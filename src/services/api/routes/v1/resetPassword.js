const router = require('express').Router();
const bcrypt = require('bcrypt');
const { RNID } = require('../../../../models/rnid');
const util = require('../../../../util');

const PASSWORD_WORD_OR_NUMBER_REGEX = /(?=.*[a-zA-Z])(?=.*\d).*/;
const PASSWORD_WORD_OR_PUNCTUATION_REGEX = /(?=.*[a-zA-Z])(?=.*[\_\-\.]).*/;
const PASSWORD_NUMBER_OR_PUNCTUATION_REGEX = /(?=.*\d)(?=.*[\_\-\.]).*/;
const PASSWORD_REPEATED_CHARACTER_REGEX = /(.)\1\1/;

router.post('/', async (request, response) => {
	const { body } = request;
	const password = body.password?.trim();
	const passwordConfirm = body.password_confirm?.trim();
	const token = body.token?.trim();

	if (!token || token === '') {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Missing token'
		});
	}

	let unpackedToken;
	try {
		const decryptedToken = await util.decryptToken(Buffer.from(token, 'base64'));
		unpackedToken = util.unpackToken(decryptedToken);
	} catch (error) {
		console.log(error);
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Invalid token'
		});
	}

	if (unpackedToken.expire_time < Date.now()) {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Token expired'
		});
	}

	const rnid = await RNID.findOne({ pid: unpackedToken.pid });

	if (!rnid) {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Invalid token. No user found'
		});
	}


	if (!password || password === '') {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Must enter a password'
		});
	}

	if (password.length < 6) {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Password is too short'
		});
	}

	if (password.length > 16) {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Password is too long'
		});
	}

	if (password.toLowerCase() === rnid.get('usernameLower')) {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Password cannot be the same as username'
		});
	}

	if (!PASSWORD_WORD_OR_NUMBER_REGEX.test(password) && !PASSWORD_WORD_OR_PUNCTUATION_REGEX.test(password) && !PASSWORD_NUMBER_OR_PUNCTUATION_REGEX.test(password)) {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Password must have combination of letters, numbers, and/or punctuation characters'
		});
	}

	if (PASSWORD_REPEATED_CHARACTER_REGEX.test(password)) {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Password may not have 3 repeating characters'
		});
	}

	if (password !== passwordConfirm) {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Passwords do not match'
		});
	}

	const primaryPasswordHash = util.nintendoPasswordHash(password, rnid.get('pid'));
	const passwordHash = await bcrypt.hash(primaryPasswordHash, 10);

	rnid.password = passwordHash;

	await rnid.save();

	response.json({
		app: 'api',
		status: 200
	});
});

module.exports = router;