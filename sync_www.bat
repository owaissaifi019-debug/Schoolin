@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File .\sync_www.ps1
pause
