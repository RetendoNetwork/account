const express = require('express');
const xmlbuilder = require('xmlbuilder');
const xmlParser = require('xmlbuilder2');
const { getValueFromHeaders, mapToObject } = require('../utils');

function XMLMiddleware(request, response, next) {
	if (request.method == 'POST' || request.method == 'PUT') {
		const contentType = getValueFromHeaders(request.headers, 'content-type');
		const contentLength = getValueFromHeaders(request.headers, 'content-length');
		let body = '';

		if (
			!contentType ||
			!contentType.toLowerCase().includes('xml')
		) {
			return next();
		}

		if (
			!contentLength ||
			parseInt(contentLength) === 0
		) {
			return next();
		}

		request.setEncoding('utf-8');
		request.on('data', (chunk) => {
			body += chunk;
		});

		request.on('end', () => {
			try {
				request.body = xmlParser.document(body);
				request.body = request.body.toObject();
				request.body = mapToObject(request.body);
			} catch (error) {
				return response.status(401).send(xmlbuilder.create({
					errors: {
						error: {
							code: '0004',
							message: 'XML parse error'
						}
					}
				}).end());
			}

			next();
		});
	} else {
		next();
	}
}

module.exports = XMLMiddleware;