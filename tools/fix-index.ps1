param(
  [string]$FilePath = "c:\Users\OS\Desktop\sadam\trust-wind\index.html"
)

# Read all lines to avoid issues with non-ASCII text in inline commands
if (-not (Test-Path -Path $FilePath)) {
  Write-Error "File not found: $FilePath"
  exit 1
}

# Use ReadAllLines/WriteAllLines for stable encoding handling
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$lines = [System.IO.File]::ReadAllLines($FilePath)

if ($lines.Length -eq 0) {
  Write-Error "File is empty: $FilePath"
  exit 1
}

# 1) Fix malformed DOCTYPE on first line
$lines[0] = '<!DOCTYPE html>'

# 2) Update registration modal username field id (only within a safe range to avoid login form)
for ($i = 120; $i -lt [Math]::Min($lines.Length, 200); $i++) {
  if ($lines[$i] -match 'id="username"') {
    $lines[$i] = $lines[$i] -replace 'id="username"', 'id="registerUsername"'
    break
  }
}

# 3) Update registration modal password field: type=number -> password, id change, remove min/max
for ($i = 120; $i -lt [Math]::Min($lines.Length, 200); $i++) {
  if ($lines[$i] -match 'id="userpassword"') {
    $line = $lines[$i]
    $line = $line -replace 'type="number"', 'type="password"'
    $line = $line -replace 'id="userpassword"', 'id="registerPassword"'
    $line = $line -replace '\s+min="[^"]*"', ''
    $line = $line -replace '\s+max="[^"]*"', ''
    $lines[$i] = $line
    break
  }
}

[System.IO.File]::WriteAllLines($FilePath, $lines, $utf8NoBom)
Write-Output "index.html updated successfully."
