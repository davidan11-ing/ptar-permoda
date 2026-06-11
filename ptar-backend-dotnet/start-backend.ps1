$env:ASPNETCORE_ENVIRONMENT = "Development"
Start-Process "$PSScriptRoot\PtarApi\bin\Release\net10.0\PtarApi.exe" -WorkingDirectory "$PSScriptRoot\PtarApi"
Write-Host "Backend iniciado en http://localhost:8001"
