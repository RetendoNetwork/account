const router = require('express').Router();
const xmlbuilder = require('xmlbuilder');
const { RNID } = require('../../../models/rnid');
const config = require('../../../../config.json');

router.get('/', async (request, response) => {

	const { pids } = request.query;

	const results = await RNID.where('pid', pids);
	const miis = [];

	for (const user of results) {
		const  { mii } = user;

		const miiImages = [
			{
				cached_url: `${config.cdn.base_url}/mii/${user.pid}/normal_face.png`,
				id: mii.id,
				url: `${config.cdn.base_url}/mii/${user.pid}/normal_face.png`,
				type: 'standard'
			},
			{
				cached_url: `${config.cdn.base_url}/mii/${user.pid}/frustrated.png`,
				id: mii.id,
				url: `${config.cdn.base_url}/mii/${user.pid}/frustrated.png`,
				type: 'frustrated_face'
			},
			{
				cached_url: `${config.cdn.base_url}/mii/${user.pid}/smile_open_mouth.png`,
				id: mii.id,
				url: `${config.cdn.base_url}/mii/${user.pid}/smile_open_mouth.png`,
				type: 'happy_face'
			},
			{
				cached_url: `${config.cdn.base_url}/mii/${user.pid}/wink_left.png`,
				id: mii.id,
				url: `${config.cdn.base_url}/mii/${user.pid}/wink_left.png`,
				type: 'like_face'
			},
			{
				cached_url: `${config.cdn.base_url}/mii/${user.pid}/normal_face.png`,
				id: mii.id,
				url: `${config.cdn.base_url}/mii/${user.pid}/normal_face.png`,
				type: 'normal_face'
			},
			{
				cached_url: `${config.cdn.base_url}/mii/${user.pid}/sorrow.png`,
				id: mii.id,
				url: `${config.cdn.base_url}/mii/${user.pid}/sorrow.png`,
				type: 'puzzled_face'
			},
			{
				cached_url: `${config.cdn.base_url}/mii/${user.pid}/surprised_open_mouth.png`,
				id: mii.id,
				url: `${config.cdn.base_url}/mii/${user.pid}/surprised_open_mouth.png`,
				type: 'surprised_face'
			},
			{
				cached_url: `${config.cdn.base_url}/mii/${user.pid}/body.png`,
				id: mii.id,
				url: `${config.cdn.base_url}/mii/${user.pid}/body.png`,
				type: 'whole_body'
			}
		];

		miis.push({
			data: mii.data.replace(/(\r\n|\n|\r)/gm, ''),
			id: mii.id,
			images: {
				image: miiImages
			},
			name: mii.name,
			pid: user.pid,
			primary: mii.primary ? 'Y' : 'N',
			user_id: user.username
		});
	}

	response.send(xmlbuilder.create({
		miis: {
			mii: miis
		}
	}).end());
});

module.exports = router;
