@echo off
setlocal enabledelayedexpansion
cd /d %~dp0
chcp 65001 > nul

echo window.IMAGE_LIST = [ > image-list.js
set "first=1"

for /f "delims=" %%i in ('dir /b /a-d "スライド\*.*"') do (
    if "!first!"=="1" (
        echo     "スライド/%%i" >> image-list.js
        set "first=0"
    ) else (
        echo     ,"スライド/%%i" >> image-list.js
    )
)

echo ]; >> image-list.js

start "" "index.html"
