const router = require('express').Router();
const dns = require('dns');
const xmlbuilder = require('xmlbuilder');
const moment = require('moment');
const util = require('../../../util');
const database = require('../../../database');

router.post('/validate/email', async (request, response) => {
	const { email } = request.body;

	if (!email) {
		return response.send(xmlbuilder.create({
			errors: {
				error: {
					cause: 'email',
					code: '0103',
					message: 'Email format is invalid'
				}
			}
		}).end());
	}

	const domain = email.split('@')[1];

	dns.resolveMx(domain, (error) => {
		if (error) {
			return response.send(xmlbuilder.create({
				errors: {
					error: {
						code: '1126',
						message: 'The domain "' + domain + '" is not accessible.'
					}
				}
			}).end());
		}

		response.status(200);
		response.end();
	});
});

router.put('/email_confirmation/:pid/:code', async (request, response) => {
	const { pid, code } = request.params;

	const rnid = await database.getUserByPID(pid);

	if (!rnid) {
		return response.status(400).send(xmlbuilder.create({
			errors: {
				error: {
					code: '0130',
					message: 'PID has not been registered yet'
				}
			}
		}).end());
	}

	if (rnid.get('identification.email_code') !== code) {
		return response.status(400).send(xmlbuilder.create({
			errors: {
				error: {
					code: '0116',
					message: 'Missing or invalid verification code'
				}
			}
		}).end());
	}

	const validatedDate = moment().format('YYYY-MM-DDTHH:MM:SS');

	rnid.set('email.reachable', true);
	rnid.set('email.validated', true);
	rnid.set('email.validated_date', validatedDate);

	await rnid.save();

	await util.sendEmailConfirmedEmail(rnid);

	response.status(200).send('');
});

router.get('/resend_confirmation', async (request, response) => {
	const pid = request.headers['x-nintendo-pid'];

	const rnid = await database.getUserByPID(pid);

	if (!rnid) {
		return response.status(400).send(xmlbuilder.create({
			errors: {
				error: {
					code: '0130',
					message: 'PID has not been registered yet'
				}
			}
		}).end());
	}

	await util.sendConfirmationEmail(rnid);

	response.status(200).send('');
});

router.get('/forgotten_password/:pid', async (request, response) => {
	const { pid } = request.params;

	const rnid = await database.getUserByPID(pid);

	if (!rnid) {
		return response.status(400).send(xmlbuilder.create({
			errors: {
				error: {
					cause: 'device_id',
					code: '0113',
					message: 'Unauthorized device'
				}
			}
		}).end());
	}

	await util.sendForgotPasswordEmail(rnid);

	response.status(200).send('');
});

module.exports = router;