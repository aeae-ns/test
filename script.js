// グローバル変数
let uploadedImage = null; // アップロードされたPNGイメージ
let canvas = null; // プレビュー用Canvas
let ctx = null;
let animationType = '浮遊'; // デフォルト
let animationSpeed = 3.0; // 秒/周期
let intensity = 0.5; // 強度 (0-1)
let delay = 0; // 遅延秒 (プレビューでは無視、出力でフレーム遅延に使用)
let easing = 'ease-in-out'; // イージング
let colorLimit = 128; // 色数制限 (GIF/APNGで使用)
let sizeScale = 1.0; // 画像サイズ調整 (0-1)
let fps = 15; // フレームレート
let quality = '高品質'; // 品質設定 (GIFのqualityにマップ)
let loop = Infinity; // ループ設定 (Infinityで無限)
let outputFormat = 'APNG'; // 出力形式

// DOM要素の取得 (HTMLの構造に基づいて調整。必要に応じてクラス/ID追加)
const previewContainer = document.querySelector('div[data-label="Preview"]'); // プレビューエリアの親div (HTMLにdata-label追加推奨)
const uploadDropArea = document.querySelector('div[title="PNGファイルをドラッグ&ドロップ またはクリックしてアップロード"]'); // アップロードエリア
const outputWidthInput = document.querySelector('input[name="width"]');
const outputHeightInput = document.querySelector('input[name="height"]');
const animTypeSelect = document.querySelector('select[data-label="アニメーションタイプ"]'); // セレクトにdata-label追加
const speedSlider = document.querySelector('input[type="range"][data-label="アニメーション速度"]'); // スライダーにdata-label追加
const intensitySlider = document.querySelector('input[type="range"][data-label="強度"]');
const delaySlider = document.querySelector('input[type="range"][data-label="遅延"]');
const easingSelect = document.querySelector('select[data-label="イージング"]');
const colorLimitInput = document.querySelector('input[data-label="色数制限"]');
const sizeScaleInput = document.querySelector('input[data-label="画像サイズ調整"]');
const fpsSelect = document.querySelector('select[data-label="フレームレート"]');
const qualitySelect = document.querySelector('select[data-label="品質設定"]');
const loopSelect = document.querySelector('select[data-label="ループ設定"]');
const formatRadios = document.querySelectorAll('input[name="output-format"]'); // ラジオボタン
const generateButton = document.querySelector('button[data-label="⚡ アニメーション生成 ⚡"]');
const downloadButton = document.querySelector('a[data-label="⇩ ファイルダウンロード ⇩"]'); // aタグとして仮定
const resetButton = document.querySelector('button[data-label="↻ アニメーションリセット"]');
const deleteButton = document.querySelector('button[data-label="✕ 画像削除"]');

// Canvasの初期化
function initCanvas(width, height) {
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.style.maxWidth = '100%';
        canvas.style.height = 'auto';
        previewContainer.appendChild(canvas);
    }
    canvas.width = width * sizeScale;
    canvas.height = height * sizeScale;
    ctx = canvas.getContext('2d');
}

// アップロード処理 (ドラッグ&ドロップ)
uploadDropArea.addEventListener('dragover', (e) => e.preventDefault());
uploadDropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleUpload(file);
});
// クリックアップロード (input fileを隠しで追加 or 既存利用)
const uploadInput = document.createElement('input');
uploadInput.type = 'file';
uploadInput.accept = 'image/png';
uploadInput.style.display = 'none';
uploadDropArea.appendChild(uploadInput);
uploadDropArea.addEventListener('click', () => uploadInput.click());
uploadInput.addEventListener('change', (e) => handleUpload(e.target.files[0]));

function handleUpload(file) {
    if (file && file.type === 'image/png') {
        const reader = new FileReader();
        reader.onload = (event) => {
            uploadedImage = new Image();
            uploadedImage.src = event.target.result;
            uploadedImage.onload = () => {
                initCanvas(uploadedImage.width, uploadedImage.height);
                updatePreview();
                // ファイル情報更新 (HTMLの表示要素にセット)
                document.querySelector('[data-label="ファイル名"]').textContent = file.name;
                document.querySelector('[data-label="画像サイズ"]').textContent = `${uploadedImage.width}x${uploadedImage.height}`;
            };
        };
        reader.readAsDataURL(file);
    } else {
        alert('PNGファイルのみ対応しています。');
    }
}

// 設定変更イベント
animTypeSelect.addEventListener('change', (e) => { animationType = e.target.value; updatePreview(); });
speedSlider.addEventListener('input', (e) => { animationSpeed = parseFloat(e.target.value); updatePreview(); });
intensitySlider.addEventListener('input', (e) => { intensity = parseFloat(e.target.value) / 100; updatePreview(); });
delaySlider.addEventListener('input', (e) => { delay = parseFloat(e.target.value); updatePreview(); });
easingSelect.addEventListener('change', (e) => { easing = e.target.value; updatePreview(); });
colorLimitInput.addEventListener('input', (e) => { colorLimit = parseInt(e.target.value); });
sizeScaleInput.addEventListener('input', (e) => { sizeScale = parseFloat(e.target.value) / 100; if (uploadedImage) initCanvas(uploadedImage.width, uploadedImage.height); updatePreview(); });
fpsSelect.addEventListener('change', (e) => { fps = parseInt(e.target.value); updatePreview(); });
qualitySelect.addEventListener('change', (e) => { quality = e.target.value; });
loopSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    loop = val === '無限ループ' ? Infinity : val === '1回のみ' ? 1 : parseInt(val);
});
formatRadios.forEach(radio => radio.addEventListener('change', (e) => { outputFormat = e.target.value; }));

// 出力サイズ調整イベント (幅/高さ入力、ロックボタンなどHTMLに基づく)
outputWidthInput.addEventListener('input', (e) => { canvas.width = parseInt(e.target.value); updatePreview(); });
outputHeightInput.addEventListener('input', (e) => { canvas.height = parseInt(e.target.value); updatePreview(); });

// イージング関数 (ease-in-outなど)
function easeLinear(t) { return t; }
function easeIn(t) { return t * t; }
function easeOut(t) { return t * (2 - t); }
function easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
function easeBounce(t) { if (t < (1/2.75)) return 7.5625*t*t; else if (t < (2/2.75)) return 7.5625*(t-=(1.5/2.75))*t + .75; else if (t < (2.5/2.75)) return 7.5625*(t-=(2.25/2.75))*t + .9375; else return 7.5625*(t-=(2.625/2.75))*t + .984375; }
function getEasingFunction() {
    switch (easing) {
        case 'linear': return easeLinear;
        case 'ease-in': return easeIn;
        case 'ease-out': return easeOut;
        case 'ease-in-out': return easeInOut;
        case 'バウンス': return easeBounce;
        default: return easeInOut;
    }
}

// applyAnimation関数（追加: globalAlphaリセットを強化）
function applyAnimation(transformTime, width, height) {
    const easeFunc = getEasingFunction();
    const eased = easeFunc((transformTime % 1));
    const amp = intensity * 50;
    ctx.save();
    ctx.translate(width / 2, height / 2);
    switch (animationType) {
        case '浮遊': // Y軸移動
            ctx.translate(0, Math.sin(transformTime * 2 * Math.PI) * amp);
            break;
        case '呼吸': // スケール
            ctx.scale(1 + Math.sin(transformTime * 2 * Math.PI) * (intensity * 0.1), 1 + Math.sin(transformTime * 2 * Math.PI) * (intensity * 0.1));
            break;
        case '揺れ': // 回転
            ctx.rotate(Math.sin(transformTime * 2 * Math.PI) * (intensity * Math.PI / 180 * 5));
            break;
        case 'バウンス': // Y軸バウンス
            ctx.translate(0, Math.abs(Math.sin(transformTime * 2 * Math.PI * 2)) * amp * -1);
            break;
        case 'パルス': // スケールパルス
            ctx.scale(1 + eased * (intensity * 0.2), 1 + eased * (intensity * 0.2));
            break;
        case '右回転': // 右回転
            ctx.rotate(transformTime * 2 * Math.PI);
            break;
        case '左回転': // 左回転
            ctx.rotate(-transformTime * 2 * Math.PI);
            break;
        case 'ぐらぐら': // 左右回転
            ctx.rotate(Math.sin(transformTime * 4 * Math.PI) * (intensity * Math.PI / 180 * 10));
            break;
        case '震え': // ランダム偏移
            ctx.translate((Math.random() - 0.5) * amp / 2, (Math.random() - 0.5) * amp / 2);
            break;
        case '左右スライド': // X軸スライド
            ctx.translate(Math.sin(transformTime * 2 * Math.PI) * amp, 0);
            break;
        case '上下スライド': // Y軸スライド
            ctx.translate(0, Math.sin(transformTime * 2 * Math.PI) * amp);
            break;
        case '8の字': // 8の字軌道
            ctx.translate(Math.sin(transformTime * 2 * Math.PI) * amp, Math.sin(transformTime * 4 * Math.PI) * (amp / 2));
            break;
        case '心拍': // スケール心拍
            const pulse = (Math.sin(transformTime * 4 * Math.PI) + 1) / 2 * (intensity * 0.1);
            ctx.scale(1 + pulse, 1 + pulse);
            break;
        case '弾性': // 弾性スケール (easeBounce使用)
            ctx.scale(1 + easeBounce(eased) * (intensity * 0.2), 1 + easeBounce(eased) * (intensity * 0.2));
            break;
        case '振り子': // 回転振り子
            ctx.rotate(Math.sin(transformTime * 2 * Math.PI) * (intensity * Math.PI / 180 * 45));
            break;
        case '螺旋': // 回転 + スケール
            ctx.rotate(transformTime * 4 * Math.PI);
            ctx.scale(1 - eased * (intensity * 0.5), 1 - eased * (intensity * 0.5));
            break;
        case '波': // Y軸波
            ctx.translate(0, Math.sin(transformTime * 2 * Math.PI + Math.PI / 2) * amp);
            break;
        case 'ズームイン・アウト': // スケールズーム
            ctx.scale(1 + Math.sin(transformTime * 2 * Math.PI) * (intensity * 0.5), 1 + Math.sin(transformTime * 2 * Math.PI) * (intensity * 0.5));
            break;
        case '水平フリップ': // X軸フリップ
            ctx.scale(-1 + 2 * eased, 1);
            break;
        case '垂直フリップ': // Y軸フリップ
            ctx.scale(1, -1 + 2 * eased);
            break;
        case 'タイプライター': // クリップで文字風 (簡易: 左から表示)
            ctx.beginPath();
            ctx.rect(-width / 2, -height / 2, width * eased, height);
            ctx.clip();
            break;
        case 'フェードイン・アウト': // アルファフェード
            ctx.globalAlpha = Math.abs(Math.sin(transformTime * 2 * Math.PI)) * (1 - intensity) + intensity;
            break;
        case 'スライドバウンス': // X軸スライド + バウンス
            ctx.translate(easeBounce(eased) * amp * 2 - amp, 0);
            break;
    }
    ctx.translate(-width / 2, -height / 2); // 元に戻す
if (animationType === 'フェードイン・アウト') {
        ctx.globalAlpha = Math.abs(Math.sin(transformTime * 2 * Math.PI)) * (1 - intensity) + intensity;
    } else {
        ctx.globalAlpha = 1; // 透過喪失防止
    }
    ctx.translate(-width / 2, -height / 2);
}


// プレビュー更新 (リアルタイムアニメーション)
function updatePreview() {
    if (!uploadedImage || !ctx) return;
    let startTime = performance.now();
    const animate = () => {
        const elapsed = (performance.now() - startTime) / 1000; // 秒
        const transformTime = (elapsed + delay) / animationSpeed; // 周期進捗
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        applyAnimation(transformTime, canvas.width, canvas.height);
        ctx.drawImage(uploadedImage, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        requestAnimationFrame(animate);
    };
    animate();
}

// 生成ボタン: フレームキャプチャ（修正: 各フレームでsave/restoreを独立）
generateButton.addEventListener('click', () => {
    if (!uploadedImage) return alert('PNGをアップロードしてください');
    const totalFrames = Math.round(fps * animationSpeed);
    const frameDelayMs = 1000 / fps;
    const frames = [];
    for (let i = 0; i < totalFrames; i++) {
        ctx.save(); // 各フレームでsave
        const progress = i / totalFrames;
        const transformTime = progress + delay / animationSpeed;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        applyAnimation(transformTime, canvas.width, canvas.height);
        ctx.drawImage(uploadedImage, 0, 0, canvas.width, canvas.height);
        ctx.restore(); // 各フレームでrestore
        const frameData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        frames.push(frameData);
    }
    exportAnimation(frames, frameDelayMs, totalFrames);
});

// エクスポート関数（修正: GIFにtransparent追加、APNGにpremultiply処理）
function exportAnimation(frames, frameDelayMs, totalFrames) {
    const width = canvas.width;
    const height = canvas.height;
    const gifQualityMap = { '高品質': 10, '標準品質': 20, '低品質': 30 };
    const repeat = loop === Infinity ? 0 : loop - 1;

    if (outputFormat === 'GIF') {
        const gif = new GIF({
            workers: 2,
            quality: gifQualityMap[quality],
            repeat: repeat,
            width: width,
            height: height,
            workerScript: 'gif.worker.js',
            dither: colorLimit < 256 ? 'FloydSteinberg-serpentine' : false,
            transparent: 0x000000, // 黒を透過色に指定（PNG透過部が黒背景の場合調整）
            debug: true
        });
        frames.forEach((frameData) => {
            gif.addFrame(frameData, { delay: frameDelayMs, copy: true, dispose: -1 });
        });
        gif.on('finished', (blob) => {
            if (blob) {
                downloadFile(blob, 'animation.gif');
            } else {
                console.error('GIF生成失敗: blobがnull');
            }
        });
        gif.on('progress', (p) => console.log('GIF進捗: ' + p));
        gif.render();
    } else if (outputFormat === 'APNG') {
        const frameBuffers = frames.map((frameData) => {
            const data = frameData.data;
            // Premultiply alpha for transparency preservation during quantization
            for (let i = 0; i < data.length; i += 4) {
                const alpha = data[i + 3] / 255;
                data[i] = Math.round(data[i] * alpha);     // R
                data[i + 1] = Math.round(data[i + 1] * alpha); // G
                data[i + 2] = Math.round(data[i + 2] * alpha); // B
                // Alpha remains as is
            }
            return data.buffer; // ArrayBuffer (premultiplied RGBA)
        });
        const delays = new Array(totalFrames).fill(frameDelayMs);
        try {
            const apngBuffer = UPNG.encode(frameBuffers, width, height, colorLimit === 256 ? 0 : colorLimit, delays);
            const blob = new Blob([apngBuffer], { type: 'image/apng' });
            downloadFile(blob, 'animation.apng');
        } catch (e) {
            console.error('APNG生成エラー: ' + e.message);
        }
    }
}

// ダウンロード関数
function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    downloadButton.href = url;
    downloadButton.download = filename;
    downloadButton.style.display = 'block'; // ボタン表示
    // 自動クリックせず、ユーザーがクリックするよう (HTMLの⇩ボタン使用)
    document.querySelector('[data-label="推定ファイルサイズ"]').textContent = `${(blob.size / 1024).toFixed(2)} KB`;
}

// リセット/削除
resetButton.addEventListener('click', () => {
    animationType = '浮遊'; // デフォルトに戻す
    // 他の変数もリセット
    updatePreview();
});
deleteButton.addEventListener('click', () => {
    uploadedImage = null;
    if (canvas) canvas.remove();
    // 表示リセット
});
