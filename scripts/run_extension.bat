@echo off
echo Starting Screen Observer Extension...
echo.
echo NOTE: This will open a new Chrome window with the extension loaded.
echo You still need to manually open the Side Panel to start the observer.
echo.

:: Try to find Chrome executable
set "CHROME_PATH="
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" set "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "CHROME_PATH=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

if "%CHROME_PATH%"=="" (
    echo Error: Google Chrome not found in standard locations.
    echo Please ensure Chrome is installed.
    pause
    exit /b 1
)

echo Found Chrome at: "%CHROME_PATH%"
echo Loading extension from: "%~dp0"

:: Launch Chrome with the extension loaded
"%CHROME_PATH%" --load-extension="%~dp0." --new-window "https://www.google.com"

echo.
echo Chrome launched. Click the "Side Panel" icon in the toolbar to activate the agent.
pause
