const router = require('express').Router();
const xmlbuilder = require('xmlbuilder');
const moment = require('moment');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { RNID } = require('../../../models/rnid');
const { NEXAccount } = require('../../../models/nex-account');
const deviceCertificateMiddleware = require('../../../middleware/device-certificate');
const ratelimit = require('../../../middleware/ratelimit');
const database = require('../../../database');
const util = require('../../../util');
const logger = require('../../../logger');
require('moment-timezone');

router.get('/:username', async (request, response) => {
	const { username } = request.params;

	const userExists = await database.doesUserExist(username);

	if (userExists) {
		response.status(400).end(xmlbuilder.create({
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

router.post('/', ratelimit, deviceCertificateMiddleware, async (request, response) => {
    if (!request.certificate.valid) {
        response.status(400).send(xmlbuilder.create({
            error: {
                cause: 'Bad Request',
                code: '1600',
                message: 'Unable to process request'
            }
        }).end());

		return;
    }

	const body = request.body;

    const person = body.person;

    const userExists = await database.doesUserExist(person.user_id);

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

    const creationDate = moment().format('YYYY-MM-DDTHH:mm:ss');
    let rnid;
    let nexAccount;

    try {
        nexAccount = new NEXAccount({
            device_type: 'wiiu',
        });

        await nexAccount.generatePID();
        await nexAccount.generatePassword();

        nexAccount.owning_pid = nexAccount.pid;

        await nexAccount.save();

        const primaryPasswordHash = util.nintendoPasswordHash(person.getpassword, nexAccount.pid);
        const passwordHash = await bcrypt.hash(primaryPasswordHash, 10);

        rnid = new RNID({
            pid: nexAccount.pid,
            creation_date: creationDate,
            updated: creationDate,
            username: person.user_id,
            usernameLower: person.user_id.toLowerCase(),
            password: passwordHash,
            birthdate: person.birth_date,
            gender: person.gender,
            country: person.country,
            language: person.language,
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
                name: person.tz_name,
                offset: (moment.tz(person.tz_name).utcOffset() * 60)
            },
            mii: {
                name: person.mii.name,
                primary: person.mii.name === 'Y',
                data: person.mii.data,
                id: crypto.randomBytes(4).readUInt32LE(),
                hash: crypto.randomBytes(7).toString('hex'),
                image_url: '',
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

        // await rnid.generateEmailValidationCode();
        // await rnid.generateEmailValidationToken();

        await rnid.save();
    } catch (error) {
        logger.error('[POST] /v1/api/people: ' + error);
        return response.status(404).send(xmlbuilder.create({
            error: {
                cause: 'Bad Request',
                code: '1600',
                message: 'Unable to process request'
            }
        }).end());

		return;
    }

    // await util.sendConfirmationEmail(rnid);

    response.send(xmlbuilder.create({
        person: {
            pid: rnid.pid
        }
    }).end());
});

router.get('/@me/profile', async (request, response) => {
	response.set('Content-Type', 'text/xml');
	response.set('Server', 'Nintendo 3DS (http)');
	response.set('X-Nintendo-Date', new Date().getTime().toString());

	const rnid = request.rnid;

	if (!rnid) {
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

	const person = await database.getUserProfileJSONByPID(rnid.pid);

	if (!person) {
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

router.post('/@me/devices', async (request, response) => {
	response.set('Content-Type', 'text/xml');
	response.set('Server', 'Nintendo 3DS (http)');
	response.set('X-Nintendo-Date', new Date().getTime().toString());

	const rnid = request.rnid;

	if (!rnid) {
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

	const person = await database.getUserProfileJSONByPID(rnid.pid);

	if (!person) {
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

router.get('/@me/devices', async (request, response) => {
	response.set('Content-Type', 'text/xml');
	response.set('Server', 'Nintendo 3DS (http)');
	response.set('X-Nintendo-Date', new Date().getTime().toString());

	const { rnid, headers } = request;

	if (!rnid) {
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
					device_id: headers['x-nintendo-device-id'],
					language: headers['accept-language'],
					updated: moment().format('YYYY-MM-DDTHH:MM:SS'),
					pid: rnid.pid,
					platform_id: headers['x-nintendo-platform-id'],
					region: headers['x-nintendo-region'],
					serial_number: headers['x-nintendo-serial-number'],
					status: 'ACTIVE',
					system_version: headers['x-nintendo-system-version'],
					type: 'RETAIL',
					updated_by: 'USER'
				}
			}
		]
	}).end());
});

router.get('/@me/devices/owner', async (request, response) => {
	response.set('Content-Type', 'text/xml');
	response.set('Server', 'Nintendo 3DS (http)');
	response.set('X-Nintendo-Date', moment().add(5, 'h').toString());

	const rnid = request.rnid;

	if (!rnid) {
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

	const person = await database.getUserProfileJSONByPID(rnid.pid);

	if (!person) {
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

router.get('/@me/devices/status', async (request, response) => {
	response.set('Content-Type', 'text/xml');
	response.set('Server', 'Nintendo 3DS (http)');
	response.set('X-Nintendo-Date', moment().add(5, 'h').toString());

	response.send(xmlbuilder.create({
		device: {}
	}).end());
});

router.put('/@me/miis/@primary', async (request, response) => {
	const rnid = request.rnid;

	if (!rnid) {
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

	const body = request.body;

	const mii = body.mii;

	const [name, primary, data] = [mii.name, mii.primary, mii.data];

	await rnid.updateMii({ name, primary, data });

	response.send('');
});

router.put('/@me/devices/@current/inactivate', async (request, response) => {
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

router.put('/@me/deletion', async (request, response) => {
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

	// await RNID.deleteOne({ pid: rnid.pid });

	const email = rnid.email.address;

	await rnid.scrub();
	await rnid.save();

	try {
		await util.sendPNIDDeletedEmail(email, rnid.username);
	} catch (error) {
		logger.error(`Error sending deletion email ${error}`);
	}

	response.send('');
});

router.put('/@me', async (request, response) => {
	const body = request.body;
	const rnid = request.rnid;
	const person = body.person;

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
	const timezoneName = person.tz_name ? person.tz_name : rnid.timezone.name;
	const marketingFlag = person.marketing_flag ? person.marketing_flag === 'Y' : rnid.flags.marketing;
	const offDeviceFlag = person.off_device_flag ? person.off_device_flag === 'Y' : rnid.flags.off_device;

	if (person.password) {
		const primaryPasswordHash = util.nintendoPasswordHash(person.password, rnid.pid);
		const passwordHash = await bcrypt.hash(primaryPasswordHash, 10);
		
		rnid.password = passwordHash;
	}

	rnid.gender = gender;
	rnid.region = region;
	rnid.timezone.name = timezoneName;
	rnid.timezone.offset = (moment.tz(timezoneName).utcOffset() * 60);
	rnid.timezone.marketing = marketingFlag;
	rnid.timezone.off_device = offDeviceFlag;

	await rnid.save();

	response.send('');
});

router.get('/@me/emails', async (request, response) => {
	const rnid = request.rnid;

	if (!rnid) {
		response.status(404).end(xmlbuilder.create({
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
					type: 'DEFAULT', // what is this?
					updated_by: 'USER', // need to actually update this
					validated: rnid.email.validated ? 'Y' : 'N',
					validated_date: rnid.email.validated_date,
				}
			}
		]
	}).end());
});

router.put('/@me/emails/@primary', async (request, response) => {
	const body = request.body;
	const rnid = request.rnid;
	const email = body.email;

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

	rnid.email.address = email.address.toLowerCase();
	rnid.email.reachable = false;
	rnid.email.validated = false;
	rnid.email.validated_date = '';
	rnid.email.id = crypto.randomBytes(4).readUInt32LE();

	await rnid.generateEmailValidationCode();
	await rnid.generateEmailValidationToken();

	await rnid.save();

	// await util.sendConfirmationEmail(rnid);

	response.send('');
});

module.exports = router;
