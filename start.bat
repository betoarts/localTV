@echo off
setlocal EnableDelayedExpansion

echo =======================================
echo  Local TV - Gerenciador de Inicializacao
echo =======================================
echo.
echo OBS: A funcao de microfone do assistente funciona em localhost ou HTTPS.
echo.

:: ── Persistent Data Directory ──────────────────────────────────────
:: If a .env file exists in the backend folder, load DATA_DIR from it.
:: Otherwise, default to a folder called "LocalTV_Data" on the Desktop.
set DATA_DIR=

if exist "backend\.env" (
    for /f "usebackq tokens=1,* delims==" %%A in ("backend\.env") do (
        if /i "%%A"=="DATA_DIR" set DATA_DIR=%%B
    )
)

if "!DATA_DIR!"=="" (
    set DATA_DIR=%USERPROFILE%\Desktop\LocalTV_Data
    echo [AVISO] DATA_DIR nao configurado. Usando: !DATA_DIR!
) else (
    echo [INFO] Dados persistentes em: !DATA_DIR!
)

:: Create the data folder if it doesn't exist yet
if not exist "!DATA_DIR!" (
    mkdir "!DATA_DIR!"
    echo [INFO] Pasta de dados criada: !DATA_DIR!
)

echo.
echo [1/3] Iniciando Backend (Porta 3000)...
start "LocalTV - Backend" cmd /c "cd backend && set DATA_DIR=!DATA_DIR! && node server.js"


echo [2/3] Iniciando Frontend Dev Server (Porta 5173)...
start "LocalTV - Frontend" cmd /c "cd frontend && npm run dev"

echo [3/3] Detectando IP local...
set LOCAL_IP=
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /C:"IPv4 Address" /C:"Endere" /C:"Endereco IPv4"') do (
    set temp_ip=%%A
    set LOCAL_IP=!temp_ip: =!
)

timeout /t 4 /nobreak >nul

echo.
echo =======================================
echo  Sistema iniciado com sucesso!
echo =======================================
if "%LOCAL_IP%"=="" (
    echo Painel Admin : http://localhost:5173/admin
    echo Player (TV)  : http://localhost:5173/player/[ID]
    echo Assistente   : http://localhost:5173/assistant
) else (
    echo Painel Admin  : http://localhost:5173/admin
    echo Producao      : http://%LOCAL_IP%:3000
    echo Player na TV  : http://%LOCAL_IP%:5173/player/[ID_DO_DISPOSITIVO]
    echo Assistente    : http://%LOCAL_IP%:5173/assistant
)
echo Dados salvos em: !DATA_DIR!
echo.
echo Microfone no assistente:
echo - Funciona em localhost no navegador local
echo - Em outro dispositivo pela rede, prefira HTTPS
echo =======================================
echo.

start http://localhost:5173/admin

echo Os servidores estao rodando em janelas auxiliares.
echo Para encerrar, feche as janelas "LocalTV - Backend" e "LocalTV - Frontend".
pause
