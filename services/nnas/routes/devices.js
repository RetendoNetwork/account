// handles "account.nintendo.net/v1/api/devices" endpoints

const express = require('express');
const database = require('../../../utils/database');
const xmlbuilder = require('xmlbuilder');
const router = express.Router();

router.get('/@current/status', (req, res) => {
    res.setHeader('Content-Type', 'application/xml');
    res.send(xmlbuilder.create({
	    device: {}
    }).end());
});

module.exports = router;