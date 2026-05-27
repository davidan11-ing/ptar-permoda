@echo off
chcp 65001 >nul
title Actualizar PTAR — Luna

:: Ir a la raiz del proyecto sin importar desde donde se ejecute el script
cd /d "C:\Users\lunaop\OneDrive - PERMODA LTDA\Documentos\Claude\Projects\App PTAR 2"

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║         PTAR PERMODA — Actualización Luna            ║
echo ╚══════════════════════════════════════════════════════╝
echo.

:: ── 1. Git pull ─────────────────────────────────────────────────────────────
echo [1/4] Bajando cambios del repositorio...
git pull
if %ERRORLEVEL% neq 0 (
    echo.
    echo  ERROR: No se pudo hacer git pull.
    echo  Verifica tu conexión o que no tengas cambios locales sin guardar.
    pause
    exit /b 1
)
echo  OK - Código actualizado.
echo.

:: ── 2. npm install ──────────────────────────────────────────────────────────
echo [2/4] Actualizando dependencias del frontend...
cd ptar-app
call npm install --silent
if %ERRORLEVEL% neq 0 (
    echo  ERROR: npm install falló.
    pause
    exit /b 1
)
cd ..
echo  OK - Dependencias listas.
echo.

:: ── 3. Migración de base de datos ───────────────────────────────────────────
echo [3/4] Migración de base de datos...
echo.

:: Buscar mysql.exe en rutas comunes
set MYSQL_EXE=
if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" (
    set MYSQL_EXE="C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
) else if exist "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" (
    set MYSQL_EXE="C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"
) else if exist "C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe" (
    set MYSQL_EXE="C:\Program Files\MySQL\MySQL Server 9.0\bin\mysql.exe"
) else (
    where mysql >nul 2>&1
    if %ERRORLEVEL% equ 0 set MYSQL_EXE=mysql
)

if "%MYSQL_EXE%"=="" (
    echo  AVISO: No se encontró mysql.exe automáticamente.
    echo  Ingresa la ruta completa a mysql.exe ^(o presiona Enter para omitir^):
    set /p MYSQL_EXE=  Ruta:
    if "%MYSQL_EXE%"=="" goto :skip_migration
)

echo  Usando: %MYSQL_EXE%
echo.
set /p DB_USER=  Usuario MySQL (default: root):
if "%DB_USER%"=="" set DB_USER=root

set /p DB_NAME=  Nombre de la base de datos (default: ptar_permoda):
if "%DB_NAME%"=="" set DB_NAME=ptar_permoda

echo  Contraseña MySQL para %DB_USER%:
set /p DB_PASS=  Contraseña:

echo.
echo  Creando tabla operacion_ptap_turno si no existe...

(
echo CREATE TABLE IF NOT EXISTS operacion_ptap_turno ^(
echo   id                         INT             NOT NULL AUTO_INCREMENT,
echo   fecha                      DATE            NOT NULL,
echo   dia_mes                    TINYINT         NOT NULL,
echo   turno                      TINYINT         NOT NULL,
echo   usuario                    VARCHAR^(100^)    DEFAULT NULL,
echo   equipo                     TEXT            DEFAULT NULL,
echo   final_pol_anionico_ptap_l  DECIMAL^(12,2^)   DEFAULT NULL,
echo   final_coagulante_ptap_l    DECIMAL^(12,2^)   DEFAULT NULL,
echo   final_acido_ptap_l         DECIMAL^(12,2^)   DEFAULT NULL,
echo   final_soda_l               DECIMAL^(12,2^)   DEFAULT NULL,
echo   final_peroxido_l           DECIMAL^(12,2^)   DEFAULT NULL,
echo   consumo_pol_anionico_ptap_l DECIMAL^(12,4^)  DEFAULT NULL,
echo   consumo_coagulante_ptap_l   DECIMAL^(12,4^)  DEFAULT NULL,
echo   consumo_acido_ptap_l        DECIMAL^(12,4^)  DEFAULT NULL,
echo   consumo_soda_l              DECIMAL^(12,4^)  DEFAULT NULL,
echo   consumo_peroxido_l          DECIMAL^(12,4^)  DEFAULT NULL,
echo   kg_pol_anionico_ptap       DECIMAL^(12,4^)   DEFAULT NULL,
echo   kg_coagulante_ptap         DECIMAL^(12,4^)   DEFAULT NULL,
echo   kg_acido_ptap              DECIMAL^(12,4^)   DEFAULT NULL,
echo   kg_soda                    DECIMAL^(12,4^)   DEFAULT NULL,
echo   kg_peroxido                DECIMAL^(12,4^)   DEFAULT NULL,
echo   ppm_pol_anionico_ptap      DECIMAL^(12,4^)   DEFAULT NULL,
echo   ppm_coagulante_ptap        DECIMAL^(12,4^)   DEFAULT NULL,
echo   ppm_acido_ptap             DECIMAL^(12,4^)   DEFAULT NULL,
echo   ppm_soda                   DECIMAL^(12,4^)   DEFAULT NULL,
echo   ppm_peroxido               DECIMAL^(12,4^)   DEFAULT NULL,
echo   costo_op_pol_anionico_ptap DECIMAL^(14,2^)   DEFAULT NULL,
echo   costo_op_coagulante_ptap   DECIMAL^(14,2^)   DEFAULT NULL,
echo   costo_op_acido_ptap        DECIMAL^(14,2^)   DEFAULT NULL,
echo   costo_op_soda              DECIMAL^(14,2^)   DEFAULT NULL,
echo   costo_op_peroxido          DECIMAL^(14,2^)   DEFAULT NULL,
echo   observaciones              TEXT            DEFAULT NULL,
echo   created_at                 TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
echo   PRIMARY KEY ^(id^),
echo   UNIQUE KEY uq_ptap_fecha_turno ^(fecha, turno^)
echo ^) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
) > "%TEMP%\ptar_migration.sql"

%MYSQL_EXE% -u %DB_USER% -p%DB_PASS% %DB_NAME% < "%TEMP%\ptar_migration.sql" 2>&1
del "%TEMP%\ptar_migration.sql" >nul 2>&1

if %ERRORLEVEL% equ 0 (
    echo  OK - Tabla creada / ya existia.
) else (
    echo  AVISO: Hubo un problema con la migración. Verifica usuario/contraseña.
    echo  Puedes crear la tabla manualmente desde MySQL Workbench con el SQL del README.
)
goto :done_migration

:skip_migration
echo  Migración omitida. Recuerda crear la tabla operacion_ptap_turno manualmente.

:done_migration
echo.

:: ── 4. Listo ────────────────────────────────────────────────────────────────
echo [4/4] Todo listo!
echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║  Para iniciar la app, abre DOS terminales:           ║
echo ║                                                      ║
echo ║  Terminal 1 — Backend:                               ║
echo ║    cd ptar-backend                                   ║
echo ║    .venv\Scripts\activate                            ║
echo ║    uvicorn app.main:app --reload --port 8001         ║
echo ║                                                      ║
echo ║  Terminal 2 — Frontend:                              ║
echo ║    cd ptar-app                                       ║
echo ║    npm run dev                                       ║
echo ║                                                      ║
echo ║  Abre: http://localhost:5174                         ║
echo ╚══════════════════════════════════════════════════════╝
echo.
pause
