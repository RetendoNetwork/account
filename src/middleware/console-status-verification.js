const crypto = require('node:crypto');
const express = require('express');
const xmlbuilder = require('xmlbuilder');
const { Device } = require('../models/device');
const { getValueFromHeaders } = require('../utils');

async function consoleStatusVerificationMiddleware(request, response, next) {
	if (!request.certificate || !request.certificate.valid) {
		response.status(400).send(xmlbuilder.create({
			error: {
				code: '0110',
				message: 'Unlinked device'
			}
		}).end());

		return;
	}

	const deviceIDHeader = getValueFromHeaders(request.headers, 'x-nintendo-device-id');

	if (!deviceIDHeader) {
		response.status(400).send(xmlbuilder.create({
			error: {
				code: '0002',
				message: 'deviceId format is invalid'
			}
		}).end());

		return;
	}

	const deviceID = Number(deviceIDHeader);

	if (isNaN(deviceID)) {
		response.status(400).send(xmlbuilder.create({
			error: {
				code: '0002',
				message: 'deviceId format is invalid'
			}
		}).end());

		return;
	}

	const serialNumber = getValueFromHeaders(request.headers, 'x-nintendo-serial-number');

	if (!serialNumber) {
		response.status(400).send(xmlbuilder.create({
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

	const certificateHash = crypto.createHash('sha256').update(request.certificate._certificate).digest('base64');

	if (!device && request.certificate.consoleType === '3ds') {
		response.status(400).send(xmlbuilder.create({
			error: {
				code: '0002',
				message: 'serialNumber format is invalid'
			}
		}).end());

		return;
	} else if (device && !device.certificate_hash && request.certificate.consoleType === '3ds') {
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
		response.status(400).send(xmlbuilder.create({
			error: {
				cause: 'Bad Request',
				code: '1600',
				message: 'Unable to process request'
			}
		}).end());

		return;
	}

	const certificateDeviceID = parseInt(request.certificate.certificateName.slice(2).split('-')[0], 16);

	if (deviceID !== certificateDeviceID) {
		response.status(400).send(xmlbuilder.create({
			error: {
				cause: 'Bad Request',
				code: '1600',
				message: 'Unable to process request'
			}
		}).end());

		return;
	}

	if (device.access_level < 0) {
		response.status(400).send(xmlbuilder.create({
			errors: {
				error: {
					code: '0012',
					message: 'Device has been banned by game server'
				}
			}
		}).end());

		return;
	}

	request.device = device;

	return next();
}

module.exports = consoleStatusVerificationMiddleware;