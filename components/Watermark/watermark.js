/**
 * @file 全站水印组件
 * @description 创建一个不可交互的固定水印层，并根据深色模式自动刷新样式。
 */

const WATERMARK_ID = 'global-watermark';

let dom = null;
let observer = null;
let resizeTimer = null;
let currentText = '';

export function init({ text }) {
    currentText = text || '';
    if (!currentText) return;

    dom = document.getElementById(WATERMARK_ID);
    if (!dom) {
        dom = document.createElement('div');
        dom.id = WATERMARK_ID;
        dom.setAttribute('aria-hidden', 'true');
        document.body.appendChild(dom);
    }

    renderWatermark();
    watchThemeChanges();
    window.addEventListener('resize', handleResize);
}

function handleResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderWatermark, 150);
}

function watchThemeChanges() {
    if (observer) observer.disconnect();

    observer = new MutationObserver(renderWatermark);
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
    });
}

function renderWatermark() {
    if (!dom || !currentText) return;

    const isDarkMode = document.documentElement.classList.contains('dark');
    const tileWidth = window.innerWidth < 640 ? 190 : 260;
    const tileHeight = window.innerWidth < 640 ? 140 : 180;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = tileWidth * pixelRatio;
    canvas.height = tileHeight * pixelRatio;
    canvas.style.width = `${tileWidth}px`;
    canvas.style.height = `${tileHeight}px`;

    ctx.scale(pixelRatio, pixelRatio);
    ctx.clearRect(0, 0, tileWidth, tileHeight);
    ctx.translate(tileWidth / 2, tileHeight / 2);
    ctx.rotate(-Math.PI / 7);

    ctx.font = '600 18px Inter, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(30, 64, 175, 0.09)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentText, 0, 0);

    dom.style.backgroundImage = `url("${canvas.toDataURL('image/png')}")`;
    dom.style.backgroundSize = `${tileWidth}px ${tileHeight}px`;
}
