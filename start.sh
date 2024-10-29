#!/bin/bash

npm install

node generate-keys.js service myservice
node generate-keys.js nex myservice
node generate-keys.js account myservice

php -r 'echo json_encode(require("config.php"), JSON_PRETTY_PRINT);' > config.json

npm run start
