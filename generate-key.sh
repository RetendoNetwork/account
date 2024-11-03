#!/bin/bash

configPath="config.json"

keyBytes=$(openssl rand -hex 32)

if [ -f "$configPath" ]; then
    config=$(cat "$configPath")
else
    config="{}"
fi

config=$(echo "$config" | jq --arg aesKey "$keyBytes" '.aes_key = $aesKey')

echo "$config" > "$configPath"

echo "AES-256-CBC Key generated!"
echo "Key saved in 'aes_key' field of config.json"
