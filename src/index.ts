import express from 'express';
const config = require('../config.json');
const { config: { port } } = config;
const app = express();

app.listen(port, () => {
    console.log(`The server was listening on http://localhost:${port}`)
});