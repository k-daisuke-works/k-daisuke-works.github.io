document.getElementById('csvFile').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        const text = event.target.result;
        processData(text);
    };
    reader.readAsText(file);
});

let socialChartInst = null;
let aiChartInst = null;
let currentSlideIndex = 0;
let totalSlides = 1;
let commentsPerPage = 8;
let reportData = null; // テキスト出力用のデータ保持

function processData(csvText) {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== "");
    if (lines.length < 2) {
        alert("CSVデータが不足しています。");
        return;
    }

    function parseCSVLine(line) {
        const result = [];
        let cur = "";
        let inQuote = false;
        for (let char of line) {
            if (char === '"') inQuote = !inQuote;
            else if (char === ',' && !inQuote) {
                result.push(cur);
                cur = "";
            } else cur += char;
        }
        result.push(cur);
        return result.map(s => s.trim());
    }

    const rows = lines.slice(1).map(parseCSVLine);
    const labels = ["論理的根拠", "実現可能性", "倫理基準", "寄り添い", "好み"];
    const socialIndices = [1, 3, 5, 7, 9];
    const aiIndices = [2, 4, 6, 8, 10];
    const commentIndex = 11;

    let socialTotals = [0, 0, 0, 0, 0];
    let aiTotals = [0, 0, 0, 0, 0];
    let allComments = [];
    let count = 0;

    rows.forEach(row => {
        if (row.length < 11) return;
        let hasData = false;
        socialIndices.forEach((idx, i) => {
            const val = parseFloat(row[idx]);
            if (!isNaN(val)) { socialTotals[i] += val; hasData = true; }
        });
        aiIndices.forEach((idx, i) => {
            const val = parseFloat(row[idx]);
            if (!isNaN(val)) { aiTotals[i] += val; hasData = true; }
        });
        if (hasData) count++;
        if (row[commentIndex]) allComments.push(row[commentIndex]);
    });

    const socialAverages = socialTotals.map(s => count > 0 ? s / count : 0);
    const aiAverages = aiTotals.map(s => count > 0 ? s / count : 0);

    renderCharts(labels, socialAverages, aiAverages, socialTotals, aiTotals);
    updateTotalBadges(labels, socialTotals, aiTotals, count);
    generateCommentSlides(allComments);

    currentSlideIndex = 0;
    updateSlideVisibility();

    document.getElementById('statsInfo').innerHTML = `⚠️ この報告書は合計 ${count} 名の【平均値】を表示しています`;
    document.getElementById('slideOverlay').classList.add('active');

    // テキスト保存用にデータを保持
    reportData = {
        labels: labels,
        socialTotals: socialTotals,
        aiTotals: aiTotals,
        count: count,
        comments: allComments
    };
}

function generateCommentSlides(comments) {
    const container = document.getElementById('commentsContainer');
    container.innerHTML = '';
    const pageCount = Math.ceil(comments.length / commentsPerPage);
    totalSlides = 1 + pageCount;

    for (let i = 0; i < pageCount; i++) {
        const slideDiv = document.createElement('div');
        slideDiv.id = `slide${i + 2}`;
        slideDiv.className = 'slide-content';
        const pageComments = comments.slice(i * commentsPerPage, (i + 1) * commentsPerPage);

        let listHtml = '<ul class="comment-list">';
        pageComments.forEach(c => { listHtml += `<li class="comment-item">${c}</li>`; });
        listHtml += '</ul>';

        slideDiv.innerHTML = `<div class="comment-container"><h2 style="margin-bottom:1.5rem; font-size:2rem; color:#fbbf24;">自由記述コメント (${i + 1}/${pageCount})</h2>${listHtml}</div>`;
        container.appendChild(slideDiv);
    }
}

function updateSlideVisibility() {
    document.querySelectorAll('.slide-content').forEach((s, i) => {
        if (i === currentSlideIndex) s.classList.add('active');
        else s.classList.remove('active');
    });
    document.getElementById('pageIndicator').innerText = `Slide ${currentSlideIndex + 1} / ${totalSlides}`;
    document.getElementById('prevBtn').disabled = currentSlideIndex === 0;
    document.getElementById('nextBtn').disabled = currentSlideIndex === totalSlides - 1;
}

document.getElementById('prevBtn').addEventListener('click', () => { if (currentSlideIndex > 0) { currentSlideIndex--; updateSlideVisibility(); } });
document.getElementById('nextBtn').addEventListener('click', () => { if (currentSlideIndex < totalSlides - 1) { currentSlideIndex++; updateSlideVisibility(); } });
document.getElementById('closeSlide').addEventListener('click', () => {
    document.getElementById('slideOverlay').classList.remove('active');
    window.close();
});
document.getElementById('reportBtn').addEventListener('click', () => {
    if (!reportData) {
        alert("データが読み込まれていません。");
        return;
    }

    const { labels, socialTotals, aiTotals, count, comments } = reportData;

    let text = `=======================================\n`;
    text += `   事例検討比較 レーダーチャート分析レポート\n`;
    text += `=======================================\n\n`;
    text += `【評価スコアまとめ】\n`;
    text += `総投票数（有効回答）: ${count} 名\n\n`;

    labels.forEach((label, i) => {
        const sTotal = socialTotals[i];
        const aTotal = aiTotals[i];
        const sAvg = count > 0 ? (sTotal / count).toFixed(1) : "0.0";
        const aAvg = count > 0 ? (aTotal / count).toFixed(1) : "0.0";

        let winner = "同点";
        if (sTotal > aTotal) winner = "社会福祉士 優位";
        if (aTotal > sTotal) winner = "生成AI 優位";

        text += `■ ${label}\n`;
        text += `  ・社会福祉士 : 平均 ${sAvg} pt (合計 ${Math.round(sTotal)}pt)\n`;
        text += `  ・生成AI     : 平均 ${aAvg} pt (合計 ${Math.round(aTotal)}pt)\n`;
        text += `  => 判定: ${winner}\n\n`;
    });

    text += `=======================================\n`;
    text += `【自由記述コメント一覧】\n`;
    text += `=======================================\n`;
    comments.forEach((c, index) => {
        text += `\n(${index + 1}) \n${c}\n`;
    });
    text += `\n=======================================\n`;
    text += `出力日時: ${new Date().toLocaleString('ja-JP')}\n`;

    // テキストファイルとしてブラウザでダウンロードさせる
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '評価点比較レポート.txt';
    a.click();
    URL.revokeObjectURL(url);
});

function updateTotalBadges(labels, socialTotals, aiTotals, count) {
    const socialArea = document.getElementById('socialTotals');
    const aiArea = document.getElementById('aiTotals');
    socialArea.innerHTML = ''; aiArea.innerHTML = '';
    labels.forEach((label, i) => {
        const sTotal = socialTotals[i], aTotal = aiTotals[i];
        const sAvg = count > 0 ? (sTotal / count).toFixed(1) : "0.0";
        const aAvg = count > 0 ? (aTotal / count).toFixed(1) : "0.0";
        socialArea.innerHTML += `<div class="score-badge"><span class="score-label">${label}</span><span class="score-value">${Math.round(sTotal)}pt</span><span class="score-avg">平均${sAvg}</span></div>`;
        aiArea.innerHTML += `<div class="score-badge"><span class="score-label">${label}</span><span class="score-value">${Math.round(aTotal)}pt</span><span class="score-avg">平均${aAvg}</span></div>`;
    });
}

function renderCharts(labels, socialScores, aiScores, socialTotals, aiTotals) {
    if (socialChartInst) socialChartInst.destroy();
    if (aiChartInst) aiChartInst.destroy();

    // ★の有無で文字幅が変わり、グラフが縮小するのを防ぐため、全角スペースで幅を完全に一致させる
    const socialLabels = labels.map((l, i) => socialTotals[i] > aiTotals[i] ? `★ ${l} ★` : `　 ${l} 　`);
    const aiLabels = labels.map((l, i) => aiTotals[i] > socialTotals[i] ? `★ ${l} ★` : `　 ${l} 　`);

    const socialLabelColors = labels.map((l, i) => {
        if (socialTotals[i] > aiTotals[i]) return '#fbbf24';
        if (socialTotals[i] < aiTotals[i]) return 'rgba(255,255,255,0.3)';
        return '#ffffff';
    });
    const aiLabelColors = labels.map((l, i) => {
        if (aiTotals[i] > socialTotals[i]) return '#fbbf24';
        if (aiTotals[i] < socialTotals[i]) return 'rgba(255,255,255,0.3)';
        return '#ffffff';
    });

    const getOptions = (lColors) => ({
        responsive: true,
        maintainAspectRatio: false, // 柔軟なリサイズを許可
        scales: {
            r: {
                angleLines: { color: 'rgba(148, 163, 184, 0.3)' },
                grid: { color: 'rgba(148, 163, 184, 0.2)' },
                pointLabels: { color: lColors, font: { size: 24, weight: '900' }, padding: 15 },
                ticks: { display: true, backdropColor: 'transparent', color: 'rgba(255, 255, 255, 0.5)', stepSize: 1, min: 0, max: 5, font: { size: 14, weight: '800' } },
                min: 0, max: 5
            }
        },
        layout: { padding: 30 }, // 左右サイズが固定化されたので、安全な範囲でグラフを最大化
        plugins: { legend: { display: false } },
        animation: { duration: 1500, easing: 'easeOutQuart' }
    });

    socialChartInst = new Chart(document.getElementById('socialChart'), {
        type: 'radar',
        data: { labels: socialLabels, datasets: [{ data: socialScores, fill: true, backgroundColor: 'rgba(56, 189, 248, 0.3)', borderColor: '#38bdf8', borderWidth: 4, pointBackgroundColor: '#38bdf8' }] },
        options: getOptions(socialLabelColors)
    });

    aiChartInst = new Chart(document.getElementById('aiChart'), {
        type: 'radar',
        data: { labels: aiLabels, datasets: [{ data: aiScores, fill: true, backgroundColor: 'rgba(244, 114, 182, 0.3)', borderColor: '#f472b6', borderWidth: 4, pointBackgroundColor: '#f472b6' }] },
        options: getOptions(aiLabelColors)
    });
}
