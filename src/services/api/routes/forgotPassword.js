const router = require('express').Router();
const validator = require('validator');
const database = require('../../../database');
const util = require('../../../util');

router.post('/', async (request, response) => {
	const { body } = request;
	const { input } = body;

	if (!input || input.trim() === '') {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Invalid or missing input'
		});
	}

	let rnid;

	if (validator.isEmail(input)) {
		rnid = await database.getUserByEmailAddress(input);
	} else {
		rnid = await database.getUserByUsername(input);
	}

	if (rnid) {
		await util.sendForgotPasswordEmail(rnid);
	}

	response.json({
		app: 'api',
		status: 200
	});
});

module.exports = router;