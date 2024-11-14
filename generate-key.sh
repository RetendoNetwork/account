#!/bin/bash

aes_key=$(openssl rand -base64 32)

if [ -f "config.json" ]; then
  if grep -q '"aes_key":' config.json; then
    sed -i 's/"aes_key": *"[^"]*"/"aes_key": "'"$aes_key"'"/' config.json
  else
    sed -i '$ s/}/,\n  "aes_key": "'"$aes_key"'"\n}/' config.json
  fi
else
  echo "{\"aes_key\": \"$aes_key\"}" > config.json
fi

echo "AES-256-CBC Key generated!"