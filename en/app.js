/* StoreFit — App Store Connect image size converter
   Runs fully in the browser: exact pixel output, flattened background, RGB-only PNG, ZIP packaging. */

(function () {
  'use strict';

  const APP_VERSION = '1.0.0';
  const STORAGE_KEY = 'storefit.settings.v1';
  const MAX_SOURCES = 24;
  const SCREENSHOT_LIMIT = 10;
  const PNG_SUPPORTED = typeof CompressionStream === 'function' && typeof Response === 'function';

  /* ---------------------------------------------------------------- targets */

  const TARGETS = {
    header21: {
      group: 'creative', name: 'Product page header', short: 'Header 21:9', ratio: '21:9',
      fixed: [3840, 1646], formats: ['jpg', 'png'],
      sub: 'Banner image · Largest preset', prefix: 'Header-21x9',
      folder: 'Creative/01-Header-21x9-3840x1646',
    },
    header16: {
      group: 'creative', name: 'Product page header', short: 'Header 16:9', ratio: '16:9',
      fixed: [5244, 2950], formats: ['png'], pngOnly: true,
      sub: 'Shared PNG-only dimensions', prefix: 'Header-16x9',
      folder: 'Creative/02-Header-16x9-5244x2950',
    },
    search32: {
      group: 'creative', name: 'Search results', short: 'Search 3:2', ratio: '3:2',
      fixed: [3840, 2560], formats: ['jpg', 'png'],
      sub: '1920×1280 minimum, up to 3840×2560', prefix: 'Search-3x2',
      folder: 'Creative/03-Search-3x2-3840x2560',
    },
    search16: {
      group: 'creative', name: 'Search results', short: 'Search 16:9', ratio: '16:9',
      fixed: [5244, 2950], formats: ['png'], pngOnly: true,
      sub: 'Shares the header asset', prefix: 'Search-16x9',
      folder: 'Creative/04-Search-16x9-5244x2950',
    },

    iphone69: {
      group: 'screenshots', name: 'iPhone 6.9″', short: 'iPhone 6.9', ratio: '19.5:9',
      dims: [[1320, 2868], [2868, 1320]], formats: ['jpg', 'png'], maxCount: SCREENSHOT_LIMIT,
      sub: 'iPhone 17 Pro Max and others', prefix: 'iPhone-6.9',
      folder: 'Screenshots/iPhone-6.9',
    },
    iphone65: {
      group: 'screenshots', name: 'iPhone 6.5″', short: 'iPhone 6.5', ratio: '19.3:9',
      dims: [[1284, 2778], [2778, 1284]], formats: ['jpg', 'png'], maxCount: SCREENSHOT_LIMIT,
      sub: 'Older iPhone sizes', prefix: 'iPhone-6.5',
      folder: 'Screenshots/iPhone-6.5',
    },
    ipad13: {
      group: 'screenshots', name: 'iPad 13″', short: 'iPad 13', ratio: '3:4',
      dims: [[2064, 2752], [2752, 2064]], formats: ['jpg', 'png'], maxCount: SCREENSHOT_LIMIT,
      sub: 'iPad Air / Pro 13', prefix: 'iPad-13',
      folder: 'Screenshots/iPad-13',
    },
    ipad129: {
      group: 'screenshots', name: 'iPad 12.9″', short: 'iPad 12.9', ratio: '3:4',
      dims: [[2048, 2732], [2732, 2048]], formats: ['jpg', 'png'], maxCount: SCREENSHOT_LIMIT,
      sub: 'iPad Pro 12.9', prefix: 'iPad-12.9',
      folder: 'Screenshots/iPad-12.9',
    },

    mac: {
      group: 'more', name: 'Mac Screenshots', short: 'Mac', ratio: '16:10',
      fixed: [2880, 1800], formats: ['jpg', 'png'], maxCount: SCREENSHOT_LIMIT,
      sub: 'also accepts 2560×1600 and others', prefix: 'Mac',
      folder: 'Screenshots/Mac-2880x1800',
    },
    tv: {
      group: 'more', name: 'Apple TV', short: 'Apple TV', ratio: '16:9',
      fixed: [3840, 2160], formats: ['jpg', 'png'], maxCount: SCREENSHOT_LIMIT,
      sub: 'or 1920×1080', prefix: 'AppleTV',
      folder: 'Screenshots/Apple-TV-3840x2160',
    },
    vision: {
      group: 'more', name: 'Apple Vision Pro', short: 'Vision Pro', ratio: '16:9',
      fixed: [3840, 2160], formats: ['jpg', 'png'], maxCount: SCREENSHOT_LIMIT,
      sub: 'Shared and full space assets', prefix: 'VisionPro',
      folder: 'Screenshots/Vision-Pro-3840x2160',
    },
    watch: {
      group: 'more', name: 'Apple Watch', short: 'Watch', ratio: '422:514',
      fixed: [422, 514], formats: ['jpg', 'png'], maxCount: SCREENSHOT_LIMIT,
      sub: 'Ultra 4/3 Largest preset', prefix: 'Watch-Ultra',
      folder: 'Screenshots/Apple-Watch-422x514',
    },
    eventCard: {
      group: 'more', name: 'In-app event card', short: 'Event card', ratio: '16:9',
      fixed: [3840, 2160], formats: ['jpg', 'png'],
      sub: '1920×1080 minimum', prefix: 'Event-Card',
      folder: 'In-App-Events/Card-16x9-3840x2160',
    },
    eventDetail: {
      group: 'more', name: 'In-app event detail', short: 'Event detail', ratio: '9:16',
      fixed: [2160, 3840], formats: ['jpg', 'png'],
      sub: '1080×1920 minimum', prefix: 'Event-Detail',
      folder: 'In-App-Events/Detail-9x16-2160x3840',
    },
    custom: {
      group: 'more', name: 'Custom dimensions', short: 'Custom', ratio: 'Custom',
      custom: true, formats: ['jpg', 'png'],
      sub: 'Any 100–20000 px', prefix: 'Custom',
      folder: 'Custom',
    },
  };

  const GROUPS = {
    creative: ['header21', 'header16', 'search32', 'search16'],
    screenshots: ['iphone69', 'iphone65', 'ipad13', 'ipad129'],
    more: ['mac', 'tv', 'vision', 'watch', 'eventCard', 'eventDetail'],
  };

  const ANCHORS = [
    ['nw', 0, 0], ['n', 0.5, 0], ['ne', 1, 0],
    ['w', 0, 0.5], ['c', 0.5, 0.5], ['e', 1, 0.5],
    ['sw', 0, 1], ['s', 0.5, 1], ['se', 1, 1],
  ];

  const ANCHOR_LABEL = {
    nw: 'Top left', n: 'Top', ne: 'Top right',
    w: 'Left', c: 'Center', e: 'Right',
    sw: 'Bottom left', s: 'Bottom', se: 'Bottom right',
  };

  const FIT_LABEL = { blur: 'Blurred background', solid: 'Solid padding', cover: 'Crop to fill' };

  /* ---------------------------------------------------------------- helpers */

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, html) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  };
  const icon = (id) => `<svg class="icon" aria-hidden="true"><use href="#${id}"/></svg>`;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function formatBytes(n) {
    if (!Number.isFinite(n)) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB';
    return (n / 1048576).toFixed(n > 52428800 ? 1 : 2) + ' MB';
  }

  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
    if (!m) return [245, 245, 247];
    const v = parseInt(m[1], 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }

  const rgbToHex = (r, g, b) => '#' + [r, g, b].map((x) => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase();

  // A backgrounded tab stops firing rAF, so race it to keep long exports moving.
  const nextPaint = () => new Promise((resolve) => {
    let settled = false;
    const finish = () => { if (!settled) { settled = true; resolve(); } };
    requestAnimationFrame(() => setTimeout(finish, 0));
    setTimeout(finish, 120);
  });

  /* ---------------------------------------------------------------- state */

  const state = {
    sources: [],
    selected: new Set(),
    orientation: 'portrait',
    fit: 'blur',
    bgColor: '#F5F5F7',
    anchor: 'c',
    format: 'png',
    quality: 95,
    customW: '',
    customH: '',
    previewTarget: null,
    previewSource: 0,
    lastZip: null,
  };

  let uid = 0;
  const nextId = () => 's' + (++uid) + Date.now().toString(36);

  /* ---------------------------------------------------------- dimensions */

  function getDims(id) {
    const t = TARGETS[id];
    if (!t) return null;
    if (t.custom) {
      const w = Math.round(Number(state.customW));
      const h = Math.round(Number(state.customH));
      if (!Number.isFinite(w) || !Number.isFinite(h) || w < 100 || h < 100 || w > 20000 || h > 20000) {
        return { w: 0, h: 0, error: 'range' };
      }
      if (w * h > 100000000) return { w: 0, h: 0, error: 'area' };
      if (String(state.customW) !== String(w) || String(state.customH) !== String(h)) {
        return { w: 0, h: 0, error: 'range' };
      }
      return { w, h };
    }
    if (t.fixed) return { w: t.fixed[0], h: t.fixed[1] };
    const pair = t.dims[state.orientation === 'landscape' ? 1 : 0];
    return { w: pair[0], h: pair[1] };
  }

  function dimsText(id) {
    const d = getDims(id);
    if (!d || !d.w) return 'Enter dimensions';
    return d.w + ' × ' + d.h;
  }

  function effectiveFormat(id) {
    const t = TARGETS[id];
    return t.pngOnly ? 'png' : state.format;
  }

  function folderFor(id) {
    const t = TARGETS[id];
    if (!t.custom) return t.folder;
    const d = getDims(id);
    return 'Custom/' + (d.w ? d.w + 'x' + d.h : 'set-size');
  }

  function isScreenshotCapTarget(id) {
    return Boolean(TARGETS[id].maxCount);
  }

  function selectedIds() {
    return Object.keys(TARGETS).filter((id) => state.selected.has(id) && id !== 'custom' )
      .concat(state.selected.has('custom') ? ['custom'] : []);
  }

  function validSelectedIds() {
    return selectedIds().filter((id) => {
      const d = getDims(id);
      return d && d.w > 0;
    });
  }

  /* ------------------------------------------------------------ sources */

  async function toBitmap(blob) {
    try {
      return await createImageBitmap(blob, { imageOrientation: 'from-image' });
    } catch (err) {
      return await createImageBitmap(blob);
    }
  }

  function kindOf(file) {
    if (/^image\/vnd\.aria/.test(file.type)) return 'PNG';
    if (file.type === 'image/jpeg') return 'JPG';
    if (file.type === 'image/png') return 'PNG';
    if (file.type === 'image/webp') return 'WebP';
    if (file.type === 'image/heic') return 'HEIC';
    return (file.type.split('/')[1] || 'Image').toUpperCase().slice(0, 4);
  }

  async function addFiles(files) {
    const list = Array.from(files || []).filter((f) => /^image\//.test(f.type) || /\.(png|jpe?g|webp|heic)$/i.test(f.name));
    if (!list.length) {
      toast('Only PNG, JPG, and WebP images are supported');
      return;
    }
    const room = MAX_SOURCES - state.sources.length;
    if (room <= 0) {
      toast(`Up to ${MAX_SOURCES} images; remove some images first`);
      return;
    }
    const batch = list.slice(0, room);
    let added = 0;
    for (const file of batch) {
      try {
        const bitmap = await toBitmap(file);
        state.sources.push({
          id: nextId(),
          name: file.name || 'image',
          file,
          bitmap,
          width: bitmap.width,
          height: bitmap.height,
          kind: kindOf(file),
          size: file.size,
          thumb: URL.createObjectURL(file),
        });
        added++;
      } catch (err) {
        console.error('StoreFit decode:', err);
        toast(`“${file.name}” could not be decoded and was skipped`);
      }
    }
    if (list.length > room) toast(`Added ${added} images; skipped images beyond the ${MAX_SOURCES} image limit`);
    if (state.sources.length && !state.sources[state.previewSource]) state.previewSource = 0;
    renderAll();
    saveSettings();
  }

  async function addFromUrls(urls) {
    const files = [];
    for (const url of urls) {
      const res = await fetch(url);
      const blob = await res.blob();
      const name = decodeURIComponent(String(url).split('/').pop().split('?')[0]) || 'image.png';
      files.push(new File([blob], name, { type: blob.type }));
    }
    await addFiles(files);
    return state.sources.length;
  }

  function removeSource(id) {
    const idx = state.sources.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const [gone] = state.sources.splice(idx, 1);
    try { URL.revokeObjectURL(gone.thumb); } catch (err) {}
    if (gone.bitmap && gone.bitmap.close) { try { gone.bitmap.close(); } catch (err) {} }
    state.previewSource = clamp(state.previewSource, 0, Math.max(0, state.sources.length - 1));
    renderAll();
    saveSettings();
  }

  function moveSource(id, delta) {
    const from = state.sources.findIndex((s) => s.id === id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= state.sources.length) return;
    const [item] = state.sources.splice(from, 1);
    state.sources.splice(to, 0, item);
    state.previewSource = to;
    renderAll();
    saveSettings();
  }

  function trimToLimit() {
    while (state.sources.length > SCREENSHOT_LIMIT) {
      const gone = state.sources.pop();
      try { URL.revokeObjectURL(gone.thumb); } catch (err) {}
      if (gone.bitmap && gone.bitmap.close) { try { gone.bitmap.close(); } catch (err) {} }
    }
    state.previewSource = clamp(state.previewSource, 0, state.sources.length - 1);
    renderAll();
    saveSettings();
    toast(`Kept the first ${SCREENSHOT_LIMIT} images`);
  }

  function clearSources() {
    state.sources.forEach((s) => {
      try { URL.revokeObjectURL(s.thumb); } catch (err) {}
      if (s.bitmap && s.bitmap.close) { try { s.bitmap.close(); } catch (err) {} }
    });
    state.sources = [];
    state.previewSource = 0;
    renderAll();
    saveSettings();
  }

  /* ------------------------------------------------------------- DOM refs */

  const dom = {};
  function cacheDom() {
    const ids = ['dropZone', 'fileInput', 'sources', 'sourcesGrid', 'sourceCount', 'addMoreBtn', 'clearBtn',
      'sourceLimitNotice', 'trimSourcesBtn', 'creativeGrid', 'screenshotGrid', 'moreGrid', 'moreTargets',
      'orientationControl', 'customCard', 'customCheck', 'customW', 'customH', 'swapCustom', 'customError',
      'fitGrid', 'bgRow', 'swatches', 'bgColor', 'bgHex', 'autoColorBtn', 'anchorGrid', 'anchorRow',
      'formatControl', 'qualityControl', 'qualityRange', 'qualityValue', 'formatHint', 'previewTabs',
      'previewStage', 'previewEmpty', 'previewCanvas', 'previewMeta', 'previewName', 'previewSource',
      'previewBadges', 'previewNav', 'prevSourceBtn', 'nextSourceBtn', 'sourcePosition', 'previewWarnings',
      'emptyTitle', 'emptySub', 'totalOutputs', 'summaryDetail', 'exportBtn', 'exportLabel', 'specsBtn',
      'specsDialog', 'progressDialog', 'progressText', 'progressBar', 'progressCount', 'cancelExportBtn',
      'resultDialog', 'resultSummary', 'resultList', 'closeResultBtn', 'downloadAgainBtn', 'toast', 'uploadCard'];
    ids.forEach((id) => { dom[id] = document.getElementById(id); });
  }

  /* ---------------------------------------------------------- build cards */

  function buildTargetCards() {
    const make = (id) => {
      const t = TARGETS[id];
      const card = el('label', 'target-card');
      card.dataset.target = id;
      const fmts = t.pngOnly
        ? '<span class="fmt png-only">PNG only</span>'
        : t.formats.map((f) => `<span class="fmt">${f === 'jpg' ? 'JPEG' : 'PNG'}</span>`).join('');
      card.innerHTML =
        `<input type="checkbox" data-target-check="${id}">` +
        `<span class="tick">${icon('i-check')}</span>` +
        `<span class="t-top"><span class="t-name">${escapeHtml(t.name)}</span><span class="t-ratio">${escapeHtml(t.ratio)}</span></span>` +
        `<span class="t-dims" data-dims="${id}">${dimsText(id)}<span class="px">px</span></span>` +
        `<span class="t-sub">${escapeHtml(t.sub)}</span>` +
        `<span class="t-bottom">${fmts}</span>`;
      return card;
    };
    GROUPS.creative.forEach((id) => dom.creativeGrid.appendChild(make(id)));
    GROUPS.screenshots.forEach((id) => dom.screenshotGrid.appendChild(make(id)));
    GROUPS.more.forEach((id) => dom.moreGrid.appendChild(make(id)));

    const grid = dom.anchorGrid;
    ANCHORS.forEach(([key]) => {
      const b = el('button', 'anchor-button');
      b.type = 'button';
      b.dataset.anchor = key;
      b.setAttribute('aria-label', 'Keep ' + ANCHOR_LABEL[key] + ' area');
      b.title = ANCHOR_LABEL[key];
      grid.appendChild(b);
    });
  }

  function refreshDynamicDims() {
    document.querySelectorAll('[data-dims]').forEach((node) => {
      node.innerHTML = dimsText(node.dataset.dims) + '<span class="px">px</span>';
    });
  }

  /* ------------------------------------------------------------ rendering */

  function renderSources() {
    const list = state.sources;
    dom.sources.hidden = list.length === 0;
    dom.clearBtn.hidden = list.length === 0;
    dom.sourceCount.textContent = String(list.length);

    const grid = dom.sourcesGrid;
    grid.innerHTML = '';
    list.forEach((s, i) => {
      const card = el('div', 'source' + (i === state.previewSource ? ' selected' : ''));
      card.dataset.id = s.id;
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Image ${i + 1}: ${s.name}; click to preview`);
      card.innerHTML =
        `<div class="source-thumb">` +
          `<img src="${s.thumb}" alt="">` +
          `<span class="order-badge">${i + 1}</span>` +
          `<button type="button" class="remove-button" data-action="remove" aria-label="Remove ${escapeHtml(s.name)}">${icon('i-close')}</button>` +
          (i === state.previewSource ? `<span class="selected-pill">Previewing</span>` : '') +
        `</div>` +
        `<div class="source-meta">` +
          `<p class="source-name" title="${escapeHtml(s.name)}">${escapeHtml(s.name)}</p>` +
          `<p class="source-dims">${s.width} × ${s.height} · ${s.kind}</p>` +
        `</div>` +
        `<div class="source-foot">` +
          `<span class="tiny">${formatBytes(s.size)}</span>` +
          `<span class="move-group">` +
            `<button type="button" class="move-button" data-action="left" ${i === 0 ? 'disabled' : ''} aria-label="Move earlier">${icon('i-arrow-left-sm')}</button>` +
            `<button type="button" class="move-button" data-action="right" ${i === list.length - 1 ? 'disabled' : ''} aria-label="Move later">${icon('i-arrow-right-sm')}</button>` +
          `</span>` +
        `</div>`;
      grid.appendChild(card);
    });

    const count = state.sources.length;
    const cappedIds = validSelectedIds().filter(isScreenshotCapTarget);
    const notice = count > SCREENSHOT_LIMIT;
    dom.sourceLimitNotice.hidden = !notice;
    dom.trimSourcesBtn.hidden = !(notice && cappedIds.length > 0);
    if (notice) {
      const strong = dom.sourceLimitNotice.querySelector('strong');
      const para = dom.sourceLimitNotice.querySelector('p');
      if (cappedIds.length) {
        strong.textContent = 'Too many screenshots';
        para.textContent = 'Each screenshot size supports up to 10 images. Remove images or keep the first 10.';
      } else {
        strong.textContent = `Currently ${count} images`;
        para.textContent = 'Screenshot targets support up to 10 images per size.';
      }
    }
  }

  function renderTargets() {
    document.querySelectorAll('.target-card').forEach((card) => {
      const id = card.dataset.target;
      const on = state.selected.has(id);
      card.classList.toggle('selected', on);
      card.querySelector('input').checked = on;
    });
    dom.customCard.classList.toggle('selected', state.selected.has('custom'));
    dom.customCheck.checked = state.selected.has('custom');

    const customOn = state.selected.has('custom');
    dom.customW.disabled = !customOn;
    dom.customH.disabled = !customOn;
    dom.swapCustom.disabled = !customOn;

    Object.keys(GROUPS).forEach((group) => {
      const btn = document.querySelector(`[data-select-group="${group}"]`);
      if (!btn) return;
      const ids = GROUPS[group];
      const all = ids.every((id) => state.selected.has(id));
      btn.textContent = all ? 'Deselect all' : 'Select all';
    });

    refreshDynamicDims();
  }

  function renderOptions() {
    dom.fitGrid.querySelectorAll('.fit-option').forEach((card) => {
      const on = card.dataset.fitCard === state.fit;
      card.classList.toggle('active', on);
      card.querySelector('input').checked = on;
    });
    const needsBg = state.fit !== 'cover';
    dom.bgRow.hidden = !needsBg;
    dom.anchorRow.hidden = state.fit !== 'cover';

    dom.bgColor.value = state.bgColor.toLowerCase();
    dom.bgHex.textContent = state.bgColor.toUpperCase();
    dom.swatches.querySelectorAll('.swatch').forEach((sw) => {
      sw.classList.toggle('active', sw.dataset.color.toUpperCase() === state.bgColor.toUpperCase());
    });
    dom.anchorGrid.querySelectorAll('.anchor-button').forEach((b) => {
      b.classList.toggle('active', b.dataset.anchor === state.anchor);
    });

    dom.formatControl.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('active', b.dataset.format === state.format);
    });
    dom.qualityControl.hidden = state.format !== 'jpg';
    dom.qualityValue.textContent = state.quality + '%';
    dom.qualityRange.value = String(state.quality);

    const pngForced = ['header16', 'search16'].filter((id) => state.selected.has(id));
    if (state.format === 'jpg' && pngForced.length) {
      dom.formatHint.textContent = `JPEG is selected; ${TARGETS[pngForced[0]].name} (5244 × 2950)requires PNG and will export as PNG automatically.`;
    } else if (state.format === 'jpg') {
      dom.formatHint.textContent = 'JPEG produces smaller files for photos. PNG preserves sharper text.';
    } else if (!PNG_SUPPORTED) {
      dom.formatHint.textContent = 'This browser cannot encode RGB PNG. Standard PNG may retain an alpha channel.';
    } else {
      dom.formatHint.textContent = 'PNG uses RGB encoding without an alpha channel, ideal for text and interface screenshots.';
    }
  }

  function renderPreviewTabs() {
    const ids = validSelectedIds();
    if (!ids.includes(state.previewTarget)) state.previewTarget = ids[0] || null;
    dom.previewTabs.innerHTML = '';
    ids.forEach((id) => {
      const b = el('button', id === state.previewTarget ? 'active' : undefined, escapeHtml(TARGETS[id].short));
      b.type = 'button';
      b.dataset.previewTarget = id;
      dom.previewTabs.appendChild(b);
    });
  }

  function paintPreview() {
    const canvas = dom.previewCanvas;
    const ids = validSelectedIds();
    const source = state.sources[state.previewSource];

    const hasTargets = ids.length > 0;
    const hasSource = Boolean(source);

    if (!hasSource || !hasTargets) {
      canvas.hidden = true;
      dom.previewMeta.hidden = true;
      dom.previewNav.hidden = true;
      dom.previewEmpty.hidden = false;
      if (!hasSource) {
        dom.emptyTitle.textContent = 'Add images first';
        dom.emptySub.textContent = 'Drop or paste an image to preview the result here.';
      } else {
        dom.emptyTitle.textContent = 'Select output sizes';
        dom.emptySub.textContent = `Ready: ${state.sources.length} images; select targets to preview the output.`;
      }
      return;
    }

    const id = state.previewTarget || ids[0];
    const dims = getDims(id);
    if (!dims || !dims.w) return;

    const scale = Math.min(1, 1500 / Math.max(dims.w, dims.h));
    canvas.width = Math.max(1, Math.round(dims.w * scale));
    canvas.height = Math.max(1, Math.round(dims.h * scale));
    const ctx = canvas.getContext('2d');
    drawTarget(ctx, source.bitmap, canvas.width, canvas.height, {
      fit: state.fit, bgColor: state.bgColor, anchor: state.anchor,
      previewRatio: scale,
    });
    canvas.hidden = false;
    dom.previewEmpty.hidden = true;

    dom.previewMeta.hidden = false;
    dom.previewName.textContent = `${TARGETS[id].name} · ${dims.w} × ${dims.h}`;
    dom.previewSource.textContent = `Source ${state.previewSource + 1}/${state.sources.length} · ${source.name}`;
    const fmt = effectiveFormat(id);
    const badges = [
      `<span class="pb accent">${dims.w}×${dims.h}</span>`,
      `<span class="pb">${fmt === 'jpg' ? 'JPEG' : 'PNG RGB'}</span>`,
      `<span class="pb">${FIT_LABEL[state.fit]}</span>`,
    ];
    if (TARGETS[id].pngOnly && state.format === 'jpg') badges.push('<span class="pb">PNG required</span>');
    dom.previewBadges.innerHTML = badges.join('');

    dom.previewNav.hidden = state.sources.length < 2;
    dom.sourcePosition.textContent = `${state.previewSource + 1} / ${state.sources.length}`;
    dom.prevSourceBtn.disabled = state.previewSource === 0;
    dom.nextSourceBtn.disabled = state.previewSource >= state.sources.length - 1;
  }

  function ratioMismatch(srcRatio, tgtRatio) {
    return Math.abs(srcRatio - tgtRatio) / tgtRatio > 0.02;
  }

  function renderWarnings() {
    const box = dom.previewWarnings;
    box.innerHTML = '';
    const ids = validSelectedIds();
    const source = state.sources[state.previewSource];
    const add = (cls, text) => {
      const w = el('div', 'warning ' + cls, `<span>${text}</span>`);
      box.appendChild(w);
    };

    if (!ids.length) {
      if (state.selected.size && !ids.length) add('danger', 'Enter a width and height for the custom target.');
      return;
    }
    if (!source) return;

    const srcRatio = source.width / source.height;
    const mismatch = ids.filter((id) => {
      const d = getDims(id);
      return d && ratioMismatch(srcRatio, d.w / d.h);
    });

    if (mismatch.length) {
      const worst = mismatch.reduce((a, b) => {
        const da = getDims(a), db = getDims(b);
        return Math.abs(srcRatio - da.w / da.h) > Math.abs(srcRatio - db.w / db.h) ? a : b;
      }, mismatch[0]);
      const d = getDims(worst);
      if (state.fit === 'cover') {
        const s = Math.max(d.w / source.width, d.h / source.height);
        const lost = Math.round(Math.max(0, Math.max(1 - d.w / (source.width * s), 1 - d.h / (source.height * s))) * 100);
        add('info', `“${TARGETS[worst].name}” has a different aspect ratio. Crop to fill removes approximately ${lost}% of the image.`);
      } else {
        add('info', `Source ${srcRatio.toFixed(2)}:1 versus “${TARGETS[worst].name}” ${(d.w / d.h).toFixed(2)}:1 differs; padded using ${FIT_LABEL[state.fit]}.`);
      }
    }

    const small = ids.filter((id) => {
      const d = getDims(id);
      return d && (d.w > source.width * 1.8 || d.h > source.height * 1.8);
    });
    if (small.length) {
      add('', `${small.map((id) => TARGETS[id].short).join(', ')} is much larger than the source. Use a higher-resolution image to avoid pixelation.`);
    }

    if (state.sources.length > SCREENSHOT_LIMIT) {
      const capped = ids.filter(isScreenshotCapTarget);
      if (capped.length) {
        add('danger', `${capped.map((id) => TARGETS[id].short).join(', ')} supports up to 10 images per size. Remove extra images.`);
      }
    }

    if (!PNG_SUPPORTED && ids.some((id) => effectiveFormat(id) === 'png')) {
      add('danger', 'This browser cannot encode RGB PNG. An alpha channel may remain. Try an updated Safari or Chrome.');
    }

    const pngOnly = ids.filter((id) => TARGETS[id].pngOnly);
    if (pngOnly.length && state.format === 'jpg') {
      add('info', `${pngOnly.map((id) => TARGETS[id].short).join(', ')} requires PNG. PNG output has been selected automatically.`);
    }
  }

  function renderSummary() {
    const ids = validSelectedIds();
    const count = ids.length * state.sources.length;
    dom.totalOutputs.textContent = String(count);

    const blocked = [];
    if (state.selected.has('custom') && !getDims('custom').w) blocked.push('Custom dimensions incomplete');
    if (state.sources.length > SCREENSHOT_LIMIT && ids.some(isScreenshotCapTarget)) blocked.push('More than 10 screenshots');
    if (!state.sources.length) blocked.push('No images added');
    if (!ids.length && !blocked.length) blocked.push('No target selected');

    if (blocked.length) {
      dom.summaryDetail.textContent = blocked.join(' · ');
      dom.exportBtn.disabled = true;
      dom.exportLabel.textContent = blocked.length === 1 ? blocked[0] : 'Cannot export';
      return;
    }
    const groups = {};
    ids.forEach((id) => { groups[TARGETS[id].group] = (groups[TARGETS[id].group] || 0) + 1; });
    const parts = [];
    if (groups.creative) parts.push(`Creative assets ${groups.creative}`);
    if (groups.screenshots) parts.push(`Screenshots ${groups.screenshots}`);
    if (groups.more) parts.push(`Other ${groups.more}`);
    dom.summaryDetail.textContent = `${parts.join(' · ')} × ${state.sources.length} images, packaged as a ZIP download.`;
    dom.exportBtn.disabled = false;
    dom.exportLabel.textContent = `Export ${count} files`;
  }

  function renderAll() {
    renderSources();
    renderTargets();
    validateCustom();
    renderOptions();
    renderPreviewTabs();
    paintPreview();
    renderWarnings();
    renderSummary();
  }

  /* ----------------------------------------------------------- compositing */

  function fillBackground(ctx, W, H, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawCoverImage(ctx, img, W, H, anchor) {
    const iw = img.width, ih = img.height;
    const s = Math.max(W / iw, H / ih);
    const dw = iw * s, dh = ih * s;
    const [ax, ay] = (ANCHORS.find((a) => a[0] === anchor) || ANCHORS[4]).slice(1);
    ctx.drawImage(img, (W - dw) * ax, (H - dh) * ay, dw, dh);
  }

  function drawContainImage(ctx, img, W, H) {
    const iw = img.width, ih = img.height;
    const s = Math.min(W / iw, H / ih);
    const dw = iw * s, dh = ih * s;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  }

  let supportsFilter = null;
  function hasCanvasFilter() {
    if (supportsFilter !== null) return supportsFilter;
    const c = document.createElement('canvas');
    c.width = c.height = 4;
    const x = c.getContext('2d');
    x.filter = 'blur(2px)';
    supportsFilter = x.filter === 'blur(2px)';
    return supportsFilter;
  }

  function drawBlurBackground(ctx, img, W, H) {
    const long = Math.max(W, H);
    const tinySide = 48;
    const proxySide = long > 2600 ? 460 : 300;
    const iw = img.width, ih = img.height;

    const tiny = document.createElement('canvas');
    const ts = Math.max(tinySide / Math.min(iw, ih), tinySide / Math.max(iw, ih));
    tiny.width = Math.max(1, Math.round(iw * ts));
    tiny.height = Math.max(1, Math.round(ih * ts));
    const tx = tiny.getContext('2d');
    tx.imageSmoothingEnabled = true;
    tx.imageSmoothingQuality = 'high';
    tx.drawImage(img, 0, 0, tiny.width, tiny.height);

    const proxy = document.createElement('canvas');
    const ps = Math.max(proxySide / W, proxySide / H);
    proxy.width = Math.max(1, Math.round(W * ps));
    proxy.height = Math.max(1, Math.round(H * ps));
    const px = proxy.getContext('2d');
    px.imageSmoothingEnabled = true;
    px.imageSmoothingQuality = 'high';
    if (hasCanvasFilter()) px.filter = `blur(${Math.round(Math.max(proxy.width, proxy.height) * 0.022)}px)`;
    const cover = Math.max(proxy.width / tiny.width, proxy.height / tiny.height);
    const dw = tiny.width * cover, dh = tiny.height * cover;
    px.drawImage(tiny, (proxy.width - dw) / 2, (proxy.height - dh) / 2, dw, dh);
    px.filter = 'none';

    const over = 1.06;
    const ow = W * over, oh = H * over;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(proxy, (W - ow) / 2, (H - oh) / 2, ow, oh);

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.055)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawTarget(ctx, img, W, H, opts) {
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    fillBackground(ctx, W, H, opts.bgColor || '#F5F5F7');
    if (opts.fit === 'cover') {
      drawCoverImage(ctx, img, W, H, opts.anchor || 'c');
    } else {
      if (opts.fit === 'blur') drawBlurBackground(ctx, img, W, H);
      drawContainImage(ctx, img, W, H);
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------ PNG (RGB) */

  let CRC_TABLE = null;
  function crcTable() {
    if (CRC_TABLE) return CRC_TABLE;
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    CRC_TABLE = t;
    return t;
  }

  function crc32Update(crc, bytes) {
    const t = crcTable();
    let c = crc >>> 0;
    for (let i = 0; i < bytes.length; i++) c = t[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return c >>> 0;
  }

  const crc32Bytes = (bytes) => (crc32Update(0xffffffff, bytes) ^ 0xffffffff) >>> 0;

  async function crc32Blob(blob) {
    let c = 0xffffffff;
    const reader = blob.stream().getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      c = crc32Update(c, value);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function writeU32(view, off, value) {
    view.setUint32(off, value >>> 0, false);
  }

  function pngChunk(tag, data) {
    const out = new Uint8Array(data.length + 12);
    const view = new DataView(out.buffer);
    writeU32(view, 0, data.length);
    for (let i = 0; i < 4; i++) out[4 + i] = tag.charCodeAt(i);
    out.set(data, 8);
    writeU32(view, data.length + 8, crc32Bytes(out.subarray(4, data.length + 8)));
    return out;
  }

  async function deflateZlib(bytes) {
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  function bigUint32(value) {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, value >>> 0, false);
    return b;
  }

  function concatBytes(parts) {
    const total = parts.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(total);
    let off = 0;
    for (const p of parts) { out.set(p, off); off += p.length; }
    return out;
  }

  async function encodeRgbPng(canvas) {
    if (!PNG_SUPPORTED) return encodePngFallback(canvas);
    const w = canvas.width, h = canvas.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const src = ctx.getImageData(0, 0, w, h).data;

    const stride = w * 3;
    const raw = new Uint8Array((stride + 1) * h);
    for (let y = 0; y < h; y++) {
      const row = y * (stride + 1);
      raw[row] = y === 0 ? 0 : 2;
      const line = y * w * 4;
      const above = (y - 1) * w * 4;
      for (let x = 0; x < w; x++) {
        const p = line + x * 4;
        const o = row + 1 + x * 3;
        if (y === 0) {
          raw[o] = src[p];
          raw[o + 1] = src[p + 1];
          raw[o + 2] = src[p + 2];
        } else {
          const a = above + x * 4;
          raw[o] = (src[p] - src[a]) & 0xff;
          raw[o + 1] = (src[p + 1] - src[a + 1]) & 0xff;
          raw[o + 2] = (src[p + 2] - src[a + 2]) & 0xff;
        }
      }
    }

    const idat = await deflateZlib(raw);
    const ihdr = new Uint8Array(13);
    const ihdrView = new DataView(ihdr.buffer);
    ihdrView.setUint32(0, w, false);
    ihdrView.setUint32(4, h, false);
    ihdr[8] = 8;   // bit depth
    ihdr[9] = 2;   // colour type: truecolor, no alpha
    ihdr[10] = 0;  // deflate
    ihdr[11] = 0;  // no interlace
    const srgb = new Uint8Array([0]);

    return new Blob([
      concatBytes([
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        pngChunk('IHDR', ihdr),
        pngChunk('sRGB', srgb),
        pngChunk('IDAT', idat),
        pngChunk('IEND', new Uint8Array(0)),
      ]),
    ], { type: 'image/png' });
  }

  function encodePngFallback(canvas) {
    return new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob([], { type: 'image/png' })), 'image/png');
    });
  }

  function encodeJpeg(canvas, quality) {
    return new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b || new Blob([], { type: 'image/jpeg' })), 'image/jpeg', quality);
    });
  }

  async function renderJob(targetId, source) {
    const dims = getDims(targetId);
    const canvas = document.createElement('canvas');
    canvas.width = dims.w;
    canvas.height = dims.h;
    const asPng = effectiveFormat(targetId) === 'png';
    const ctx = canvas.getContext('2d', { willReadFrequently: asPng });
    drawTarget(ctx, source.bitmap, dims.w, dims.h, {
      fit: state.fit, bgColor: state.bgColor, anchor: state.anchor,
    });
    const blob = asPng ? await encodeRgbPng(canvas) : await encodeJpeg(canvas, state.quality / 100);
    canvas.width = canvas.height = 0;
    return { blob, dims, fmt: asPng ? 'png' : 'jpg' };
  }

  /* -------------------------------------------------------------- ZIP */

  function dosTimeDate(date) {
    const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
    const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    return { time: time & 0xffff, date: day & 0xffff };
  }

  function utf8(str) {
    return new TextEncoder().encode(str);
  }

  async function makeZip(entries) {
    const now = new Date();
    const { time, date } = dosTimeDate(now);
    const parts = [];
    const central = [];
    let offset = 0;

    for (const entry of entries) {
      const nameBytes = utf8(entry.name);
      const crc = await crc32Blob(entry.blob);
      const size = entry.blob.size;

      const local = new Uint8Array(30 + nameBytes.length);
      const lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, 0x0800, true);
      lv.setUint16(8, 0, true);
      lv.setUint16(10, time, true);
      lv.setUint16(12, date, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, size, true);
      lv.setUint32(22, size, true);
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true);
      local.set(nameBytes, 30);

      parts.push(local, entry.blob);

      const head = new Uint8Array(46 + nameBytes.length);
      const hv = new DataView(head.buffer);
      hv.setUint32(0, 0x02014b50, true);
      hv.setUint16(4, 20, true);
      hv.setUint16(6, 20, true);
      hv.setUint16(8, 0x0800, true);
      hv.setUint16(10, 0, true);
      hv.setUint16(12, time, true);
      hv.setUint16(14, date, true);
      hv.setUint32(16, crc, true);
      hv.setUint32(20, size, true);
      hv.setUint32(24, size, true);
      hv.setUint16(28, nameBytes.length, true);
      hv.setUint32(42, offset, true);
      head.set(nameBytes, 46);
      central.push(head);

      offset += local.length + size;
    }

    const centralSize = central.reduce((n, c) => n + c.length, 0);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, entries.length, true);
    ev.setUint16(10, entries.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);

    return new Blob([...parts, ...central, eocd], { type: 'application/zip' });
  }

  function buildManifest(groups) {
    const lines = [
      'StoreFit ' + APP_VERSION + ' — App Store Connect Export manifest',
      'Generated: ' + new Date().toLocaleString('en-US'),
      '',
      'General rules',
      '1. Files use the exact pixel dimensions of the selected presets.',
      '2. Images are flattened onto opaque backgrounds. RGB PNG encoding omits the alpha channel when supported.',
      '3. Colors use sRGB.',
      '4. Screenshot targets support up to 10 images per size. Numbers indicate upload order.',
      '5. The 5244 × 2950 targets use PNG only.',
      '',
      'Folder / Dimensions / Count / Format',
    ];
    groups.forEach((g) => {
      lines.push(`- ${g.folder} | ${g.dims} | ${g.count} images | ${g.fmt.toUpperCase()}`);
    });
    lines.push('', 'Upload to App Store Connect > Your App > Product Page (screenshots) or Asset Library (creative assets).');
    return lines.join('\n');
  }

  /* ------------------------------------------------------------- export */

  function planJobs() {
    const ids = validSelectedIds();
    const jobs = [];
    ids.forEach((id) => {
      state.sources.forEach((source, i) => {
        jobs.push({ targetId: id, source, index: i });
      });
    });
    return jobs;
  }

  let cancelRequested = false;

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function stampName() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `StoreFit-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.zip`;
  }

  function setProgress(done, total, text) {
    dom.progressText.textContent = text;
    dom.progressCount.textContent = `${done} / ${total}`;
    dom.progressBar.style.width = (total ? Math.round((done / total) * 100) : 0) + '%';
  }

  async function exportAll() {
    const jobs = planJobs();
    if (!jobs.length) return;
    cancelRequested = false;
    dom.cancelExportBtn.disabled = false;
    dom.progressDialog.showModal();

    const entries = [];
    const groups = {};
    let failed = 0;

    try {
      for (let i = 0; i < jobs.length; i++) {
        if (cancelRequested) break;
        const job = jobs[i];
        const t = TARGETS[job.targetId];
        const dims = getDims(job.targetId);
        setProgress(i, jobs.length, `Exporting ${t.name} ${dims.w}×${dims.h} (Image ${job.index + 1})`);
        await nextPaint();
        try {
          const { blob, fmt } = await renderJob(job.targetId, job.source);
          const seq = String(job.index + 1).padStart(2, '0');
          const name = `${folderFor(job.targetId)}/${t.prefix}-${seq}-${dims.w}x${dims.h}.${fmt === 'png' ? 'png' : 'jpg'}`;
          entries.push({ name, blob });
          const key = folderFor(job.targetId);
          groups[key] = groups[key] || { folder: key, dims: `${dims.w}×${dims.h}`, count: 0, fmt };
          groups[key].count++;
        } catch (err) {
          console.error('StoreFit render:', err);
          failed++;
        }
      }

      if (cancelRequested || !entries.length) {
        dom.progressDialog.close();
        if (!cancelRequested) toast('All exports failed. Check that the source images can be decoded.');
        return;
      }

      setProgress(jobs.length, jobs.length, 'Packaging ZIP…');
      await nextPaint();
      const readme = new Blob([buildManifest(Object.values(groups))], { type: 'text/plain;charset=utf-8' });
      entries.unshift({ name: 'README.txt', blob: readme });

      const zip = await makeZip(entries);
      state.lastZip = { blob: zip, filename: stampName(), entries, groups };
      dom.progressDialog.close();
      showResult();
      triggerDownload(zip, state.lastZip.filename);
    } finally {
      if (dom.progressDialog.open) dom.progressDialog.close();
    }
  }

  function showResult() {
    const info = state.lastZip;
    if (!info) return;
    const files = info.entries.length - 1;
    dom.resultSummary.textContent = `${files} files · ${formatBytes(info.blob.size)} · Exact dimensions with flattened backgrounds.`;
    dom.resultList.innerHTML = '';
    Object.values(info.groups).forEach((g) => {
      const row = el('div', 'result-row');
      row.innerHTML =
        `<span class="result-row-name"><strong>${escapeHtml(g.folder.split('/').pop())}</strong> · ${g.count} images</span>` +
        `<span class="result-row-meta"><span class="pb">${escapeHtml(g.dims)}</span><span class="pb">${g.fmt.toUpperCase()}</span></span>`;
      dom.resultList.appendChild(row);
    });
    dom.downloadAgainBtn.href = URL.createObjectURL(info.blob);
    dom.downloadAgainBtn.download = info.filename;
    dom.resultDialog.showModal();
  }

  /* -------------------------------------------------------------- dialogs */

  function openDialog(node) {
    if (!node.open) node.showModal();
  }

  function toast(message, ms) {
    dom.toast.textContent = message;
    dom.toast.hidden = false;
    requestAnimationFrame(() => dom.toast.classList.add('show'));
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      dom.toast.classList.remove('show');
      setTimeout(() => { dom.toast.hidden = true; }, 220);
    }, ms || 2600);
  }

  /* ------------------------------------------------------------- wiring */

  function bindSourceEvents() {
    dom.dropZone.addEventListener('click', () => dom.fileInput.click());
    dom.dropZone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dom.fileInput.click(); }
    });
    dom.addMoreBtn.addEventListener('click', () => dom.fileInput.click());
    dom.fileInput.addEventListener('change', () => {
      addFiles(dom.fileInput.files);
      dom.fileInput.value = '';
    });

    ['dragenter', 'dragover'].forEach((type) => {
      dom.uploadCard.addEventListener(type, (e) => {
        if (!e.dataTransfer || Array.from(e.dataTransfer.types || []).indexOf('Files') < 0) return;
        e.preventDefault();
        dom.uploadCard.classList.add('drag-active');
        dom.dropZone.classList.add('is-dragging');
      });
    });
    ['dragleave', 'drop'].forEach((type) => {
      dom.uploadCard.addEventListener(type, (e) => {
        if (type === 'dragleave' && dom.uploadCard.contains(e.relatedTarget)) return;
        dom.uploadCard.classList.remove('drag-active');
        dom.dropZone.classList.remove('is-dragging');
      });
    });
    dom.uploadCard.addEventListener('drop', (e) => {
      if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return;
      e.preventDefault();
      addFiles(e.dataTransfer.files);
    });

    dom.sourcesGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.source');
      if (!card) return;
      const actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        const action = actionBtn.dataset.action;
        if (action === 'remove') removeSource(card.dataset.id);
        if (action === 'left') moveSource(card.dataset.id, -1);
        if (action === 'right') moveSource(card.dataset.id, 1);
        return;
      }
      const idx = state.sources.findIndex((s) => s.id === card.dataset.id);
      if (idx >= 0) {
        state.previewSource = idx;
        renderSources();
        paintPreview();
        renderWarnings();
      }
    });

    dom.clearBtn.addEventListener('click', () => { clearSources(); toast('Cleared all images'); });
    dom.trimSourcesBtn.addEventListener('click', trimToLimit);

    document.addEventListener('paste', (e) => {
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      const files = [];
      for (const item of items) {
        if (item.kind === 'file') {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length) {
        e.preventDefault();
        addFiles(files);
        toast(`Pasted ${files.length} images`);
      }
    });

    document.addEventListener('dragover', (e) => { if (e.dataTransfer && Array.from(e.dataTransfer.types || []).indexOf('Files') >= 0) e.preventDefault(); });
    document.addEventListener('drop', (e) => {
      if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return;
      if (dom.uploadCard.contains(e.target)) return;
      e.preventDefault();
      addFiles(e.dataTransfer.files);
    });
  }

  function bindTargetEvents() {
    ['creativeGrid', 'screenshotGrid', 'moreGrid'].forEach((key) => {
      dom[key].addEventListener('change', (e) => {
        const input = e.target.closest('[data-target-check]');
        if (!input) return;
        toggleTarget(input.dataset.targetCheck, input.checked);
      });
    });
    dom.customCheck.addEventListener('change', () => toggleTarget('custom', dom.customCheck.checked));

    document.querySelectorAll('[data-select-group]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ids = GROUPS[btn.dataset.selectGroup];
        const all = ids.every((id) => state.selected.has(id));
        ids.forEach((id) => (all ? state.selected.delete(id) : state.selected.add(id)));
        renderAll();
        saveSettings();
      });
    });

    dom.orientationControl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-orientation]');
      if (!b) return;
      state.orientation = b.dataset.orientation;
      dom.orientationControl.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
      renderAll();
      saveSettings();
    });

    [dom.customW, dom.customH].forEach((input) => {
      input.addEventListener('input', () => {
        state[input.id === 'customW' ? 'customW' : 'customH'] = input.value.trim();
        validateCustom();
        renderAll();
        saveSettings();
      });
    });

    dom.swapCustom.addEventListener('click', () => {
      const w = dom.customW.value, h = dom.customH.value;
      dom.customW.value = h;
      dom.customH.value = w;
      state.customW = dom.customW.value.trim();
      state.customH = dom.customH.value.trim();
      validateCustom();
      renderAll();
      saveSettings();
    });
  }

  function toggleTarget(id, on) {
    if (on) state.selected.add(id); else state.selected.delete(id);
    if (id === 'custom' && on && dom.moreTargets) dom.moreTargets.open = true;
    renderAll();
    saveSettings();
  }

  function validateCustom() {
    const d = getDims('custom');
    const showError = state.selected.has('custom') && !d.w;
    dom.customError.hidden = !showError;
    if (showError) {
      dom.customError.textContent = d.error === 'area'
        ? 'Total pixels must not exceed 100 million (for example, 10000 × 10000)'
        : 'Enter integer dimensions between 100 and 20000';
    }
    [dom.customW, dom.customH].forEach((i) => i.setAttribute('aria-invalid', showError ? 'true' : 'false'));
  }

  function bindOptionEvents() {
    dom.fitGrid.addEventListener('change', (e) => {
      const input = e.target.closest('input[name="fitMode"]');
      if (!input) return;
      state.fit = input.value;
      renderAll();
      saveSettings();
    });

    dom.swatches.addEventListener('click', (e) => {
      const sw = e.target.closest('[data-color]');
      if (!sw) return;
      setColor(sw.dataset.color);
    });
    dom.bgColor.addEventListener('input', () => setColor(dom.bgColor.value));
    dom.autoColorBtn.addEventListener('click', () => {
      const c = autoDetectColor();
      if (!c) { toast('Add an image before sampling its color'); return; }
      setColor(c);
      toast(`Sampled color: ${c}`);
    });

    dom.anchorGrid.addEventListener('click', (e) => {
      const b = e.target.closest('[data-anchor]');
      if (!b) return;
      state.anchor = b.dataset.anchor;
      renderAll();
      saveSettings();
    });

    dom.formatControl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-format]');
      if (!b) return;
      state.format = b.dataset.format;
      renderAll();
      saveSettings();
    });
    dom.qualityRange.addEventListener('input', () => {
      state.quality = Number(dom.qualityRange.value);
      renderOptions();
      renderSummary();
      saveSettings();
    });
  }

  function setColor(hex) {
    state.bgColor = hex.toUpperCase();
    renderOptions();
    paintPreview();
    renderWarnings();
    saveSettings();
  }

  function autoDetectColor() {
    const source = state.sources[state.previewSource];
    if (!source) return null;
    const size = 40;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, size, size);
    try {
      x.drawImage(source.bitmap, 0, 0, size, size);
    } catch (err) {
      return null;
    }
    const d = x.getContext('2d').getImageData(0, 0, size, size).data;
    let r = 0, g = 0, b = 0, n = 0;
    const push = (px, py) => {
      const i = (py * size + px) * 4;
      r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
    };
    for (let i = 0; i < size; i++) {
      push(i, 0);
      push(i, size - 1);
      push(0, i);
      push(size - 1, i);
    }
    if (!n) return null;
    return rgbToHex(r / n, g / n, b / n);
  }

  function bindUiEvents() {
    dom.specsBtn.addEventListener('click', () => openDialog(dom.specsDialog));
    document.querySelectorAll('[data-close-dialog]').forEach((b) => {
      b.addEventListener('click', () => {
        const node = document.getElementById(b.dataset.closeDialog);
        if (node && node.open) node.close();
      });
    });
    dom.closeResultBtn.addEventListener('click', () => dom.resultDialog.close());
    dom.cancelExportBtn.addEventListener('click', () => {
      cancelRequested = true;
      dom.cancelExportBtn.disabled = true;
      dom.progressText.textContent = 'Canceling…';
    });
    dom.exportBtn.addEventListener('click', () => {
      if (dom.exportBtn.disabled) return;
      exportAll();
    });
    dom.previewTabs.addEventListener('click', (e) => {
      const b = e.target.closest('[data-preview-target]');
      if (!b) return;
      state.previewTarget = b.dataset.previewTarget;
      renderPreviewTabs();
      paintPreview();
      renderOptions();
      renderWarnings();
    });
    dom.prevSourceBtn.addEventListener('click', () => stepSource(-1));
    dom.nextSourceBtn.addEventListener('click', () => stepSource(1));

    document.addEventListener('keydown', (e) => {
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (dom.resultDialog.open || dom.specsDialog.open) return;
      if (e.key === 'ArrowLeft') stepSource(-1);
      if (e.key === 'ArrowRight') stepSource(1);
    });
  }

  function stepSource(delta) {
    if (state.sources.length < 2) return;
    state.previewSource = (state.previewSource + delta + state.sources.length) % state.sources.length;
    renderSources();
    paintPreview();
    renderWarnings();
  }

  /* ---------------------------------------------------------- persistence */

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        selected: Array.from(state.selected),
        orientation: state.orientation,
        fit: state.fit,
        bgColor: state.bgColor,
        anchor: state.anchor,
        format: state.format,
        quality: state.quality,
        customW: state.customW,
        customH: state.customH,
      }));
    } catch (err) { /* private mode: settings simply not remembered */ }
  }

  function loadSettings() {
    let data = null;
    try {
      data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch (err) { data = null; }
    if (!data) return;
    if (Array.isArray(data.selected)) {
      data.selected.forEach((id) => { if (TARGETS[id]) state.selected.add(id); });
    }
    if (data.orientation === 'landscape' || data.orientation === 'portrait') state.orientation = data.orientation;
    if (FIT_LABEL[data.fit]) state.fit = data.fit;
    if (/^#[0-9a-f]{6}$/i.test(String(data.bgColor))) state.bgColor = data.bgColor.toUpperCase();
    if (ANCHORS.some((a) => a[0] === data.anchor)) state.anchor = data.anchor;
    if (data.format === 'png' || data.format === 'jpg') state.format = data.format;
    if (Number.isFinite(data.quality)) state.quality = clamp(Math.round(data.quality), 80, 100);
    if (data.customW != null) state.customW = String(data.customW);
    if (data.customH != null) state.customH = String(data.customH);
  }

  function applySettingsToUi() {
    dom.customW.value = state.customW;
    dom.customH.value = state.customH;
    dom.orientationControl.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('active', b.dataset.orientation === state.orientation);
    });
    if (state.selected.has('custom')) dom.moreTargets.open = true;
  }

  /* ------------------------------------------------------------------ boot */

  function boot() {
    cacheDom();
    buildTargetCards();
    loadSettings();
    applySettingsToUi();
    bindSourceEvents();
    bindTargetEvents();
    bindOptionEvents();
    bindUiEvents();
    validateCustom();
    renderAll();

    if (!PNG_SUPPORTED) {
      toast('PNG encoding in this browser may retain an alpha channel. Try an updated Safari or Chrome.', 5200);
    }

    window.__storefit = {
      version: APP_VERSION,
      addFromUrls,
      plan: () => planJobs().map((j) => ({
        target: j.targetId,
        image: j.source.name,
        ...getDims(j.targetId),
        format: effectiveFormat(j.targetId),
        name: `${folderFor(j.targetId)}/${TARGETS[j.targetId].prefix}-${String(j.index + 1).padStart(2, '0')}-${getDims(j.targetId).w}x${getDims(j.targetId).h}.${effectiveFormat(j.targetId) === 'png' ? 'png' : 'jpg'}`,
      })),
      state: () => ({
        sources: state.sources.map((s) => ({ name: s.name, width: s.width, height: s.height })),
        selected: Array.from(state.selected),
        orientation: state.orientation,
        fit: state.fit,
        format: state.format,
        quality: state.quality,
        bgColor: state.bgColor,
        anchor: state.anchor,
        custom: [state.customW, state.customH],
        pngEncoder: PNG_SUPPORTED,
      }),
      encode: async (targetId, sourceIndex) => {
        const job = planJobs().find((j) => (!targetId || j.targetId === targetId) && (sourceIndex == null || j.index === sourceIndex));
        if (!job) throw new Error('no job');
        const out = await renderJob(job.targetId, job.source);
        const buf = new Uint8Array(await out.blob.arrayBuffer());
        const info = { bytes: buf.length, format: out.fmt, width: out.dims.w, height: out.dims.h, blob: out.blob };
        if (out.fmt === 'png') {
          const view = new DataView(buf.buffer);
          info.signature = Array.from(buf.subarray(0, 8)).map((b) => b.toString(16)).join(' ');
          info.colorType = buf[25];
          info.bitDepth = buf[24];
          info.width = view.getUint32(16, false);
          info.height = view.getUint32(20, false);
          info.interlace = buf[28];
        } else {
          info.soi = buf[0].toString(16) + buf[1].toString(16);
        }
        return info;
      },
      zip: async () => {
        const jobs = planJobs();
        const entries = [];
        for (const j of jobs) {
          const out = await renderJob(j.targetId, j.source);
          const d = getDims(j.targetId);
          entries.push({ name: `${folderFor(j.targetId)}/${TARGETS[j.targetId].prefix}-${String(j.index + 1).padStart(2, '0')}-${d.w}x${d.h}.${out.fmt === 'png' ? 'png' : 'jpg'}`, blob: out.blob });
        }
        const blob = await makeZip(entries);
        return { size: blob.size, entries: entries.length };
      },
      download: () => {
        if (!state.lastZip) throw new Error('no zip yet');
        triggerDownload(state.lastZip.blob, state.lastZip.filename);
        return state.lastZip.filename;
      },
      zipInfo: () => (state.lastZip ? {
        filename: state.lastZip.filename,
        size: state.lastZip.blob.size,
        names: state.lastZip.entries.map((e) => e.name),
        blob: state.lastZip.blob,
      } : null),
      verifyPng: async (blob) => {
        const buf = new Uint8Array(await blob.arrayBuffer());
        const view = new DataView(buf.buffer);
        const chunks = [];
        let off = 8;
        while (off < buf.length) {
          const len = view.getUint32(off, false);
          const type = String.fromCharCode(buf[off + 4], buf[off + 5], buf[off + 6], buf[off + 7]);
          const stored = view.getUint32(off + 8 + len, false);
          const calc = crc32Bytes(buf.subarray(off + 4, off + 8 + len));
          chunks.push({ type, len, crcOk: stored === calc });
          off += 12 + len;
        }
        const bmp = await createImageBitmap(new Blob([buf], { type: 'image/png' }));
        const info = { width: view.getUint32(16, false), height: view.getUint32(20, false), bitDepth: buf[24], colorType: buf[25], chunks, decoded: [bmp.width, bmp.height], tail: off === buf.length };
        if (bmp.close) bmp.close();
        return info;
      },
      exportAll,
      clear: clearSources,
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
