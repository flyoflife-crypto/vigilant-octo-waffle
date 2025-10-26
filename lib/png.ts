// lib/exporters/png.ts
import * as htmlToImage from 'html-to-image';

type ExportResult = { ok: true; blob: Blob } | { ok: false; error: string };

function waitFontsAndImages(root: HTMLElement | Document = document): Promise<void> {
  const fontsReady = (document as any).fonts?.ready ?? Promise.resolve();
  const imgs = Array.from((root instanceof Document ? root : root.ownerDocument!).images || []);
  const imgPromises = imgs.map(img => {
    if ((img as any).complete && (img as any).naturalWidth) return Promise.resolve();
    return new Promise<void>(res => {
      img.addEventListener('load', () => res(), { once: true });
      img.addEventListener('error', () => res(), { once: true }); // не блокируем на ошибках
    });
  });
  return Promise.all([fontsReady, ...imgPromises]).then(() => undefined);
}

/**
 * Пытается снять «цельный» PNG с указанного контейнера.
 * Если страница очень длинная (> ~16–20k px), использует фолбэк «тайлинг» (склейку).
 */
export async function exportFullPagePng(
  rootSelector = '#onepagerRoot',
  fileName = 'onepager.png',
  opts: { saveAs?: boolean } = {}
): Promise<ExportResult> {
  const root = document.querySelector<HTMLElement>(rootSelector) ?? document.body;
  if (!root) return { ok: false, error: `Root not found: ${rootSelector}` };

  // Сохраняем исходные стили, чтобы потом вернуть
  const prev = {
    htmlOverflow: document.documentElement.style.overflow,
    bodyOverflow: document.body.style.overflow,
    rootWidth: root.style.width,
    rootHeight: root.style.height,
  };

  // Считаем реальную ширину/высоту контента
  const width = Math.max(
    root.scrollWidth,
    document.documentElement.scrollWidth,
    document.body?.scrollWidth || 0
  );
  const height = Math.max(
    root.scrollHeight,
    document.documentElement.scrollHeight,
    document.body?.scrollHeight || 0
  );

  try {
    // Готовим страницу: снимаем скролл, растягиваем контейнер
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    root.style.width = `${width}px`;
    root.style.height = `${height}px`;

    await waitFontsAndImages(root);

    // Пытаемся сделать один большой снимок
    const MAX_SAFE = 28000; // браузерные лимиты canvas по высоте; держим запас
    if (height <= MAX_SAFE) {
      const dataUrl = await htmlToImage.toPng(root, {
        pixelRatio: window.devicePixelRatio || 1,
        width,
        height,
        style: { transform: 'none' }, // на всякий случай убираем масштаб
        skipFonts: false,
        cacheBust: true,
      });
      const blob = await (await fetch(dataUrl)).blob();
      if (opts.saveAs && 'showSaveFilePicker' in window) {
        await saveWithPicker(blob, fileName);
      } else {
        triggerDownload(blob, fileName);
      }
      return { ok: true, blob };
    }

    // Фолбэк: тайлинг (склейка кусками по вьюпорту)
    const res = await exportByTiling(root, width, height, fileName, opts);
    return res;

  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  } finally {
    // Возвращаем стили
    document.documentElement.style.overflow = prev.htmlOverflow;
    document.body.style.overflow = prev.bodyOverflow;
    root.style.width = prev.rootWidth;
    root.style.height = prev.rootHeight;
  }
}

function triggerDownload(blob: Blob, fileName: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 0);
}

/**
 * Склейка длинной страницы: рендерим по «экранам» и рисуем в единый canvas.
 */
async function exportByTiling(
  root: HTMLElement,
  width: number,
  height: number,
  fileName: string,
  opts: { saveAs?: boolean }
): Promise<ExportResult> {
  const tileH = Math.min(window.innerHeight || 1200, 2000);
  const tiles: Blob[] = [];
  const totalTiles = Math.ceil(height / tileH);

  for (let i = 0; i < totalTiles; i++) {
    const top = i * tileH;
    const dataUrl = await htmlToImage.toPng(root, {
      pixelRatio: window.devicePixelRatio || 1,
      width,
      height: Math.min(tileH, height - top),
      style: { transform: `translateY(-${top}px)` },
      skipFonts: false,
      cacheBust: true,
    });
    tiles.push(await (await fetch(dataUrl)).blob());
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  let y = 0;

  for (const tile of tiles) {
    const img = await blobToImage(tile);
    await new Promise(res => {
      if (img.complete) return res(null);
      img.onload = () => res(null);
      img.onerror = () => res(null);
    });
    ctx.drawImage(img, 0, y);
    y += img.height;
  }

  const finalBlob: Blob = await new Promise<Blob>(res => canvas.toBlob(b => res(b!), 'image/png'));
  if (opts.saveAs && 'showSaveFilePicker' in window) {
    await saveWithPicker(finalBlob, fileName);
  } else {
    triggerDownload(finalBlob, fileName);
  }
  return { ok: true, blob: finalBlob };
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(img); };
    img.src = url;
  });
}

async function saveWithPicker(blob: Blob, suggestedName: string) {
  const handle = await (window as any).showSaveFilePicker({
    suggestedName,
    types: [{ description: 'PNG Image', accept: { 'image/png': ['.png'] } }],
    excludeAcceptAllOption: false,
  });
  const stream = await handle.createWritable();
  await stream.write(blob);
  await stream.close();
}