import crypto from 'node:crypto';
import express from 'express';
import xmlbuilder from 'xmlbuilder';
import bcrypt from 'bcrypt';
import moment from 'moment';
import deviceCertificateMiddleware from '@/middleware/device-certificate';
import ratelimit from '@/middleware/ratelimit';
import { connection as databaseConnection, doesRNIDExist, getRNIDProfileJSONByPID } from '@/database';
import { getValueFromHeaders, nintendoPasswordHash, sendConfirmationEmail, sendPNIDDeletedEmail } from '@/util';
import { RNID } from '@/models/rnid';
import { NEXAccount } from '@/models/nex-account';
import logger from '@/logger';
import timezones from '@/services/nnas/timezones.json';

import { HydratedRNIDDocument } from '@/types/mongoose/rnid';
import { HydratedNEXAccountDocument } from '@/types/mongoose/nex-account';
import { Person } from '@/types/services/nnas/person';

const router = express.Router();

router.get('/:username', async (request: express.Request, response: express.Response): Promise<void> => {
	const username = request.params.username;

	const userExists = await doesRNIDExist(username);

	if (userExists) {
		response.status(400).send(xmlbuilder.create({
			errors: {
				error: {
					code: '0100',
					message: 'Account ID already exists'
				}
			}
		}).end());

		return;
	}

	response.send();
});

router.post('/', ratelimit, deviceCertificateMiddleware, async (request: express.Request, response: express.Response): Promise<void> => {
	if (!request.certificate || !request.certificate.valid) {
		// TODO - Change this to a different error
		response.status(400).send(xmlbuilder.create({
			error: {
				cause: 'Bad Request',
				code: '1600',
				message: 'Unable to process request'
			}
		}).end());

		return;
	}

	const person: Person = request.body.person;

	const userExists = await doesRNIDExist(person.user_id);

	if (userExists) {
		response.status(400).send(xmlbuilder.create({
			errors: {
				error: {
					code: '0100',
					message: 'Account ID already exists'
				}
			}
		}).end());

		return;
	}

	const creationDate = moment().format('YYYY-MM-DDTHH:MM:SS');
	let rnid: HydratedRNIDDocument;
	let nexAccount: HydratedNEXAccountDocument;

	const session = await databaseConnection().startSession();
	await session.startTransaction();

	try {
		nexAccount = new NEXAccount({
			device_type: 'wiiu',
		});

		await nexAccount.generatePID();
		await nexAccount.generatePassword();

		// * Quick hack to get the PIDs to match
		// TODO - Change this maybe?
		// * NN with a NNID will always use the NNID PID
		// * even if the provided NEX PID is different
		// * To fix this we make them the same PID
		nexAccount.owning_pid = nexAccount.pid;

		await nexAccount.save({ session });

		const primaryPasswordHash = nintendoPasswordHash(person.password, nexAccount.pid);
		const passwordHash = await bcrypt.hash(primaryPasswordHash, 10);

		const countryCode = person.country;
		const language = person.language;
		const timezoneName = person.tz_name;

		const regionLanguages = timezones[countryCode as keyof typeof timezones];
		const regionTimezones = regionLanguages[language as keyof typeof regionLanguages] ? regionLanguages[language as keyof typeof regionLanguages] : Object.values(regionLanguages)[0];
		let timezone = regionTimezones.find(tz => tz.area === timezoneName);

		if (!timezone) {
			// TODO - Change this, handle the error
			timezone = {
				area: 'America/New_York',
				language: 'en',
				name: 'Eastern Time (US &amp; Canada)',
				order: '11',
				utc_offset: '-14400'
			};
		}

		rnid = new RNID({
			pid: nexAccount.pid,
			creation_date: creationDate,
			updated: creationDate,
			username: person.user_id,
			usernameLower: person.user_id.toLowerCase(),
			password: passwordHash,
			birthdate: person.birth_date,
			gender: person.gender,
			country: countryCode,
			language: language,
			email: {
				address: person.email.address.toLowerCase(),
				primary: person.email.primary === 'Y',
				parent: person.email.parent === 'Y',
				reachable: false,
				validated: person.email.validated === 'Y',
				id: crypto.randomBytes(4).readUInt32LE()
			},
			region: person.region,
			timezone: {
				name: timezoneName,
				offset: Number(timezone.utc_offset)
			},
			mii: {
				name: person.mii.name,
				primary: person.mii.name === 'Y',
				data: person.mii.data,
				id: crypto.randomBytes(4).readUInt32LE(),
				hash: crypto.randomBytes(7).toString('hex'),
				image_url: '', // * deprecated, will be removed in the future
				image_id: crypto.randomBytes(4).readUInt32LE()
			},
			flags: {
				active: true,
				marketing: person.marketing_flag === 'Y',
				off_device: person.off_device_flag === 'Y'
			},
			identification: {
				email_code: 1, // * will be overwritten before saving
				email_token: '' // * will be overwritten before saving
			}
		});

		await rnid.generateEmailValidationCode();
		await rnid.generateEmailValidationToken();
		await rnid.generateMiiImages();

		await rnid.save({ session });

		await session.commitTransaction();
	} catch (error) {
		logger.error('[POST] /v1/api/people: ' + error);

		await session.abortTransaction();

		response.status(400).send(xmlbuilder.create({
			error: {
				cause: 'Bad Request',
				code: '1600',
				message: 'Unable to process request'
			}
		}).end());

		return;
	} finally {
		// * This runs regardless of failure
		// * Returning on catch will not prevent this from running
		await session.endSession();
	}

	await sendConfirmationEmail(rnid);

	response.send(xmlbuilder.create({
		person: {
			pid: rnid.pid
		}
	}).end());
});

router.get('/@me/profile', async (request: express.Request, response: express.Response): Promise<void> => {
	response.set('Content-Type', 'text/xml');
	response.set('Server', 'Nintendo 3DS (http)');
	response.set('X-Nintendo-Date', new Date().getTime().toString());

	const rnid = request.rnid;

	if (!rnid) {
		// TODO - Research this error more
		response.status(404).send(xmlbuilder.create({
			errors: {
				error: {
					cause: '',
					code: '0008',
					message: 'Not Found'
				}
			}
		}).end());

		return;
	}

	const person = await getRNIDProfileJSONByPID(rnid.pid);

	if (!person) {
		// TODO - Research this error more
		response.status(404).send(xmlbuilder.create({
			errors: {
				error: {
					cause: '',
					code: '0008',
					message: 'Not Found'
				}
			}
		}).end());

		return;
	}

	response.send(xmlbuilder.create({
		person
	}, { separateArrayItems: true }).end());
});

router.post('/@me/devices', async (request: express.Request, response: express.Response): Promise<void> => {
	response.set('Content-Type', 'text/xml');
	response.set('Server', 'Nintendo 3DS (http)');
	response.set('X-Nintendo-Date', new Date().getTime().toString());

	// * We don't care about the device attributes
	// * The console ignores them and PNIDs are not tied to consoles anyway
	// * So the server also ignores them and does not save the ones posted here

	// TODO - CHANGE THIS. WE NEED TO SAVE CONSOLE DETAILS !!!

	const rnid = request.rnid;

	if (!rnid) {
		// TODO - Research this error more
		response.status(404).send(xmlbuilder.create({
			errors: {
				error: {
					cause: '',
					code: '0008',
					message: 'Not Found'
				}
			}
		}).end());

		return;
	}

	const person = await getRNIDProfileJSONByPID(rnid.pid);

	if (!person) {
		// TODO - Research this error more
		response.status(404).send(xmlbuilder.create({
			errors: {
				error: {
					cause: '',
					code: '0008',
					message: 'Not Found'
				}
			}
		}).end());

		return;
	}

	response.send(xmlbuilder.create({
		person
	}).end());
});

router.get('/@me/devices', async (request: express.Request, response: express.Response): Promise<void> => {
	response.set('Content-Type', 'text/xml');
	response.set('Server', 'Nintendo 3DS (http)');
	response.set('X-Nintendo-Date', new Date().getTime().toString());

	const rnid = request.rnid;
	const deviceID = getValueFromHeaders(request.headers, 'x-nintendo-device-id');
	const acceptLanguage = getValueFromHeaders(request.headers, 'accept-language');
	const platformID = getValueFromHeaders(request.headers, 'x-nintendo-platform-id');
	const region = getValueFromHeaders(request.headers, 'x-nintendo-region');
	const serialNumber = getValueFromHeaders(request.headers, 'x-nintendo-serial-number');
	const systemVersion = getValueFromHeaders(request.headers, 'x-nintendo-system-version');

	if (!deviceID || !acceptLanguage || !platformID || !region || !serialNumber || !systemVersion) {
		// TODO - Research these error more
		response.status(400).send(xmlbuilder.create({
			errors: {
				error: {
					cause: 'Bad Request',
					code: '1600',
					message: 'Unable to process request'
				}
			}
		}).end());

		return;
	}

	if (!rnid) {
		// TODO - Research this error more
		response.status(404).send(xmlbuilder.create({
			errors: {
				error: {
					cause: '',
					code: '0008',
					message: 'Not Found'
				}
			}
		}).end());

		return;
	}

	response.send(xmlbuilder.create({
		devices: [
			{
				device: {
					device_id: deviceID,
					language: acceptLanguage,
					updated: moment().format('YYYY-MM-DDTHH:MM:SS'),
					pid: rnid.pid,
					platform_id: platformID,
					region: region,
					serial_number: serialNumber,
					status: 'ACTIVE',
					system_version: systemVersion,
					type: 'RETAIL',
					updated_by: 'USER'
				}
			}
		]
	}).end());
});

router.get('/@me/devices/owner', async (request: express.Request, response: express.Response): Promise<void> => {
	response.set('Content-Type', 'text/xml');
	response.set('Server', 'Nintendo 3DS (http)');
	response.set('X-Nintendo-Date', moment().add(5, 'h').toString());

	const rnid = request.rnid;

	if (!rnid) {
		// TODO - Research this error more
		response.status(404).send(xmlbuilder.create({
			errors: {
				error: {
					cause: '',
					code: '0008',
					message: 'Not Found'
				}
			}
		}).end());

		return;
	}

	const person = await getRNIDProfileJSONByPID(rnid.pid);

	if (!person) {
		// TODO - Research this error more
		response.status(404).send(xmlbuilder.create({
			errors: {
				error: {
					cause: '',
					code: '0008',
					message: 'Not Found'
				}
			}
		}).end());

		return;
	}

	response.send(xmlbuilder.create({
		person
	}).end());
});

router.get('/@me/devices/status', async (_request: express.Request, response: express.Response): Promise<void> => {
	response.set('Content-Type', 'text/xml');
	response.set('Server', 'Nintendo 3DS (http)');
	response.set('X-Nintendo-Date', moment().add(5, 'h').toString());

	response.send(xmlbuilder.create({
		device: {}
	}).end());
});

router.put('/@me/miis/@primary', async (request: express.Request, response: express.Response): Promise<void> => {
	const rnid = request.rnid;

	if (!rnid) {
		// TODO - Research this error more
		response.status(404).send(xmlbuilder.create({
			errors: {
				error: {
					cause: '',
					code: '0008',
					message: 'Not Found'
				}
			}
		}).end());

		return;
	}

	const mii: {
		name: string;
		primary: string;
		data: string;
	} = request.body.mii;

	// TODO - Better checks

	const name = mii.name;
	const primary = mii.primary;
	const data = mii.data;

	await rnid.updateMii({ name, primary, data });

	response.send('');
});

router.put('/@me/devices/@current/inactivate', async (request: express.Request, response: express.Response): Promise<void> => {
	response.set('Server', 'Nintendo 3DS (http)');
	response.set('X-Nintendo-Date', new Date().getTime().toString());

	const rnid = request.rnid;

	if (!rnid) {
		response.status(400).send(xmlbuilder.create({
			errors: {
				error: {
					cause: 'access_token',
					code: '0002',
					message: 'Invalid access token'
				}
			}
		}).end());

		return;
	}

	response.send();
});

router.post('/@me/deletion', async (request: express.Request, response: express.Response): Promise<void> => {
	const rnid = request.rnid;

	if (!rnid) {
		response.status(400).send(xmlbuilder.create({
			errors: {
				error: {
					cause: 'access_token',
					code: '0002',
					message: 'Invalid access token'
				}
			}
		}).end());

		return;
	}

	const email = rnid.email.address;

	await rnid.scrub();
	await rnid.save();

	try {
		await sendPNIDDeletedEmail(email, rnid.username);
	} catch (error) {
		logger.error(`Error sending deletion email ${error}`);
	}

	response.send('');
});

router.put('/@me', async (request: express.Request, response: express.Response): Promise<void> => {
	const rnid = request.rnid;
	const person: Person = request.body.person;

	if (!rnid) {
		response.status(400).send(xmlbuilder.create({
			errors: {
				error: {
					cause: 'access_token',
					code: '0002',
					message: 'Invalid access token'
				}
			}
		}).end());

		return;
	}

	const gender = person.gender ? person.gender : rnid.gender;
	const region = person.region ? person.region : rnid.region;
	const countryCode = person.country ? person.country : rnid.country;
	const language = person.language ? person.language : rnid.language;
	let timezoneName = person.tz_name ? person.tz_name : rnid.timezone.name;

	// * Fix for 3DS sending empty person.tz_name, which is interpreted as an empty object
	// TODO - See if there's a cleaner way to do this?

	if (typeof timezoneName === 'object' && Object.keys(timezoneName).length === 0) {
		timezoneName = rnid.timezone.name;
	}

	const marketingFlag = person.marketing_flag ? person.marketing_flag === 'Y' : rnid.flags.marketing;
	const offDeviceFlag = person.off_device_flag ? person.off_device_flag === 'Y' : rnid.flags.off_device;

	const regionLanguages = timezones[countryCode as keyof typeof timezones];
	const regionTimezones = regionLanguages[language as keyof typeof regionLanguages] ? regionLanguages[language as keyof typeof regionLanguages] : Object.values(regionLanguages)[0];
	let timezone = regionTimezones.find(tz => tz.area === timezoneName);

	if (!timezone) {
		// TODO - Change this, handle the error
		timezone = {
			area: 'America/New_York',
			language: 'en',
			name: 'Eastern Time (US &amp; Canada)',
			order: '11',
			utc_offset: '-14400'
		};
	}

	if (person.password) {
		const primaryPasswordHash = nintendoPasswordHash(person.password, rnid.pid);
		const passwordHash = await bcrypt.hash(primaryPasswordHash, 10);

		rnid.password = passwordHash;
	}

	rnid.gender = gender;
	rnid.region = region;
	rnid.country = countryCode;
	rnid.language = language;
	rnid.timezone.name = timezoneName;
	rnid.timezone.offset = Number(timezone.utc_offset);
	rnid.flags.marketing = marketingFlag;
	rnid.flags.off_device = offDeviceFlag;

	await rnid.save();

	response.send('');
});

router.get('/@me/emails', async (request: express.Request, response: express.Response): Promise<void> => {
	const rnid = request.rnid;

	if (!rnid) {
		response.status(400).send(xmlbuilder.create({
			errors: {
				error: {
					cause: 'access_token',
					code: '0002',
					message: 'Invalid access token'
				}
			}
		}).end());

		return;
	}

	response.send(xmlbuilder.create({
		emails: [
			{
				email: {
					address: rnid.email.address,
					id: rnid.email.id,
					parent: rnid.email.parent ? 'Y' : 'N',
					primary: rnid.email.primary ? 'Y' : 'N',
					reachable: rnid.email.reachable ? 'Y' : 'N',
					type: 'DEFAULT', // * what is this?
					updated_by: 'USER', // * need to actually update this
					validated: rnid.email.validated ? 'Y' : 'N',
					validated_date: rnid.email.validated_date,
				}
			}
		]
	}).end());
});

router.put('/@me/emails/@primary', async (request: express.Request, response: express.Response): Promise<void> => {
	const rnid = request.rnid;

	const email: {
		address: string;
	} = request.body.email;

	if (!rnid || !email || !email.address) {
		response.status(400).send(xmlbuilder.create({
			errors: {
				error: {
					cause: 'access_token',
					code: '0002',
					message: 'Invalid access token'
				}
			}
		}).end());

		return;
	}

	// TODO - Better email check
	rnid.email.address = email.address.toLowerCase();
	rnid.email.reachable = false;
	rnid.email.validated = false;
	rnid.email.validated_date = '';
	rnid.email.id = crypto.randomBytes(4).readUInt32LE();

	await rnid.generateEmailValidationCode();
	await rnid.generateEmailValidationToken();

	await rnid.save();

	await sendConfirmationEmail(rnid);

	response.send('');
});

export default router;