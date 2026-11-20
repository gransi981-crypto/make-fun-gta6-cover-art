// Vice Sunset Studio — cover renderer.
// Draws the multi-panel poster onto any canvas: preview, export, or the
// full-window shot used for screenshots. No network, no fonts to load:
// lettering is system heavy sans with canvas gradients and outlines.

export const LAYOUTS = {
  single: (w, h) => [{ x: 0, y: 0, w, h }],
  duo: (w, h) => [
    { x: 0, y: 0, w: w * 0.56, h },
    { x: w * 0.56, y: 0, w: w * 0.44, h },
  ],
  triptych: (w, h) => [
    { x: 0, y: 0, w: w * 0.3, h },
    { x: w * 0.3, y: 0, w: w * 0.4, h },
    { x: w * 0.7, y: 0, w: w * 0.3, h },
  ],
  grid: (w, h) => [
    { x: 0, y: 0, w: w / 2, h: h / 2 },
    { x: w / 2, y: 0, w: w / 2, h: h / 2 },
    { x: 0, y: h / 2, w: w / 2, h: h / 2 },
    { x: w / 2, y: h / 2, w: w / 2, h: h / 2 },
  ],
};

export const GRADES = {
  sunset: { top: 'rgba(255,122,26,0.20)', bottom: 'rgba(255,46,136,0.30)', glow: '#ff7a1a' },
  neon: { top: 'rgba(45,226,255,0.18)', bottom: 'rgba(255,46,136,0.34)', glow: '#ff2e88' },
  vice: { top: 'rgba(123,47,255,0.26)', bottom: 'rgba(20,8,40,0.30)', glow: '#7b2fff' },
  noir: { top: 'rgba(0,0,0,0.10)', bottom: 'rgba(0,0,0,0.34)', glow: '#888888' },
  original: { top: 'rgba(0,0,0,0)', bottom: 'rgba(0,0,0,0.16)', glow: '#ff9a3d' },
};

// Tiny deterministic pseudo-random stream, so the film grain looks the
// same on every render of the same cover.
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function drawPhotoInto(ctx, img, rect, panel) {
  const zoom = (panel.zoom || 100) / 100;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = rect.x + (rect.w - dw) / 2 + (panel.panX || 0) * rect.w * 0.01;
  const dy = rect.y + (rect.h - dh) / 2 + (panel.panY || 0) * rect.h * 0.01;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (panel.grade === 'noir') ctx.filter = 'grayscale(1) contrast(1.15)';
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.filter = 'none';
  ctx.restore();
}

function gradePanel(ctx, rect, gradeName) {
  const g = GRADES[gradeName] || GRADES.sunset;
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  grad.addColorStop(0, g.top);
  grad.addColorStop(1, g.bottom);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  // Vignette: darkened corners pull the eye to the middle of the panel.
  const vig = ctx.createRadialGradient(
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.min(rect.w, rect.h) * 0.35,
    rect.x + rect.w / 2, rect.y + rect.h / 2, Math.max(rect.w, rect.h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10,2,20,0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();
}

function grain(ctx, w, h, seed) {
  const rand = seededRandom(seed);
  ctx.save();
  ctx.globalAlpha = 0.07;
  for (let i = 0; i < 900; i++) {
    const x = rand() * w;
    const y = rand() * h;
    ctx.fillStyle = rand() > 0.5 ? '#ffffff' : '#000000';
    ctx.fillRect(x, y, 1.6, 1.6);
  }
  ctx.restore();
}

function drawSun(ctx, w, h, color, layout) {
  // A low striped sunset disc, half-hidden behind the caption band.
  // In a 2x2 grid it shrinks and drops lower so it never covers a face.
  const small = layout === 'grid';
  const cx = w * (small ? 0.88 : 0.84);
  const cy = h * (small ? 0.75 : 0.66);
  const r = Math.min(w, h) * (small ? 0.13 : 0.2);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const grad = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  grad.addColorStop(0, '#ffd23d');
  grad.addColorStop(0.55, '#ff7a1a');
  grad.addColorStop(1, color);
  ctx.fillStyle = grad;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = 'rgba(20,9,31,0.55)';
  for (let i = 0; i < 5; i++) {
    const y = cy + r * 0.05 + i * r * 0.16;
    ctx.fillRect(cx - r, y, r * 2, r * 0.045);
  }
  ctx.restore();
}

function fitCaptionFont(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `900 ${size}px "Arial Black", Impact, "Helvetica Neue", sans-serif`;
  while (size > 28 && ctx.measureText(text).width > maxWidth) {
    size -= 4;
    ctx.font = `900 ${size}px "Arial Black", Impact, "Helvetica Neue", sans-serif`;
  }
  return size;
}

function drawCaption(ctx, w, h, state) {
  const text = (state.caption || '').trim().toUpperCase();
  const sub = (state.subcaption || '').trim().toUpperCase();
  if (!text && !sub) return;
  const margin = w * 0.045;
  const maxWidth = w - margin * 2;
  const atTop = state.captionPlace === 'top';
  const bandH = h * (text ? 0.24 : 0.1);
  const bandY = atTop ? 0 : h - bandH;
  // Dark band so the lettering reads over any photo.
  const band = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  if (atTop) {
    band.addColorStop(0, 'rgba(12,4,24,0.88)');
    band.addColorStop(1, 'rgba(12,4,24,0)');
  } else {
    band.addColorStop(0, 'rgba(12,4,24,0)');
    band.addColorStop(1, 'rgba(12,4,24,0.88)');
  }
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, w, bandH);

  if (text) {
    const size = fitCaptionFont(ctx, text, maxWidth, Math.round(w * 0.085));
    const fill = ctx.createLinearGradient(0, bandY, 0, bandY + size * 1.4);
    fill.addColorStop(0, '#fff6c9');
    fill.addColorStop(0.45, '#ffd23d');
    fill.addColorStop(0.75, '#ff7a1a');
    fill.addColorStop(1, '#ff2e88');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    const cy = atTop ? bandY + bandH * 0.42 : h - bandH * 0.6;
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = size * 0.12;
    ctx.shadowOffsetY = size * 0.045;
    ctx.lineWidth = Math.max(4, size * 0.09);
    ctx.strokeStyle = '#160826';
    ctx.strokeText(text, w / 2, cy);
    ctx.fillStyle = fill;
    ctx.fillText(text, w / 2, cy);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    if (sub) {
      const subSize = Math.max(14, Math.round(size * 0.22));
      ctx.font = `700 ${subSize}px "Arial Black", Impact, sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.lineWidth = Math.max(3, subSize * 0.2);
      ctx.strokeStyle = '#160826';
      const sy = cy + size * 0.58;
      ctx.strokeText(sub, w / 2, sy);
      ctx.fillText(sub, w / 2, sy);
    }
  }
}

function drawFrame(ctx, w, h) {
  // Thin neon frame + corner ticks, the poster's edge.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,210,61,0.9)';
  ctx.lineWidth = Math.max(3, w * 0.004);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  ctx.strokeStyle = 'rgba(45,226,255,0.85)';
  ctx.lineWidth = Math.max(2, w * 0.002);
  const t = w * 0.03;
  const o = w * 0.012;
  for (const [cx, cy, sx, sy] of [[o, o, 1, 1], [w - o, o, -1, 1], [o, h - o, 1, -1], [w - o, h - o, -1, -1]]) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * t, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + sy * t);
    ctx.stroke();
  }
  ctx.restore();
}

// state: { layout, panels: [{photoIndex, zoom, panX, panY, grade}],
//          caption, subcaption, captionPlace }
// photos: array of HTMLImageElement | null, indexed by photo slot.
export function drawCover(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#14091f';
  ctx.fillRect(0, 0, w, h);

  const rects = (LAYOUTS[state.layout] || LAYOUTS.triptych)(w, h);
  const panels = state.panels || [];
  rects.forEach((rect, i) => {
    const panel = panels[i] || { photoIndex: 0, zoom: 100, panX: 0, panY: 0, grade: 'sunset' };
    const img = photos[panel.photoIndex];
    if (img) {
      drawPhotoInto(ctx, img, rect, panel);
    } else {
      // Empty panel: a dusk gradient so the cover still reads as a poster.
      const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
      g.addColorStop(0, '#3a1450');
      g.addColorStop(1, '#ff2e88');
      ctx.fillStyle = g;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    gradePanel(ctx, rect, panel.grade);
    // Seam between panels.
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = Math.max(2, w * 0.003);
    ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
  });

  drawSun(ctx, w, h, (GRADES[(panels[0] || {}).grade] || GRADES.sunset).glow, state.layout);
  grain(ctx, w, h, 20261120 + w + h);
  drawCaption(ctx, w, h, state);
  drawFrame(ctx, w, h);
  return canvas;
}

export function renderCoverPNG(state, photos, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCover(canvas, state, photos);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
