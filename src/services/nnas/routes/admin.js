const router = require('express').Router();
const xmlbuilder = require('xmlbuilder');
const { RNID } = require('../../../models/rnid');

router.get('/mapped_ids', async (request, response) => {
	let { input: inputList, input_type: inputType, output_type: outputType } = request.query;
	inputList = inputList.split(',');
	inputList = inputList.filter(input => input);

	if (inputType === 'user_id') {
		inputType = 'usernameLower';
		inputList = inputList.map(name => name.toLowerCase());
	}

	if (outputType === 'user_id') {
		outputType = 'username';
	}

	const results = [];
	const allowedTypes = ['pid', 'user_id'];

	for (const input of inputList) {
		const result = {
			in_id: input,
			out_id: ''
		};

		if (allowedTypes.includes(request.query.input_type) && allowedTypes.includes(request.query.output_type)) {
			const query = {};
			query[inputType] = input;

			const searchResult = await RNID.findOne(query);

			if (searchResult) {
				result.out_id = searchResult.get(outputType);
			}
		}

		results.push(result);
	}

	response.send(xmlbuilder.create({
		mapped_ids: {
			mapped_id: results
		}
	}).end());
});

router.get('/time', async (request, response) => {
	response.set('X-Nintendo-Date', Date.now().toString());
	response.set('Server', 'Nintendo 3DS (http)');
	response.set('Date', new Date().toUTCString());

	response.send('');
});

module.exports = router;