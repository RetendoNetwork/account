import express from 'express';
import bcrypt from 'bcrypt';
import { PNID } from '@/models/pnid';
import { decryptToken, unpackToken, nintendoPasswordHash } from '@/util';

const router = express.Router();

const PASSWORD_WORD_OR_NUMBER_REGEX = /(?=.*[a-zA-Z])(?=.*\d).*/;
const PASSWORD_WORD_OR_PUNCTUATION_REGEX = /(?=.*[a-zA-Z])(?=.*[_\-.]).*/;
const PASSWORD_NUMBER_OR_PUNCTUATION_REGEX = /(?=.*\d)(?=.*[_\-.]).*/;
const PASSWORD_REPEATED_CHARACTER_REGEX = /(.)\1\1/;

router.post('/', async (req, res) => {
	const password = req.body.password?.trim();
	const passwordConfirm = req.body.password_confirm?.trim();
	const token = req.body.token?.trim();

	if (!token || token === '') {
		res.status(400).json({
			app: 'api',
			status: 400,
			error: 'Missing token'
		});

		return;
	}

	let unpackedToken;

	try {
		const decryptedToken = await decryptToken(Buffer.from(token, 'hex'));
		unpackedToken = unpackToken(decryptedToken);
	} catch (error) {
		res.status(400).json({
			app: 'api',
			status: 400,
			error: 'Invalid token'
		});

		return;
	}

	if (unpackedToken.expire_time < Date.now()) {
		res.status(400).json({
			app: 'api',
			status: 400,
			error: 'Token expired'
		});

		return;
	}

	const rnid = await RNID.findOne({ pid: unpackedToken.pid });

	if (!rnid) {
		res.status(400).json({
			app: 'api',
			status: 400,
			error: 'Invalid token. No user found'
		});

		return;
	}


	if (!password || password === '') {
		res.status(400).json({
			app: 'api',
			status: 400,
			error: 'Must enter a password'
		});

		return;
	}

	if (password.length < 6) {
		res.status(400).json({
			app: 'api',
			status: 400,
			error: 'Password is too short'
		});

		return;
	}

	if (password.length > 16) {
		res.status(400).json({
			app: 'api',
			status: 400,
			error: 'Password is too long'
		});

		return;
	}

	if (password.toLowerCase() === rnid.usernameLower) {
		res.status(400).json({
			app: 'api',
			status: 400,
			error: 'Password cannot be the same as username'
		});

		return;
	}

	if (!PASSWORD_WORD_OR_NUMBER_REGEX.test(password) && !PASSWORD_WORD_OR_PUNCTUATION_REGEX.test(password) && !PASSWORD_NUMBER_OR_PUNCTUATION_REGEX.test(password)) {
		res.status(400).json({
			app: 'api',
			status: 400,
			error: 'Password must have combination of letters, numbers, and/or punctuation characters'
		});

		return;
	}

	if (PASSWORD_REPEATED_CHARACTER_REGEX.test(password)) {
		res.status(400).json({
			app: 'api',
			status: 400,
			error: 'Password may not have 3 repeating characters'
		});

		return;
	}

	if (password !== passwordConfirm) {
		res.status(400).json({
			app: 'api',
			status: 400,
			error: 'Passwords do not match'
		});

		return;
	}

	const primaryPasswordHash = nintendoPasswordHash(password, rnid.pid);
	const passwordHash = await bcrypt.hash(primaryPasswordHash, 10);

	rnid.password = passwordHash;

	await rnid.save();

	res.json({
		app: 'api',
		status: 200
	});
});

module.exports = router;