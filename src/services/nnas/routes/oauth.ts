import express from 'express';
import xmlbuilder from 'xmlbuilder';
import bcrypt from 'bcrypt';
import deviceCertificateMiddleware from '@/middleware/device-certificate';
import consoleStatusVerificationMiddleware from '@/middleware/console-status-verification';
import { getRNIDByTokenAuth, getRNIDByUsername } from '@/database';
import { generateToken } from '@/util';
import { config } from '@/config-manager';
import { Device } from '@/models/device';

const router = express.Router();

router.post('/access_token/generate', deviceCertificateMiddleware, consoleStatusVerificationMiddleware, async (request: express.Request, response: express.Response): Promise<void> => {
	const grantType = request.body.grant_type;
	const username = request.body.user_id;
	const password = request.body.password;
	const refreshToken = request.body.refresh_token;

	if (!['password', 'refresh_token'].includes(grantType)) {
		response.status(400).send(xmlbuilder.create({
			error: {
				cause: 'grant_type',
				code: '0004',
				message: 'Invalid Grant Type'
			}
		}).end());

		return;
	}

	let rnid = null;

	if (grantType === 'password') {
		if (!username || username.trim() === '') {
			response.status(400).send(xmlbuilder.create({
				error: {
					cause: 'user_id',
					code: '0002',
					message: 'user_id format is invalid'
				}
			}).end());

			return;
		}

		if (!password || password.trim() === '') {
			response.status(400).send(xmlbuilder.create({
				error: {
					cause: 'password',
					code: '0002',
					message: 'password format is invalid'
				}
			}).end());

			return;
		}

		rnid = await getRNIDByUsername(username);

		if (!rnid || !await bcrypt.compare(password, rnid.password)) {
			response.status(400).send(xmlbuilder.create({
				errors: {
					error: {
						code: '0106',
						message: 'Invalid account ID or password'
					}
				}
			}).end({ pretty: true }));

			return;
		}
	} else {
		if (!refreshToken || refreshToken.trim() === '') {
			response.status(400).send(xmlbuilder.create({
				error: {
					cause: 'refresh_token',
					code: '0106',
					message: 'Invalid Refresh Token'
				}
			}).end());

			return;
		}

		try {
			rnid = await getRNIDByTokenAuth(refreshToken);

			if (!rnid) {
				response.status(400).send(xmlbuilder.create({
					error: {
						cause: 'refresh_token',
						code: '0106',
						message: 'Invalid Refresh Token'
					}
				}).end());

				return;
			}
		} catch (error) {
			response.status(400).send(xmlbuilder.create({
				error: {
					cause: 'refresh_token',
					code: '0106',
					message: 'Invalid Refresh Token'
				}
			}).end());

			return;
		}
	}

	if (rnid.deleted) {
		// * 0112 is the "account deleted" error, but unsure if this unlinks the RNID from the user?
		// * 0143 is the "The link to this Nintendo Network ID has been temporarliy removed" error,
		// * maybe that is a better error to use here?
		response.status(400).send(xmlbuilder.create({
			error: {
				code: '0112',
				message: rnid.username
			}
		}).end());

		return;
	}

	// * This are set/validated in consoleStatusVerificationMiddleware
	// * It is always set, despite what Express might think
	if (request.device?.model === 'wup') {
		await Device.updateOne({
			_id: request.device?._id
		}, {
			$addToSet: {
				linked_pids: rnid.pid
			}
		});
	}

	if (rnid.access_level < 0) {
		response.status(400).send(xmlbuilder.create({
			errors: {
				error: {
					code: '0122',
					message: 'Device has been banned by game server'
				}
			}
		}).end());

		return;
	}

	const accessTokenOptions = {
		system_type: 0x1, // * WiiU
		token_type: 0x1, // * OAuth Access
		pid: rnid.pid,
		expire_time: BigInt(Date.now() + (3600 * 1000))
	};

	const refreshTokenOptions = {
		system_type: 0x1, // * WiiU
		token_type: 0x2, // * OAuth Refresh
		pid: rnid.pid,
		expire_time: BigInt(Date.now() + (3600 * 1000))
	};

	const accessTokenBuffer = await generateToken(config.aes_key, accessTokenOptions);
	const refreshTokenBuffer = await generateToken(config.aes_key, refreshTokenOptions);

	const accessToken = accessTokenBuffer ? accessTokenBuffer.toString('hex') : '';
	const newRefreshToken = refreshTokenBuffer ? refreshTokenBuffer.toString('hex') : '';

	// TODO - Handle null tokens

	response.send(xmlbuilder.create({
		OAuth20: {
			access_token: {
				token: accessToken,
				refresh_token: newRefreshToken,
				expires_in: 3600
			}
		}
	}).end());
});

export default router;