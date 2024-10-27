const router = require('express').Router();
const joi = require('joi');
const { RNID } = require('../../../models/rnid');
const config = require('../../../../config.json');

const userSchema = joi.object({
	mii: joi.object({
		name: joi.string(),
		primary: joi.string(),
		data: joi.string(),
	})
});

router.get('/', async (request, response) => {
	const { rnid } = request;

	if (!rnid) {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Invalid or missing access token'
		});
	}

	return response.json({
		access_level: rnid.get('access_level'),
		server_access_level: rnid.get('server_access_level'),
		pid: rnid.get('pid'),
		creation_date: rnid.get('creation_date'),
		updated: rnid.get('updated'),
		username: rnid.get('username'),
		birthdate: rnid.get('birthdate'),
		gender: rnid.get('gender'),
		country: rnid.get('country'),
		email: {
			address: rnid.get('email.address'),
		},
		timezone: {
			name: rnid.get('timezone.name')
		},
		mii: {
			data: rnid.get('mii.data'),
			name: rnid.get('mii.name'),
			image_url: `${config.cdn.base_url}/mii/${rnid.get('pid')}/normal_face.png`
		},
		flags: {
			marketing: rnid.get('flags.marketing')
		},
		connections: {
			discord: {
				id: rnid.get('connections.discord.id')
			}
		}
	});
});

router.post('/', async (request, response) => {
	const { body, rnid } = request;

	if (!rnid) {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Invalid or missing access token'
		});
	}

	const valid = userSchema.validate(body);

	if (valid.error) {
		return response.status(400).json({
			app: 'api',
			status: 400,
			error: valid.error
		});
	}

	const { pid } = rnid;

	const updateData = {};

	await RNID.updateOne({ pid }, { $set: updateData }).exec();

	return response.json({
		access_level: rnid.get('access_level'),
		server_access_level: rnid.get('server_access_level'),
		pid: rnid.get('pid'),
		creation_date: rnid.get('creation_date'),
		updated: rnid.get('updated'),
		username: rnid.get('username'),
		birthdate: rnid.get('birthdate'),
		gender: rnid.get('gender'),
		country: rnid.get('country'),
		email: {
			address: rnid.get('email.address'),
		},
		timezone: {
			name: rnid.get('timezone.name')
		},
		mii: {
			data: rnid.get('mii.data'),
			name: rnid.get('mii.name'),
			image_url: `${config.cdn.base_url}/mii/${rnid.get('pid')}/normal_face.png`
		},
		flags: {
			marketing: rnid.get('flags.marketing')
		},
		connections: {
			discord: {
				id: rnid.get('connections.discord.id')
			}
		}
	});
});

module.exports = router;