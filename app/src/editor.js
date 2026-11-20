// Vice Sunset Studio — editor state and interactions.
// Owns the cover state, the photo slots, panel selection, drag-to-pan and
// wheel-to-zoom on the preview, and the PNG export.

import { LAYOUTS, drawCover, renderCoverPNG } from './cover.js';

export const EXPORT_SIZES = {
  '1920x1080': [1920, 1080],
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
};

function blankPanel(photoIndex) {
  return { photoIndex, zoom: 100, panX: 0, panY: 0, grade: 'sunset' };
}

export function freshState() {
  return {
    layout: 'triptych',
    panels: [blankPanel(0), blankPanel(1), blankPanel(0)],
    caption: 'Sunset Heist',
    subcaption: 'Vice City · Summer 2026',
    captionPlace: 'bottom',
    exportSize: '1920x1080',
  };
}

export function panelCount(state) {
  return (LAYOUTS[state.layout] || LAYOUTS.triptych)(1, 1).length;
}

// Grow or shrink the panel list to match the layout, keeping each panel's
// own settings where it still exists.
export function syncPanels(state) {
  const n = panelCount(state);
  while (state.panels.length < n) state.panels.push(blankPanel(state.panels.length % 3));
  state.panels.length = n;
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export function loadFileImage(file) {
  return loadImage(URL.createObjectURL(file));
}

// Which panel rect (in preview-canvas pixels) holds point (x, y)?
export function hitPanel(state, canvas, x, y) {
  const rects = (LAYOUTS[state.layout] || LAYOUTS.triptych)(canvas.width, canvas.height);
  const scaleX = canvas.width / canvas.clientWidth;
  const scaleY = canvas.height / canvas.clientHeight;
  const px = x * scaleX;
  const py = y * scaleY;
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h) return i;
  }
  return 0;
}

export function redrawPreview(canvas, state, photos) {
  // Keep the preview canvas at the export aspect ratio so the preview is
  // exactly what the PNG will be.
  const [w, h] = EXPORT_SIZES[state.exportSize] || EXPORT_SIZES['1920x1080'];
  const scale = Math.min(960 / w, 540 / h);
  const pw = Math.round(w * scale);
  const ph = Math.round(h * scale);
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw;
    canvas.height = ph;
  }
  drawCover(canvas, state, photos);
}

export async function exportPNG(state, photos, noteEl) {
  const [w, h] = EXPORT_SIZES[state.exportSize] || EXPORT_SIZES['1920x1080'];
  const blob = await renderCoverPNG(state, photos, w, h);
  if (!blob) {
    if (noteEl) noteEl.textContent = 'Export failed — try again.';
    return false;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `vice-sunset-cover-${w}x${h}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  if (noteEl) noteEl.textContent = `Saved vice-sunset-cover-${w}x${h}.png (${Math.round(blob.size / 1024)} KiB).`;
  return true;
}

// Drag-to-pan and wheel-to-zoom on the preview canvas. Returns a cleanup fn.
export function bindCanvasGestures(canvas, state, photos, onChange, getSelected, setSelected) {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  canvas.addEventListener('pointerdown', (e) => {
    const p = pos(e);
    setSelected(hitPanel(state, canvas, p.x, p.y));
    dragging = true;
    lastX = p.x;
    lastY = p.y;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const p = pos(e);
    const panel = state.panels[getSelected()];
    if (!panel) return;
    panel.panX = Math.max(-50, Math.min(50, panel.panX + (p.x - lastX) * 0.12));
    panel.panY = Math.max(-50, Math.min(50, panel.panY + (p.y - lastY) * 0.12));
    lastX = p.x;
    lastY = p.y;
    onChange();
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const panel = state.panels[getSelected()];
    if (!panel) return;
    panel.zoom = Math.max(100, Math.min(300, panel.zoom - Math.sign(e.deltaY) * 10));
    onChange();
  }, { passive: false });
}
