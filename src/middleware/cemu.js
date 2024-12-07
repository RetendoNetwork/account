const express = require('express');

function CemuMiddleware(req, _res, next) {
	const subdomain = req.subdomains.reverse().join('.');

	req.isCemu = subdomain === 'c.account';

	return next();
}

module.exports = { 
	CemuMiddleware
};