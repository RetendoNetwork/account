import express from 'express';
import xmlbuilder from 'xmlbuilder';
import { getValueFromHeaders } from '@/util';
import { getRNIDByBasicAuth, getRNIDByTokenAuth } from '@/database';
import { HydratedRNIDDocument } from '@/types/mongoose/rnid';

async function RNIDMiddleware(request: express.Request, response: express.Response, next: express.NextFunction): Promise<void> {
	const authHeader = getValueFromHeaders(request.headers, 'authorization');

	if (!authHeader || !(authHeader.startsWith('Bearer') || authHeader.startsWith('Basic'))) {
		return next();
	}

	const parts = authHeader.split(' ');
	const type = parts[0];
	let token = parts[1];
	let rnid: HydratedRNIDDocument | null;

	if (request.isCemu) {
		token = Buffer.from(token, 'hex').toString('base64');
	}

	if (type === 'Basic') {
		rnid = await getRNIDByBasicAuth(token);
	} else {
		rnid = await getRNIDByTokenAuth(token);
	}

	if (!rnid) {
		if (type === 'Bearer') {
			response.status(401).send(xmlbuilder.create({
				errors: {
					error: {
						cause: 'access_token',
						code: '0005',
						message: 'Invalid access token'
					}
				}
			}).end());

			return;
		}

		response.status(401).send(xmlbuilder.create({
			errors: {
				error: {
					code: '1105',
					message: 'Email address, username, or password, is not valid'
				}
			}
		}).end());

		return;
	}

	if (rnid.deleted) {
		response.status(400).send(xmlbuilder.create({
			errors: {
				error: {
					code: '0112',
					message: rnid.username
				}
			}
		}).end());

		return;
	}

	if (rnid.access_level < 0) {
		response.status(400).send(xmlbuilder.create({
			errors: {
				error: {
					code: '0122',
					message: 'Device has been banned by game server'
				}
			}
		}).end());

		return;
	}

	request.rnid = rnid;

	return next();
}

export default RNIDMiddleware;