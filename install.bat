@echo off
echo =======================================
echo Local Digital Signage System - Installer
echo =======================================

echo [1/3] Installing Backend Dependencies...
cd backend
call npm install
cd ..

echo [2/3] Installing Frontend Dependencies...
cd frontend
call npm install
cd ..

echo [3/3] Building Frontend for Production...
cd frontend
call npx vite build
cd ..

echo.
echo =======================================
echo Installation complete!
echo You can now run start.bat to start the system.
echo =======================================
pause
