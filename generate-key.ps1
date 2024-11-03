$configPath = "config.json"

$keyBytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($keyBytes)
$aesKey = ([BitConverter]::ToString($keyBytes) -replace '-', '').ToLower()

if (Test-Path $configPath) {
    $config = Get-Content -Raw -Path $configPath | ConvertFrom-Json
} else {
    $config = @{}
}

$config.aes_key = $aesKey

$config | ConvertTo-Json -Compress | Set-Content -Path $configPath

Write-Output "AES-256-CBC Key generated !"
Write-Output "Key saved in 'aes_key' field of config.json"
