@echo off
title Push RRB Technician CBT to GitHub
echo ========================================================
echo   Pushing Project to GitHub (Raja18110/rrb-technician-cbt)
echo ========================================================
echo.
git push -u origin main
echo.
if %errorlevel% neq 0 (
    echo.
    echo ========================================================
    echo [!] NOTE: If push failed with 404 or repository not found:
    echo 1. Open your browser and go to: https://github.com/new
    echo 2. Type Repository name: rrb-technician-cbt
    echo 3. Click "Create repository" (leave everything else unchecked)
    echo 4. Run this script again!
    echo ========================================================
    echo.
) else (
    echo [SUCCESS] Project successfully uploaded to GitHub!
    echo Repository: https://github.com/Raja18110/rrb-technician-cbt
)
pause
