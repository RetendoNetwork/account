import express from 'express';
import xmlbuilder from 'xmlbuilder';

const router = express.Router();

router.get('/@current/status', async (request: express.Request, response: express.Response): Promise<void> => {
	response.send(xmlbuilder.create({
		device: ''
	}).end());
});

export default router;