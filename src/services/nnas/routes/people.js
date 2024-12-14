const crypto = require('node:crypto');
const express = require('express');
const xmlbuilder = require('xmlbuilder');
const bcrypt = require('bcrypt');
const moment = require('moment');
const deviceCertificateMiddleware = require('../../../middleware/device-certificate');
const ratelimit = require('../../../middleware/ratelimit');
const { connection, doesRNIDExist, getRNIDProfileJSONByPID } = require('../../../database');
const { getValueFromHeaders, nintendoPasswordHash, sendConfirmationEmail, sendRNIDDeletedEmail } = require('../../../utils');
const { RNID } = require('../../../models/rnid');
const { NEXAccount } = require('../../../models/nex-account');
const logger = require('../../../logger');
const timezones = require('../timezones.json');

const router = express.Router();

router.get('/:username', async (req, res) => {
	const params = req.params
	const username = params.username;

	const userExists = await doesRNIDExist(username);

	if (userExists) {
		res.status(400).send(xmlbuilder.create({
			errors: {
				error: {
					code: '0100',
					message: 'Account ID already exists'
				}
			}
		}).end());

		return;
	}

	res.send();
});

router.post('/', ratelimit, deviceCertificateMiddleware, async (req, res) => {
	if (!req.certificate || !req.certificate.valid) {
		res.status(400).send(xmlbuilder.create({
			error: {
				cause: 'Bad req',
				code: '1600',
				message: 'Unable to process req'
			}
		}).end());

		return;
	}

    const body = req.body;
	const person = body.person;

	const userExists = await doesRNIDExist(person.user_id);

	if (userExists) {
		res.status(400).send(xmlbuilder.create({
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
	let rnid;
	let nexAccount;

	// TODO - Fix errors with transaction and generateMiiImages.

	// const session = await connection().startSession();
	// await session.startTransaction();

	try {
		nexAccount = new NEXAccount({
			device_type: 'wiiu',
		});

		await nexAccount.generatePID();
		await nexAccount.generatePassword();

		nexAccount.owning_pid = nexAccount.pid;

		await nexAccount.save(); // await nexAccount.save({ session });

		const primaryPasswordHash = nintendoPasswordHash(person.password, nexAccount.pid);
		const passwordHash = await bcrypt.hash(primaryPasswordHash, 10);

		const countryCode = person.country;
		const language = person.language;
		const timezoneName = person.tz_name;

		const regionLanguages = timezones[countryCode];
		const regionTimezones = regionLanguages[language] ? regionLanguages[language] : Object.values(regionLanguages)[0];
		let timezone = regionTimezones.find(tz => tz.area === timezoneName);

		if (!timezone) {
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
				email_code: 1,
				email_token: ''
			}
		});

		await rnid.generateEmailValidationCode();
		await rnid.generateEmailValidationToken();
		// await rnid.generateMiiImages();

		await rnid.save(); // await rnid.save({ session });

		// await session.commitTransaction();
	} catch (error) {
		logger.error('[POST] /v1/api/people: ' + error);

		// await session.abortTransaction();

		res.status(400).send(xmlbuilder.create({
			error: {
				cause: 'Bad req',
				code: '1600',
				message: 'Unable to process req'
			}
		}).end());

		return;
	} finally {
		// await session.endSession();
	}

	await sendConfirmationEmail(rnid);

	res.send(xmlbuilder.create({
		person: {
			pid: rnid.pid
		}
	}).end());
});

router.get('/@me/profile', async (req, res) => {
	res.set('Content-Type', 'text/xml');
	res.set('Server', 'Nintendo 3DS (http)');
	res.set('X-Nintendo-Date', new Date().getTime().toString());

	const rnid = req.rnid;

	if (!rnid) {
		res.status(404).send(xmlbuilder.create({
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
		res.status(404).send(xmlbuilder.create({
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

	res.send(xmlbuilder.create({
		person
	}, { separateArrayItems: true }).end());
});

router.post('/@me/devices', async (req, res) => {
	res.set('Content-Type', 'text/xml');
	res.set('Server', 'Nintendo 3DS (http)');
	res.set('X-Nintendo-Date', new Date().getTime().toString());

	const rnid = req.rnid;

	if (!rnid) {
		res.status(404).send(xmlbuilder.create({
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
		res.status(404).send(xmlbuilder.create({
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

	res.send(xmlbuilder.create({
		person
	}).end());
});

router.get('/@me/devices', async (req, res) => {
	res.set('Content-Type', 'text/xml');
	res.set('Server', 'Nintendo 3DS (http)');
	res.set('X-Nintendo-Date', new Date().getTime().toString());

	const rnid = req.rnid;
	const deviceID = getValueFromHeaders(req.headers, 'x-nintendo-device-id');
	const acceptLanguage = getValueFromHeaders(req.headers, 'accept-language');
	const platformID = getValueFromHeaders(req.headers, 'x-nintendo-platform-id');
	const region = getValueFromHeaders(req.headers, 'x-nintendo-region');
	const serialNumber = getValueFromHeaders(req.headers, 'x-nintendo-serial-number');
	const systemVersion = getValueFromHeaders(req.headers, 'x-nintendo-system-version');

	if (!deviceID || !acceptLanguage || !platformID || !region || !serialNumber || !systemVersion) {
		res.status(400).send(xmlbuilder.create({
			errors: {
				error: {
					cause: 'Bad req',
					code: '1600',
					message: 'Unable to process req'
				}
			}
		}).end());

		return;
	}

	if (!rnid) {
		res.status(404).send(xmlbuilder.create({
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

	res.send(xmlbuilder.create({
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

router.get('/@me/devices/owner', async (req, res) => {
	res.set('Content-Type', 'text/xml');
	res.set('Server', 'Nintendo 3DS (http)');
	res.set('X-Nintendo-Date', moment().add(5, 'h').toString());

	const rnid = req.rnid;

	if (!rnid) {
		res.status(404).send(xmlbuilder.create({
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
		res.status(404).send(xmlbuilder.create({
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

	res.send(xmlbuilder.create({
		person
	}).end());
});

router.get('/@me/devices/status', async (_req, res) => {
	res.set('Content-Type', 'text/xml');
	res.set('Server', 'Nintendo 3DS (http)');
	res.set('X-Nintendo-Date', moment().add(5, 'h').toString());

	res.send(xmlbuilder.create({
		device: {}
	}).end());
});


router.put('/@me/miis/@primary', async (req, res) => {
    const body = req.body;
	const rnid = req.rnid;

	if (!rnid) {
		res.status(404).send(xmlbuilder.create({
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

	const mii = body.mii;

	const name = mii.name;
	const primary = mii.primary;
	const data = mii.data;

	await rnid.updateMii({ name, primary, data });

	res.send('');
});

router.put('/@me/devices/@current/inactivate', async (req, res) => {
	res.set('Server', 'Nintendo 3DS (http)');
	res.set('X-Nintendo-Date', new Date().getTime().toString());

	const rnid = req.rnid;

	if (!rnid) {
		res.status(400).send(xmlbuilder.create({
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

	res.send();
});

router.post('/@me/deletion', async (req, res) => {
	const rnid = req.rnid;

	if (!rnid) {
		res.status(400).send(xmlbuilder.create({
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
		await sendRNIDDeletedEmail(email, rnid.username);
	} catch (error) {
		logger.error(`Error sending deletion email ${error}`);
	}

	res.send('');
});

router.put('/@me', async (req, res) => {
    const body = req.body;
	const rnid = req.rnid;
	const person = body.person;

	if (!rnid) {
		res.status(400).send(xmlbuilder.create({
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

	if (typeof timezoneName === 'object' && Object.keys(timezoneName).length === 0) {
		timezoneName = rnid.timezone.name;
	}

	const marketingFlag = person.marketing_flag ? person.marketing_flag === 'Y' : rnid.flags.marketing;
	const offDeviceFlag = person.off_device_flag ? person.off_device_flag === 'Y' : rnid.flags.off_device;

	const regionLanguages = timezones[countryCode];
	const regionTimezones = regionLanguages[language] ? regionLanguages[language] : Object.values(regionLanguages)[0];
	let timezone = regionTimezones.find(tz => tz.area === timezoneName);

	if (!timezone) {
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

	res.send('');
});

router.get('/@me/emails', async (req, res) => {
	const rnid = req.rnid;

	if (!rnid) {
		res.status(400).send(xmlbuilder.create({
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

	res.send(xmlbuilder.create({
		emails: [
			{
				email: {
					address: rnid.email.address,
					id: rnid.email.id,
					parent: rnid.email.parent ? 'Y' : 'N',
					primary: rnid.email.primary ? 'Y' : 'N',
					reachable: rnid.email.reachable ? 'Y' : 'N',
					type: 'DEFAULT',
					updated_by: 'USER',
					validated: rnid.email.validated ? 'Y' : 'N',
					validated_date: rnid.email.validated_date,
				}
			}
		]
	}).end());
});

router.put('/@me/emails/@primary', async (req, res) => {
    const body = req.body;
	const rnid = req.rnid;
    const email = body.email;

	if (!rnid || !email || !email.address) {
		res.status(400).send(xmlbuilder.create({
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

	rnid.email.address = email.address.toLowerCase();
	rnid.email.reachable = false;
	rnid.email.validated = false;
	rnid.email.validated_date = '';
	rnid.email.id = crypto.randomBytes(4).readUInt32LE();

	await rnid.generateEmailValidationCode();
	await rnid.generateEmailValidationToken();

	await rnid.save();

	await sendConfirmationEmail(rnid);

	res.send('');
});

module.exports = router;
