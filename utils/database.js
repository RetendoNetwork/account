const colors = require('colors');
const config = require("../config.json");
const logger = require('./logger');
const pg = require('pg');

const { db } = config;
const { host, username, port, password, database } = db;

const postconfig = {
    user: username,
    password: password,
    host: host,
    database: database,
    port: port
}

const client = new pg.Client(postconfig);

async function connectToDB() {
    try {
        await client.connect();
        logger.database(`Connected to ${database} Database.`);
    } catch (err) {
        throw new Error(`Failed to connect to the database: ${err.message}`);
    }
}

function query(input) {
    return client.query({ text: input });
}

module.exports = { 
    connectToDB, 
    query 
};