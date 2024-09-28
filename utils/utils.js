const express = require('express');
const crypto = require('crypto');
const { Client } = require('pg');
const bcrypt = require('bcrypt');

/**
 * @author Pretendo Network Team
 * @param {string} password 
 * @param {number} pid 
 * @returns {string} hashed password
 */

function nintendoPasswordHash(password, pid) {
    const pidBuffer = Buffer.alloc(4);
    pidBuffer.writeUInt32LE(pid);

    const unpacked = Buffer.concat([
        pidBuffer,
        Buffer.from('\x02\x65\x43\x46'),
        Buffer.from(password)
    ]);
    const hashed = crypto.createHash('sha256').update(unpacked).digest().toString('hex');

    return hashed;
}

async function createNewUserOnDatabase(birth_date, user_id, password, country, language, tz_name, gender, region, mii, screen_name, email) {
    const insertAccountQuery = `
        INSERT INTO accounts(
            birth_date, nnid, password, country, language, tz_name, gender, region, 
            screen_name, mii_data, mii_hash2, email
        )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, 
            $9, $10, $11, $12)
        RETURNING id
    `;

    const hashedPassword = await bcrypt.hash(utils.nintendoPasswordHash(password, user_id), config.encryption_keys.saltRounds);

    const values = [
        birth_date,
        user_id,
        hashedPassword,
        country,
        language,
        tz_name,
        gender,
        region,
        screen_name,
        mii.mii_data,
        mii.mii_hash2,
        "Y", // mii.primary
        "COMPLETED", // mii.status
        email.address,
        "N", // email.owned
        "N", // email.parent
        "N", // email.primary
        "N", // email.validated
        "DEFAULT" // email.type
    ];

    const res = await database.query(insertAccountQuery, values);
    return res.rows[0].id;
}

function fullUrl(req) {
	const protocol = request.protocol;
	const host = request.host;
	const opath = request.originalUrl;

	return `${protocol}://${host}${opath}`;
}

module.exports = {
	nintendoPasswordHash,
    createNewUserOnDatabase,
	fullUrl
};