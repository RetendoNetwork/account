const express = require('express');
const NintendoCertificate = require('../nintendo-certificate');
const { getValueFromHeaders } = require('../utils');

function deviceCertificateMiddleware(req, _res, next) {
	const certificate = getValueFromHeaders(req.headers, 'x-nintendo-device-cert');

	if (!certificate) {
		return next();
	}

	req.certificate = new NintendoCertificate(certificate);

	return next();
}

module.exports = deviceCertificateMiddleware;