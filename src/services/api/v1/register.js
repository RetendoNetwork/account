const crypto = require('node:crypto');
const express = require('express');
const emailvalidator = require('email-validator');
const bcrypt = require('bcrypt');
const moment = require('moment');
const Mii = require('../../../models/mii');
const { doesRNIDExist } = require('../../../database');
const { nintendoPasswordHash, sendConfirmationEmail, generateToken } = require('../../../utils');
const logger = require('../../../logger');
const { RNID } = require('../../../models/rnid');
const { NEXAccount } = require('../../../models/nex-account');
const { config } = require('../../../config-manager');

const router = express.Router();

const RNID_VALID_CHARACTERS_REGEX = /^[\w\-.]*$/;
const RNID_PUNCTUATION_START_REGEX = /^[_\-.]/;
const RNID_PUNCTUATION_END_REGEX = /[_\-.]$/;
const RNID_PUNCTUATION_DUPLICATE_REGEX = /[_\-.]{2,}/;

const PASSWORD_WORD_OR_NUMBER_REGEX = /(?=.*[a-zA-Z])(?=.*\d).*/;
const PASSWORD_WORD_OR_PUNCTUATION_REGEX = /(?=.*[a-zA-Z])(?=.*[_\-.]).*/;
const PASSWORD_NUMBER_OR_PUNCTUATION_REGEX = /(?=.*\d)(?=.*[_\-.]).*/;
const PASSWORD_REPEATED_CHARACTER_REGEX = /(.)\1\1/;

const DEFAULT_MII_DATA = Buffer.from('AwAAQOlVognnx0GC2/uogAOzuI0n2QAAAEBEAGUAZgBhAHUAbAB0AAAAAAAAAEBAAAAhAQJoRBgmNEYUgRIXaA0AACkAUkhQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGm9', 'base64');

router.post('/', async (request, response) => {
	const email = request.body.email?.trim();
	const username = request.body.username?.trim();
	const miiName = request.body.mii_name?.trim();
	const password = request.body.password?.trim();

	if (!email || email === '') {
		response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Must enter an email address'
		});

		return;
	}

	if (!emailvalidator.validate(email)) {
		response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Invalid email address'
		});

		return;
	}

	if (!username || username === '') {
		response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Must enter a username'
		});

		return;
	}

	if (username.length < 6) {
		response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Username is too short'
		});

		return;
	}

	if (username.length > 16) {
		response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Username is too long'
		});

		return;
	}

	if (!RNID_VALID_CHARACTERS_REGEX.test(username)) {
		console.log(Buffer.from(username));
		response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Username contains invalid characters'
		});

		return;
	}

	if (RNID_PUNCTUATION_START_REGEX.test(username)) {
		response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Username cannot begin with punctuation characters'
		});

		return;
	}

	if (RNID_PUNCTUATION_END_REGEX.test(username)) {
		response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Username cannot end with punctuation characters'
		});

		return;
	}

	if (RNID_PUNCTUATION_DUPLICATE_REGEX.test(username)) {
		response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Two or more punctuation characters cannot be used in a row'
		});

		return;
	}

	const userExists = await doesRNIDExist(username);

	if (userExists) {
		response.status(400).json({
			app: 'api',
			status: 400,
			error: 'RNID already in use'
		});

		return;
	}

	if (!miiName || miiName === '') {
		response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Must enter a Mii name'
		});

		return;
	}

	if (!password || password === '') {
		response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Must enter a password'
		});

		return;
	}

	if (password.length < 6) {
		response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Password is too short'
		});

		return;
	}

	if (password.length > 16) {
		response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Password is too long'
		});

		return;
	}

	if (password.toLowerCase() === username.toLowerCase()) {
		response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Password cannot be the same as username'
		});

		return;
	}

	if (!PASSWORD_WORD_OR_NUMBER_REGEX.test(password) && !PASSWORD_WORD_OR_PUNCTUATION_REGEX.test(password) && !PASSWORD_NUMBER_OR_PUNCTUATION_REGEX.test(password)) {
		response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Password must have combination of letters, numbers, and/or punctuation characters'
		});

		return;
	}

	if (PASSWORD_REPEATED_CHARACTER_REGEX.test(password)) {
		response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Password may not have 3 repeating characters'
		});

		return;
	}

	const miiNameBuffer = Buffer.from(miiName, 'utf16le'); // * UTF8 to UTF16

	if (miiNameBuffer.length > 0x14) {
		response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Mii name too long'
		});

		return;
	}

	const mii = new Mii(DEFAULT_MII_DATA);
	mii.miiName = miiName;

	const creationDate = moment().format('YYYY-MM-DDTHH:MM:SS');
	let rnid;
	let nexAccount;

	// const session = await databaseConnection().startSession();
	// await session.startTransaction();

	try {
		nexAccount = new NEXAccount({
			device_type: 'wiiu',
		});

		await nexAccount.generatePID();
		await nexAccount.generatePassword();

		nexAccount.owning_pid = nexAccount.pid;

		await nexAccount.save(); // await nexAccount.save({ session });

		const primaryPasswordHash = nintendoPasswordHash(password, nexAccount.pid);
		const passwordHash = await bcrypt.hash(primaryPasswordHash, 10);

		rnid = new RNID({
			pid: nexAccount.pid,
			creation_date: creationDate,
			updated: creationDate,
			username: username,
			usernameLower: username.toLowerCase(),
			password: passwordHash,
			birthdate: '1990-01-01',
			gender: 'M',
			country: 'US',
			language: 'en',
			email: {
				address: email.toLowerCase(),
				primary: true,
				parent: true,
				reachable: false,
				validated: false,
				id: crypto.randomBytes(4).readUInt32LE()
			},
			region: 0x310B0000,
			timezone: {
				name: 'America/New_York',
				offset: -14400
			},
			mii: {
				name: miiName,
				primary: true,
				data: mii.encode().toString('base64'),
				id: crypto.randomBytes(4).readUInt32LE(),
				hash: crypto.randomBytes(7).toString('hex'),
				image_url: '', // * deprecated, will be removed in the future
				image_id: crypto.randomBytes(4).readUInt32LE()
			},
			flags: {
				active: true,
				marketing: true,
				off_device: true
			},
			identification: {
				email_code: 1, // * will be overwritten before saving
				email_token: '' // * will be overwritten before saving
			}
		});

		await rnid.generateEmailValidationCode();
		await rnid.generateEmailValidationToken();
		// await rnid.generateMiiImages();

		await rnid.save(); // await rnid.save({ session });

		//await session.commitTransaction();
	} catch (error) {
		logger.error('[POST] /v1/register: ' + error);
		if (error.stack) console.error(error.stack);

		// await session.abortTransaction();

		response.status(500).json({
			app: 'api',
			status: 500,
			error: 'Internal server error'
		});

		return;
	} finally {
		// await session.endSession();
	}

	await sendConfirmationEmail(rnid);

	const accessTokenOptions = {
		system_type: 0x3, // * API
		token_type: 0x1, // * OAuth Access
		pid: rnid.pid,
		access_level: rnid.access_level,
		title_id: BigInt(0),
		expire_time: BigInt(Date.now() + (3600 * 1000))
	};

	const refreshTokenOptions = {
		system_type: 0x3, // * API
		token_type: 0x2, // * OAuth Refresh
		pid: rnid.pid,
		access_level: rnid.access_level,
		title_id: BigInt(0),
		expire_time: BigInt(Date.now() + (3600 * 1000))
	};

	const accessTokenBuffer = await generateToken(config.aes_key, accessTokenOptions);
	const refreshTokenBuffer = await generateToken(config.aes_key, refreshTokenOptions);

	const accessToken = accessTokenBuffer ? accessTokenBuffer.toString('hex') : '';
	const refreshToken = refreshTokenBuffer ? refreshTokenBuffer.toString('hex') : '';

	response.json({
		access_token: accessToken,
		token_type: 'Bearer',
		expires_in: 3600,
		refresh_token: refreshToken
	});
});

module.exports = router;
