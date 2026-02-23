document.getElementById('run-btn').addEventListener('click', async () => {
    const urlsInput = document.getElementById('urls').value;
    const promptValue = document.getElementById('prompt').value;

    // UI要素
    const btn = document.getElementById('run-btn');
    const btnText = document.querySelector('.btn-text');
    const loader = document.querySelector('.loader-spinner');
    const statusBox = document.getElementById('status-box');
    const statusMsg = document.getElementById('status-message');

    // Validation
    const urls = urlsInput.split('\n').map(u => u.trim()).filter(u => u !== '');
    if (urls.length === 0) {
        alert('対象のGems URLを1つ以上入力してください。');
        return;
    }
    if (!promptValue.trim()) {
        alert('プロンプト（テキスト）を入力してください。');
        return;
    }

    // UI ローディング状態
    btn.disabled = true;
    btnText.style.display = 'none';
    loader.style.display = 'block';
    statusBox.classList.remove('hidden');

    statusMsg.innerText = 'サーバーにリクエストを送信中...';
    statusMsg.style.color = '#38bdf8'; // 色変更

    try {
        const response = await fetch('/api/run', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ urls, prompt: promptValue })
        });

        const data = await response.json();

        if (response.ok) {
            statusMsg.innerText = `処理をバックグラウンドで開始しました！\n（ターミナルログをご確認ください）`;
            statusMsg.style.color = '#34d399'; // 成功色
        } else {
            statusMsg.innerText = `エラー: ${data.error}`;
            statusMsg.style.color = '#ef4444'; // エラー色
        }

    } catch (error) {
        console.error('通信エラー:', error);
        statusMsg.innerText = 'サーバーとの通信に失敗しました。';
        statusMsg.style.color = '#ef4444';
    } finally {
        // バックグラウンド実行なのでボタンはすぐ元に戻す
        setTimeout(() => {
            btn.disabled = false;
            btnText.style.display = 'block';
            loader.style.display = 'none';
        }, 2000);
    }
});
