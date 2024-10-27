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
							'#cdata': 'Retendo Network Services Agreement'
						},
						agree_text: {
							'#cdata': 'Accept'
						},
						non_agree_text: {
							'#cdata': 'Decline'
						},
						main_text: {
							'@index': '1',
							'#cdata': 'Welcome to Retendo Network, glad you chose our network !'
						},
						sub_title: {
							'#cdata': 'Privacy Policy'
						},
						sub_text: {
							'@index': '1',
							'#cdata': 'Welcome to Retendo Network, glad you chose our network !'
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
							'#cdata': 'Acuerdo de Servicios de Retendo Network'
						},
						agree_text: {
							'#cdata': 'Aceptar'
						},
						non_agree_text: {
							'#cdata': 'Rechazar'
						},
						main_text: {
							'@index': '1',
							'#cdata': 'Bienvenido a Retendo Network, nos alegramos de que haya elegido nuestra red !'
						},
						sub_title: {
							'#cdata': 'Política de privacidad'
						},
						sub_text: {
							'@index': '1',
							'#cdata': 'Bienvenido a Retendo Network, nos alegramos de que haya elegido nuestra red !'
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
							'#cdata': 'Contrat de services réseau Retendo'
						},
						agree_text: {
							'#cdata': 'Accepter'
						},
						non_agree_text: {
							'#cdata': 'Décliner'
						},
						main_text: {
							'@index': '1',
							'#cdata': 'Bienvenue sur Retendo Network, nous sommes heureux que vous ayez choisi notre réseau !'
						},
						sub_title: {
							'#cdata': 'Politique de Confidentialité'
						},
						sub_text: {
							'@index': '1',
							'#cdata': 'Bienvenue sur Retendo Network, nous sommes heureux que vous ayez choisi notre réseau !'
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

	/*
	// Old method. Crashes WiiU when sending a list with over 32 entries, but otherwise works
	// countryTimezones is "countries-and-timezones" module

	const country = countryTimezones.getCountry(countryCode);
	const timezones = country.timezones.map((timezone, index) => {
		const data = countryTimezones.getTimezone(timezone);

		return {
			area: data.name,
			language,
			name: data.name,
			utc_offset: data.utcOffset * 6 * 10,
			order: index+1
		};
	});
	*/

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