import express from 'express';
import xmlbuilder from 'xmlbuilder';
import { getValueFromQueryString } from '@/util';
import { RNID } from '@/models/rnid';
import { config } from '@/config-manager';
import { YesNoBoolString } from '@/types/common/yes-no-bool-string';

const router = express.Router();

router.get('/', async (request: express.Request, response: express.Response): Promise<void> => {
	const input = getValueFromQueryString(request.query, 'pids');

	if (!input) {
		response.status(400).send(xmlbuilder.create({
			errors: {
				error: {
					cause: 'Bad Request',
					code: '1600',
					message: 'Unable to process request'
				}
			}
		}).end());

		return;
	}

	const pids = input.split(',').map(pid => Number(pid)).filter(pid => !isNaN(pid));

	const miis: {
		data: string;
		id: number;
		images: {
			image: {
				cached_url: string;
				id: number;
				url: string;
				type: string;
			}[]
		};
		name: string;
		pid: number;
		primary: YesNoBoolString;
		user_id: string;
	}[] = [];

	for (const pid of pids) {
		// TODO - Replace this with a single query again somehow? Maybe aggregation?
		const rnid = await RNID.findOne({ pid });

		if (rnid) {
			miis.push({
				data: rnid.mii.data.replace(/(\r\n|\n|\r)/gm, ''),
				id: rnid.mii.id,
				images: {
					image: [
						{
							cached_url: `${config.cdn.base_url}/mii/${rnid.pid}/normal_face.png`,
							id: rnid.mii.id,
							url: `${config.cdn.base_url}/mii/${rnid.pid}/normal_face.png`,
							type: 'standard'
						},
						{
							cached_url: `${config.cdn.base_url}/mii/${rnid.pid}/frustrated.png`,
							id: rnid.mii.id,
							url: `${config.cdn.base_url}/mii/${rnid.pid}/frustrated.png`,
							type: 'frustrated_face'
						},
						{
							cached_url: `${config.cdn.base_url}/mii/${rnid.pid}/smile_open_mouth.png`,
							id: rnid.mii.id,
							url: `${config.cdn.base_url}/mii/${rnid.pid}/smile_open_mouth.png`,
							type: 'happy_face'
						},
						{
							cached_url: `${config.cdn.base_url}/mii/${rnid.pid}/wink_left.png`,
							id: rnid.mii.id,
							url: `${config.cdn.base_url}/mii/${rnid.pid}/wink_left.png`,
							type: 'like_face'
						},
						{
							cached_url: `${config.cdn.base_url}/mii/${rnid.pid}/normal_face.png`,
							id: rnid.mii.id,
							url: `${config.cdn.base_url}/mii/${rnid.pid}/normal_face.png`,
							type: 'normal_face'
						},
						{
							cached_url: `${config.cdn.base_url}/mii/${rnid.pid}/sorrow.png`,
							id: rnid.mii.id,
							url: `${config.cdn.base_url}/mii/${rnid.pid}/sorrow.png`,
							type: 'puzzled_face'
						},
						{
							cached_url: `${config.cdn.base_url}/mii/${rnid.pid}/surprised_open_mouth.png`,
							id: rnid.mii.id,
							url: `${config.cdn.base_url}/mii/${rnid.pid}/surprised_open_mouth.png`,
							type: 'surprised_face'
						},
						{
							cached_url: `${config.cdn.base_url}/mii/${rnid.pid}/body.png`,
							id: rnid.mii.id,
							url: `${config.cdn.base_url}/mii/${rnid.pid}/body.png`,
							type: 'whole_body'
						}
					]
				},
				name: rnid.mii.name,
				pid: rnid.pid,
				primary: rnid.mii.primary ? 'Y' : 'N',
				user_id: rnid.username
			});
		}
	}

	if (miis.length === 0) {
		response.status(404).end();
	} else {
		response.send(xmlbuilder.create({
			miis: {
				mii: miis
			}
		}).end());
	}
});

export default router;