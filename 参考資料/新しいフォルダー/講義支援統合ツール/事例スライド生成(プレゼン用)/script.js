/**
 * Image Slideshow - Auto Mode
 */

class Slideshow {
    constructor() {
        this.images = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.intervalId = null;
        this.autoPlaySpeed = 3000;
        this.clickTimer = null;

        this.slideshowScreen = document.getElementById('slideshow-screen');
        this.setupScreen = document.getElementById('setup-screen');
        this.currentImg = document.getElementById('current-image');
        this.counterLabel = document.getElementById('counter');
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.playPauseBtn = document.getElementById('play-pause-btn');
        this.fullscreenBtn = document.getElementById('fullscreen-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.thumbnailStrip = document.getElementById('thumbnail-strip');
        this.playIcon = document.getElementById('play-icon');
        this.pauseIcon = document.getElementById('pause-icon');
        this.closeBtn = document.getElementById('close-btn');

        this.initEventListeners();
        this.autoLoad();
    }

    autoLoad() {
        // 初回はスライド画面を隠して必ず表紙（setup-screen）を表示
        this.slideshowScreen.classList.add('hidden');
        this.setupScreen.classList.remove('hidden');

        // 画像リストは初期状態で空になっている前提
        this.currentIndex = 0;

        this.updateStartButtonState();
    }

    updateStartButtonState() {
        const startBtn = document.getElementById('start-slideshow-btn');
        const warning = document.getElementById('no-image-warning');
        const subtitle = document.getElementById('drop-subtitle');

        if (this.images.length > 0) {
            if (warning) warning.classList.add('hidden');
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.style.opacity = '1';
                startBtn.style.cursor = 'pointer';
            }
            if (subtitle) {
                subtitle.innerHTML = `現在 <strong>${this.images.length} 枚</strong>の画像がセットされています <button onclick="location.reload()" style="background:none;border:none;color:var(--accent-red);cursor:pointer;text-decoration:underline;margin-left:10px;font-size:1rem;">[リセット]</button>`;
            }
        } else {
            if (warning) warning.classList.remove('hidden');
            if (startBtn) {
                startBtn.disabled = true;
                startBtn.style.opacity = '0.5';
                startBtn.style.cursor = 'not-allowed';
            }
            if (subtitle) {
                subtitle.innerHTML = `スライド編集画面`;
            }
        }
    }

    renderEditThumbnails() {
        const container = document.getElementById('edit-thumbnails');
        if (!container) return;
        container.innerHTML = '';

        this.images.forEach((img, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'edit-thumb-wrapper';
            wrapper.draggable = true;
            wrapper.dataset.index = index;

            const elImg = document.createElement('img');
            elImg.src = img.url;
            wrapper.appendChild(elImg);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = '×';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                this.images.splice(index, 1);
                this.renderEditThumbnails();
                this.updateStartButtonState();
            };
            wrapper.appendChild(removeBtn);

            // 並び替え用ドラッグ＆ドロップイベント
            wrapper.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', index);
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(() => wrapper.classList.add('dragging'), 0);
            });

            wrapper.addEventListener('dragend', () => {
                wrapper.classList.remove('dragging');
            });

            wrapper.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });

            wrapper.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                if (isNaN(fromIndex)) return; // OSからのファイルドロップの場合は無視

                const toIndex = index;
                if (fromIndex !== toIndex) {
                    const movedItem = this.images.splice(fromIndex, 1)[0];
                    this.images.splice(toIndex, 0, movedItem);
                    this.renderEditThumbnails();
                }
            });

            container.appendChild(wrapper);
        });
    }

    initEventListeners() {
        // --- 画像追加用のドラッグ＆ドロップイベント ---
        const dropZone = document.getElementById('drop-zone');
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.style.backgroundColor = 'rgba(56, 189, 248, 0.2)';
                dropZone.style.borderColor = 'var(--accent-blue)';
            });
            dropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropZone.style.backgroundColor = 'rgba(0,0,0,0.4)';
                dropZone.style.borderColor = 'rgba(255,255,255,0.3)';
            });
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.style.backgroundColor = 'rgba(0,0,0,0.4)';
                dropZone.style.borderColor = 'rgba(255,255,255,0.3)';

                // 投げ込まれたファイルを配列に変換し、画像ファイルのみ抽出
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    const files = Array.from(e.dataTransfer.files);
                    // 複数ファイルに対して非同期処理を順番に行うためIIFEとfor...ofを使用
                    (async () => {
                        for (const file of files) {
                            if (file.type.startsWith('image/')) {
                                this.images.push({
                                    name: file.name,
                                    url: URL.createObjectURL(file)
                                });
                            } else if (file.type === 'application/pdf') {
                                await this.loadPdfAsImages(file);
                            }
                        }
                        this.renderEditThumbnails();
                        this.updateStartButtonState();
                    })();
                }
            });
        }

        // --- スライド開始ボタン ---
        const startBtn = document.getElementById('start-slideshow-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                if (this.images.length === 0) return;
                this.setupScreen.classList.add('hidden');
                this.slideshowScreen.classList.remove('hidden');
                this.renderThumbnails();
                this.updateDisplay();
            });
        }
        // ------------------------------------

        this.prevBtn.addEventListener('click', (e) => { e.stopPropagation(); this.prev(); });
        this.nextBtn.addEventListener('click', (e) => { e.stopPropagation(); this.next(); });
        this.playPauseBtn.addEventListener('click', (e) => { e.stopPropagation(); this.togglePlay(); });
        this.fullscreenBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleFullscreen(); });
        this.resetBtn.addEventListener('click', (e) => { e.stopPropagation(); this.goTo(0); });
        this.closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // 閉じるボタンで表紙に戻る（または画面を閉じる）
            this.slideshowScreen.classList.add('hidden');
            this.setupScreen.classList.remove('hidden');
            if (this.isPlaying) this.togglePlay();
        });

        this.slideshowScreen.addEventListener('click', (e) => {
            if (e.target.closest('button') || e.target.closest('.thumb')) return;
            if (document.fullscreenElement) {
                // 画面の左側（1/3）をクリックしたら戻る、それ以外は進む
                const rect = this.slideshowScreen.getBoundingClientRect();
                if (e.clientX < rect.width / 3) {
                    this.prev();
                } else {
                    this.next();
                }
            }
        });

        // 全画面時に右クリックでUI（ボタン等）の表示/非表示を切り替え
        this.slideshowScreen.addEventListener('contextmenu', (e) => {
            if (document.fullscreenElement) {
                e.preventDefault();
                this.slideshowScreen.classList.toggle('ui-hidden');
            }
        });

        document.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement) this.slideshowScreen.classList.add('ui-hidden');
            else this.slideshowScreen.classList.remove('ui-hidden');
        });

        document.addEventListener('keydown', (e) => {
            if (this.images.length === 0) return;
            if (e.key === 'ArrowLeft') this.prev();
            if (e.key === 'ArrowRight') this.next();
            if (e.key === 'f') this.toggleFullscreen();
            if (e.key === ' ') {
                e.preventDefault();
                this.togglePlay();
            }
            if (e.key === 'Escape') window.close();
        });
    }

    sortFiles(data) {
        const circleMap = {
            '①': 1, '②': 2, '③': 3, '④': 4, '⑤': 5,
            '⑥': 6, '⑦': 7, '⑧': 8, '⑨': 9, '⑩': 10
        };
        const getVal = (name) => {
            const firstChar = name.charAt(0);
            if (circleMap[firstChar]) return circleMap[firstChar];
            const digitMatch = firstChar.match(/[0-9]/);
            if (digitMatch) return parseInt(digitMatch[0]);
            return 999;
        };
        return data.sort((a, b) => {
            const valA = getVal(a.name);
            const valB = getVal(b.name);
            if (valA !== valB) return valA - valB;
            return a.name.localeCompare(b.name, undefined, { numeric: true });
        });
    }

    updateDisplay() {
        if (this.images.length === 0) return;
        const img = this.images[this.currentIndex];
        this.currentImg.style.opacity = '0';
        setTimeout(() => {
            this.currentImg.src = img.url;
            this.currentImg.style.opacity = '1';
            this.currentImg.classList.remove('slide-in');
            void this.currentImg.offsetWidth;
            this.currentImg.classList.add('slide-in');
        }, 200);
        this.counterLabel.textContent = `${this.currentIndex + 1} / ${this.images.length}`;
        document.querySelectorAll('.thumb').forEach((t, i) => {
            t.classList.toggle('active', i === this.currentIndex);
            if (i === this.currentIndex) t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        });
    }

    renderThumbnails() {
        this.thumbnailStrip.innerHTML = '';
        this.images.forEach((img, i) => {
            const t = document.createElement('img');
            t.className = 'thumb';
            t.src = img.url;
            t.onclick = () => this.goTo(i);
            this.thumbnailStrip.appendChild(t);
        });
    }

    prev() { this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length; this.updateDisplay(); }
    next() { this.currentIndex = (this.currentIndex + 1) % this.images.length; this.updateDisplay(); }
    goTo(i) {
        this.currentIndex = i;
        this.updateDisplay();
    }

    togglePlay() {
        this.isPlaying = !this.isPlaying;
        if (this.isPlaying) {
            this.playIcon.classList.add('hidden');
            this.pauseIcon.classList.remove('hidden');
            this.intervalId = setInterval(() => this.next(), this.autoPlaySpeed);
        } else {
            this.playIcon.classList.remove('hidden');
            this.pauseIcon.classList.add('hidden');
            clearInterval(this.intervalId);
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) this.slideshowScreen.requestFullscreen();
        else document.exitFullscreen();
    }

    async loadPdfAsImages(file) {
        try {
            const subtitle = document.getElementById('drop-subtitle');
            if (subtitle) {
                subtitle.innerHTML = `<span style="color:var(--accent-blue)">⏳ PDF「${file.name}」をスライド画像に変換中...</span>`;
            }

            // CDNからWorkerをロードして動作を安定させる
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                // 画質を担保するためスケールを1.5倍にしてレンダリング
                const viewport = page.getViewport({ scale: 1.5 });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({ canvasContext: context, viewport: viewport }).promise;

                // JPEG画像としてデータURL化（0.9は画質）
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                this.images.push({
                    name: `${file.name} - ページ ${i}`,
                    url: dataUrl
                });

                // 少しずつサムネイルに反映させて進捗がわかるようにする
                this.renderEditThumbnails();
            }
        } catch (error) {
            console.error('PDF読み込み処理エラー:', error);
            alert(`PDF「${file.name}」の読み込みに失敗しました。`);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => { new Slideshow(); });
