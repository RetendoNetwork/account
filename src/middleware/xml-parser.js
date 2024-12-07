const express = require('express');
const xmlbuilder = require('xmlbuilder');
const xmlParser = require('xmlbuilder2');
const { getValueFromHeaders, mapToObject } = require('../utils');

function XMLMiddleware(req, res, next) {
	if (req.method == 'POST' || req.method == 'PUT') {
		const contentType = getValueFromHeaders(req.headers, 'content-type');
		const contentLength = getValueFromHeaders(req.headers, 'content-length');
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

		req.setEncoding('utf-8');
		req.on('data', (chunk) => {
			body += chunk;
		});

		req.on('end', () => {
			try {
				req.body = xmlParser.document(body);
				req.body = req.body.toObject();
				req.body = mapToObject(req.body);
			} catch (error) {
				return res.status(401).send(xmlbuilder.create({
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