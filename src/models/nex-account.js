const { Schema, model } = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const NEXAccountSchema = new Schema({
	device_type: {
		type: String,
		enum: [
			'wiiu',
			'3ds',
		]
	},
	pid: {
		type: Number,
		unique: true
	},
	password: String,
	owning_pid: Number,
	access_level: {
		type: Number,
		default: 0 
	},
	server_access_level: {
		type: String,
		default: 'prod'
	},
	friend_code: String
});

NEXAccountSchema.plugin(uniqueValidator, { message: '{PATH} already in use.' });

/*
	According to http://pf2m.com/tools/rank.php Nintendo PID's start at 1,800,000,000 and count down with each account
	This means the max PID is 1799999999 and hard-limits the number of potential accounts to 1,800,000,000
	The author of that site does not give any information on how they found this out, but it does seem to hold true
	https://account.nintendo.net/v1/api/admin/mapped_ids?input_type=pid&output_type=user_id&input=1800000000 returns nothing
	https://account.nintendo.net/v1/api/admin/mapped_ids?input_type=pid&output_type=user_id&input=1799999999 returns `prodtest1`
	and the next few accounts counting down seem to be admin, service and internal test accounts
*/
NEXAccountSchema.method('generatePID', async function generatePID() {
	const min = 1000000000;
	const max = 1799999999;

	const pid = Math.floor(Math.random() * (max - min + 1) + min);

	const inuse = await NEXAccount.findOne({ pid });

	if (inuse) {
		await this.generatePID();
	} else {
		this.pid = pid;
	}
});

NEXAccountSchema.method('generatePassword', function generatePassword() {
	function character() {
		const offset = Math.floor(Math.random() * 62);
		if (offset < 10) return offset;
		if (offset < 36) return String.fromCharCode(offset + 55);
		return String.fromCharCode(offset + 61);
	}

	const output = [];

	while (output.length < 16) {
		output.push(String(character()));
	}

	this.password = output.join('');
});

const NEXAccount = model('NEXAccount', NEXAccountSchema);