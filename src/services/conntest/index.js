// handles "conntest.nintendowifi.net" endpoints

const express = require('express');
const subdomain = require('express-subdomain');
const logger = require('../../logger');

const conntest = express.Router();

logger.info('[CONNTEST] Applying routes');
conntest.get('/', async (request, response) => {
	response.set('Content-Type', 'text/html');
	response.set('X-Organization', 'Nintendo');

	response.send(`
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html>
<head>
<title>HTML Page</title>
</head>
<body bgcolor="#FFFFFF">
This is test.html page
</body>
</html>
`)
});

const router = express.Router();

logger.info('[CONNTEST] Creating \'conntest\' subdomain');
router.use(subdomain('conntest', conntest));

module.exports = router;
