// handles "api.nintendo.net" endpoints

const express = require('express');
const subdomain = require('express-subdomain');
const logger = require('../../logger');

const datastore = express.Router();

const upload = require('./routes/upload');

logger.info('[DATASTORE] Applying routes');
datastore.use(upload);

const router = express.Router();

logger.info('[DATASTORE] Creating \'datastore\' subdomain');
router.use(subdomain('datastore', datastore));

module.exports = router;
