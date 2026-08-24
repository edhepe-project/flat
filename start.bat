@echo off
setlocal enabledelayedexpansion
title TerraPlana 3D Pro

:: Cambiar al directorio donde reside el archivo .bat independientemente de donde se ejecute
cd /d "%~dp0"

set PORT=8080

:: 1. Probar si existe Python en el sistema
where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [TerraPlana 3D] Iniciando servidor con Python...
    start http://localhost:%PORT%
    python -m http.server %PORT%
    goto end
)

:: 2. Probar si existe Node.js en el sistema
where npx >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [TerraPlana 3D] Iniciando servidor con Node / npx serve...
    start http://localhost:%PORT%
    npx -y serve -l %PORT% .
    goto end
)

:: 3. Si no tiene Python ni Node.js: Servidor HTTP Nativo de Windows (PowerShell integrado en todo Windows)
echo [TerraPlana 3D] Iniciando servidor HTTP nativo de Windows (PowerShell)...
start http://localhost:%PORT%

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$listener = New-Object System.Net.HttpListener; ^
     $listener.Prefixes.Add('http://localhost:%PORT%/'); ^
     try { $listener.Start(); } catch { Write-Host 'Error al iniciar listener: ' $_; exit 1; } ^
     Write-Host 'Servidor activo en http://localhost:%PORT%/ - Presiona Ctrl+C para salir'; ^
     while ($listener.IsListening) { ^
         $context = $listener.GetContext(); ^
         $req = $context.Request; ^
         $res = $context.Response; ^
         $urlPath = $req.Url.LocalPath.TrimStart('/'); ^
         if ([string]::IsNullOrEmpty($urlPath)) { $urlPath = 'index.html'; } ^
         $filePath = Join-Path (Get-Location) $urlPath; ^
         if (Test-Path $filePath -PathType Leaf) { ^
             $ext = [System.IO.Path]::GetExtension($filePath).ToLower(); ^
             $mime = switch ($ext) { ^
                 '.html' { 'text/html; charset=utf-8' } ^
                 '.js'   { 'application/javascript; charset=utf-8' } ^
                 '.css'  { 'text/css; charset=utf-8' } ^
                 '.json' { 'application/json; charset=utf-8' } ^
                 '.geojson' { 'application/geo+json; charset=utf-8' } ^
                 '.png'  { 'image/png' } ^
                 '.jpg'  { 'image/jpeg' } ^
                 '.jpeg' { 'image/jpeg' } ^
                 '.svg'  { 'image/svg+xml' } ^
                 default { 'application/octet-stream' } ^
             }; ^
             $res.ContentType = $mime; ^
             $res.AddHeader('Access-Control-Allow-Origin', '*'); ^
             $bytes = [System.IO.File]::ReadAllBytes($filePath); ^
             $res.ContentLength64 = $bytes.Length; ^
             $res.OutputStream.Write($bytes, 0, $bytes.Length); ^
         } else { ^
             $res.StatusCode = 404; ^
             $buf = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found'); ^
             $res.OutputStream.Write($buf, 0, $buf.Length); ^
         } ^
         $res.OutputStream.Close(); ^
     }"

:end
pause
