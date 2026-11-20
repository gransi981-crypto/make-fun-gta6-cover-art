// Vice Sunset Studio — page wiring.
// Connects the controls to the editor state, loads sample photos for the
// demo buttons, and sets up fixed ?shot= scenes for screenshots.

import { drawCover } from './cover.js';
import {
  freshState, syncPanels, loadImage, loadFileImage,
  redrawPreview, exportPNG, bindCanvasGestures, hitPanel, EXPORT_SIZES,
} from './editor.js';

const state = freshState();
const photos = [null, null, null];
let selected = 0;

const canvas = document.getElementById('preview');
const $ = (id) => document.getElementById(id);
const captionInput = $('captionInput');
const subInput = $('subInput');
const captionPlace = $('captionPlace');
const exportSize = $('exportSize');
const sizeLabel = $('sizeLabel');
const zoomRange = $('zoomRange');
const zoomOut = $('zoomOut');
const panXRange = $('panXRange');
const panYRange = $('panYRange');
const panelPhoto = $('panelPhoto');
const panelGrade = $('panelGrade');
const exportNote = $('exportNote');

function refreshControls() {
  const panel = state.panels[selected];
  if (!panel) return;
  panelPhoto.value = String(panel.photoIndex);
  panelGrade.value = panel.grade;
  zoomRange.value = String(panel.zoom);
  zoomOut.textContent = `${panel.zoom}%`;
  panXRange.value = String(panel.panX);
  panYRange.value = String(panel.panY);
  document.querySelectorAll('.layout-row button').forEach((b) => {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  });
  document.querySelectorAll('.photo-slots .slot').forEach((slot, i) => {
    slot.classList.toggle('loaded', !!photos[i]);
  });
  sizeLabel.textContent = state.exportSize.replace('x', ' × ');
}

function redraw() {
  syncPanels(state);
  refreshControls();
  redrawPreview(canvas, state, photos);
}

function setSelected(i) {
  selected = Math.max(0, Math.min(state.panels.length - 1, i));
  refreshControls();
}

async function loadSample(name, slot) {
  const img = await loadImage(`samples/${name}.jpg`);
  photos[slot] = img;
  redraw();
}

document.querySelectorAll('.layout-row button').forEach((b) => {
  b.addEventListener('click', () => {
    state.layout = b.dataset.layout;
    selected = 0;
    redraw();
  });
});

['fileA', 'fileB', 'fileC'].forEach((id, slot) => {
  $(id).addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    photos[slot] = await loadFileImage(file);
    redraw();
  });
});

$('loadSampleBoulevard').addEventListener('click', () => loadSample('boulevard', 0));
$('loadSamplePier').addEventListener('click', () => loadSample('pier', 1));

panelPhoto.addEventListener('change', () => {
  state.panels[selected].photoIndex = Number(panelPhoto.value);
  redraw();
});
panelGrade.addEventListener('change', () => {
  state.panels[selected].grade = panelGrade.value;
  redraw();
});
zoomRange.addEventListener('input', () => {
  state.panels[selected].zoom = Number(zoomRange.value);
  redraw();
});
panXRange.addEventListener('input', () => {
  state.panels[selected].panX = Number(panXRange.value);
  redraw();
});
panYRange.addEventListener('input', () => {
  state.panels[selected].panY = Number(panYRange.value);
  redraw();
});
captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
subInput.addEventListener('input', () => { state.subcaption = subInput.value; redraw(); });
captionPlace.addEventListener('change', () => { state.captionPlace = captionPlace.value; redraw(); });
exportSize.addEventListener('change', () => { state.exportSize = exportSize.value; redraw(); });
$('exportBtn').addEventListener('click', () => exportPNG(state, photos, exportNote));

bindCanvasGestures(canvas, state, photos, redraw, () => selected, setSelected);

// --- Fixed scenes for screenshots -------------------------------------------
// ?shot=editor — the editor with a photo loaded.
// ?shot=cover  — the cover alone, filling the window.
// Extra params: photo, photo2, caption, sub, layout, size, grade.
async function runShot() {
  const q = new URLSearchParams(location.search);
  const shot = q.get('shot');
  if (!shot) return false;
  if (shot === 'cover') document.body.classList.add('shot-cover');

  const caption = q.get('caption');
  if (caption !== null) { state.caption = caption; captionInput.value = caption; }
  const sub = q.get('sub');
  if (sub !== null) { state.subcaption = sub; subInput.value = sub; }
  const layout = q.get('layout');
  if (layout) state.layout = layout;
  const size = q.get('size');
  if (size && EXPORT_SIZES[size]) { state.exportSize = size; exportSize.value = size; }
  const grade = q.get('grade');
  if (grade) state.panels.forEach((p) => { p.grade = grade; });

  // Load the named sample photos into slots A and B (photo2 defaults to
  // the same photo, so a one-photo cover fills every panel).
  const first = q.get('photo') || 'pier';
  const second = q.get('photo2') || first;
  photos[0] = await loadImage(`samples/${first}.jpg`);
  photos[1] = await loadImage(`samples/${second}.jpg`);
  state.panels.forEach((p, i) => {
    p.photoIndex = i % 2 === 0 ? 0 : 1;
  });

  if (shot === 'cover') {
    // In cover mode the canvas is the cover itself, sized to the window.
    const [w, h] = EXPORT_SIZES[state.exportSize] || EXPORT_SIZES['1920x1080'];
    canvas.width = w;
    canvas.height = h;
    drawCover(canvas, state, photos);
  } else {
    redraw();
  }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  window.__shotReady = true;
  return true;
}

if (!await runShot()) redraw();
