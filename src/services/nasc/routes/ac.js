const express = require('express');
const { nintendoBase64Encode, nintendoBase64Decode, nascDateTime, nascError, generateToken } = require('../../../utils');
const { getServerByTitleID } = require('../../../database');

const router = express.Router();

router.post('/', async (req, res) => {
	const reqParams = req.body;
	const action = nintendoBase64Decode(reqParams.action).toString();
	const titleID = nintendoBase64Decode(reqParams.titleid).toString();
	const nexAccount = req.nexAccount;
	let resData = nascError('null');

	if (!nexAccount) {
		res.status(200).send(resData.toString());
		return;
	}

	let serverAccessLevel = 'test';
	if (titleID !== '0004013000003202') {
		serverAccessLevel = nexAccount.server_access_level;
	}

	const server = await getServerByTitleID(titleID, serverAccessLevel);

	if (!server || !server.aes_key) {
		res.status(200).send(nascError('110').toString());
		return;
	}

	if (server.maintenance_mode) {
		res.status(200).send(nascError('110').toString());
		return;
	}

	if (action === 'LOGIN' && server.port <= 0 && server.ip !== '0.0.0.0') {
		// * Addresses of 0.0.0.0:0 are allowed
		// * They are expected for titles with no NEX server
		res.status(200).send(nascError('110').toString());
		return;
	}

	switch (action) {
		case 'LOGIN':
			resData = await processLoginreq(server, nexAccount.pid, titleID);
			break;
		case 'SVCLOC':
			resData = await processServiceTokenreq(server, nexAccount.pid, titleID);
			break;
	}

	res.status(200).send(resData.toString());
});

async function processLoginreq(server, pid, titleID) {
	const tokenOptions = {
		system_type: 0x2, // * 3DS
		token_type: 0x3, // * NEX token
		pid: pid,
		access_level: 0,
		title_id: BigInt(parseInt(titleID, 16)),
		expire_time: BigInt(Date.now() + (3600 * 1000))
	};

	const nexTokenBuffer = await generateToken(server.aes_key, tokenOptions);
	const nexToken = nintendoBase64Encode(nexTokenBuffer || '');

	return new URLSearchParams({
		locator: nintendoBase64Encode(`${server.ip}:${server.port}`),
		retry: nintendoBase64Encode('0'),
		returncd: nintendoBase64Encode('001'),
		token: nexToken,
		datetime: nintendoBase64Encode(nascDateTime()),
	});
}

async function processServiceTokenreq(server, pid, titleID) {
	const tokenOptions = {
		system_type: 0x2, // * 3DS
		token_type: 0x4, // * Service token
		pid: pid,
		access_level: 0,
		title_id: BigInt(parseInt(titleID, 16)),
		expire_time: BigInt(Date.now() + (3600 * 1000))
	};

	const serviceTokenBuffer = await generateToken(server.aes_key, tokenOptions);
	const serviceToken = nintendoBase64Encode(serviceTokenBuffer || '');

	return new URLSearchParams({
		retry: nintendoBase64Encode('0'),
		returncd: nintendoBase64Encode('007'),
		servicetoken: serviceToken,
		statusdata: nintendoBase64Encode('Y'),
		svchost: nintendoBase64Encode('n/a'),
		datetime: nintendoBase64Encode(nascDateTime()),
	});
}

module.exports = router;