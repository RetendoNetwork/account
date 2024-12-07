const express = require('express');
const validator = require('validator');
const { getRNIDByEmailAddress, getRNIDByUsername } = require('../../../database');
const { sendForgotPasswordEmail } = require('../../../utils');
const { config } = require('../../../config-manager');

const router = express.Router();

router.post('/', async (req, res) => {
	const input = req.body?.input;

	if (!input || input.trim() === '') {
		res.status(400).json({
			app: 'api',
			status: 400,
			error: 'Invalid or missing input'
		});

		return;
	}

	let rnid;

	if (validator.isEmail(input)) {
		rnid = await getRNIDByEmailAddress(input);
	} else {
		rnid = await getRNIDByUsername(input);
	}

	if (rnid) {
		await sendForgotPasswordEmail(rnid);
	}

	res.json({
		app: 'api',
		status: 200
	});
});

module.exports = router;