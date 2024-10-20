const router = require('express').Router();
const xmlbuilder = require('xmlbuilder');
const timezones = require('../timezones.json');

router.get('/agreements/:type/:region/:version', (request, response) => {
	response.set('Content-Type', 'text/xml');
	response.set('Server', 'Nintendo 3DS (http)');
	response.set('X-Nintendo-Date', new Date().getTime());

	response.send(xmlbuilder.create({
		agreements: {
			agreement: [
				{
					country: 'US',
					language: 'en',
					language_name: 'English',
					publish_date: '2014-09-29T20:07:35',
					texts: {
						'@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
						'@xsi:type': 'chunkedStoredAgreementText',

						main_title: {
							'#cdata': 'Pretendo Network Services Agreement'
						},
						agree_text: {
							'#cdata': 'I Accept'
						},
						non_agree_text: {
							'#cdata': 'I Decline'
						},
						main_text: {
							'@index': '1',
							'#cdata': 'Welcome to Pretendo\'s Christmas public beta! This is supplied with no liability or warranty, and is a stress test of our current services.This test is not expected to last long- term, and the data may be kept for later testing; this data will not be shared outside of Pretendo, and will be deleted at the end of our testing period.'
						},
						sub_title: {
							'#cdata': 'Privacy Policy'
						},
						sub_text: {
							'@index': '1',
							'#cdata': 'Welcome to Pretendo\'s Christmas public beta! This is supplied with no liability or warranty, and is a stress test of our current services.This test is not expected to last long- term, and the data may be kept for later testing; this data will not be shared outside of Pretendo, and will be deleted at the end of our testing period.'
						},
					},
					type: 'NINTENDO-NETWORK-EULA',
					version: '0300',
				},
				{
					country: 'US',
					language: 'en',
					language_name: 'Español',
					publish_date: '2014-09-29T20:07:35',
					texts: {
						'@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
						'@xsi:type': 'chunkedStoredAgreementText',

						main_title: {
							'#cdata': 'Pretendo Network Services Agreement'
						},
						agree_text: {
							'#cdata': 'I Accept'
						},
						non_agree_text: {
							'#cdata': 'I Decline'
						},
						main_text: {
							'@index': '1',
							'#cdata': 'Welcome to Pretendo\'s Christmas public beta! This is supplied with no liability or warranty, and is a stress test of our current services.This test is not expected to last long- term, and the data may be kept for later testing; this data will not be shared outside of Pretendo, and will be deleted at the end of our testing period.'
						},
						sub_title: {
							'#cdata': 'Privacy Policy'
						},
						sub_text: {
							'@index': '1',
							'#cdata': 'Welcome to Pretendo\'s Christmas public beta! This is supplied with no liability or warranty, and is a stress test of our current services.This test is not expected to last long- term, and the data may be kept for later testing; this data will not be shared outside of Pretendo, and will be deleted at the end of our testing period.'
						},
					},
					type: 'NINTENDO-NETWORK-EULA',
					version: '0300',
				},
				{
					country: 'US',
					language: 'en',
					language_name: 'Français',
					publish_date: '2014-09-29T20:07:35',
					texts: {
						'@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
						'@xsi:type': 'chunkedStoredAgreementText',

						main_title: {
							'#cdata': 'Pretendo Network Services Agreement'
						},
						agree_text: {
							'#cdata': 'I Accept'
						},
						non_agree_text: {
							'#cdata': 'I Decline'
						},
						main_text: {
							'@index': '1',
							'#cdata': 'Welcome to Pretendo\'s Christmas public beta! This is supplied with no liability or warranty, and is a stress test of our current services.This test is not expected to last long- term, and the data may be kept for later testing; this data will not be shared outside of Pretendo, and will be deleted at the end of our testing period.'
						},
						sub_title: {
							'#cdata': 'Privacy Policy'
						},
						sub_text: {
							'@index': '1',
							'#cdata': 'Welcome to Pretendo\'s Christmas public beta! This is supplied with no liability or warranty, and is a stress test of our current services.This test is not expected to last long- term, and the data may be kept for later testing; this data will not be shared outside of Pretendo, and will be deleted at the end of our testing period.'
						},
					},
					type: 'NINTENDO-NETWORK-EULA',
					version: '0300',
				}
			]
		}
	}).end());
});

router.get('/time_zones/:countryCode/:language', (request, response) => {
	response.set('Content-Type', 'text/xml');
	response.set('Server', 'Nintendo 3DS (http)');
	response.set('X-Nintendo-Date', new Date().getTime());

	const { countryCode, language } = request.params;

	const regionLanguages = timezones[countryCode];
	const regionTimezones = regionLanguages[language] ? regionLanguages[language] : Object.values(regionLanguages)[0];

	response.send(xmlbuilder.create({
		timezones: {
			timezone: regionTimezones
		}
	}).end());
});

module.exports = router;
