const router = require('express').Router();
const xmlbuilder = require('xmlbuilder');

router.get('/@current/status', async (request, response) => {
	response.send(xmlbuilder.create({
		device: ''
	}).end());
});

module.exports = router;