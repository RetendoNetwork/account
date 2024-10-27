const router = require('express').Router();
const moment = require('moment');
const { RNID } = require('../../../models/rnid');
const util = require('../../../util');

router.get('/verify', async (request, response) => {
	const { token } = request.query;

	if (!token || token.trim() == '') {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Missing email token'
		});
	}

	const rnid = await RNID.findOne({
		'identification.email_token': token
	});

	if (!rnid) {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Invalid email token'
		});
	}

	const validatedDate = moment().format('YYYY-MM-DDTHH:MM:SS');

	rnid.set('email.reachable', true);
	rnid.set('email.validated', true);
	rnid.set('email.validated_date', validatedDate);

	await rnid.save();

	await util.sendEmailConfirmedEmail(rnid);

	response.status(200).send('Email validated. You may close this window');
});

module.exports = router;