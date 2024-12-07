// handle "account.nintendo.net/v1/api/devices" endpoints

const express = require('express');
const xmlbuilder = require('xmlbuilder');
const router = express.Router();

router.get('/@current/status', async (req, res) => {
	res.send(xmlbuilder.create({
		device: ''
	}).end());
});

module.exports = router;