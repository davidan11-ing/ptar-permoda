$env:ASPNETCORE_ENVIRONMENT = "Development"

$exe = "$PSScriptRoot\PtarApi\bin\Release\net10.0\PtarApi.exe"
$wd  = "$PSScriptRoot\PtarApi"

Write-Host "Iniciando backend PTAR en http://localhost:8001 ..." -ForegroundColor Cyan
Write-Host "Presiona Ctrl+C para detener.`n" -ForegroundColor DarkGray

Set-Location $wd
& $exe
