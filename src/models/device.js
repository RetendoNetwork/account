const { Schema, model } = require('mongoose');

const DeviceAttributeSchema = new Schema({
    created_date: String,
    name: String,
    value: String
});

exports.DeviceSchema = new Schema({
    model: {
        type: String,
        enum: [
            'wup',
            'ctr',
            'spr',
            'ftr',
            'ktr',
            'red',
            'jan'
        ]
    },
    device_id: Number,
    device_type: Number,
    serial: String,
    device_attributes: [DeviceAttributeSchema],
    soap: {
        token: String,
        account_id: Number,
    },
    environment: String,
    mac_hash: String,
    fcdcert_hash: String,
    linked_pids: [Number],
    access_level: {
        type: Number,
        default: 0
    },
    server_access_level: {
        type: String,
        default: 'prod'
    },
    certificate_hash: String
});

const Device = model('Device', exports.DeviceSchema);