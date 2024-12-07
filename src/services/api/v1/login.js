const express = require('express');
const bcrypt = require('bcrypt');
const { getRNIDByUsername, getRNIDByTokenAuth } = require('../../../database');
const { nintendoPasswordHash, generateToken} = require('../../../utils');
const { config } = require('../../../config-manager');

const router = express.Router();

router.post('/', async (req, res) => {
	const body = req.body;
	const grantType = body?.grant_type;
	const username = body?.username;
	const password = body?.password;
	const refreshToken = body?.refresh_token;

	if (!['password', 'refresh_token'].includes(grantType)) {
		res.status(400).json({
			app: 'api',
			status: 400,
			error: 'Invalid grant type'
		});

		return;
	}

	if (grantType === 'password' && (!username || username.trim() === '')) {
		res.status(400).json({
			app: 'api',
			status: 400,
			error: 'Invalid or missing username'
		});

		return;
	}

	if (grantType === 'password' && (!password || password.trim() === '')) {
		res.status(400).json({
			app: 'api',
			status: 400,
			error: 'Invalid or missing password'
		});

		return;
	}

	if (grantType === 'refresh_token' && (!refreshToken || refreshToken.trim() === '')) {
		res.status(400).json({
			app: 'api',
			status: 400,
			error: 'Invalid or missing refresh token'
		});

		return;
	}

	let rnid;

	if (grantType === 'password') {
		rnid = await getRNIDByUsername(username);

		if (!rnid) {
			res.status(400).json({
				app: 'api',
				status: 400,
				error: 'User not found'
			});

			return;
		}

		const hashedPassword = nintendoPasswordHash(password, rnid.pid);

		if (!rnid || !bcrypt.compareSync(hashedPassword, rnid.password)) {
			res.status(400).json({
				app: 'api',
				status: 400,
				error: 'Invalid or missing password'
			});

			return;
		}
	} else {
		rnid = await getRNIDByTokenAuth(refreshToken);

		if (!rnid) {
			res.status(400).json({
				app: 'api',
				status: 400,
				error: 'Invalid or missing refresh token'
			});

			return;
		}
	}

	if (rnid.deleted) {
		res.status(400).json({
			app: 'api',
			status: 400,
			error: 'User not found'
		});

		return;
	}

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
	const newRefreshToken = refreshTokenBuffer ? refreshTokenBuffer.toString('hex') : '';

	res.json({
		access_token: accessToken,
		token_type: 'Bearer',
		expires_in: 3600,
		refresh_token: newRefreshToken
	});
});

module.exports = router;