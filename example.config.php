<?php
return [
    'config' => [
        'port' => 7070,
    ],
    'mongoose' => [
        'uri' => 'mongodb://localhost:27017/retendo_account',
        'options' => [
            'useNewUrlParser' => true,
        ],
    ],
    'email' => [
        'host' => 'smtp.gmail.com',
        'port' => 587,
        'secure' => false,
        'auth' => [
            'user' => 'username',
            'pass' => 'password',
        ],
        'from' => 'cedke <cedke@retendo.net>',
    ],
    's3' => [
        'key' => 'ACCESS_KEY',
        'secret' => 'ACCESS_SECRET',
    ],
    'hcaptcha' => [
        'secret' => '0x0000000000000000000000000000000000000000',
    ],
    'cdn' => [
        'base_url' => 'https://local-cdn.innoverse.club',
        'subdomain' => 'local-cdn',
        'disk_path' => '/home/root/retend-cdn',
    ],
    'website_base' => 'https://retendo.online',
];
