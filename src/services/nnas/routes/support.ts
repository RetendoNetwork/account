import dns from 'node:dns';
import express from 'express';
import xmlbuilder from 'xmlbuilder';
import moment from 'moment';
import { getRNIDByPID } from '@/database';
import { sendEmailConfirmedEmail, sendConfirmationEmail, sendForgotPasswordEmail } from '@/util';

const router = express.Router();

router.post('/validate/email', async (request: express.Request, response: express.Response): Promise<void> => {
	const email = request.body.email;

	if (!email) {
		response.send(xmlbuilder.create({
			errors: {
				error: {
					cause: 'email',
					code: '0103',
					message: 'Email format is invalid'
				}
			}
		}).end());

		return;
	}

	const domain = email.split('@')[1];

	dns.resolveMx(domain, (error: NodeJS.ErrnoException | null) => {
		if (error) {
			return response.send(xmlbuilder.create({
				errors: {
					error: {
						code: '1126',
						message: 'The domain "' + domain + '" is not accessible.'
					}
				}
			}).end());
		}

		response.send();
	});
});

router.put('/email_confirmation/:pid/:code', async (request: express.Request, response: express.Response): Promise<void> => {
	const code = request.params.code;
	const pid = Number(request.params.pid);

	const rnid = await getRNIDByPID(pid);

	if (!rnid) {
		response.status(400).send(xmlbuilder.create({
			errors: {
				error: {
					code: '0130',
					message: 'PID has not been registered yet'
				}
			}
		}).end());

		return;
	}

	if (rnid.identification.email_code !== code) {
		response.status(400).send(xmlbuilder.create({
			errors: {
				error: {
					code: '0116',
					message: 'Missing or invalid verification code'
				}
			}
		}).end());
		return;
	}

	const validatedDate = moment().format('YYYY-MM-DDTHH:MM:SS');

	rnid.email.reachable = true;
	rnid.email.validated = true;
	rnid.email.validated_date = validatedDate;

	await rnid.save();

	await sendEmailConfirmedEmail(rnid);

	response.status(200).send('');
});

router.get('/resend_confirmation', async (request: express.Request, response: express.Response): Promise<void> => {
	const pid = Number(request.headers['x-nintendo-pid']);

	const rnid = await getRNIDByPID(pid);

	if (!rnid) {
		// TODO - Unsure if this is the right error
		response.status(400).send(xmlbuilder.create({
			errors: {
				error: {
					code: '0130',
					message: 'PID has not been registered yet'
				}
			}
		}).end());

		return;
	}

	await sendConfirmationEmail(rnid);

	response.status(200).send('');
});

router.get('/forgotten_password/:pid', async (request: express.Request, response: express.Response): Promise<void> => {
	const pid = Number(request.params.pid);

	const rnid = await getRNIDByPID(pid);

	if (!rnid) {
		// TODO - Better errors
		response.status(400).send(xmlbuilder.create({
			errors: {
				error: {
					cause: 'device_id',
					code: '0113',
					message: 'Unauthorized device'
				}
			}
		}).end());

		return;
	}

	await sendForgotPasswordEmail(rnid);

	response.status(200).send('');
});

export default router;