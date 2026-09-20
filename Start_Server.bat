@echo off
title RRB CBT Test Local Server
echo ========================================================
echo   Starting Local HTTP Server on port 8080...
echo   Open: http://localhost:8080
echo ========================================================
cd /d "%~dp0"
start http://localhost:8080
python -m http.server 8080
