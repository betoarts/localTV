@echo off
setlocal EnableDelayedExpansion

echo =======================================
echo  Local TV - Instalador
echo =======================================
echo.

echo [1/4] Instalando dependencias do Backend...
cd backend
call npm install
cd ..

echo [2/4] Instalando dependencias do Frontend...
cd frontend
call npm install
cd ..

echo [3/4] Gerando build de producao do Frontend...
cd frontend
call npx vite build
cd ..

echo [4/4] Configurando ambiente...
:: Create backend/.env from .env.example if it doesn't exist yet
if not exist "backend\.env" (
    if exist "backend\.env.example" (
        copy "backend\.env.example" "backend\.env" >nul
        echo     Arquivo backend\.env criado a partir do .env.example
        echo     IMPORTANTE: Edite backend\.env e defina DATA_DIR antes de iniciar!
    )
) else (
    echo     backend\.env ja existe, pulando criacao.
)

echo.
echo =======================================
echo  Instalacao concluida!
echo =======================================
echo.
echo Proximo passo: Edite o arquivo "backend\.env" e defina DATA_DIR
echo para uma pasta persistente (ex: C:\LocalTV_Data) antes de iniciar.
echo.
echo Depois execute start.bat para iniciar o sistema.
echo =======================================
pause
