// handle "account.nintendo.net/v1/api/support" endpoints

const express = require('express');
const dns = require('dns');
const xmlbuilder = require('xmlbuilder');
const moment = require('moment');
const { execSync } = require('child_process');
const router = express.Router();

router.post('/validate/email', async (req, res) => {
	const { email } = req.body;

	if (!email) {
		return res.send(xmlbuilder.create({
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
			return res.send(xmlbuilder.create({
				errors: {
					error: {
						code: '1126',
						message: 'The domain "' + domain + '" is not accessible.'
					}
				}
			}).end());
		}

		res.status(200);
		res.end();
	});
});

router.get('/', (req, res) => {
    res.json('');
});

router.get('/resend_confirmation/', (req, res) => {
    res.send(xmlbuilder.create({ email: {} }).end({ pretty: false, allowEmpty: false }));
});

router.get('/forgotten_password/:pid', (req, res) => {
    res.send(xmlbuilder.create({ email: {} }).end({ pretty: false, allowEmpty: false }));
})

router.get('/send_confirmation/pin/:email', (req, res) => {
    res.sendStatus(200);
});

module.exports = router;