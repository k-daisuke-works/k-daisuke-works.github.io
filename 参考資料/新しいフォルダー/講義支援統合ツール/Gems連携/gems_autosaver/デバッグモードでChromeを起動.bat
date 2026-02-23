@echo off
chcp 65001 > nul
echo =========================================================
echo  普段お使いのGoogle ChromeをGems自動化モードで起動します
echo =========================================================
echo.
echo ※注意※
echo 起動する前に、現在開いている【すべてのGoogle Chromeの画面を閉じて】ください。
echo 閉じられていない場合、デバッグポート(9222)が開かず、設定が反映されません。
echo.
pause

start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222

echo.
echo ブラウザが起動しました。
echo この状態でブラウザ上でGoogleアカウントにログインし、Gemsが開けるか確認してください。
echo 確認後、Gems Auto-Saver PRO の「実行を開始」ボタンを押してください。
echo.
pause
