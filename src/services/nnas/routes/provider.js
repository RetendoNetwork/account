const express = require('express');
const xmlbuilder = require('xmlbuilder');
const { getServerByClientID, getServerByGameServerID } = require('../../../database');
const { generateToken, getValueFromHeaders, getValueFromQueryString } = require('../../../utils');
const { NEXAccount } = require('../../../models/nex-account');

const router = express.Router();

router.get('/service_token/@me', async (req, res) => {
	const rnid = req.rnid;

	if (!rnid) {
		res.status(400).send(xmlbuilder.create({
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

	const clientID = getValueFromQueryString(req.query, 'client_id');

	if (!clientID) {
		res.send(xmlbuilder.create({
			errors: {
				error: {
					code: '1021',
					message: 'The reqed game server was not found'
				}
			}
		}).end());

		return;
	}

	const titleID = getValueFromHeaders(req.headers, 'x-nintendo-title-id');

	if (!titleID) {
		res.send(xmlbuilder.create({
			errors: {
				error: {
					code: '1021',
					message: 'The reqed game server was not found'
				}
			}
		}).end());

		return;
	}

	const serverAccessLevel = rnid.server_access_level;
	const server = await getServerByClientID(clientID, serverAccessLevel);

	if (!server || !server.aes_key) {
		res.send(xmlbuilder.create({
			errors: {
				error: {
					code: '1021',
					message: 'The reqed game server was not found'
				}
			}
		}).end());

		return;
	}

	if (server.maintenance_mode) {
		res.send(xmlbuilder.create({
			errors: {
				error: {
					code: '2002',
					message: 'The reqed game server is under maintenance'
				}
			}
		}).end());

		return;
	}

	const tokenOptions = {
		system_type: server.device,
		token_type: 0x4, // * Service token
		pid: rnid.pid,
		access_level: rnid.access_level,
		title_id: BigInt(parseInt(titleID, 16)),
		expire_time: BigInt(Date.now() + (3600 * 1000))
	};

	const serviceTokenBuffer = await generateToken(server.aes_key, tokenOptions);
	let serviceToken = serviceTokenBuffer ? serviceTokenBuffer.toString('base64') : '';

	if (req.isCemu) {
		serviceToken = Buffer.from(serviceToken, 'base64').toString('hex');
	}

	res.send(xmlbuilder.create({
		service_token: {
			token: serviceToken
		}
	}).end());
});

router.get('/nex_token/@me', async (req, res) => {
	const rnid = req.rnid;

	if (!rnid) {
		res.status(400).send(xmlbuilder.create({
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
		res.status(404).send(xmlbuilder.create({
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

	const gameServerID = getValueFromQueryString(req.query, 'game_server_id');

	if (!gameServerID) {
		res.send(xmlbuilder.create({
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
	const server = await getServerByGameServerID(gameServerID, serverAccessLevel);

	if (!server || !server.aes_key) {
		res.send(xmlbuilder.create({
			errors: {
				error: {
					code: '1021',
					message: 'The reqed game server was not found'
				}
			}
		}).end());

		return;
	}

	if (server.maintenance_mode) {
		res.send(xmlbuilder.create({
			errors: {
				error: {
					code: '2002',
					message: 'The reqed game server is under maintenance'
				}
			}
		}).end());

		return;
	}

	const titleID = getValueFromHeaders(req.headers, 'x-nintendo-title-id');

	if (!titleID) {
		res.send(xmlbuilder.create({
			errors: {
				error: {
					code: '1021',
					message: 'The reqed game server was not found'
				}
			}
		}).end());

		return;
	}

	const tokenOptions = {
		system_type: server.device,
		token_type: 0x3, // * nex token,
		pid: rnid.pid,
		access_level: rnid.access_level,
		title_id: BigInt(parseInt(titleID, 16)),
		expire_time: BigInt(Date.now() + (3600 * 1000))
	};

	const nexTokenBuffer = await generateToken(server.aes_key, tokenOptions);
	let nexToken = nexTokenBuffer ? nexTokenBuffer.toString('base64') : '';

	if (req.isCemu) {
		nexToken = Buffer.from(nexToken || '', 'base64').toString('hex');
	}

	res.send(xmlbuilder.create({
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