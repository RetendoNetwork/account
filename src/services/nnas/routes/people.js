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
		response.status(400);

		return response.end(xmlbuilder.create({
			errors: {
				error: {
					code: '0100',
					message: 'Account ID already exists'
				}
			}
		}).end());
	}

	response.status(200);
	response.end();
});

router.post('/', ratelimit, deviceCertificateMiddleware, async (request, response) => {
    if (!request.certificate.valid) {
        response.status(400);
        return response.send(xmlbuilder.create({
            error: {
                cause: 'Bad Request',
                code: '1600',
                message: 'Unable to process request'
            }
        }).end());
    }

    const person = request.body.get('person');

    const userExists = await database.doesUserExist(person.get('user_id'));

    if (userExists) {
        response.status(400);
        return response.end(xmlbuilder.create({
            errors: {
                error: {
                    code: '0100',
                    message: 'Account ID already exists'
                }
            }
        }).end());
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

        nexAccount.owning_pid = nexAccount.get('pid');

        await nexAccount.save();

        const primaryPasswordHash = util.nintendoPasswordHash(person.get('password'), nexAccount.get('pid'));
        const passwordHash = await bcrypt.hash(primaryPasswordHash, 10);

        rnid = new RNID({
            pid: nexAccount.get('pid'),
            creation_date: creationDate,
            updated: creationDate,
            username: person.get('user_id'),
            usernameLower: person.get('user_id').toLowerCase(),
            password: passwordHash,
            birthdate: person.get('birth_date'),
            gender: person.get('gender'),
            country: person.get('country'),
            language: person.get('language'),
            email: {
                address: person.get('email').get('address').toLowerCase(),
                primary: person.get('email').get('primary') === 'Y',
                parent: person.get('email').get('parent') === 'Y',
                reachable: false,
                validated: person.get('email').get('validated') === 'Y',
                id: crypto.randomBytes(4).readUInt32LE()
            },
            region: person.get('region'),
            timezone: {
                name: person.get('tz_name'),
                offset: (moment.tz(person.get('tz_name')).utcOffset() * 60)
            },
            mii: {
                name: person.get('mii').get('name'),
                primary: person.get('mii').get('name') === 'Y',
                data: person.get('mii').get('data'),
                id: crypto.randomBytes(4).readUInt32LE(),
                hash: crypto.randomBytes(7).toString('hex'),
                image_url: '',
                image_id: crypto.randomBytes(4).readUInt32LE()
            },
            flags: {
                active: true,
                marketing: person.get('marketing_flag') === 'Y',
                off_device: person.get('off_device_flag') === 'Y'
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
        response.status(400);
        return response.send(xmlbuilder.create({
            error: {
                cause: 'Bad Request',
                code: '1600',
                message: 'Unable to process request'
            }
        }).end());
    }

    // await util.sendConfirmationEmail(rnid);

    response.send(xmlbuilder.create({
        person: {
            pid: rnid.get('pid')
        }
    }).end());
});

router.get('/@me/profile', async (request, response) => {
	response.set('Content-Type', 'text/xml');
	response.set('Server', 'Nintendo 3DS (http)');
	response.set('X-Nintendo-Date', new Date().getTime());

	const { rnid } = request;

	const person = await database.getUserProfileJSONByPID(rnid.get('pid'));

	response.send(xmlbuilder.create({
		person
	}, { separateArrayItems: true }).end());
});

router.post('/@me/devices', async (request, response) => {
	response.set('Content-Type', 'text/xml');
	response.set('Server', 'Nintendo 3DS (http)');
	response.set('X-Nintendo-Date', new Date().getTime());

	const { rnid } = request;

	const person = await database.getUserProfileJSONByPID(rnid.get('pid'));

	response.send(xmlbuilder.create({
		person
	}).end());
});

router.get('/@me/devices', async (request, response) => {
	response.set('Content-Type', 'text/xml');
	response.set('Server', 'Nintendo 3DS (http)');
	response.set('X-Nintendo-Date', new Date().getTime());

	const { rnid, headers } = request;

	response.send(xmlbuilder.create({
		devices: [
			{
				device: {
					device_id: headers['x-nintendo-device-id'],
					language: headers['accept-language'],
					updated: moment().format('YYYY-MM-DDTHH:MM:SS'),
					pid: rnid.get('pid'),
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
	response.set('X-Nintendo-Date', moment().add(5, 'h'));

	const { rnid } = request;

	const person = await database.getUserProfileJSONByPID(rnid.get('pid'));

	response.send(xmlbuilder.create({
		person
	}).end());
});

router.get('/@me/devices/status', async (request, response) => {
	response.set('Content-Type', 'text/xml');
	response.set('Server', 'Nintendo 3DS (http)');
	response.set('X-Nintendo-Date', moment().add(5, 'h'));

	response.send(xmlbuilder.create({
		device: {}
	}).end());
});


router.put('/@me/miis/@primary', async (request, response) => {
	const { rnid } = request;

	const mii = request.body.get('mii');

	const [name, primary, data] = [mii.get('name'), mii.get('primary'), mii.get('data')];

	await rnid.updateMii({ name, primary, data });

	response.send('');
});

router.put('/@me/devices/@current/inactivate', async (request, response) => {
	response.set('Server', 'Nintendo 3DS (http)');
	response.set('X-Nintendo-Date', new Date().getTime());

	const { rnid } = request;

	if (!rnid) {
		response.status(400);

		return response.end(xmlbuilder.create({
			errors: {
				error: {
					cause: 'access_token',
					code: '0002',
					message: 'Invalid access token'
				}
			}
		}).end());
	}

	response.status(200);
	response.end();
});

router.put('/@me/deletion', async (request, response) => {
	const { rnid } = request;

	if (!rnid) {
		response.status(400);

		return response.end(xmlbuilder.create({
			errors: {
				error: {
					cause: 'access_token',
					code: '0002',
					message: 'Invalid access token'
				}
			}
		}).end());
	}

	await RNID.deleteOne({ pid: rnid.get('pid') });

	response.send('');
});

router.put('/@me', async (request, response) => {
	const { rnid } = request;
	const person = request.body.get('person');

	if (!rnid) {
		response.status(400);

		return response.end(xmlbuilder.create({
			errors: {
				error: {
					cause: 'access_token',
					code: '0002',
					message: 'Invalid access token'
				}
			}
		}).end());
	}

	const gender = person.get('gender') ? person.get('gender') : rnid.get('gender');
	const region = person.get('region') ? person.get('region') : rnid.get('region');
	const timezoneName = person.get('tz_name') ? person.get('tz_name') : rnid.get('timezone.name');
	const marketingFlag = person.get('marketing_flag') ? person.get('marketing_flag') === 'Y' : rnid.get('flags.marketing');
	const offDeviceFlag = person.get('off_device_flag') ? person.get('off_device_flag') === 'Y' : rnid.get('flags.off_device');

	if (person.get('password')) {
		const primaryPasswordHash = util.nintendoPasswordHash(person.get('password'), rnid.get('pid'));
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
	const { rnid } = request;

	if (!rnid) {
		response.status(400);

		return response.end(xmlbuilder.create({
			errors: {
				error: {
					cause: 'access_token',
					code: '0002',
					message: 'Invalid access token'
				}
			}
		}).end());
	}

	response.send(xmlbuilder.create({
		emails: [
			{
				email: {
					address: rnid.get('email.address'),
					id: rnid.get('email.id'),
					parent: rnid.get('email.parent') ? 'Y' : 'N',
					primary: rnid.get('email.primary') ? 'Y' : 'N',
					reachable: rnid.get('email.reachable') ? 'Y' : 'N',
					type: 'DEFAULT', // what is this?
					updated_by: 'USER', // need to actually update this
					validated: rnid.get('email.validated') ? 'Y' : 'N',
					validated_date: rnid.get('email.validated_date'),
				}
			}
		]
	}).end());
});

router.put('/@me/emails/@primary', async (request, response) => {
	const { rnid } = request;
	const email = request.body.get('email');

	if (!rnid) {
		response.status(400);

		return response.end(xmlbuilder.create({
			errors: {
				error: {
					cause: 'access_token',
					code: '0002',
					message: 'Invalid access token'
				}
			}
		}).end());
	}

	rnid.set('email.address', email.get('address').toLowerCase());
	rnid.set('email.reachable', false);
	rnid.set('email.validated', false);
	rnid.set('email.validated_date', '');
	rnid.set('email.id', crypto.randomBytes(4).readUInt32LE());

	await rnid.generateEmailValidationCode();
	await rnid.generateEmailValidationToken();

	await rnid.save();

	await util.sendConfirmationEmail(rnid);

	response.send('');
});

module.exports = router;