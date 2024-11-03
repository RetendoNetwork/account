const crypto = require('node:crypto');
const express = require('express');
const ratelimit = require('express-rate-limit');
const { getValueFromHeaders } = require('../utils');

module.exports = ratelimit({
	windowMs: 60 * 1000,
	max: 1,
	keyGenerator: (request) => {
		let data = getValueFromHeaders(request.headers, 'x-nintendo-device-cert');

		if (!data) {
			data = request.ip;
		}

		return crypto.createHash('md5').update(data).digest('hex');
	}
});