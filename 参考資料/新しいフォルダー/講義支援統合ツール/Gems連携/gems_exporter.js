/**
 * Gems Auto-Saver: Slide & Image Edition
 * Google Gemini (Gems) 専用の成果物保存スクリプト
 */

(function() {
    'use strict';

    // --- 設定・定数 ---
    const SELECTORS = {
        input: 'div.ql-editor',
        send: 'button.send-button',
        lastResponse: 'div.model-response:last-child message-content',
        codeBlocks: 'pre code',
        images: 'img[src^="https://"]',
        isGenerating: 'button[aria-label="応答の生成を停止"], button[aria-label="Stop generating"]'
    };

    // --- UI の作成 ---
    const container = document.createElement('div');
    container.id = 'gems-saver-panel';
    container.innerHTML = `
        <div class="header">
            <span>💎 Gems Auto-Saver</span>
            <button id="close-panel">×</button>
        </div>
        <div class="body">
            <textarea id="gems-prompt" placeholder="Gemsへの指示を入力..."></textarea>
            <div class="actions">
                <button id="exec-btn" class="primary">Execute & Save</button>
                <button id="save-btn">Manual Save (Last)</button>
            </div>
            <div id="status-log">Ready</div>
        </div>
        <style>
            #gems-saver-panel {
                position: fixed; top: 20px; right: 20px; width: 320px;
                background: rgba(15, 15, 25, 0.85); backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5); color: white;
                font-family: 'Inter', sans-serif; z-index: 9999; overflow: hidden;
                transition: transform 0.3s ease;
            }
            #gems-saver-panel .header {
                padding: 12px 16px; background: rgba(255,255,255,0.05);
                display: flex; justify-content: space-between; align-items: center;
                border-bottom: 1px solid rgba(255,255,255,0.1); font-weight: bold;
            }
            #gems-saver-panel .header span {
                background: linear-gradient(90deg, #00f2fe, #4facfe);
                -webkit-background-clip: text; -webkit-text-fill-color: transparent;
            }
            #gems-saver-panel .body { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
            #gems-prompt {
                width: 100%; height: 100px; background: rgba(0,0,0,0.3);
                border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
                color: #e0e0e0; padding: 8px; font-size: 13px; resize: none; overflow-y: auto;
            }
            #gems-saver-panel .actions { display: flex; gap: 8px; }
            #gems-saver-panel button {
                flex: 1; padding: 10px; border-radius: 8px; border: none;
                cursor: pointer; font-size: 12px; font-weight: 600; transition: 0.2s;
            }
            #gems-saver-panel button.primary {
                background: linear-gradient(45deg, #00d2ff, #3a7bd5); color: white;
            }
            #gems-saver-panel button#save-btn {
                background: rgba(255,255,255,0.1); color: white;
            }
            #gems-saver-panel button:hover { opacity: 0.9; transform: translateY(-1px); }
            #status-log {
                font-size: 11px; color: #aaa; text-align: center; margin-top: 4px;
            }
            #close-panel { background: transparent !important; color: #ff5f56 !important; font-size: 18px !important; padding: 0 !important; width: auto !important; flex: none !important; }
        </style>
    `;
    document.body.appendChild(container);

    // --- ロジックの実装 ---
    const log = (msg) => { document.getElementById('status-log').innerText = msg; };

    const downloadFile = (filename, content, type) => {
        const blob = new Blob([content], { type: type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const extractAndSave = () => {
        const responseElem = document.querySelector(SELECTORS.lastResponse);
        if (!responseElem) {
            log('Error: Response not found.');
            return;
        }

        log('Extracting artifacts...');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

        // 1. スライド (HTML/CSSコードブロック)
        const codes = Array.from(responseElem.querySelectorAll(SELECTORS.codeBlocks));
        let htmlContent = '';
        codes.forEach(code => {
            const text = code.innerText;
            if (text.includes('<html') || text.includes('<div') || text.includes('style>')) {
                htmlContent += text + '\n\n';
            }
        });

        if (htmlContent) {
            const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${htmlContent}</body></html>`;
            downloadFile(`Gems_Slide_${timestamp}.html`, fullHtml, 'text/html');
            log('Slide saved!');
        }

        // 2. 画像
        const imgs = Array.from(responseElem.querySelectorAll(SELECTORS.images));
        imgs.forEach((img, index) => {
            fetch(img.src).then(res => res.blob()).then(blob => {
                downloadFile(`Gems_Image_${timestamp}_${index}.png`, blob, 'image/png');
            });
        });

        if (imgs.length > 0) log(`Saved ${imgs.length} images!`);

        // 3. 全文テキスト
        downloadFile(`Gems_Response_${timestamp}.txt`, responseElem.innerText, 'text/plain');
        log('All artifacts saved.');
    };

    const executeAction = async () => {
        const promptText = document.getElementById('gems-prompt').value.trim();
        if (!promptText) {
            log('Please enter a prompt.');
            return;
        }

        const input = document.querySelector(SELECTORS.input);
        if (!input) {
            log('Error: Input field not found.');
            return;
        }

        log('Sending prompt...');
        // テキストを入力 (Quill editorへの対応)
        input.focus();
        document.execCommand('insertText', false, promptText);

        // 送信ボタンクリック
        setTimeout(() => {
            const sendBtn = document.querySelector(SELECTORS.send);
            if (sendBtn) {
                sendBtn.click();
                log('Generating response...');
                waitForResponse();
            } else {
                log('Error: Send button not found.');
            }
        }, 500);
    };

    const waitForResponse = () => {
        const interval = setInterval(() => {
            const isGenerating = document.querySelector(SELECTORS.isGenerating);
            if (!isGenerating) {
                clearInterval(interval);
                log('Generation complete!');
                setTimeout(extractAndSave, 2000); // 描画完了を少し待つ
            }
        }, 2000);
    };

    // --- イベントリスナー ---
    document.getElementById('exec-btn').addEventListener('click', executeAction);
    document.getElementById('save-btn').addEventListener('click', extractAndSave);
    document.getElementById('close-panel').addEventListener('click', () => {
        container.style.display = 'none';
    });

    log('Gems Saver Ready.');
})();
