const express = require('express');
const path = require('path');
const cors = require('cors');
const { runAutomation } = require('./automation');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/run', async (req, res) => {
    const { urls, prompt } = req.body;

    if (!urls || urls.length === 0 || !prompt) {
        return res.status(400).json({ error: 'URLs と プロンプトは必須です。' });
    }

    try {
        // バックグラウンドで自動化処理を開始
        // Note: クライアント側にはポーリング等のためのJobIDを返す方式もあるが、
        // 今回は単純に実行完了まで待つ、あるいは完了を待たずにレスポンスを返す形にする
        res.json({ message: '自動化処理をバックグラウンドで開始しました。コンソールログを確認してください。' });

        // 実際の処理は非同期で実行
        runAutomation(urls, prompt).catch(err => {
            console.error('Automation failed:', err);
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'サーバー内部エラーが発生しました。' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
