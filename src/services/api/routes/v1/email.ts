import express from 'express';
import moment from 'moment';
import { RNID } from '@/models/rnid';
import { getValueFromQueryString, sendEmailConfirmedEmail } from '@/util';

const router = express.Router();

router.get('/verify', async (request: express.Request, response: express.Response): Promise<void> => {
	const token = getValueFromQueryString(request.query, 'token');

	if (!token || token.trim() == '') {
		response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Missing email token'
		});

		return;
	}

	const rnid = await RNID.findOne({
		'identification.email_token': token
	});

	if (!rnid) {
		response.status(400).json({
			app: 'api',
			status: 400,
			error: 'Invalid email token'
		});

		return;
	}

	const validatedDate = moment().format('YYYY-MM-DDTHH:MM:SS');

	rnid.email.reachable = true;
	rnid.email.validated = true;
	rnid.email.validated_date = validatedDate;

	await rnid.save();

	await sendEmailConfirmedEmail(rnid);

	response.status(200).send('Email validated. You may close this window');
});

export default router;