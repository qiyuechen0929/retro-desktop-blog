@echo off
REM ---- ChenQiyue blog: start both dev servers ----
cd /d "%~dp0"
start "blog-comments (8765)" /min cmd /c "node --experimental-sqlite server\comments-server.js"
timeout /t 2 /nobreak >nul
start "blog-hexo (4000)" /min cmd /c "node node_modules\hexo\bin\hexo server -p 4000"
echo.
echo   backend : http://127.0.0.1:8765
echo   site    : http://localhost:4000    admin: http://localhost:4000/admin/
echo.
echo   close the two minimized windows to stop the servers.
pause
