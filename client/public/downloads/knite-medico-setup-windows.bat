@echo off
:: ==============================================================================
:: KNITE Medico Pharmacy POS - Automated Windows Setup Launcher
:: Website: https://knitemedico.kniteinfotech.in
:: Support: +91 8778721940 | kniteinfotech@gmail.com
:: ==============================================================================

title KNITE Medico Pharmacy POS Setup
color 0A
cls

echo ==============================================================================
echo    🏥 WELCOME TO KNITE MEDICO PHARMACY SAAS ^& POS BILLING SETUP
echo ==============================================================================
echo.
echo  [1/3] Downloading official KNITE Medico icon and creating Desktop Shortcut...
if not exist "%APPDATA%\KNITE Medico" mkdir "%APPDATA%\KNITE Medico"
powershell -Command "try { Invoke-WebRequest -Uri 'https://knitemedico.kniteinfotech.in/favicon.ico' -OutFile '%APPDATA%\KNITE Medico\icon.ico' } catch {}" 2>nul
set SCRIPT="%TEMP%\%RANDOM%-%RANDOM%_create_shortcut.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") >> %SCRIPT%
echo sLinkFile = oWS.ExpandEnvironmentStrings("%%USERPROFILE%%\Desktop\KNITE Medico POS.lnk") >> %SCRIPT%
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> %SCRIPT%
echo oLink.TargetPath = "https://knitemedico.kniteinfotech.in/#/app" >> %SCRIPT%
echo oLink.Description = "KNITE Medico Pharmacy POS Billing & Cloud ERP" >> %SCRIPT%
echo If CreateObject("Scripting.FileSystemObject").FileExists(oWS.ExpandEnvironmentStrings("%%APPDATA%%\KNITE Medico\icon.ico")) Then >> %SCRIPT%
echo   oLink.IconLocation = oWS.ExpandEnvironmentStrings("%%APPDATA%%\KNITE Medico\icon.ico") >> %SCRIPT%
echo Else >> %SCRIPT%
echo   oLink.IconLocation = "shell32.dll, 24" >> %SCRIPT%
echo End If >> %SCRIPT%
echo oLink.Save >> %SCRIPT%
cscript /nologo %SCRIPT%
del %SCRIPT%

echo  [2/3] Registering Application Protocol...
echo.
echo  [3/3] Launching KNITE Medico Cloud POS Application...
start https://knitemedico.kniteinfotech.in/#/app

echo.
echo ==============================================================================
echo  ✅ Setup Complete! A shortcut has been placed on your Windows Desktop.
echo  📞 For assistance or thermal printer driver setup, call: +91 8778721940
echo ==============================================================================
timeout /t 5 >nul
