const { Schema, model } = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const ServerSchema = new Schema({
	client_id: String,
	ip: String,
	port: Number,
	service_name: String,
	service_type: String,
	game_server_id: String,
	title_ids: [String],
	access_mode: String,
	maintenance_mode: Boolean,
	device: Number,
	aes_key: String
});

ServerSchema.plugin(uniqueValidator, { message: '{PATH} already in use.' });

const Server = model('Server', ServerSchema);