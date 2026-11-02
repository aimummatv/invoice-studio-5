@echo off
setlocal
set "ELECTRON_RUN_AS_NODE="
set "STUDIO4_AUTOMATION=0"
if not exist "%~dp0Invoice Studio 5.exe" (
  echo Keep this launcher beside Invoice Studio 5.exe and its companion files.
  pause
  exit /b 1
)
start "Invoice Studio 5" /D "%~dp0" "%~dp0Invoice Studio 5.exe" --business-workspace >nul 2>nul
endlocal
