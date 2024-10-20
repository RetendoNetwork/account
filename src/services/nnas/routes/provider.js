const router = require('express').Router();
const xmlbuilder = require('xmlbuilder');
const fs = require('fs-extra');
const { NEXAccount } = require('../../../models/nex-account');
const util = require('../../../util');
const database = require('../../../database');
const cache = require('../../../cache');

router.get('/service_token/@me', async (request, response) => {
	const { rnid } = request;

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

	if (request.isCemu) {
		serviceToken = Buffer.from(serviceToken, 'base64').toString('hex');
	}

	response.send(xmlbuilder.create({
		service_token: {
			token: serviceToken
		}
	}).end());
});

router.get('/nex_token/@me', async (request, response) => {
	const { game_server_id: gameServerID } = request.query;
	const { rnid } = request;

	if (!gameServerID) {
		return response.send(xmlbuilder.create({
			errors: {
				error: {
					code: '0118',
					message: 'Unique ID and Game Server ID are not linked'
				}
			}
		}).end());
	}

	const serverAccessLevel = rnid.get('server_access_level');
	const server = await database.getServer(gameServerID, serverAccessLevel);

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

	const { service_name, service_type, ip, port, device } = server;
	const titleId = request.headers['x-nintendo-title-id'];

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

	const publicKey = await cache.getNEXPublicKey(service_name);
	const secretKey= await cache.getNEXSecretKey(service_name);

	const cryptoOptions = {
		public_key: publicKey,
		hmac_secret: secretKey
	};

	const tokenOptions = {
		system_type: device,
		token_type: 0x3, // nex token,
		pid: rnid.get('pid'),
		access_level: rnid.get('access_level'),
		title_id: BigInt(parseInt(titleId, 16)),
		expire_time: BigInt(Date.now() + (3600 * 1000))
	};

	const nexUser = await NEXAccount.findOne({
		owning_pid: rnid.get('pid')
	});

	if (!nexUser) {
		response.status(404);
		return response.send('<errors><error><cause/><code>0008</code><message>Not Found</message></error></errors>');
	}

	let nexToken = await util.generateToken(cryptoOptions, tokenOptions);

	if (request.isCemu) {
		nexToken = Buffer.from(nexToken, 'base64').toString('hex');
	}

	response.send(xmlbuilder.create({
		nex_token: {
			host: ip,
			nex_password: nexUser.get('password'),
			pid: nexUser.get('pid'),
			port: port,
			token: nexToken
		}
	}).end());
});

module.exports = router;