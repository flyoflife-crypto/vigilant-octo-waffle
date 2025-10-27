// lib/png.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as htmlToImage from 'html-to-image';

type ExportResult =
  | { ok: true; blob: Blob; path?: string | null; canceled?: boolean }
  | { ok: false; error: string; canceled?: boolean };

function waitFontsAndImages(root: HTMLElement | Document = document): Promise<void> {
  const fontsReady = (document as any).fonts?.ready ?? Promise.resolve();
  const imgs = Array.from((root instanceof Document ? root : root.ownerDocument!).images || []);
  const imgPromises = imgs.map((img) => {
    if ((img as any).complete && (img as any).naturalWidth) return Promise.resolve();
    return new Promise<void>((res) => {
      img.addEventListener('load', () => res(), { once: true });
      img.addEventListener('error', () => res(), { once: true }); // не блокируем на ошибках
    });
  });
  return Promise.all([fontsReady, ...imgPromises]).then(() => undefined);
}

function fmtDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
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

async function tryElectronSave(dataUrl: string, suggestedName: string) {
  const el = (window as any)?.electron;
  if (!el || typeof el.savePng !== 'function') return { used: false as const };
  try {
    const res = await el.savePng(dataUrl, suggestedName);
    return { used: true as const, res };
  } catch (e: any) {
    console.error('[PNG] Electron save failed, fallback to browser:', e);
    return { used: true as const, res: { ok: false, error: String(e?.message || e) } };
  }
}

/**
 * Пытается снять «цельный» PNG с указанного контейнера.
 * Если страница очень длинная, использует фолбэк «тайлинг» (склейку).
 * В браузере: загрузка файла. В Electron: системный диалог сохранения.
 */
export async function exportFullPagePng(
  rootSelector = '#onepagerRoot',
  fileName = `mars-onepager-${fmtDate()}.png`,
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

    const MAX_SAFE = 28000; // браузерные лимиты canvas по высоте; держим запас
    if (height <= MAX_SAFE) {
      // один большой снимок
      const dataUrl = await htmlToImage.toPng(root, {
        pixelRatio: window.devicePixelRatio || 1,
        width,
        height,
        style: { transform: 'none' }, // на всякий случай убираем масштаб
        skipFonts: false,
        cacheBust: true,
        backgroundColor: '#ffffff',
      });

      // Electron-путь: просим main сохранить через диалог
      const elSave = await tryElectronSave(dataUrl, fileName);
      if (elSave.used) {
        if (elSave.res?.ok) {
          // вернём также blob для унификации
          const blob = await (await fetch(dataUrl)).blob();
          return { ok: true, blob, path: elSave.res.path || null, canceled: !!elSave.res.canceled };
        }
        if (elSave.res?.canceled) return { ok: false, error: 'User canceled', canceled: true };
        // если Electron попытка была, но не удалась — упадём на браузерный фолбэк ниже
      }

      const blob = await (await fetch(dataUrl)).blob();
      if (opts.saveAs && 'showSaveFilePicker' in window) {
        await saveWithPicker(blob, fileName);
      } else {
        triggerDownload(blob, fileName);
      }
      return { ok: true, blob, path: null };
    }

    // Фолбэк: тайлинг (склейка кусками)
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
      backgroundColor: '#ffffff',
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
    await new Promise((res) => {
      if (img.complete) return res(null);
      img.onload = () => res(null);
      img.onerror = () => res(null);
    });
    ctx.drawImage(img, 0, y);
    y += img.height;
  }

  // готовим результат
  const dataUrl = canvas.toDataURL('image/png');
  const blob: Blob = await (await fetch(dataUrl)).blob();

  // Electron-путь
  const elSave = await tryElectronSave(dataUrl, fileName);
  if (elSave.used) {
    if (elSave.res?.ok) return { ok: true, blob, path: elSave.res.path || null, canceled: false };
    if (elSave.res?.canceled) return { ok: false, error: 'User canceled', canceled: true };
    // если попытка была, но неуспешна — падаем в браузерный путь ниже
  }

  if (opts.saveAs && 'showSaveFilePicker' in window) {
    await saveWithPicker(blob, fileName);
  } else {
    triggerDownload(blob, fileName);
  }
  return { ok: true, blob, path: null };
}

// Совместимость: альтернативное имя
export const saveFullPagePng = exportFullPagePng;