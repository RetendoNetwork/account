const crypto = require('node:crypto');
const express = require('express');
const xmlbuilder = require('xmlbuilder');
const { Device } = require('../models/device');
const { getValueFromHeaders } = require('../utils');

async function consoleStatusVerificationMiddleware(req, res, next) {
	if (!req.certificate || !req.certificate.valid) {
		res.status(400).send(xmlbuilder.create({
			error: {
				code: '0110',
				message: 'Unlinked device'
			}
		}).end());

		return;
	}

	const deviceIDHeader = getValueFromHeaders(req.headers, 'x-nintendo-device-id');

	if (!deviceIDHeader) {
		res.status(400).send(xmlbuilder.create({
			error: {
				code: '0002',
				message: 'deviceId format is invalid'
			}
		}).end());

		return;
	}

	const deviceID = Number(deviceIDHeader);

	if (isNaN(deviceID)) {
		res.status(400).send(xmlbuilder.create({
			error: {
				code: '0002',
				message: 'deviceId format is invalid'
			}
		}).end());

		return;
	}

	const serialNumber = getValueFromHeaders(req.headers, 'x-nintendo-serial-number');

	if (!serialNumber) {
		res.status(400).send(xmlbuilder.create({
			error: {
				code: '0002',
				message: 'serialNumber format is invalid'
			}
		}).end());

		return;
	}

	let device = await Device.findOne({
		serial: serialNumber,
	});

	const certificateHash = crypto.createHash('sha256').update(req.certificate._certificate).digest('base64');

	if (!device && req.certificate.consoleType === '3ds') {
		res.status(400).send(xmlbuilder.create({
			error: {
				code: '0002',
				message: 'serialNumber format is invalid'
			}
		}).end());

		return;
	} else if (device && !device.certificate_hash && req.certificate.consoleType === '3ds') {
		device.certificate_hash = certificateHash;

		await device.save();
	}

	device = await Device.findOne({
		certificate_hash: certificateHash,
	});

	if (!device) {
		device = await Device.create({
			model: 'wup',
			device_id: deviceID,
			serial: serialNumber,
			linked_pids: [],
			certificate_hash: certificateHash
		});
	}

	if (device.serial !== serialNumber) {
		res.status(400).send(xmlbuilder.create({
			error: {
				cause: 'Bad req',
				code: '1600',
				message: 'Unable to process req'
			}
		}).end());

		return;
	}

	const certificateDeviceID = parseInt(req.certificate.certificateName.slice(2).split('-')[0], 16);

	if (deviceID !== certificateDeviceID) {
		res.status(400).send(xmlbuilder.create({
			error: {
				cause: 'Bad req',
				code: '1600',
				message: 'Unable to process req'
			}
		}).end());

		return;
	}

	if (device.access_level < 0) {
		res.status(400).send(xmlbuilder.create({
			errors: {
				error: {
					code: '0012',
					message: 'Device has been banned by game server'
				}
			}
		}).end());

		return;
	}

	req.device = device;

	return next();
}

module.exports = consoleStatusVerificationMiddleware;