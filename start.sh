#!/bin/bash

npm install

node generate-keys.js service myservice
node generate-keys.js nex myservice
node generate-keys.js account myservice

npm run start
