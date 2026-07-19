@echo off
echo ========================================
echo Сборка органайзера для CRM
echo ========================================

cd /d "C:\MyProjects\organizer-app"

echo.
echo 1. Установка зависимостей...
call npm install

echo.
echo 2. Сборка проекта...
call npm run build

if errorlevel 1 (
    echo Ошибка сборки!
    exit /b 1
)

echo.
echo 3. Копирование файлов в CRM...
if not exist "C:\OSPanel\home\progressiya.local\public\local\components\transfer\organizer\assets" mkdir "C:\OSPanel\home\progressiya.local\public\local\components\transfer\organizer\assets"

:: Находим последние файлы JS и CSS в dist/assets
for %%f in ("dist\assets\index-*.js") do set JSFILE=%%f
for %%f in ("dist\assets\index-*.css") do set CSSFILE=%%f

copy /Y "%JSFILE%" "C:\OSPanel\home\progressiya.local\public\local\components\transfer\organizer\assets\index.js" >nul
copy /Y "%CSSFILE%" "C:\OSPanel\home\progressiya.local\public\local\components\transfer\organizer\assets\index.css" >nul

echo.
echo ========================================
echo Готово! Файлы скопированы в:
echo C:\OSPanel\home\progressiya.local\public\local\components\transfer\organizer\assets\
echo ========================================

pause