const router = require('express').Router();
const emailvalidator = require('email-validator');
const fs = require('fs-extra');
const moment = require('moment');
const crypto = require('crypto');
const hcaptcha = require('hcaptcha');
const bcrypt = require('bcrypt');
const Mii = require('mii-js');
const { RNID } = require('../../../../models/rnid');
const { NEXAccount } = require('../../../../models/nex-account');
const database = require('../../../../database');
const cache = require('../../../../cache');
const util = require('../../../../util');
const logger = require('../../../../logger');
const config = require('../../../../../account-config.json');

const disabledFeatures = {
	redis: false,
	email: false,
	captcha: false,
	s3: false
};

const PNID_VALID_CHARACTERS_REGEX = /^[\w\-\.]*$/gm;
const PNID_PUNCTUATION_START_REGEX = /^[\_\-\.]/gm;
const PNID_PUNCTUATION_END_REGEX = /[\_\-\.]$/gm;
const PNID_PUNCTUATION_DUPLICATE_REGEX = /[\_\-\.]{2,}/gm;

const PASSWORD_WORD_OR_NUMBER_REGEX = /(?=.*[a-zA-Z])(?=.*\d).*/;
const PASSWORD_WORD_OR_PUNCTUATION_REGEX = /(?=.*[a-zA-Z])(?=.*[\_\-\.]).*/;
const PASSWORD_NUMBER_OR_PUNCTUATION_REGEX = /(?=.*\d)(?=.*[\_\-\.]).*/;
const PASSWORD_REPEATED_CHARACTER_REGEX = /(.)\1\1/;

const DEFAULT_MII_DATA = Buffer.from('AwAAQOlVognnx0GC2/uogAOzuI0n2QAAAEBEAGUAZgBhAHUAbAB0AAAAAAAAAEBAAAAhAQJoRBgmNEYUgRIXaA0AACkAUkhQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGm9', 'base64');

router.post('/', async (request, response) => {
	const { body } = request;

	const email = body.email?.trim();
	const username = body.username?.trim();
	const miiName = body.mii_name?.trim();
	const password = body.password?.trim();
	const passwordConfirm = body.password_confirm?.trim();
	const hCaptchaResponse = body.hCaptchaResponse?.trim();

	if (!disabledFeatures.captcha) {
		if (!hCaptchaResponse || hCaptchaResponse === '') {
			return response.status(400).json({
				app: 'api',
				status: 400,
				error: 'Must fill in captcha'
			});
		}

		const captchaVerify = await hcaptcha.verify(config.hcaptcha.secret, hCaptchaResponse);

		if (!captchaVerify.success) {
			return response.status(400).json({
				app: 'api',
				status: 400,
				error: 'Captcha verification failed'
			});
		}
	}

	if (!email || email === '') {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Must enter an email address'
		});
	}

	if (!emailvalidator.validate(email)) {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Invalid email address'
		});
	}

	if (!username || username === '') {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Must enter a username'
		});
	}

	if (username.length < 6) {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Username is too short'
		});
	}

	if (username.length > 16) {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Username is too long'
		});
	}

	if (!PNID_VALID_CHARACTERS_REGEX.test(username)) {
		console.log(Buffer.from(username));
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Username contains invalid characters'
		});
	}

	if (PNID_PUNCTUATION_START_REGEX.test(username)) {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Username cannot begin with punctuation characters'
		});
	}

	if (PNID_PUNCTUATION_END_REGEX.test(username)) {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Username cannot end with punctuation characters'
		});
	}

	if (PNID_PUNCTUATION_DUPLICATE_REGEX.test(username)) {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Two or more punctuation characters cannot be used in a row'
		});
	}

	const userExists = await database.doesUserExist(username);

	if (userExists) {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'PNID already in use'
		});
	}

	if (!miiName || miiName === '') {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Must enter a Mii name'
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

	if (password.toLowerCase() === username.toLowerCase()) {
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

	const miiNameBuffer = Buffer.from(miiName, 'utf16le');

	if (miiNameBuffer.length > 0x14) {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Mii name too long'
		});
	}

	const mii = new Mii(DEFAULT_MII_DATA);
	mii.miiName = miiName;

	const creationDate = moment().format('YYYY-MM-DDTHH:MM:SS');
	let rnid;
	let nexAccount;

	const session = await database.connection.startSession();
	await session.startTransaction();

	try {
		nexAccount = new NEXAccount({
			device_type: 'wiiu',
		});

		await nexAccount.generatePID();
		await nexAccount.generatePassword();

		nexAccount.owning_pid = nexAccount.get('pid');

		await nexAccount.save({ session });

		const primaryPasswordHash = util.nintendoPasswordHash(password, nexAccount.get('pid'));
		const passwordHash = await bcrypt.hash(primaryPasswordHash, 10);

		rnid = new RNID({
			pid: nexAccount.get('pid'),
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
				image_url: '',
				image_id: crypto.randomBytes(4).readUInt32LE()
			},
			flags: {
				active: true,
				marketing: true,
				off_device: true
			},
			identification: {
				email_code: 1,
				email_token: ''
			}
		});

		await rnid.generateEmailValidationCode();
		await rnid.generateEmailValidationToken();
		await rnid.generateMiiImages();

		await rnid.save({ session });

		await session.commitTransaction();
	} catch (error) {
		logger.error('[POST] /v1/register: ' + error);

		await session.abortTransaction();

		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Password must have combination of letters, numbers, and/or punctuation characters'
		});
	} finally {
		await session.endSession();
	}

	await util.sendConfirmationEmail(rnid);

	const cryptoPath = `${__dirname}/../../../../../certs/service/account`;

	if (!await fs.pathExists(cryptoPath)) {
		return response.status(500).json({
			app: 'api',
			status: 500,
			error: 'Failed to locate crypto keys. Please contact an administrator'
		});
	}

	const publicKey = await cache.getServicePublicKey('account');
	const secretKey = await cache.getServiceSecretKey('account');

	const cryptoOptions = {
		public_key: publicKey,
		hmac_secret: secretKey
	};

	const accessTokenOptions = {
		system_type: 0xF, // API
		token_type: 0x1, // OAuth Access,
		pid: rnid.get('pid'),
		access_level: 0,
		title_id: BigInt(0),
		expire_time: BigInt(Date.now() + (3600 * 1000))
	};

	const refreshTokenOptions = {
		system_type: 0xF, // API
		token_type: 0x2, // OAuth Refresh,
		pid: rnid.get('pid'),
		access_level: 0,
		title_id: BigInt(0),
		expire_time: BigInt(Date.now() + (3600 * 1000))
	};

	const accessToken = await util.generateToken(cryptoOptions, accessTokenOptions);
	const refreshToken = await util.generateToken(cryptoOptions, refreshTokenOptions);

	response.json({
		access_token: accessToken,
		token_type: 'Bearer',
		expires_in: 3600,
		refresh_token: refreshToken
	});
});

module.exports = router;
