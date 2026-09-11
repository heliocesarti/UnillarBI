@echo off
setlocal
set BASE=%~dp0

echo ============================================
echo   Unillar BI - Iniciando
echo ============================================
echo.

netstat -ano | findstr :8000 | findstr LISTENING >nul
if %errorlevel%==0 (
    echo [Backend] Ja esta rodando na porta 8000 - pulei essa parte.
) else (
    echo [Backend] Abrindo em nova janela...
    start "Unillar BI - Backend" cmd /k "cd /d "%BASE%backend" && venv\Scripts\uvicorn.exe app.main:app --port 8000"
    ping -n 4 127.0.0.1 >nul
)

netstat -ano | findstr :5173 | findstr LISTENING >nul
if %errorlevel%==0 (
    echo [Frontend] Ja esta rodando na porta 5173 - pulei essa parte.
) else (
    echo [Frontend] Abrindo em nova janela...
    start "Unillar BI - Frontend" cmd /k "cd /d "%BASE%frontend" && npm run dev"
)

echo.
echo ============================================
echo   Pronto! Abra no navegador: http://localhost:5173
echo.
echo   Para PARAR o projeto: feche as duas janelas
echo   que abriram (Backend e Frontend), ou rode
echo   parar.bat
echo ============================================
echo.
pause
