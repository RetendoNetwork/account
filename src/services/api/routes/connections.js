const router = require('express').Router();
const database = require('../../../database');

const VALID_CONNECTION_TYPES = [
	'discord'
];

router.post('/add/:type', async (request, response) => {
	const { body, rnid } = request;
	const { type } = request.params;
	const { data } = body;

	if (!rnid) {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Invalid or missing access token'
		});
	}

	if (!data) {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Invalid or missing connection data'
		});
	}

	if (!VALID_CONNECTION_TYPES.includes(type)) {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Invalid or missing connection type'
		});
	}

	const result = await database.addUserConnection(rnid, data, type);

	response.status(result.status).json(result);
});

router.delete('/remove/:type', async (request, response) => {
	const { rnid } = request;
	const { type } = request.params;

	if (!rnid) {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Invalid or missing access token'
		});
	}

	if (!VALID_CONNECTION_TYPES.includes(type)) {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Invalid or missing connection type'
		});
	}

	const result = await database.removeUserConnection(rnid, type);

	response.status(result.status).json(result);
});

module.exports = router;