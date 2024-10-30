const router = require('express').Router();
const xmlbuilder = require('xmlbuilder');
const fs = require('fs-extra');
const { NEXAccount } = require('../../../models/nex-account');
const util = require('../../../util');
const database = require('../../../database');
const cache = require('../../../cache');

router.get('/service_token/@me', async (request, response) => {
	const rnid = request.rnid;

	if (!rnid) {
		response.status(400).send(xmlbuilder.create({
			errors: {
				error: {
					cause: 'access_token',
					code: '0002',
					message: 'Invalid access token'
				}
			}
		}).end());

		return;
	}

	const titleId = request.headers['x-nintendo-title-id'];
	const serverAccessLevel = rnid.get('server_access_level');
	const server = await database.getServerByTitleId(titleId, serverAccessLevel);

	if (!server) {
		return response.send(xmlbuilder.create({
			errors: {
				error: {
					code: '1021',
					message: 'The requested game server was not found'
				}
			}
		}).end());
	}

	const { service_name, service_type, device } = server;

	const cryptoPath = `${__dirname}/../../../../certs/${service_type}/${service_name}`;

	if (!await fs.pathExists(cryptoPath)) {
		return response.send(xmlbuilder.create({
			errors: {
				error: {
					code: '1021',
					message: 'The requested game server was not found'
				}
			}
		}).end());
	}

	const publicKey = await cache.getServicePublicKey(service_name);
	const secretKey = await cache.getServiceSecretKey(service_name);

	const cryptoOptions = {
		public_key: publicKey,
		hmac_secret: secretKey
	};

	const tokenOptions = {
		system_type: device,
		token_type: 0x4, // service token,
		pid: rnid.get('pid'),
		access_level: rnid.get('access_level'),
		title_id: BigInt(parseInt(titleId, 16)),
		expire_time: BigInt(Date.now() + (3600 * 1000))
	};

	let serviceToken = await util.generateToken(cryptoOptions, tokenOptions);

	response.send(xmlbuilder.create({
		service_token: {
			token: serviceToken
		}
	}).end());
});

router.get('/nex_token/@me', async (request, response) => {
	const rnid = request.rnid;

	if (!rnid) {
		response.status(400).send(xmlbuilder.create({
			errors: {
				error: {
					cause: 'access_token',
					code: '0002',
					message: 'Invalid access token'
				}
			}
		}).end());

		return;
	}

	const nexAccount = await NEXAccount.findOne({
		owning_pid: rnid.pid
	});

	if (!nexAccount) {
		response.status(404).send(xmlbuilder.create({
			errors: {
				error: {
					cause: '',
					code: '0008',
					message: 'Not Found'
				}
			}
		}).end());

		return;
	}

	const gameServerID = util.getValueFromQueryString(request.query, 'game_server_id');

	if (!gameServerID) {
		response.send(xmlbuilder.create({
			errors: {
				error: {
					code: '0118',
					message: 'Unique ID and Game Server ID are not linked'
				}
			}
		}).end());

		return;
	}

	const serverAccessLevel = rnid.server_access_level;
	const server = await database.getServerByGameServerID(gameServerID, serverAccessLevel);

	if (!server) {
		return response.send(xmlbuilder.create({
			errors: {
				error: {
					code: '1021',
					message: 'The requested game server was not found'
				}
			}
		}).end());
	}

	if (server.maintenance_mode) {
		response.send(xmlbuilder.create({
			errors: {
				error: {
					code: '2002',
					message: 'The requested game server is under maintenance'
				}
			}
		}).end());

		return;
	}

	const titleID = util.getValueFromHeaders(request.headers, 'x-nintendo-title-id');

	if (!titleID) {
		response.send(xmlbuilder.create({
			errors: {
				error: {
					code: '1021',
					message: 'The requested game server was not found'
				}
			}
		}).end());

		return;
	}

	const tokenOptions = {
		system_type: server.device,
		token_type: 0x3, // nex token,
		pid: rnid.pid,
		access_level: rnid.access_level,
		title_id: BigInt(parseInt(titleID, 16)),
		expire_time: BigInt(Date.now() + (3600 * 1000))
	};

	const nexTokenBuffer = await util.generateToken(server.aes_key, tokenOptions);
	let nexToken = nexTokenBuffer ? nexTokenBuffer.toString('base64') : '';

	response.send(xmlbuilder.create({
		nex_token: {
			host: server.ip,
			nex_password: nexAccount.password,
			pid: nexAccount.pid,
			port: server.port,
			token: nexToken
		}
	}).end());
});

module.exports = router;
