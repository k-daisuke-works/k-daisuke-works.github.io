@echo off
chcp 65001 > NUL
cd /d "%~dp0\Gems連携\gems_autosaver"

echo =========================================================
echo  Gems自動化連携ツール 起動準備
echo =========================================================
echo.
echo ※注意※
echo ツールの起動前に、現在開いている【すべてのGoogle Chromeの画面を閉じて】ください。
echo 閉じられていない場合、自動化機能（デバッグポート）がうまく連携されません。
echo.
echo 全てのChromeを閉じたことを確認したら、何かキー（Enterなど）を押してください...
pause > NUL
echo.
echo 1. スライド用画像の準備フォルダを自動で同時に開きます...
explorer "C:\Users\PC_User\Downloads"
explorer "C:\Users\PC_User\Pictures\Screenshots"
explorer "C:\Users\PC_User\Desktop\新しいフォルダー\まとめ\事例スライド生成(プレゼン用)\スライド"

:: ★追加：ポータル画面（まとめのindex.html）も開く
explorer "C:\Users\PC_User\Desktop\新しいフォルダー\まとめ\index.html"

echo.
echo 2. Chromeを専用モードで起動しています...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 "https://gemini.google.com/gem/2d43a894313b"

echo.
echo 3. 裏側で連携サーバーを立ち上げています...
echo    （約3秒後に、ツールの操作画面が自動的に開きます）

:: ブラウザのタブを約3秒後に開く（その間に下の node server.js が立ち上がります）
start "" cmd /c "timeout /t 3 /nobreak > NUL & start http://localhost:3000"

echo.
echo =========================================================
echo ※ この黒いウィンドウを閉じると、ツール（サーバー）が停止します。
echo ※ ツールを使用している間は、この画面を開いたままにしてください。
echo =========================================================
echo.
node server.js
pause
