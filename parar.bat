@echo off
echo ============================================
echo   Unillar BI - Parando
echo ============================================
echo.

set ACHOU=0
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo [Backend] Encerrando processo %%p...
    taskkill /PID %%p /F >nul 2>&1
    set ACHOU=1
)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
    echo [Frontend] Encerrando processo %%p...
    taskkill /PID %%p /F >nul 2>&1
    set ACHOU=1
)

if %ACHOU%==0 (
    echo Nada estava rodando.
) else (
    echo.
    echo Projeto parado.
)
echo.
pause
