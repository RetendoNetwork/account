// handle "account.nintendo.net/v1/api/devices" endpoints

const express = require('express');
const xmlbuilder = require('xmlbuilder');
const router = express.Router();

router.get('/@current/status', async (requestt, response) => {
	response.send(xmlbuilder.create({
		device: ''
	}).end());
});

module.exports = router;