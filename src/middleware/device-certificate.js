const express = require('express');
const NintendoCertificate = require('../nintendo-certificate');
const { getValueFromHeaders } = require('../utils');

function deviceCertificateMiddleware(request, _response, next) {
	const certificate = getValueFromHeaders(request.headers, 'x-nintendo-device-cert');

	if (!certificate) {
		return next();
	}

	request.certificate = new NintendoCertificate(certificate);

	return next();
}

module.exports = deviceCertificateMiddleware;