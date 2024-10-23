import express from 'express';
import { z } from 'zod';
import Mii from 'mii-js';
import { config } from '@/config-manager';
import { RNID } from '@/models/rnid';
import { UpdateUserRequest } from '@/types/services/api/update-user-request';

const router = express.Router();

const userSchema = z.object({
	mii: z.object({
		name: z.string().trim(),
		primary: z.enum(['Y', 'N']),
		data: z.string(),
	}).optional(),
	environment: z.enum(['prod', 'test', 'dev']).optional()
});

router.get('/', async (request: express.Request, response: express.Response): Promise<void> => {
	const rnid = request.rnid;

	if (!rnid) {
		response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Invalid or missing access token'
		});

		return;
	}

	response.json({
		access_level: rnid.access_level,
		server_access_level: rnid.server_access_level,
		pid: rnid.pid,
		creation_date: rnid.creation_date,
		updated: rnid.updated,
		username: rnid.username,
		birthdate: rnid.birthdate,
		gender: rnid.gender,
		country: rnid.country,
		email: {
			address: rnid.email.address,
		},
		timezone: {
			name: rnid.timezone.name
		},
		mii: {
			data: rnid.mii.data,
			name: rnid.mii.name,
			image_url: `${config.cdn.base_url}/mii/${rnid.pid}/normal_face.png`
		},
		flags: {
			marketing: rnid.flags.marketing
		},
		connections: {
            
		}
	});
});

router.post('/', async (request: express.Request, response: express.Response): Promise<void> => {
	const rnid = request.rnid;
	const updateUserRequest: UpdateUserRequest = request.body;

	if (!rnid) {
		response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Invalid or missing access token'
		});

		return;
	}

	const result = userSchema.safeParse(updateUserRequest);

	if (!result.success) {
		response.status(400).json({
			app: 'api',
			status: 400,
			error: result.error
		});

		return;
	}

	if (result.data.mii) {
		const miiNameBuffer = Buffer.from(result.data.mii.name, 'utf16le'); // * UTF8 to UTF16

		if (miiNameBuffer.length < 1) {
			response.status(400).json({
				app: 'api',
				status: 400,
				error: 'Mii name too short'
			});

			return;
		}

		if (miiNameBuffer.length > 0x14) {
			response.status(400).json({
				app: 'api',
				status: 400,
				error: 'Mii name too long'
			});

			return;
		}

		try {
			const miiDataBuffer = Buffer.from(result.data.mii.data, 'base64');

			if (miiDataBuffer.length < 0x60) {
				response.status(400).json({
					app: 'api',
					status: 400,
					error: 'Mii data too short'
				});

				return;
			}

			if (miiDataBuffer.length > 0x60) {
				response.status(400).json({
					app: 'api',
					status: 400,
					error: 'Mii data too long'
				});

				return;
			}

			const mii = new Mii(miiDataBuffer);
			mii.validate();
		} catch (_) {
			response.status(400).json({
				app: 'api',
				status: 400,
				error: 'Failed to decode Mii data'
			});

			return;
		}

		await rnid.updateMii({
			name: result.data.mii.name,
			primary: result.data.mii.primary,
			data: result.data.mii.data
		});
	}

	const updateData: Record<string, any> = {};

	if (result.data.environment) {
		const environment = result.data.environment;

		if (environment === 'test' && rnid.access_level < 1) {
			response.status(400).json({
				app: 'api',
				status: 400,
				error: 'Do not have permission to enter this environment'
			});

			return;
		}

		if (environment === 'dev' && rnid.access_level < 3) {
			response.status(400).json({
				app: 'api',
				status: 400,
				error: 'Do not have permission to enter this environment'
			});

			return;
		}

		updateData.server_access_level = environment;
	}

	await RNID.updateOne({ pid: rnid.pid }, { $set: updateData }).exec();

	response.json({
		access_level: rnid.access_level,
		server_access_level: rnid.server_access_level,
		pid: rnid.pid,
		creation_date: rnid.creation_date,
		updated: rnid.updated,
		username: rnid.username,
		birthdate: rnid.birthdate,
		gender: rnid.gender,
		country: rnid.country,
		email: {
			address: rnid.email.address,
		},
		timezone: {
			name: rnid.timezone.name
		},
		mii: {
			data: rnid.mii.data,
			name: rnid.mii.name,
			image_url: `${config.cdn.base_url}/mii/${rnid.pid}/normal_face.png`
		},
		flags: {
			marketing: rnid.flags.marketing
		},
		connections: {
			
		}
	});
});

export default router;