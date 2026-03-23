@echo off
setlocal EnableDelayedExpansion

echo =======================================
echo Starting Local Digital Signage System
echo =======================================

echo [1/3] Building Frontend...
cd frontend
call npx vite build
cd ..

echo [2/3] Starting Backend API (Port 3000)...
start "Backend" cmd /c "cd backend && node server.js"

echo [3/3] Starting Frontend Dev Server (Port 5173)...
start "Frontend" cmd /c "cd frontend && npm run dev"

echo.
echo Searching for exact Local IP Address...

:: Extrair IP IPv4 local (Suporta PT-BR e EN)
set LOCAL_IP=
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /C:"IPv4 Address" /C:"Endereço IPv4" /C:"Endereco IPv4"') do (
    set temp_ip=%%A
    set LOCAL_IP=!temp_ip: =!
)

echo System started successfully!
echo =======================================
if "%LOCAL_IP%"=="" (
    echo Acesse o Painel (Neste PC): http://localhost:5173/admin
    echo Acesse na TV (Outro disp): Descubra seu IP e acesse http://SEU_IP:5173/player/[ID]
) else (
    echo Painel de Controle  : http://localhost:5173/admin
    echo Player na TV        : http://%LOCAL_IP%:5173/player/[ID_DO_DISPOSITIVO]
    echo Producao (porta 3000): http://%LOCAL_IP%:3000
    echo.
    echo Cadastre os dispositivos no painel em '/admin/devices'.
)
echo =======================================
echo Aguardando o servidor iniciar para abrir o navegador...
timeout /t 4 /nobreak >nul
start http://localhost:5173/admin

echo.
echo Os servidores estao rodando em telas auxiliares (cmd).
echo Para encerrar o sistema, feche as janelas auxiliares.
pause
