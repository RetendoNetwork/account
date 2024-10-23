import crypto from 'node:crypto';
import express from 'express';
import got from 'got';
import { z } from 'zod';
import { getServerByClientID, getRNIDByPID } from '@/database';
import logger from '@/logger';
import { decryptToken, unpackToken, getValueFromHeaders, sendConfirmationEmail } from '@/util';
import { config } from '@/config-manager';
import { HydratedServerDocument } from '@/types/mongoose/server';
import { HydratedRNIDDocument } from '@/types/mongoose/rnid';
import { AccountSettings } from '@/types/services/nnas/account-settings';
import { Token } from '@/types/common/token';
import { RegionLanguages } from '@/types/services/nnas/region-languages';
import { RegionTimezone, RegionTimezones } from '@/types/services/nnas/region-timezones';
import { Country, Region } from '@/types/services/nnas/regions';
import timezones from '@/services/nnas/timezones.json';
import regionsList from '@/services/nnas/regions.json';

const router = express.Router();

const accountSettingsSchema = z.object({
	birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	gender: z.enum(['M', 'F']),
	tz_name: z.string(),
	region: z.coerce.number(),
	country: z.string(),
	email: z.string().email(),
	server_selection: z.enum(['prod', 'test', 'dev']),
	marketing_flag: z.enum(['true', 'false']).transform((value) => value === 'true'),
	off_device_flag: z.enum(['true', 'false']).transform((value) => value === 'true'),
});

router.get('/ui/profile', async function (request: express.Request, response: express.Response): Promise<void> {
	const server: HydratedServerDocument | null = await getServerByClientID('3f3928cc6f780638d360f0485cef973f', config.server_environment);
	const token = getValueFromHeaders(request.headers, 'x-nintendo-service-token');

	if (!server || !token) {
		response.sendStatus(504);
		return;
	}

	const aes_key: string = server?.aes_key;
	const decryptedToken = decryptToken(Buffer.from(token, 'base64'), aes_key);

	const tokenContents: Token = unpackToken(decryptedToken);

	try {
		const RNID: HydratedRNIDDocument | null = await getRNIDByPID(tokenContents.pid);

		if (!RNID) {
			response.sendStatus(504);
			return;
		}

		const countryCode = RNID.country;
		const language = RNID.language;

		const regionLanguages: RegionLanguages = timezones[countryCode as keyof typeof timezones];
		const regionTimezones: RegionTimezones = regionLanguages[language] ? regionLanguages[language] : Object.values(regionLanguages)[0];

		const region: Country | undefined = regionsList.find((region) => region.iso_code === countryCode);

		const miiFaces = ['normal_face', 'smile_open_mouth', 'sorrow', 'surprise_open_mouth', 'wink_left', 'frustrated'];
		const face = miiFaces[crypto.randomInt(5)];

		const notice = request.query.notice ? request.query.notice.toString() : undefined;

		const accountLevel = ['Standard', 'Tester', 'Moderator', 'Developer'];

		response.render('index.ejs', {
			RNID,
			regionTimezones,
			face,
			notice,
			accountLevel,
			regions: region ? region.regions: [],
			regionsList
		});
	} catch (error: any) {
		logger.error(error);
		response.sendStatus(504);
		return;
	}
});

router.get('/mii/:pid/:face', async function (request: express.Request, response: express.Response): Promise<void> {
	if (!config.cdn.base_url) {
		response.sendStatus(404);
		return;
	}

	try {
		const url = `${config.cdn.base_url}/mii/${request.params.pid}/${request.params.face}.png`;
		console.log(url);
		const miiImage = await got(url).buffer();

		response.set('Content-Type', 'image/png');
		response.send(miiImage);
	} catch (error: any) {
		logger.error(error);
		response.sendStatus(404);
		return;
	}
});

router.post('/update', async function (request: express.Request, response: express.Response): Promise<void> {
	const server: HydratedServerDocument | null = await getServerByClientID('3f3928cc6f780638d360f0485cef973f', config.server_environment);
	const token = getValueFromHeaders(request.headers, 'x-nintendo-service-token');

	if (!server || !token) {
		response.sendStatus(504);
		return;
	}

	const aesKey = server?.aes_key;
	const decryptedToken = decryptToken(Buffer.from(token, 'base64'), aesKey);
	const tokenContents: Token = unpackToken(decryptedToken);

	try {
		const rnid: HydratedRNIDDocument | null = await getRNIDByPID(tokenContents.pid);
		const personBody: AccountSettings = request.body;

		if (!rnid) {
			response.status(404);
			response.redirect('/v1/account-settings/ui/profile');
			return;
		}

		const person = accountSettingsSchema.safeParse(personBody);

		if (!person.success) {
			response.status(404);
			response.redirect('/v1/account-settings/ui/profile');
			return;
		}

		const timezoneName = (person.data.tz_name && !!Object.keys(person.data.tz_name).length) ? person.data.tz_name : rnid.timezone.name;

		const regionLanguages: RegionLanguages = timezones[rnid.country as keyof typeof timezones];
		const regionTimezones: RegionTimezones = regionLanguages[rnid.language] ? regionLanguages[rnid.language] : Object.values(regionLanguages)[0];
		const timezone: RegionTimezone | undefined = regionTimezones.find(tz => tz.area === timezoneName);
		const country: Country | undefined = regionsList.find((region) => region.iso_code === rnid.country);
		let notice = '';

		if (!country) {
			response.status(404);
			response.redirect('/v1/account-settings/ui/profile');
			return;
		}

		const regionObject: Region | undefined = country.regions.find((region) => region.id === person.data.region);
		const region = regionObject ? regionObject.id : rnid.region;

		if (!timezone) {
			response.status(404);
			response.redirect('/v1/account-settings/ui/profile');
			return;
		}

		rnid.birthdate = person.data.birthdate;
		rnid.gender = person.data.gender;
		rnid.region = region;
		rnid.country = person.data.country;
		rnid.timezone.name = timezoneName;
		rnid.timezone.offset = Number(timezone.utc_offset);
		rnid.flags.marketing = person.data.marketing_flag;
		rnid.flags.off_device = person.data.off_device_flag;

		if (person.data.server_selection && rnid.access_level > 0 && rnid.access_level < 4) {
			const environment = person.data.server_selection;

			if (environment === 'test' && rnid.access_level < 1) {
				response.status(400);
				notice = 'Do not have permission to enter this environment';
				response.redirect(`/v1/account-settings/ui/profile?notice=${notice}`);
				return;
			}

			if (environment === 'dev' && rnid.access_level < 3) {
				response.status(400);
				notice = 'Do not have permission to enter this environment';
				response.redirect(`/v1/account-settings/ui/profile?notice=${notice}`);
				return;
			}

			rnid.server_access_level = environment;
		}

		if (person.data.email.trim().toLowerCase() !== rnid.email.address) {
			// TODO - Better email check
			rnid.email.address = person.data.email.trim().toLowerCase();
			rnid.email.reachable = false;
			rnid.email.validated = false;
			rnid.email.validated_date = '';
			rnid.email.id = crypto.randomBytes(4).readUInt32LE();

			await rnid.generateEmailValidationCode();
			await rnid.generateEmailValidationToken();
			await sendConfirmationEmail(rnid);

			notice = 'A confirmation email has been sent to your inbox.';
		}

		await rnid.save();
		response.redirect(`/v1/account-settings/ui/profile?notice=${notice}`);
	} catch (error: any) {
		logger.error(error);
		response.sendStatus(504);
		return;
	}
});

export default router;