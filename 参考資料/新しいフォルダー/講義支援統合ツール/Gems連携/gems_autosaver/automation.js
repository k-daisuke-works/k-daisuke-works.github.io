const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');

// ダウンロードフォルダの作成
const DOWNLOAD_DIR = path.join(__dirname, 'downloads');
if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR);
}

// ファイルのダウンロード用ヘルパー関数
const downloadImage = (url, filepath) => {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            // リダイレクト (Googleの画像URLなど) に対応
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return downloadImage(res.headers.location, filepath).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`Failed to get '${url}' (${res.statusCode})`));
            }
            const fileStream = fs.createWriteStream(filepath);
            res.pipe(fileStream);
            fileStream.on('finish', () => {
                fileStream.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(filepath, () => reject(err));
        });
    });
};

const runAutomation = async (urls, promptText) => {
    console.log('🤖 自動化処理を開始します...');

    let browserContext;
    let isCdpConnection = false;

    try {
        // 先に既存のChrome(リモートデバッグポート9222)に接続を試みる
        console.log('🔄 デバッグモードで起動しているChrome(ポート9222)への接続を試みます...');
        const browser = await chromium.connectOverCDP('http://localhost:9222');
        browserContext = browser.contexts()[0];
        isCdpConnection = true;
        console.log('✅ 既存のログイン済みChromeセッションに接続しました！');
    } catch (e) {
        console.log('⚠️ 既存のChromeが見つかりません。専用の別ブラウザを起動します。');
        console.log('   ※ Googleログインが求められる場合があります。');
        console.log('   ※ あなたの普段のGoogleアカウントをそのまま使いたい場合は、ツールを実行する前に「デバッグモードでChromeを起動.bat」からChromeを立ち上げてください。');

        // Playwright を Persistent Context で起動 (初回ログイン状態をローカルに保持)
        const userDataDir = path.join(__dirname, 'userdata');
        browserContext = await chromium.launchPersistentContext(userDataDir, {
            headless: false, // UIを確認するため表示
            viewport: { width: 1280, height: 800 },
            channel: 'chrome', // Google Chromeを使う
            ignoreDefaultArgs: ["--enable-automation"] // automationバナーを消すことでbot検知を回避しやすくする
        });
    }

    try {
        console.log(`\n▶ 全 ${urls.length} 個のタブを並行して実行します...`);
        const tasks = urls.map(async (urlItem, i) => {
            const url = urlItem.trim();
            if (!url) return;

            // タスクごとに新しいタブを開く
            const page = await browserContext.newPage();
            console.log(`\n▶ [${i + 1}/${urls.length}] ${url} への処理を開始`);

            try {

                await page.goto(url, { waitUntil: 'load' });
                console.log('  ページロード完了。ログイン待機またはフォーム待機中...');

                // 入力欄が出てくるまで待つ (ログインが必要な場合はここでタイムアウトするため、ユーザーにログインを促す)
                const inputSelector = 'div.ql-editor';
                try {
                    await page.waitForSelector(inputSelector, { state: 'visible', timeout: 60000 }); // 初回ログイン考慮で1分待機
                } catch (e) {
                    console.log(`  ⚠️ [${i + 1}] 入力欄が見つかりませんでした。処理をスキップします。`);
                    return;
                }

                await page.click(inputSelector);

                // テキスト入力
                await page.evaluate(({ sel }) => {
                    const el = document.querySelector(sel);
                    if (el) {
                        el.focus();
                        document.execCommand('selectAll', false, null);
                        document.execCommand('delete', false, null);
                    }
                }, { sel: inputSelector });

                // 1つ目のGem (i===0) だけは「３．家族構成（構成と関係性）」ブロックのみを抽出して送信
                let textToInput = promptText;
                if (i === 0) {
                    // 「３．家族構成」から「４．本人のストレングス」などの直前までを抽出する正規表現
                    const match = promptText.match(/３．家族構成（構成と関係性）[\s\S]*?(?=４．本人のストレングス|$)/);
                    if (match) {
                        textToInput = match[0].trim();
                        console.log('  ※ 1つ目のGemのため、「家族構成」のブロックのみを切り取って入力します。');
                    } else {
                        console.log('  ⚠️ 「３．家族構成（構成と関係性）」が見つからなかったため、全文を入力します。');
                    }
                }

                // 長文や改行を含む場合、Playwrightのキーボードエミュレーションでクリップボードのように流し込む
                await page.keyboard.insertText(textToInput);

                // 少し待機して送信ボタンの有効化を待つ
                await page.waitForTimeout(1000);

                // APIやDOMの変動に対応できるよう、いくつかのセレクタを用意
                const sendButtonSelectors = [
                    'button.send-button',
                    'button[aria-label="Send message"]',
                    'button[aria-label="メッセージを送信"]'
                ];

                let clicked = false;
                for (let btnSel of sendButtonSelectors) {
                    const btn = await page.$(btnSel);
                    if (btn) {
                        const isDisabled = await btn.evaluate(node => node.disabled);
                        if (!isDisabled) {
                            try {
                                await page.click(btnSel);
                                clicked = true;
                                break;
                            } catch (e) { }
                        }
                    }
                }

                if (!clicked) {
                    console.log('  送信ボタンをクリックできず。Enterで代替します。');
                    // ql-editorにフォーカスした状態でEnterを押す
                    await page.focus(inputSelector);
                    // Control+Enter に対応している場合もあるので通常のEnterを試す
                    await page.keyboard.press('Enter');
                }

                console.log('  送信完了。応答を待機しています...');

                // メッセージ生成開始のラグを待つ
                await page.waitForTimeout(3000);

                // [1] 「応答の生成を停止」ボタンの消失を待つ (従来方式・最大3分)
                const stopButtonSelectors = ['button[aria-label="応答の生成を停止"]', 'button[aria-label="Stop generating"]'];
                for (let stopSel of stopButtonSelectors) {
                    try {
                        const isGenerating = await page.$(stopSel);
                        if (isGenerating) {
                            await page.waitForSelector(stopSel, { state: 'hidden', timeout: 180000 });
                        }
                    } catch (e) { }
                }

                // [2] 念には念を入れ、回答の文字数が「変化しなくなるまで」待つ (最大10回確認)
                console.log('  応答アニメーションの完了（DOMの安定化）を確認しています...');
                let previousTextLength = 0;
                let stableCount = 0;
                const contentSelector = 'message-content, .message-content, [data-test-id="model-response"]';

                for (let check = 0; check < 30; check++) { // 最大60秒
                    try {
                        const currentText = await page.evaluate(({ sel }) => {
                            const els = document.querySelectorAll(sel);
                            return els.length > 0 ? els[els.length - 1].innerText : '';
                        }, { sel: contentSelector });

                        if (currentText.length > 0 && currentText.length === previousTextLength) {
                            stableCount++;
                            if (stableCount >= 3) break; // 3回連続(約6秒間)変化がなければ完了とみなす
                        } else {
                            stableCount = 0;
                            previousTextLength = currentText.length;
                        }
                    } catch (e) { }
                    await page.waitForTimeout(2000); // 2秒おきにチェック
                }

                // さらにDOM描画完了のバッファ

                await page.waitForTimeout(5000);
                console.log('  応答の生成が完了しました。データ抽出・保存中...');

                // --- 0. 最新の確実なコンテナをPlaywright Locatorで特定する ---
                // ※PlaywrightのLocatorはShadow DOMを貫通でき、より確実に要素を捕捉できます
                const possibleSelectors = [
                    'message-content',
                    '[data-test-id="model-response"]',
                    '.model-response-text',
                    'div[class*="message-content"]',
                    '.message-content'
                ];

                let lastResponseLoc = null;
                for (let sel of possibleSelectors) {
                    const locs = page.locator(sel);
                    const count = await locs.count();
                    if (count > 0) {
                        for (let k = count - 1; k >= 0; k--) {
                            const l = locs.nth(k);
                            const t = await l.innerText();
                            if (t && t.trim().length > 5) {
                                lastResponseLoc = l;
                                break;
                            }
                        }
                    }
                    if (lastResponseLoc) break;
                }

                // 保存用プレフィックス
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                const prefix = `Gem_${i + 1}_${timestamp}`;

                if (!lastResponseLoc) {
                    console.log(`  ⚠️ [${i + 1}] 回答コンテナのテキストが見つかりません。抽出をスキップします。`);
                    return;
                }

                // --- 1. テキスト抽出・保存 (※スキップ) ---
                // ユーザー要望によりテキスト保存機能は削除

                // --- 2. スライド/HTMLコード抽出・保存 (※スキップ) ---
                // ユーザー要望により画像・スライド取得機能は削除

                // --- 3. 画像抽出・保存 (※スキップ) ---
                // ユーザー要望により画像・スライド取得機能は削除

            } catch (pageError) {
                console.error(`❌ [${i + 1}] のタブでエラーが発生しました:`, pageError);
            }
        });

        // ==========================================
        // 新規追加機能：事例スライド生成（配布・印刷用）のローカル起動と実行
        // ==========================================
        const localSlideTask = (async () => {
            const slideHtmlPath = path.join(__dirname, '..', '..', '事例スライド生成(配布・印刷用)', 'slide.html');
            const fileUrl = 'file:///' + slideHtmlPath.replace(/\\/g, '/');
            console.log(`\n▶ [Local] 事例スライド生成ツール（配布・印刷用）の起動を開始します...`);

            try {
                const page = await browserContext.newPage();
                await page.goto(fileUrl, { waitUntil: 'load' });
                console.log(`  [Local] ページをロードしました。テキストを入力します...`);

                // テキスト入力を待機して入力
                await page.waitForSelector('#text-input', { state: 'visible', timeout: 10000 });
                await page.fill('#text-input', promptText);

                // 生成ボタンをクリック
                console.log(`  [Local] 生成ボタンをクリックします...`);
                await page.click('#generate-btn');

                console.log(`  [Local] ✅ スライド生成の実行が完了しました。`);
            } catch (error) {
                console.error(`❌ [Local] 事例スライド生成ツールの操作に失敗しました:`, error);
            }
        })();

        // タスク一覧に追加して並行実行
        tasks.push(localSlideTask);

        // ==========================================
        // 追加機能：まとめ直下のポータル（index.html）を起動しておく
        // ==========================================
        const localIndexTask = (async () => {
            const indexHtmlPath = path.join(__dirname, '..', '..', 'index.html');
            const fileUrl = 'file:///' + indexHtmlPath.replace(/\\/g, '/');
            console.log(`\n▶ [Local] ポータル画面（index.html）を開きます...`);

            try {
                const page = await browserContext.newPage();
                await page.goto(fileUrl, { waitUntil: 'load' });
                console.log(`  [Local] ✅ ポータル画面を開きました。`);
            } catch (error) {
                console.error(`❌ [Local] ポータル画面の起動に失敗しました:`, error);
            }
        })();

        tasks.push(localIndexTask);

        // すべてのタブの処理が完了するまで待機
        await Promise.all(tasks);

    } catch (error) {
        console.error('❌ 予期せぬエラーが発生しました:', error);
    } finally {
        if (!isCdpConnection) {
            await browserContext.close();
        } else {
            console.log('🔗 デバッグポートとの接続を解除しました（ブラウザはそのまま使用できます）');
        }
        console.log('\n🎉 自動化処理の全フローが完了しました！');
    }
};

module.exports = { runAutomation };
