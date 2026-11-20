const GITHUB_USER = "";
const GITHUB_REPO = "";

const MUSIC_DIR = "music";
const CACHE_TTL = 20 * 60 * 1000;
const CACHE_PREFIX = "mixtape_music_library_v4";
const DURATION_CACHE_PREFIX = "mixtape_track_durations_v1";
const SETTINGS_KEY = "pulse_player_settings_v1";
const ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5c0-.8.87-1.28 1.54-.85l10.2 6.5a1 1 0 0 1 0 1.7l-10.2 6.5A1 1 0 0 1 8 18.5v-13Z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 5.5A1.5 1.5 0 0 1 8 4h1a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 9 20H8a1.5 1.5 0 0 1-1.5-1.5v-13ZM14 5.5A1.5 1.5 0 0 1 15.5 4h1A1.5 1.5 0 0 1 18 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5v-13Z"/></svg>';
const ICON_MUTE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m16 9 5 6m0-6-5 6"/></svg>';
const ICON_VOLUME = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
const DEFAULT_PALETTE = { primary: [132, 138, 148], accent: [76, 83, 94] };
const NEUTRAL_PALETTE = { primary: [132, 138, 148], accent: [76, 83, 94] };
const FALLBACK_COVER = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#9aa1ad"/><stop offset="1" stop-color="#252a33"/></linearGradient></defs><rect width="500" height="500" fill="#111116"/><circle cx="250" cy="250" r="190" fill="url(#g)" opacity=".38"/><circle cx="250" cy="250" r="132" fill="none" stroke="#c1c7d0" stroke-opacity=".38" stroke-width="3"/><circle cx="250" cy="250" r="77" fill="none" stroke="#d5d9e0" stroke-opacity=".5" stroke-width="2"/><circle cx="250" cy="250" r="20" fill="#c1c7d0"/><circle cx="250" cy="250" r="7" fill="#111116"/></svg>');

const backgroundTransitionStates = new WeakMap();
const imageTransitionStates = new WeakMap();

const elements = {
  grid: document.getElementById("albumGrid"),
  empty: document.getElementById("emptyState"),
  emptyTitle: document.getElementById("emptyTitle"),
  emptyMessage: document.getElementById("emptyMessage"),
  emptyRetry: document.getElementById("emptyRetry"),
  albumCount: document.getElementById("albumCount"),
  search: document.getElementById("albumSearch"),
  searchCount: document.getElementById("searchCount"),
  globalTrackResults: document.getElementById("globalTrackResults"),
  playlistSearch: document.getElementById("playlistSearch"),
  status: document.getElementById("syncStatus"),
  statusText: document.getElementById("statusText"),
  repoUpdateTimer: document.getElementById("repoUpdateTimer"),
  repoUpdateText: document.getElementById("repoUpdateText"),
  repoLink: document.getElementById("repoLink"),
  gitwaveLogo: document.getElementById("gitwaveLogo"),
  gitwaveFallback: document.getElementById("gitwaveFallback"),
  overlay: document.getElementById("playlistOverlay"),
  playlistWindow: document.querySelector(".playlist-window"),
  scrim: document.getElementById("playlistScrim"),
  ambient: document.getElementById("playlistAmbient"),
  closePlaylist: document.getElementById("closePlaylist"),
  downloadZip: document.getElementById("downloadZipBtn"),
  downloadZipLabel: document.getElementById("downloadZipLabel"),
   downloadProgress: document.getElementById("downloadProgress"),
   downloadProgressText: document.getElementById("downloadProgressText"),
   downloadProgressStats: document.getElementById("downloadProgressStats"),
   downloadProgressFill: document.getElementById("downloadProgressFill"),
   selectVisibleTracks: document.getElementById("selectVisibleTracksBtn"),
   selectedTrackCount: document.getElementById("selectedTrackCount"),
   downloadSelected: document.getElementById("downloadSelectedBtn"),
  playlistCover: document.getElementById("playlistCover"),
  playlistCoverMosaic: document.getElementById("playlistCoverMosaic"),
  playlistCoverFallback: document.getElementById("playlistCoverFallback"),
  playlistTitle: document.getElementById("playlistAlbumTitle"),
  playlistMeta: document.getElementById("playlistAlbumMeta"),
  trackCount: document.getElementById("trackCount"),
  trackList: document.getElementById("trackList"),
  playAll: document.getElementById("playAllBtn"),
  shuffleAlbum: document.getElementById("shuffleAlbumBtn"),
  playerPrompt: document.getElementById("playerPrompt"),
  playerCover: document.getElementById("playerCover"),
  playerCoverFallback: document.getElementById("playerCoverFallback"),
  playerTitle: document.getElementById("playerTrackTitle"),
  playerAlbum: document.getElementById("playerAlbumTitle"),
  shuffle: document.getElementById("shuffleBtn"),
  previous: document.getElementById("previousBtn"),
  playPause: document.getElementById("playPauseBtn"),
  next: document.getElementById("nextBtn"),
  repeat: document.getElementById("repeatBtn"),
  mute: document.getElementById("muteBtn"),
  progress: document.getElementById("progressBar"),
  currentTime: document.getElementById("currentTime"),
  durationTime: document.getElementById("durationTime"),
  volume: document.getElementById("volumeBar"),
  volumePercent: document.getElementById("volumePercent"),
  audio: document.getElementById("audioElement"),
  toast: document.getElementById("toastContainer"),
  dock: document.querySelector(".player-dock"),
  visualizer: document.getElementById("visualizerCanvas")
};
elements.audio.crossOrigin = "anonymous";

const browserDownloadSessions = new Map();
let browserDownloadServicePromise = null;

function supportsServiceWorkerDownloadInterception() {
  if (window.__gitwaveForceBlobDownloads) return false;
  return typeof window.NavigateEvent !== "undefined" && "downloadRequest" in window.NavigateEvent.prototype;
}

function initializeBrowserDownloadService() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext || !supportsServiceWorkerDownloadInterception()) return Promise.resolve(false);
  if (browserDownloadServicePromise) return browserDownloadServicePromise;
  browserDownloadServicePromise = navigator.serviceWorker.register(new URL("./gitwave-download-sw.js", location.href).href, {
    scope: new URL("./", location.href).pathname,
    updateViaCache: "none"
  }).then(async () => {
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) return true;
    return new Promise(resolve => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        navigator.serviceWorker.removeEventListener("controllerchange", finish);
        resolve(Boolean(navigator.serviceWorker.controller));
      };
      const timer = setTimeout(finish, 8000);
      navigator.serviceWorker.addEventListener("controllerchange", finish);
    });
  }).catch(() => false);
  return browserDownloadServicePromise;
}

function createBrowserDownloadSession(fileName, mime) {
  if (!supportsServiceWorkerDownloadInterception() || !navigator.serviceWorker || !navigator.serviceWorker.controller) return null;
  const id = "gw" + Date.now().toString(36) + Math.random().toString(36).slice(2);
  let port = null;
  let aborted = false;
  let closed = false;
  let readySettled = false;
  let closeSettled = false;
  let pullRequested = false;
  let closeRequested = false;
  let closeSent = false;
  let sequence = 0;
  let readyResolve;
  let readyReject;
  let closeResolve;
  let closeReject;
  let readyTimer = null;
  const queue = [];
  const pending = new Map();
  const readyPromise = new Promise((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });
  const closedPromise = new Promise((resolve, reject) => {
    closeResolve = resolve;
    closeReject = reject;
  });

  const rejectOutstanding = error => {
    queue.splice(0).forEach(item => item.reject(error));
    pending.forEach(item => item.reject(error));
    pending.clear();
  };

  const fail = (error, notifyWorker = true) => {
    if (aborted || closed) return;
    aborted = true;
    clearTimeout(readyTimer);
    if (port && notifyWorker) {
      try {
        port.postMessage({ type: "ERROR", message: error.message || "Download failed" });
      } catch (portError) {
      }
    }
    rejectOutstanding(error);
    if (!readySettled) {
      readySettled = true;
      readyReject(error);
    }
    if (!closeSettled) {
      closeSettled = true;
      closeReject(error);
    }
    browserDownloadSessions.delete(id);
    if (port) {
      try {
        port.close();
      } catch (portError) {
      }
    }
  };

  const pump = () => {
    if (!port || aborted || closed) return;
    if (pullRequested && queue.length) {
      const item = queue.shift();
      pullRequested = false;
      pending.set(item.sequence, item);
      const chunk = new Uint8Array(item.buffer);
      try {
        port.postMessage({ type: "CHUNK", seq: item.sequence, chunk }, [item.buffer]);
      } catch (error) {
        pending.delete(item.sequence);
        item.reject(error);
        fail(error);
      }
      return;
    }
    if (closeRequested && !queue.length && !pending.size && !closeSent) {
      closeSent = true;
      try {
        port.postMessage({ type: "CLOSE" });
      } catch (error) {
        fail(error);
      }
    }
  };

  const session = {
    attach(nextPort) {
      if (port || aborted) {
        try {
          nextPort.postMessage({ type: "ERROR", message: "Download session is not available" });
          nextPort.close();
        } catch (error) {
        }
        return;
      }
      port = nextPort;
      clearTimeout(readyTimer);
      port.onmessage = event => {
        const message = event.data || {};
        if (message.type === "PULL") {
          pullRequested = true;
          pump();
        } else if (message.type === "ACK") {
          const item = pending.get(message.seq);
          if (item) {
            pending.delete(message.seq);
            item.resolve();
          }
          pump();
        } else if (message.type === "ABORT") {
          fail(new Error("Браузер отменил загрузку."), false);
        } else if (message.type === "CLOSED") {
          if (closed || aborted) return;
          closed = true;
          closeSettled = true;
          closeResolve();
          browserDownloadSessions.delete(id);
          try {
            port.close();
          } catch (error) {
          }
        }
      };
      if (typeof port.start === "function") port.start();
      readySettled = true;
      readyResolve();
      pump();
    },
    writable: {
      async write(value) {
        await readyPromise;
        if (aborted || closed) throw new Error("Браузерная загрузка была прервана.");
        const view = value instanceof Uint8Array ? value : new Uint8Array(value);
        const buffer = view.byteOffset === 0 && view.byteLength === view.buffer.byteLength
          ? view.buffer
          : view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
        const currentSequence = ++sequence;
        return new Promise((resolve, reject) => {
          if (aborted || closed) {
            reject(new Error("Браузерная загрузка была прервана."));
            return;
          }
          queue.push({ sequence: currentSequence, buffer, resolve, reject });
          pump();
        });
      },
      async close() {
        await readyPromise;
        if (aborted) throw new Error("Браузерная загрузка была прервана.");
        if (closed) return;
        closeRequested = true;
        pump();
        await closedPromise;
      },
      async abort() {
        if (aborted || closed) return;
        fail(new Error("Загрузка отменена."));
      }
    }
  };

  browserDownloadSessions.set(id, session);
  readyTimer = setTimeout(() => fail(new Error("Браузер не подготовил поток загрузки.")), 15000);
  const channel = new MessageChannel();
  session.attach(channel.port1);
  try {
    navigator.serviceWorker.controller.postMessage({ type: "GITWAVE_REGISTER_DOWNLOAD", id }, [channel.port2]);
  } catch (error) {
    fail(error, false);
    return session;
  }
  const url = new URL("./__gitwave_download__/" + id, location.href);
  url.searchParams.set("filename", fileName);
  url.searchParams.set("type", mime);
  const link = document.createElement("a");
  link.href = url.href;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  return session;
}

let repository = resolveRepository();
let repositoryBranch = null;
let repositorySourcePath = "";
let repositorySourceResolved = false;
let repositoryAssets = { background: "", backgroundFallback: "", gitwave: "", gitwaveFallback: "", allTracksIcon: "", allTracksIconFallback: "" };
let durationCache = loadDurationCache();
let durationScanGeneration = 0;
let audioFallbackTimer = null;
let playbackRequested = false;
let playSequence = 0;
let audioRecoveryPromise = null;
let audioRecoveryToken = 0;
let repoUpdatedAt = 0;
let repoUpdateCheckedAt = 0;
let repoUpdateInterval = null;
let albums = [];
let filteredAlbums = [];
let allTracksAlbum = null;
const ALL_TRACKS_ID = "__all_tracks__";
const ALL_TRACKS_ART = '<div class="all-tracks-art"><div class="all-tracks-disc"></div><div class="all-tracks-wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="all-tracks-art-label">ALL TRACKS</div></div>';
let currentAlbum = null;
let currentTrackIndex = -1;
let viewedAlbum = null;
let shuffleEnabled = false;
let repeatMode = 0;
let shuffleHistory = [];
let shuffleCursor = -1;
let shuffleCyclePlayed = new Set();
let previousVolume = 0.8;
let isSeeking = false;
let toastTimer = null;
let zipDownloadActive = false;
let zipDownloadToken = 0;
const selectedTrackKeys = new Set();
let audioReady = false;
let audioContext = null;
let audioAnalyser = null;
let audioSourceNode = null;
let frequencyData = null;
let spectrumLevels = new Array(84).fill(0);
let visualizerFrame = 0;
let visualizerLastFrame = 0;
let spectrumEnvelope = 0;
let albumOpenTimer = 0;
let idleHighlightTimer = null;
let idleHighlightIndex = 0;
let idleHighlightedCard = null;
let audioGraphConnected = false;
let audioDirectConnected = false;
let audioContextRecoveryAttached = false;


function validPalette(palette) {
  return Boolean(palette && Array.isArray(palette.primary) && palette.primary.length === 3 && Array.isArray(palette.accent) && palette.accent.length === 3 && [...palette.primary, ...palette.accent].every(value => Number.isFinite(value) && value >= 0 && value <= 255));
}

function rgbToHsl(color) {
  const r = color[0] / 255;
  const g = color[1] / 255;
  const b = color[2] / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (delta) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let rgb;
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return rgb.map(value => Math.round((value + m) * 255));
}

function polishPaletteColor(color) {
  const [h, s, l] = rgbToHsl(color);
  return hslToRgb(h, Math.min(.88, Math.max(.42, s * 1.2 + .06)), Math.min(.7, Math.max(.34, l)));
}

function colorDistance(a, b) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

function extractImagePalette(image) {
  if (!image || !image.complete || !image.naturalWidth || !image.naturalHeight) return NEUTRAL_PALETTE;
  try {
    const canvas = document.createElement("canvas");
    const size = 72;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return NEUTRAL_PALETTE;
    context.drawImage(image, 0, 0, size, size);
    const pixels = context.getImageData(0, 0, size, size).data;
    const chromatic = [];
    let visibleSamples = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] < 150) continue;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const high = Math.max(r, g, b);
      const low = Math.min(r, g, b);
      const light = (r + g + b) / 765;
      if (light < .055 || light > .96) continue;
      visibleSamples++;
      const saturation = high === 0 ? 0 : (high - low) / high;
      if (saturation < .18 || light < .1 || light > .91) continue;
      const [hue] = rgbToHsl([r, g, b]);
      chromatic.push({ color: [r, g, b], hue, saturation, light });
    }
    if (chromatic.length < Math.max(40, visibleSamples * .12)) return NEUTRAL_PALETTE;
    const bins = Array.from({ length: 18 }, () => ({ score: 0, samples: [] }));
    chromatic.forEach(sample => {
      const index = Math.min(17, Math.floor(sample.hue / 20));
      const weight = .7 + sample.saturation * .65;
      bins[index].score += weight;
      bins[index].samples.push({ ...sample, weight });
    });
    const ranked = bins.map((bin, index) => ({ ...bin, index })).filter(bin => bin.samples.length).sort((a, b) => b.score - a.score);
    if (!ranked.length) return NEUTRAL_PALETTE;
    const primaryBin = ranked[0];
    const average = samples => {
      let total = 0;
      let r = 0;
      let g = 0;
      let b = 0;
      samples.forEach(sample => {
        total += sample.weight;
        r += sample.color[0] * sample.weight;
        g += sample.color[1] * sample.weight;
        b += sample.color[2] * sample.weight;
      });
      return [Math.round(r / total), Math.round(g / total), Math.round(b / total)];
    };
    const primary = average(primaryBin.samples);
    let accentBin = null;
    for (const candidate of ranked.slice(1)) {
      const difference = Math.abs(candidate.index - primaryBin.index);
      const hueDistance = Math.min(difference, 18 - difference) * 20;
      if (hueDistance < 40 || candidate.score < primaryBin.score * .2) continue;
      if (!accentBin || candidate.score > accentBin.score) accentBin = candidate;
    }
    let accent;
    if (accentBin) {
      accent = average(accentBin.samples);
    } else {
      const [h, saturation, light] = rgbToHsl(primary);
      accent = hslToRgb(h, Math.max(.28, saturation * .84), Math.max(.25, Math.min(.58, light * .72)));
    }
    const polish = color => {
      const [h, saturation, light] = rgbToHsl(color);
      if (saturation < .16) return color.map(value => Math.round(Math.max(48, Math.min(190, value))));
      return hslToRgb(h, Math.min(.9, saturation * 1.08), Math.min(.7, Math.max(.3, light)));
    };
    return { primary: polish(primary), accent: polish(accent) };
  } catch (error) {
    return NEUTRAL_PALETTE;
  }
}

function paletteCss(palette) {
  const valid = validPalette(palette) ? palette : DEFAULT_PALETTE;
  return {
    main: valid.primary.join(","),
    accent: valid.accent.join(","),
    mainColor: `rgb(${valid.primary.join(" ")})`,
    accentColor: `rgb(${valid.accent.join(" ")})`
  };
}

function applyPaletteToCard(card, palette) {
  if (!card || !validPalette(palette)) return;
  const colors = paletteCss(palette);
  card.style.setProperty("--album-rgb", colors.main);
  card.style.setProperty("--album-accent-rgb", colors.accent);
}

function getBackgroundLayers(container, mode) {
  let state = backgroundTransitionStates.get(container);
  if (state) return state;
  const layerClass = mode === "app" ? "app-background-layer" : "crossfade-bg-layer";
  const layers = [document.createElement("div"), document.createElement("div")];
  layers.forEach((layer, index) => {
    layer.className = layerClass;
    layer.dataset.backgroundLayer = String(index);
    layer.setAttribute("aria-hidden", "true");
    if (mode === "app") container.insertBefore(layer, container.firstChild);
    else container.insertBefore(layer, container.firstChild);
  });
  state = { layers, active: -1, url: "", generation: 0, mode };
  backgroundTransitionStates.set(container, state);
  return state;
}

function loadBackgroundImage(url) {
  return new Promise(resolve => {
    if (!url) {
      resolve(false);
      return;
    }
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = url;
    if (image.complete && image.naturalWidth) resolve(true);
  });
}

async function crossfadeBackground(container, url, fallbackUrl = "", mode = "ambient") {
  if (!container) return;
  const state = getBackgroundLayers(container, mode);
  const generation = ++state.generation;
  if (!url) {
    state.url = "";
    state.layers.forEach(layer => {
      layer.classList.remove("is-active");
      layer.style.opacity = "0";
      layer.style.transform = "scale(1.075) translate3d(0,1%,0)";
    });
    state.active = -1;
    return;
  }
  if (state.url === url && state.active >= 0) return;
  let resolvedUrl = url;
  let loaded = await loadBackgroundImage(resolvedUrl);
  if (generation !== state.generation) return;
  if (!loaded && fallbackUrl && fallbackUrl !== url) {
    resolvedUrl = fallbackUrl;
    loaded = await loadBackgroundImage(resolvedUrl);
  }
  if (generation !== state.generation) return;
  if (!loaded) return;
  const nextIndex = state.active === 0 ? 1 : 0;
  const nextLayer = state.layers[nextIndex];
  const previousLayer = state.active >= 0 ? state.layers[state.active] : null;
  const escapedUrl = String(resolvedUrl).replace(/["\\\n\r]/g, "\\$&");
  const image = `url("${escapedUrl}")`;
  nextLayer.style.backgroundImage = mode === "window" ? `linear-gradient(135deg,rgba(9,10,13,.46),rgba(9,10,13,.76)),${image}` : image;
  nextLayer.style.opacity = "0";
  nextLayer.style.transform = "scale(1.085) translate3d(0,1%,0)";
  nextLayer.classList.remove("is-active");
  void nextLayer.offsetWidth;
  requestAnimationFrame(() => {
    if (generation !== state.generation) return;
    nextLayer.classList.add("is-active");
    nextLayer.style.opacity = mode === "app" ? ".36" : "1";
    nextLayer.style.transform = "scale(1.015) translate3d(0,0,0)";
    if (previousLayer) {
      previousLayer.classList.remove("is-active");
      previousLayer.style.opacity = "0";
      previousLayer.style.transform = "scale(1.09) translate3d(0,-.8%,0)";
    }
    state.active = nextIndex;
    state.url = url;
  });
}

function beginImageCrossfade(image) {
  const previousState = imageTransitionStates.get(image);
  if (previousState && previousState.overlay && previousState.overlay.isConnected) previousState.overlay.remove();
  const parent = image.parentElement;
  const hasOldImage = Boolean(image.naturalWidth && image.currentSrc && image.style.display !== "none");
  if (!parent || !hasOldImage) {
    image.style.opacity = "1";
    imageTransitionStates.delete(image);
    return null;
  }
  const overlay = image.cloneNode(false);
  overlay.removeAttribute("id");
  overlay.removeAttribute("onload");
  overlay.removeAttribute("onerror");
  overlay.className = "image-crossfade-overlay";
  overlay.removeAttribute("hidden");
  overlay.style.opacity = "1";
  overlay.src = image.currentSrc;
  parent.appendChild(overlay);
  image.style.opacity = "0";
  const token = { overlay };
  imageTransitionStates.set(image, token);
  return token;
}

function finishImageCrossfade(image, token) {
  image.style.opacity = "1";
  if (!token || !token.overlay) return;
  const overlay = token.overlay;
  requestAnimationFrame(() => {
    overlay.style.opacity = "0";
  });
  const remove = () => {
    if (overlay.isConnected) overlay.remove();
    if (imageTransitionStates.get(image) === token) imageTransitionStates.delete(image);
  };
  overlay.addEventListener("transitionend", remove, { once: true });
  setTimeout(remove, 1250);
}

function setPageBackground(url, fallbackUrl = "") {
  crossfadeBackground(document.body, url || "", fallbackUrl, "app");
}

function applyBrandLogo(url, fallbackUrl = "") {
  const image = elements.gitwaveLogo;
  const fallback = elements.gitwaveFallback;
  if (!image || !fallback) return;
  if (!url) {
    image.hidden = true;
    image.removeAttribute("src");
    fallback.hidden = false;
    return;
  }
  image.hidden = false;
  fallback.hidden = true;
  image.dataset.fallbackUsed = "0";
  image.onerror = () => {
    if (fallbackUrl && image.dataset.fallbackUsed !== "1") {
      image.dataset.fallbackUsed = "1";
      image.src = fallbackUrl;
    } else {
      image.hidden = true;
      fallback.hidden = false;
    }
  };
  image.src = url;
}

function applyAlbumTheme(album) {
  const palette = album && validPalette(album.palette) ? album.palette : DEFAULT_PALETTE;
  const colors = paletteCss(palette);
  document.documentElement.style.setProperty("--active-rgb", colors.main);
  document.documentElement.style.setProperty("--active-accent-rgb", colors.accent);
  document.documentElement.style.setProperty("--active-main-color", colors.mainColor);
  document.documentElement.style.setProperty("--active-accent-color", colors.accentColor);
  if (elements.dock) elements.dock.classList.toggle("theme-active", Boolean(album && (album.cover || album.isAllTracks)));
  if (elements.overlay) elements.overlay.style.setProperty("--album-theme-rgb", colors.main);
  if (album && album.isAllTracks) setPageBackground(repositoryAssets.background, repositoryAssets.backgroundFallback);
  else setPageBackground(album && album.background ? album.background : album && album.cover ? album.cover : repositoryAssets.background, album && album.background ? album.backgroundFallback : album && album.cover ? album.coverFallback : repositoryAssets.backgroundFallback);
}

function applyImagePalette(album, image) {
  if (!album || !image || !image.naturalWidth || !album.cover) return;
  if (!validPalette(album.palette)) album.palette = extractImagePalette(image);
  const card = Array.from(elements.grid.querySelectorAll(".album-card")).find(item => item.dataset.albumId === album.id);
  applyPaletteToCard(card, album.palette);
  refreshAllTracksPalette();
  if (currentAlbum && currentAlbum.id === album.id) applyAlbumTheme(getTrackSourceAlbum(currentAlbum, currentAlbum.tracks[currentTrackIndex]));
  else if (viewedAlbum && viewedAlbum.id === album.id) applyAlbumTheme(album);
  if (repository && albums.includes(album)) writeCache(albums);
}

function resolveRepository() {
  if (GITHUB_USER.trim() && GITHUB_REPO.trim()) return { owner: GITHUB_USER.trim(), repo: GITHUB_REPO.trim(), detected: false };
  if (GITHUB_USER.trim() || GITHUB_REPO.trim()) return null;
  const host = window.location.hostname.toLowerCase();
  const segments = window.location.pathname.split("/").filter(Boolean);
  if (host.endsWith(".github.io")) {
    const owner = host.slice(0, -".github.io".length);
    const firstSegment = segments[0] || "";
    const repo = firstSegment && !["index.html", "404.html"].includes(firstSegment.toLowerCase()) ? firstSegment : `${owner}.github.io`;
    return owner && repo ? { owner, repo, detected: true } : null;
  }
  if (host === "pages.github.io" && segments.length >= 2) {
    return { owner: segments[0], repo: segments[1], detected: true };
  }
  const configured = document.querySelector('meta[name="github-repository"]')?.content?.trim();
  if (configured && configured.includes("/")) {
    const [owner, repo] = configured.split("/").filter(Boolean);
    if (owner && repo) return { owner, repo, detected: true };
  }
  return null;
}


function getAlbumById(id) {
  if (id === ALL_TRACKS_ID) return allTracksAlbum;
  return albums.find(album => album.id === id) || null;
}

function getViewedTrackIndex() {
  if (!viewedAlbum || !currentAlbum || currentTrackIndex < 0) return -1;
  const playingTrack = currentAlbum.tracks[currentTrackIndex];
  if (!playingTrack) return -1;
  return viewedAlbum.tracks.findIndex(track => track.url === playingTrack.url);
}

function buildAllTracksAlbum() {
  const sourceAlbums = albums.filter(album => album.tracks && album.tracks.length);
  const tracks = sourceAlbums.flatMap(album => album.tracks.map(track => ({
    ...track,
    albumId: album.id,
    albumTitle: album.title,
    albumCover: album.cover,
    albumPalette: album.palette || NEUTRAL_PALETTE
  })));
  if (!tracks.length) {
    allTracksAlbum = null;
    return null;
  }
  allTracksAlbum = {
    id: ALL_TRACKS_ID,
    folder: "Все альбомы",
    title: "Все треки",
    path: MUSIC_DIR,
    cover: "",
    palette: DEFAULT_PALETTE,
    tracks,
    isAllTracks: true
  };
  return allTracksAlbum;
}

function getTrackSourceAlbum(album, track) {
  if (album && album.isAllTracks && track && track.albumId) return albums.find(item => item.id === track.albumId) || album;
  return album;
}

function refreshAllTracksPalette() {
  if (!allTracksAlbum) return;
  allTracksAlbum.palette = DEFAULT_PALETTE;
  const card = elements.grid.querySelector(`[data-album-id="${ALL_TRACKS_ID}"]`);
  applyPaletteToCard(card, DEFAULT_PALETTE);
  if (currentAlbum && currentAlbum.isAllTracks && currentTrackIndex >= 0) {
    applyAlbumTheme(getTrackSourceAlbum(currentAlbum, currentAlbum.tracks[currentTrackIndex]));
  }
}

function trackMatches(track, query) {
  const normalized = query.toLocaleLowerCase("ru");
  return track.title.toLocaleLowerCase("ru").includes(normalized) || track.fileName.toLocaleLowerCase("ru").includes(normalized);
}

function renderGlobalTrackResults(query) {
  if (!query) {
    elements.globalTrackResults.innerHTML = "";
    elements.globalTrackResults.classList.remove("visible");
    elements.globalTrackResults.hidden = true;
    return 0;
  }
  const matches = [];
  albums.forEach(album => album.tracks.forEach((track, index) => {
    if (trackMatches(track, query)) matches.push({ album, track, index });
  }));
  if (!matches.length) {
    elements.globalTrackResults.innerHTML = "";
    elements.globalTrackResults.classList.remove("visible");
    elements.globalTrackResults.hidden = true;
    return 0;
  }
  const shown = matches.slice(0, 8);
  elements.globalTrackResults.innerHTML = `<div class="global-track-results-head"><span>Найденные треки</span><span>${matches.length}</span></div>${shown.map(item => `<button class="global-track-result" type="button" data-album-id="${escapeHTML(item.album.id)}" data-track-index="${item.index}"><img src="${escapeHTML(item.album.cover || FALLBACK_COVER)}" alt="" loading="lazy"><span class="global-track-result-copy"><strong>${escapeHTML(item.track.title)}</strong><small>${escapeHTML(item.album.title)}</small></span><span class="global-track-result-icon">${ICON_PLAY}</span></button>`).join("")}${matches.length > shown.length ? `<div class="global-track-results-head"><span>Ещё ${matches.length - shown.length} треков — уточни запрос</span></div>` : ""}`;
  elements.globalTrackResults.hidden = false;
  elements.globalTrackResults.classList.add("visible");
  return matches.length;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function formatName(value) {
  return String(value || "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours > 0 ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}` : `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function estimateDurationFromSize(fileName, size) {
  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes <= 0) return 0;
  const extension = String(fileName || "").split(".").pop().toLowerCase();
  const bitrate = extension === "wav" ? 1411200 : extension === "ogg" ? 160000 : 160000;
  return Math.max(1, bytes * 8 / bitrate);
}

function formatTrackDuration(track) {
  if (!track || !Number.isFinite(track.duration) || track.duration <= 0) return "…";
  return `${track.durationEstimated ? "~" : ""}${formatTime(track.duration)}`;
}

function pluralTracks(value) {
  const n = Math.abs(value) % 100;
  const last = n % 10;
  if (n > 10 && n < 20) return `${value} треков`;
  if (last > 1 && last < 5) return `${value} трека`;
  if (last === 1) return `${value} трек`;
  return `${value} треков`;
}

function pluralAlbums(value) {
  const n = Math.abs(value) % 100;
  const last = n % 10;
  if (n > 10 && n < 20) return `${value} альбомов`;
  if (last > 1 && last < 5) return `${value} альбома`;
  if (last === 1) return `${value} альбом`;
  return `${value} альбомов`;
}

function setStatus(state, message) {
  elements.status.classList.remove("ready", "error");
  if (state) elements.status.classList.add(state);
  elements.statusText.textContent = message;
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="toast-icon"></i><span>${escapeHTML(message)}</span>`;
  elements.toast.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 260);
  }, 3100);
}

const ZIP_CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let value = n;
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[n] = value >>> 0;
  }
  return table;
})();

function zipCrc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = ZIP_CRC_TABLE[(crc ^ bytes[i]) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function safeZipSegment(value) {
  let result = String(value || "track").replace(/[<>:"\/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").trim();
  if (!result || result === "." || result === "..") result = "track";
  return result;
}

function zipTrackName(album, track) {
  const fileName = safeZipSegment(track.fileName || track.title || "track");
  if (!album.isAllTracks) return safeZipSegment(album.folder || album.title) + "/" + fileName;
  const parts = String(track.path || "").split("/").filter(Boolean);
  const musicIndex = parts.findIndex(part => part.toLowerCase() === MUSIC_DIR.toLowerCase());
  if (musicIndex >= 0 && parts.length > musicIndex + 1) return parts.slice(musicIndex + 1).map(safeZipSegment).join("/");
  return safeZipSegment(track.albumTitle || "Album") + "/" + fileName;
}

function buildZipArchive(entries) {
  if (!entries.length || entries.length > 65535) throw new Error("Неподдерживаемое количество файлов для ZIP-архива.");
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  let offset = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const bytes = entry.bytes;
    if (name.length > 65535 || bytes.length > 0xffffffff || offset > 0xffffffff) throw new Error("ZIP-архив слишком большой.");
    const crc = zipCrc32(bytes);
    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, dosTime, true);
    localView.setUint16(12, dosDate, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, bytes.length, true);
    localView.setUint32(22, bytes.length, true);
    localView.setUint16(26, name.length, true);
    localView.setUint16(28, 0, true);
    local.set(name, 30);
    localParts.push(local, bytes);
    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 0x0314, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, dosTime, true);
    centralView.setUint16(14, dosDate, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, bytes.length, true);
    centralView.setUint32(24, bytes.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);
    centralParts.push(central);
    offset += local.length + bytes.length;
    if (offset > 0xffffffff) throw new Error("ZIP-архив превышает ограничение формата.");
  }
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  if (centralSize > 0xffffffff) throw new Error("ZIP-архив превышает ограничение формата.");
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true);
  return new Blob([...localParts, ...centralParts, end], { type: "application/zip" });
}

async function fetchZipTrack(track) {
  const sources = [...new Set([track.url, track.fallbackUrl].filter(Boolean))];
  let lastError = null;
  for (const source of sources) {
    try {
      const response = await fetch(source, { mode: "cors", credentials: "omit", cache: "force-cache", signal: AbortSignal.timeout(300000) });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!bytes.length) throw new Error("пустой файл");
      return bytes;
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error((track.fileName || track.title) + ": " + (lastError ? lastError.message : "источник недоступен"));
}

function createStreamingZipWriter(writable) {
  const encoder = new TextEncoder();
  const records = [];
  let offset = 0;
  let writeQueue = Promise.resolve();
  let failed = null;
  const write = async bytes => {
    if (offset + bytes.length > 0xffffffff) throw new Error("ZIP-архив превышает ограничение 4 ГБ.");
    await writable.write(bytes);
    offset += bytes.length;
  };
  const add = entry => {
    const task = writeQueue.then(async () => {
      if (failed) throw failed;
      if (records.length >= 65535) throw new Error("Слишком много файлов для ZIP-архива.");
      const name = encoder.encode(entry.name);
      const bytes = entry.bytes;
      const crc = zipCrc32(bytes);
      const localOffset = offset;
      const local = new Uint8Array(30 + name.length);
      const view = new DataView(local.buffer);
      const now = new Date();
      const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
      const dosDate = ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 0x0800, true);
      view.setUint16(8, 0, true);
      view.setUint16(10, dosTime, true);
      view.setUint16(12, dosDate, true);
      view.setUint32(14, crc, true);
      view.setUint32(18, bytes.length, true);
      view.setUint32(22, bytes.length, true);
      view.setUint16(26, name.length, true);
      view.setUint16(28, 0, true);
      local.set(name, 30);
      await write(local);
      await write(bytes);
      records.push({ name, crc, size: bytes.length, offset: localOffset, dosTime, dosDate });
    });
    writeQueue = task.catch(error => {
      failed = error;
      throw error;
    });
    return task;
  };
  const finish = async () => {
    await writeQueue;
    if (failed) throw failed;
    if (!records.length) throw new Error("В ZIP нечего сохранять.");
    const centralStart = offset;
    for (const record of records) {
      const central = new Uint8Array(46 + record.name.length);
      const view = new DataView(central.buffer);
      view.setUint32(0, 0x02014b50, true);
      view.setUint16(4, 0x0314, true);
      view.setUint16(6, 20, true);
      view.setUint16(8, 0x0800, true);
      view.setUint16(10, 0, true);
      view.setUint16(12, record.dosTime, true);
      view.setUint16(14, record.dosDate, true);
      view.setUint32(16, record.crc, true);
      view.setUint32(20, record.size, true);
      view.setUint32(24, record.size, true);
      view.setUint16(28, record.name.length, true);
      view.setUint16(30, 0, true);
      view.setUint16(32, 0, true);
      view.setUint16(34, 0, true);
      view.setUint16(36, 0, true);
      view.setUint32(38, 0, true);
      view.setUint32(42, record.offset, true);
      central.set(record.name, 46);
      await write(central);
    }
    const centralSize = offset - centralStart;
    const end = new Uint8Array(22);
    const view = new DataView(end.buffer);
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(4, 0, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, records.length, true);
    view.setUint16(10, records.length, true);
    view.setUint32(12, centralSize, true);
    view.setUint32(16, centralStart, true);
    view.setUint16(20, 0, true);
    await write(end);
    await writable.close();
    return { count: records.length, size: offset };
  };
  const abort = async () => {
    await writeQueue.catch(() => {});
    await writable.abort().catch(() => {});
  };
  return { add, finish, abort };
}

function formatDownloadBytes(bytes) {
  const value = Math.max(0, Number(bytes) || 0);
  if (value < 1048576) return (value / 1024).toFixed(value < 10240 ? 0 : 1) + " КБ";
  return (value / 1048576).toFixed(1) + " МБ";
}

function formatDownloadEta(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const value = Math.ceil(seconds);
  if (value < 60) return value + "с";
  if (value < 3600) return Math.floor(value / 60) + "м " + String(value % 60).padStart(2, "0") + "с";
  return Math.floor(value / 3600) + "ч " + String(Math.floor((value % 3600) / 60)).padStart(2, "0") + "м";
}

function updateDownloadProgress(completed, total, totalBytes, expectedBytes, startedAt) {
  const elapsed = Math.max(.25, (performance.now() - startedAt) / 1000);
  const speed = totalBytes / elapsed;
  const eta = speed > 0 && expectedBytes > 0 ? Math.max(0, expectedBytes - totalBytes) / speed : NaN;
  const percent = expectedBytes > 0 ? Math.min(100, totalBytes / expectedBytes * 100) : completed / Math.max(1, total) * 100;
  elements.downloadProgress.hidden = false;
  elements.downloadProgressText.textContent = completed + "/" + total + " · " + formatDownloadBytes(totalBytes) + (expectedBytes > 0 ? " / " + formatDownloadBytes(expectedBytes) : "") + " · " + percent.toFixed(1) + "%";
  elements.downloadProgressStats.textContent = formatDownloadBytes(speed) + "/с · осталось " + formatDownloadEta(eta);
  elements.downloadProgressFill.style.width = percent.toFixed(1) + "%";
}

function triggerBrowserDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = safeZipSegment(fileName);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 120000);
}

async function downloadSingleTrack(track) {
  if (!track) return;
  let downloadSession = null;
  try {
    const extension = String(track.fileName || "track.mp3").split(".").pop().toLowerCase();
    const mime = extension === "ogg" ? "audio/ogg" : extension === "wav" ? "audio/wav" : "audio/mpeg";
    const fileName = safeZipSegment(track.fileName || track.title + "." + extension);
    downloadSession = createBrowserDownloadSession(fileName, mime);
    showToast("Загружаю: " + (track.title || track.fileName), "info");
    const bytes = await fetchZipTrack(track);
    if (downloadSession) {
      await downloadSession.writable.write(bytes);
      await downloadSession.writable.close();
    } else {
      triggerBrowserDownload(new Blob([bytes], { type: mime }), fileName);
    }
    showToast("Трек передан в загрузки браузера: " + (track.title || track.fileName) + " · " + formatDownloadBytes(bytes.length), "success");
  } catch (error) {
    if (downloadSession) await downloadSession.writable.abort().catch(() => {});
    if (error && error.name !== "AbortError") showToast(error.message || "Не удалось скачать трек.", "error");
  }
}

function updateTrackSelectionUI() {
  const selected = selectedTrackKeys.size;
  if (elements.selectedTrackCount) elements.selectedTrackCount.textContent = selected + " выбрано";
  if (elements.downloadSelected) elements.downloadSelected.disabled = selected === 0 || zipDownloadActive;
  if (elements.selectVisibleTracks && viewedAlbum) {
    const query = elements.playlistSearch.value.trim().toLocaleLowerCase("ru");
    const visible = viewedAlbum.tracks.filter(track => !query || trackMatches(track, query) || String(track.albumTitle || "").toLocaleLowerCase("ru").includes(query));
    const allSelected = visible.length > 0 && visible.every(track => selectedTrackKeys.has(track.path || track.durationKey || track.url));
    elements.selectVisibleTracks.textContent = allSelected ? "Снять выделение" : "Выбрать всё";
  }
}

function getSelectedTrackEntries() {
  const entries = [];
  const seen = new Set();
  albums.forEach(album => album.tracks.forEach(track => {
    const key = track.path || track.durationKey || track.url;
    if (selectedTrackKeys.has(key) && !seen.has(key)) {
      seen.add(key);
      entries.push({ album, track });
    }
  }));
  return entries;
}

async function downloadAlbumZip(album) {
  if (!album) return;
  const title = album.isAllTracks ? "GitWave - Все треки" : album.folder || album.title;
  return downloadZipItems(title, album.tracks.map(track => ({ album, track })));
}

async function downloadSelectedTracksZip() {
  const entries = getSelectedTrackEntries();
  if (!entries.length) {
    showToast("Сначала выбери композиции для архива.", "error");
    return;
  }
  return downloadZipItems("GitWave - Выбранные треки", entries);
}

async function downloadZipItems(title, items) {
  if (zipDownloadActive) return;
  if (!Array.isArray(items) || !items.length) {
    showToast("В этом разделе нет треков для скачивания.", "error");
    return;
  }
  const suggestedName = safeZipSegment(title) + ".zip";
  const token = ++zipDownloadToken;
  zipDownloadActive = true;
  elements.downloadZip.disabled = true;
  elements.downloadSelected.disabled = true;
  let completed = 0;
  let totalBytes = 0;
  const expectedBytes = items.reduce((sum, item) => sum + Math.max(0, Number(item.track.size) || 0), 0);
  let startedAt = 0;
  let writable = null;
  let zipWriter = null;
  let browserDownloadSession = null;
  elements.downloadZipLabel.textContent = "Подготовка…";
  elements.downloadProgress.hidden = false;
  elements.downloadProgressText.textContent = "Подготовка архива · " + items.length + " трек(ов)";
  elements.downloadProgressStats.textContent = "Ожидаемая скорость —";
  elements.downloadProgressFill.style.width = "0%";
  try {
    browserDownloadSession = createBrowserDownloadSession(suggestedName, "application/zip");
    if (browserDownloadSession) {
      writable = browserDownloadSession.writable;
      zipWriter = createStreamingZipWriter(writable);
    }
    startedAt = performance.now();
    elements.downloadZipLabel.textContent = "Загрузка 0/" + items.length;
    const fallbackEntries = zipWriter ? null : new Array(items.length);
    const failures = [];
    let cursor = 0;
    const worker = async () => {
      while (true) {
        const index = cursor++;
        if (index >= items.length) return;
        const item = items[index];
        try {
          const bytes = await fetchZipTrack(item.track);
          totalBytes += bytes.length;
          const entry = { name: zipTrackName(item.album, item.track), bytes };
          if (zipWriter) await zipWriter.add(entry);
          else fallbackEntries[index] = entry;
        } catch (error) {
          failures.push(error);
        }
        completed++;
        if (token === zipDownloadToken) {
          elements.downloadZipLabel.textContent = "Загрузка " + completed + "/" + items.length;
          updateDownloadProgress(completed, items.length, totalBytes, expectedBytes, startedAt);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(8, items.length) }, () => worker()));
    if (failures.length) throw new Error("Не удалось скачать " + failures.length + " трек(ов): " + failures[0].message);
    if (zipWriter) {
      elements.downloadZipLabel.textContent = "Завершение ZIP…";
      elements.downloadProgressText.textContent = "Формирую структуру архива…";
      elements.downloadProgressStats.textContent = items.length + " файлов · " + formatDownloadBytes(totalBytes);
      const result = await zipWriter.finish();
      writable = null;
      elements.downloadProgressFill.style.width = "100%";
      showToast("ZIP передан в загрузки браузера: " + suggestedName + " · " + formatDownloadBytes(result.size), "success");
    } else {
      elements.downloadZipLabel.textContent = "Создание ZIP…";
      elements.downloadProgressText.textContent = "Создаю ZIP-архив…";
      const archive = buildZipArchive(fallbackEntries);
      triggerBrowserDownload(archive, suggestedName);
      elements.downloadProgressFill.style.width = "100%";
      showToast("ZIP передан в загрузки браузера: " + suggestedName + " · " + formatDownloadBytes(archive.size), "success");
    }
  } catch (error) {
    if (zipWriter) await zipWriter.abort();
    else if (writable) await writable.abort().catch(() => {});
    if (error && error.name !== "AbortError") showToast(error.message || "Не удалось сохранить ZIP-архив.", "error");
  } finally {
    if (token === zipDownloadToken) {
      zipDownloadActive = false;
      elements.downloadZip.disabled = !viewedAlbum || !viewedAlbum.tracks.length;
      elements.downloadZipLabel.textContent = "Скачать ZIP";
      updateTrackSelectionUI();
      elements.downloadProgress.hidden = true;
    }
  }
}

function getCacheKey() {
  return `${CACHE_PREFIX}:${repository.owner.toLowerCase()}:${repository.repo.toLowerCase()}`;
}

function durationStorageKey() {
  return repository ? `${DURATION_CACHE_PREFIX}:${repository.owner.toLowerCase()}:${repository.repo.toLowerCase()}` : DURATION_CACHE_PREFIX;
}

function loadDurationCache() {
  try {
    const saved = JSON.parse(localStorage.getItem(durationStorageKey()) || "{}");
    return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  } catch (error) {
    return {};
  }
}

function saveDurationCache() {
  try {
    const entries = Object.entries(durationCache);
    const limited = Object.fromEntries(entries.slice(-2500));
    localStorage.setItem(durationStorageKey(), JSON.stringify(limited));
  } catch (error) {
    return;
  }
}

function trackDurationKey(track) {
  return track.durationKey || track.path || track.url || track.fileName;
}

function rememberTrackDuration(track, duration, album = currentAlbum, index = currentTrackIndex) {
  if (!track || !Number.isFinite(duration) || duration <= 0) return;
  track.duration = duration;
  track.durationEstimated = false;
  const key = trackDurationKey(track);
  durationCache[key] = duration;
  saveDurationCache();
  for (const sourceAlbum of albums) {
    const sourceTrack = sourceAlbum.tracks.find(item => trackDurationKey(item) === key || item.url === track.url);
    if (sourceTrack) {
      sourceTrack.duration = duration;
      sourceTrack.durationEstimated = false;
    }
  }
  if (allTracksAlbum) {
    const allTrack = allTracksAlbum.tracks.find(item => trackDurationKey(item) === key || item.url === track.url);
    if (allTrack) {
      allTrack.duration = duration;
      allTrack.durationEstimated = false;
    }
  }
  if (viewedAlbum && viewedAlbum.tracks) {
    const viewedIndex = viewedAlbum.tracks.findIndex(item => trackDurationKey(item) === key || item.url === track.url);
    if (viewedIndex >= 0) {
      const row = elements.trackList.querySelector(`[data-duration-index="${viewedIndex}"]`);
      if (row) row.textContent = formatTrackDuration(viewedAlbum.tracks[viewedIndex]);
    }
  }
  if (elements.audio.dataset.trackUrl === track.url && Number.isFinite(elements.audio.duration)) {
    elements.durationTime.textContent = formatTime(elements.audio.duration);
  }
}

function readCache(allowExpired = false) {
  const key = getCacheKey();
  let cached = null;
  try {
    const sessionValue = sessionStorage.getItem(key);
    if (sessionValue) cached = JSON.parse(sessionValue);
  } catch (error) {
    cached = null;
  }
  if (!cached) {
    try {
      const persistentValue = localStorage.getItem(key);
      if (persistentValue) cached = JSON.parse(persistentValue);
      else {
        const compressed = localStorage.getItem(`${key}:compressed`);
        if (compressed && window.LZString) cached = JSON.parse(LZString.decompressFromUTF16(compressed));
      }
    } catch (error) {
      cached = null;
    }
  }
  if (!cached || !Array.isArray(cached.albums)) return null;
  if (!allowExpired && Date.now() - cached.savedAt > CACHE_TTL) return null;
  const cachedAssets = cached.assets || {};
  repositoryAssets = {
    background: cachedAssets.background || "",
    backgroundFallback: cachedAssets.backgroundFallback || "",
    gitwave: cachedAssets.gitwave || "",
    gitwaveFallback: cachedAssets.gitwaveFallback || "",
    allTracksIcon: cachedAssets.allTracksIcon || "",
    allTracksIconFallback: cachedAssets.allTracksIconFallback || ""
  };
  repositorySourceResolved = typeof cached.sourcePath === "string";
  repositoryBranch = repositorySourceResolved ? cached.branch || repositoryBranch : null;
  repositorySourcePath = repositorySourceResolved ? cached.sourcePath : "";
  return cached.albums;
}

function writeCache(data) {
  const payload = JSON.stringify({ savedAt: Date.now(), albums: data, assets: repositoryAssets, branch: repositoryBranch, sourcePath: repositorySourcePath, sourceResolved: repositorySourceResolved });
  try {
    sessionStorage.setItem(getCacheKey(), payload);
  } catch (error) {
    try {
      sessionStorage.removeItem(getCacheKey());
    } catch (ignored) {
      return;
    }
  }
  try {
    localStorage.setItem(getCacheKey(), payload);
  } catch (error) {
    try {
      localStorage.removeItem(getCacheKey());
      const compressed = window.LZString && LZString.compressToUTF16(payload);
      if (compressed) localStorage.setItem(`${getCacheKey()}:compressed`, compressed);
    } catch (ignored) {
      return;
    }
  }
}

async function resolveRepositoryBranch() {
  if (repositoryBranch && repositorySourceResolved) return repositoryBranch;
  const key = `${CACHE_PREFIX}:branch:${repository.owner.toLowerCase()}:${repository.repo.toLowerCase()}`;
  try {
    const cached = JSON.parse(sessionStorage.getItem(key) || "null");
    if (cached && cached.branch && typeof cached.sourcePath === "string" && Date.now() - cached.savedAt < 6 * 60 * 60 * 1000) {
      repositoryBranch = cached.branch;
      repositorySourcePath = cached.sourcePath;
      repositorySourceResolved = true;
      return repositoryBranch;
    }
  } catch (error) {
    repositoryBranch = null;
    repositorySourcePath = "";
    repositorySourceResolved = false;
  }
  const headers = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  const base = `https://api.github.com/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}`;
  try {
    const pagesResponse = await fetch(`${base}/pages`, { headers, cache: "no-store", signal: AbortSignal.timeout(9000) });
    if (pagesResponse.ok) {
      const pages = await pagesResponse.json();
      const sourceBranch = pages && pages.source && pages.source.branch;
      if (typeof sourceBranch === "string" && sourceBranch.trim()) {
        repositoryBranch = sourceBranch.trim();
        repositorySourcePath = String(pages.source.path || "/").replace(/^\/+|\/+$/g, "");
        repositorySourceResolved = true;
        sessionStorage.setItem(key, JSON.stringify({ branch: repositoryBranch, sourcePath: repositorySourcePath, sourceResolved: true, savedAt: Date.now() }));
        return repositoryBranch;
      }
    }
  } catch (error) {
    repositoryBranch = null;
    repositorySourcePath = "";
    repositorySourceResolved = false;
  }
  try {
    const response = await fetch(base, { headers, cache: "no-store", signal: AbortSignal.timeout(9000) });
    if (!response.ok) return null;
    const data = await response.json();
    repositoryBranch = typeof data.default_branch === "string" ? data.default_branch : null;
    repositorySourcePath = "";
    repositorySourceResolved = Boolean(repositoryBranch);
    if (repositoryBranch) sessionStorage.setItem(key, JSON.stringify({ branch: repositoryBranch, sourcePath: "", sourceResolved: true, savedAt: Date.now() }));
  } catch (error) {
    repositoryBranch = null;
    repositorySourcePath = "";
    repositorySourceResolved = false;
  }
  return repositoryBranch;
}

function mediaUrls(filePath, downloadUrl = "", version = "") {
  const appendVersion = url => url && version ? `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}` : url;
  const fallback = appendVersion(downloadUrl || rawFallbackPath(filePath));
  if (!repositoryBranch || !repository) return { url: fallback, fallbackUrl: "" };
  const safePath = String(filePath).split("/").map(encodeURIComponent).join("/");
  const cdn = appendVersion(`https://cdn.jsdelivr.net/gh/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}@${encodeURIComponent(repositoryBranch)}/${safePath}`);
  return { url: cdn, fallbackUrl: fallback && fallback !== cdn ? fallback : "" };
}

function imageMediaUrls(filePath, downloadUrl = "", version = "") {
  const appendVersion = url => url && version ? `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}` : url;
  if (!repositoryBranch || !repository) return { url: appendVersion(downloadUrl || rawFallbackPath(filePath)), fallbackUrl: "" };
  const safePath = String(filePath).split("/").map(encodeURIComponent).join("/");
  const raw = appendVersion(`https://raw.githubusercontent.com/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/${encodeURIComponent(repositoryBranch)}/${safePath}`);
  const cdn = appendVersion(`https://cdn.jsdelivr.net/gh/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}@${encodeURIComponent(repositoryBranch)}/${safePath}`);
  return { url: raw, fallbackUrl: cdn };
}

function findNamedPng(files, name) {
  return files.find(file => file.type === "file" && file.name.toLowerCase() === `${name}.png`) || null;
}

function applyLibraryAssets() {
  applyBrandLogo(repositoryAssets.gitwave, repositoryAssets.gitwaveFallback);
  if (!currentAlbum) applyAlbumTheme(null);
}

async function githubRequest(path) {
  const encodedPath = path.split("/").filter(Boolean).map(encodeURIComponent).join("/");
  const suffix = encodedPath ? `/contents/${encodedPath}` : "/contents";
  const url = `https://api.github.com/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}${suffix}`;
  const response = await fetch(url, {
    headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    cache: "no-store",
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) {
    let message = `GitHub API вернул ошибку ${response.status}.`;
    try {
      const data = await response.json();
      if (data.message) message = data.message;
    } catch (error) {
      message = `GitHub API вернул ошибку ${response.status}.`;
    }
    if (response.status === 403 || response.status === 429) throw new Error("GitHub временно ограничил запросы. Использую сохранённую библиотеку, если она доступна.");
    if (response.status === 404) throw new Error(`GitHub не нашёл путь «${path || "/"}» в репозитории ${repository.owner}/${repository.repo}. Проверь выбранный репозиторий и ветку публикации.`);
    throw new Error(message);
  }
  return response.json();
}

function rawFallbackPath(path) {
  const safePath = path.split("/").map(encodeURIComponent).join("/");
  return `https://raw.githubusercontent.com/${repository.owner}/${repository.repo}/HEAD/${safePath}`;
}

async function mapWithLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function fetchRepositoryTree() {
  const branch = await resolveRepositoryBranch();
  if (!branch) return null;
  const url = `https://api.github.com/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
  const response = await fetch(url, {
    headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    cache: "no-store",
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) return null;
  const data = await response.json();
  return Array.isArray(data.tree) ? data : null;
}

function makeTrackRecord(file) {
  const media = mediaUrls(file.path, file.download_url || "", file.sha || "");
  const durationKey = `${file.path}:${file.sha || file.size || 0}`;
  const cachedDuration = Number(durationCache[durationKey]) || 0;
  const estimatedDuration = cachedDuration || estimateDurationFromSize(file.name, file.size);
  return {
    fileName: file.name,
    title: formatName(file.name.replace(/\.(mp3|ogg|wav)$/i, "")),
    url: media.url,
    fallbackUrl: media.fallbackUrl,
    path: file.path,
    durationKey,
    duration: estimatedDuration,
    durationEstimated: !cachedDuration && estimatedDuration > 0,
    size: file.size || 0
  };
}

function makeAlbumRecord(directoryName, directoryPath, files) {
  const previewCandidates = files.filter(file => file.type === "file" && /^preview\.(png|jpe?g|webp)$/i.test(file.name));
  const previewOrder = ["png", "jpg", "jpeg", "webp"];
  previewCandidates.sort((a, b) => previewOrder.indexOf(a.name.split(".").pop().toLowerCase()) - previewOrder.indexOf(b.name.split(".").pop().toLowerCase()));
  const preview = previewCandidates[0];
  const background = findNamedPng(files, "background");
  const tracks = files.filter(file => file.type === "file" && /\.(mp3|ogg|wav)$/i.test(file.name)).sort((a, b) => a.name.localeCompare(b.name, "ru", { numeric: true, sensitivity: "base" })).map(makeTrackRecord);
  const coverMedia = preview ? imageMediaUrls(preview.path, preview.download_url || "", preview.sha || "") : { url: "", fallbackUrl: "" };
  const backgroundMedia = background ? imageMediaUrls(background.path, background.download_url || "", background.sha || "") : { url: "", fallbackUrl: "" };
  return {
    id: directoryPath,
    folder: directoryName,
    title: formatName(directoryName),
    path: directoryPath,
    cover: coverMedia.url,
    coverFallback: coverMedia.fallbackUrl,
    background: backgroundMedia.url,
    backgroundFallback: backgroundMedia.fallbackUrl,
    tracks
  };
}

function setLibraryIconsFromFiles(files) {
  const gitwave = files.find(file => file.type === "file" && file.name.toLowerCase() === "gitwave.svg");
  const allTracksIcon = files.find(file => file.type === "file" && file.name.toLowerCase() === "all_tracks.svg") || files.find(file => file.type === "file" && file.name.toLowerCase() === "all_tacks.svg");
  if (gitwave) {
    const media = imageMediaUrls(gitwave.path, gitwave.download_url || "", gitwave.sha || "");
    repositoryAssets.gitwave = media.url;
    repositoryAssets.gitwaveFallback = media.fallbackUrl;
  }
  if (allTracksIcon) {
    const media = imageMediaUrls(allTracksIcon.path, allTracksIcon.download_url || "", allTracksIcon.sha || "");
    repositoryAssets.allTracksIcon = media.url;
    repositoryAssets.allTracksIconFallback = media.fallbackUrl;
  }
}

function setLibraryIconsFromTree(tree) {
  const sourceRoot = String(repositorySourcePath || "").replace(/^\/+|\/+$/g, "");
  const prefixes = [...new Set([sourceRoot ? `${sourceRoot}/ico-main/` : "ico-main/", "ico-main/"])];
  const files = tree.filter(item => item.type === "blob" && prefixes.some(prefix => item.path.toLowerCase().startsWith(prefix.toLowerCase()))).map(item => ({
    type: "file",
    name: item.path.split("/").pop(),
    path: item.path,
    sha: item.sha,
    size: item.size
  }));
  setLibraryIconsFromFiles(files);
}

async function setLibraryIconsFromContents() {
  const sourceRoot = String(repositorySourcePath || "").replace(/^\/+|\/+$/g, "");
  const folders = [...new Set([sourceRoot ? `${sourceRoot}/ico-main` : "ico-main", "ico-main"])];
  for (const folder of folders) {
    try {
      const files = await githubRequest(folder);
      if (Array.isArray(files)) {
        setLibraryIconsFromFiles(files);
        if (repositoryAssets.gitwave && repositoryAssets.allTracksIcon) return;
      }
    } catch (error) {
      continue;
    }
  }
}

function assetsFromRootFiles(files) {
  repositoryAssets = { background: "", backgroundFallback: "", gitwave: repositoryAssets.gitwave || "", gitwaveFallback: repositoryAssets.gitwaveFallback || "", allTracksIcon: repositoryAssets.allTracksIcon || "", allTracksIconFallback: repositoryAssets.allTracksIconFallback || "" };
  const rootBackground = findNamedPng(files, "background");
  if (rootBackground) {
    const media = imageMediaUrls(rootBackground.path, rootBackground.download_url || "", rootBackground.sha || "");
    repositoryAssets.background = media.url;
    repositoryAssets.backgroundFallback = media.fallbackUrl;
  }
}

async function scanMusicWithTree(treeData) {
  const tree = treeData.tree;
  setLibraryIconsFromTree(tree);
  const sourceRoot = String(repositorySourcePath || "").replace(/^\/+|\/+$/g, "");
  const expectedMusicPath = [sourceRoot, MUSIC_DIR].filter(Boolean).join("/");
  const rootEntry = tree.find(item => item.type === "tree" && item.path.toLowerCase() === expectedMusicPath.toLowerCase());
  const rootFilePrefix = rootEntry ? rootEntry.path : expectedMusicPath;
  const prefix = `${rootFilePrefix}/`;
  const musicEntries = tree.filter(item => item.path.toLowerCase().startsWith(prefix.toLowerCase()));
  if (!musicEntries.length && !rootEntry) return null;
  const sourcePrefix = sourceRoot ? `${sourceRoot}/` : "";
  const rootFiles = tree.filter(item => item.type === "blob" && (sourcePrefix ? item.path.toLowerCase().startsWith(sourcePrefix.toLowerCase()) && !item.path.slice(sourcePrefix.length).includes("/") : !item.path.includes("/")));
  const musicRootFiles = musicEntries.filter(item => item.type === "blob" && !item.path.slice(prefix.length).includes("/"));
  const rootAssets = rootFiles.map(item => ({ type: "file", name: item.path.split("/").pop(), path: item.path, sha: item.sha, size: item.size }));
  const musicAssets = musicRootFiles.map(item => ({ type: "file", name: item.path.split("/").pop(), path: item.path, sha: item.sha, size: item.size }));
  assetsFromRootFiles(musicAssets);
  if (!repositoryAssets.background) {
    const fallbackAssets = [...rootAssets];
    if (!repositoryAssets.background) {
      const file = findNamedPng(fallbackAssets, "background");
      if (file) {
        const media = imageMediaUrls(file.path, "", file.sha || "");
        repositoryAssets.background = media.url;
        repositoryAssets.backgroundFallback = media.fallbackUrl;
      }
    }
  }
  const folders = new Map();
  musicEntries.forEach(item => {
    const relative = item.path.slice(prefix.length).split("/");
    if (relative.length < 2) return;
    const folderName = relative[0];
    if (!folders.has(folderName)) folders.set(folderName, []);
    if (relative.length === 2 && item.type === "blob") {
      folders.get(folderName).push({ type: "file", name: relative[1], path: item.path, sha: item.sha, size: item.size });
    }
  });
  const sortedFolders = Array.from(folders.keys()).sort((a, b) => a.localeCompare(b, "ru", { numeric: true, sensitivity: "base" }));
  return sortedFolders.map(name => makeAlbumRecord(name, `${rootFilePrefix}/${name}`, folders.get(name)));
}

async function scanMusicWithContents() {
  const sourceRoot = String(repositorySourcePath || "").replace(/^\/+|\/+$/g, "");
  const repositoryRoot = await githubRequest(sourceRoot);
  if (!Array.isArray(repositoryRoot)) throw new Error(`GitHub API не вернул список файлов папки источника Pages «${sourceRoot || "/"}».`);
  const musicDirectory = repositoryRoot.find(item => item.type === "dir" && item.name.toLowerCase() === MUSIC_DIR.toLowerCase());
  if (!musicDirectory) throw new Error(`В источнике публикации Pages «${sourceRoot || "/"}» репозитория ${repository.owner}/${repository.repo} не найдена папка «${MUSIC_DIR}».`);
  const root = await githubRequest(musicDirectory.path);
  if (!Array.isArray(root)) throw new Error(`Путь «${musicDirectory.path}» найден, но GitHub не вернул список его содержимого.`);
  assetsFromRootFiles(root);
  await setLibraryIconsFromContents();
  const directories = root.filter(item => item.type === "dir").sort((a, b) => a.name.localeCompare(b.name, "ru", { numeric: true, sensitivity: "base" }));
  return await mapWithLimit(directories, 4, async directory => {
    const path = `${musicDirectory.path}/${directory.name}`;
    const contents = await githubRequest(path);
    if (!Array.isArray(contents)) return null;
    return makeAlbumRecord(directory.name, path, contents);
  }).then(items => items.filter(Boolean));
}

async function scanMusicRepository() {
  let treeData = null;
  try {
    treeData = await fetchRepositoryTree();
  } catch (error) {
    treeData = null;
  }
  if (treeData && !treeData.truncated) {
    const treeResult = await scanMusicWithTree(treeData);
    if (treeResult !== null) return treeResult;
  }
  return scanMusicWithContents();
}

function setEmptyState(title, message, showRetry = true) {
  elements.emptyTitle.textContent = title;
  elements.emptyMessage.textContent = message;
  elements.emptyRetry.hidden = !showRetry;
  elements.empty.classList.add("visible");
  elements.grid.innerHTML = "";
}

function repositoryUpdateCacheKey() {
  return repository ? `unknown_repo_last_update:${repository.owner.toLowerCase()}:${repository.repo.toLowerCase()}` : "unknown_repo_last_update";
}

function updateRepositoryLastUpdateLabel() {
  if (!elements.repoUpdateText) return;
  if (!repoUpdatedAt) {
    elements.repoUpdateText.textContent = "Дата пока недоступна";
    elements.repoUpdateTimer.title = "Не удалось получить дату последнего коммита";
    return;
  }
  const elapsed = Math.max(0, Date.now() - repoUpdatedAt);
  const minutes = Math.floor(elapsed / 60000);
  let label;
  if (minutes < 1) label = "только что";
  else if (minutes < 60) label = `${minutes} мин. назад`;
  else if (minutes < 1440) label = `${Math.floor(minutes / 60)} ч. назад`;
  else label = `${Math.floor(minutes / 1440)} дн. назад`;
  elements.repoUpdateText.textContent = `Обновлено ${label}`;
  elements.repoUpdateTimer.title = `Последнее изменение репозитория: ${new Date(repoUpdatedAt).toLocaleString("ru-RU")}`;
}

async function loadRepositoryLastUpdate(force = false) {
  if (!repository) return;
  const key = repositoryUpdateCacheKey();
  try {
    const cached = JSON.parse(sessionStorage.getItem(key) || "null");
    if (cached && Number.isFinite(cached.updatedAt)) {
      repoUpdatedAt = cached.updatedAt;
      repoUpdateCheckedAt = cached.checkedAt || 0;
      updateRepositoryLastUpdateLabel();
      if (!force && Date.now() - repoUpdateCheckedAt < 10 * 60 * 1000) return;
    }
  } catch (error) {
    repoUpdateCheckedAt = 0;
  }
  try {
    const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/commits?per_page=1`, { headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }, cache: "no-store" });
    if (!response.ok) throw new Error(`GitHub API ${response.status}`);
    const commits = await response.json();
    const date = commits && commits[0] && (commits[0].commit?.committer?.date || commits[0].commit?.author?.date);
    const timestamp = date ? Date.parse(date) : 0;
    if (Number.isFinite(timestamp) && timestamp > 0) repoUpdatedAt = timestamp;
    repoUpdateCheckedAt = Date.now();
    sessionStorage.setItem(key, JSON.stringify({ updatedAt: repoUpdatedAt, checkedAt: repoUpdateCheckedAt }));
    updateRepositoryLastUpdateLabel();
  } catch (error) {
    repoUpdateCheckedAt = Date.now();
    updateRepositoryLastUpdateLabel();
  }
}

function startRepositoryUpdateTimer() {
  if (repoUpdateInterval) clearInterval(repoUpdateInterval);
  loadRepositoryLastUpdate(false);
  repoUpdateInterval = setInterval(() => {
    updateRepositoryLastUpdateLabel();
    if (!repoUpdateCheckedAt || Date.now() - repoUpdateCheckedAt >= 10 * 60 * 1000) loadRepositoryLastUpdate(true);
  }, 30000);
}

function refreshAlbumMediaFromTree(albumList, tree) {
  const files = tree.filter(item => item.type === "blob");
  albumList.forEach(album => {
    const prefix = `${String(album.path || "").replace(/\/+$/g, "")}/`;
    const contents = files.filter(item => item.path.toLowerCase().startsWith(prefix.toLowerCase()) && !item.path.slice(prefix.length).includes("/")).map(item => ({
      type: "file",
      name: item.path.slice(prefix.length),
      path: item.path,
      sha: item.sha,
      size: item.size
    }));
    const previews = contents.filter(file => /^preview\.(png|jpe?g|webp)$/i.test(file.name));
    const order = ["png", "jpg", "jpeg", "webp"];
    previews.sort((a, b) => order.indexOf(a.name.split(".").pop().toLowerCase()) - order.indexOf(b.name.split(".").pop().toLowerCase()));
    const preview = previews[0];
    const background = findNamedPng(contents, "background");
    const coverMedia = preview ? imageMediaUrls(preview.path, "", preview.sha) : { url: "", fallbackUrl: "" };
    const backgroundMedia = background ? imageMediaUrls(background.path, "", background.sha) : { url: "", fallbackUrl: "" };
    album.cover = coverMedia.url;
    album.coverFallback = coverMedia.fallbackUrl;
    album.background = backgroundMedia.url;
    album.backgroundFallback = backgroundMedia.fallbackUrl;
  });
}

async function ensureBrandAssets(force = false) {
  if (!force && repositoryAssets.gitwave && repositoryAssets.allTracksIcon) return;
  try {
    const treeData = await fetchRepositoryTree();
    if (treeData && !treeData.truncated) {
      setLibraryIconsFromTree(treeData.tree);
      if (force) refreshAlbumMediaFromTree(albums, treeData.tree);
    }
  } catch (error) {
    repositoryAssets.gitwave = repositoryAssets.gitwave || "";
    repositoryAssets.allTracksIcon = repositoryAssets.allTracksIcon || "";
  }
  if (!repositoryAssets.gitwave || !repositoryAssets.allTracksIcon) await setLibraryIconsFromContents();
  if (repositoryAssets.gitwave || repositoryAssets.allTracksIcon) writeCache(albums);
}

async function loadLibrary(force = false) {
  if (!repository) {
    setStatus("error", "Не задан репозиторий");
    setEmptyState("Не удалось определить GitHub-репозиторий", "Открой сайт по адресу username.github.io/repository/ или заполни GITHUB_USER и GITHUB_REPO в начале скрипта. Для собственного домена укажи обе константы.", false);
    elements.albumCount.textContent = "0";
    elements.searchCount.textContent = "";
    updateIdlePlayerState();
    return;
  }
  setStatus("", force ? "Обновление библиотеки..." : "Загрузка библиотеки...");
  elements.repoLink.href = `https://github.com/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}`;
  elements.repoLink.hidden = false;
  try {
    let result = !force ? readCache() : null;
    const fromCache = Array.isArray(result);
    if (!fromCache) {
      result = await scanMusicRepository();
      writeCache(result);
    }
    albums = result;
    buildAllTracksAlbum();
    await ensureBrandAssets(fromCache);
    applyLibraryAssets();
    renderAlbums();
    setStatus("ready", fromCache ? "Библиотека из кэша" : "Библиотека синхронизирована");
    if (!albums.length) setEmptyState("Музыка ещё не добавлена", `В папке ${MUSIC_DIR}/ создай подпапки альбомов и помести в них аудиофайлы MP3, OGG или WAV.`, false);
  } catch (error) {
    const stale = readCache(true);
    if (Array.isArray(stale)) {
      albums = stale;
      buildAllTracksAlbum();
      applyLibraryAssets();
      renderAlbums();
      setStatus("ready", "Библиотека из сохранённого кэша");
      showToast("GitHub временно не ответил. Открыта последняя сохранённая версия библиотеки.", "info");
      if (!albums.length) setEmptyState("Музыка ещё не добавлена", `В папке ${MUSIC_DIR}/ создай подпапки альбомов и добавь аудиофайлы.`, false);
    } else {
      setStatus("error", "Ошибка загрузки");
      setEmptyState("Не удалось загрузить библиотеку", error.message || "Проверь настройки репозитория и доступность GitHub API.", true);
      elements.albumCount.textContent = "0";
      elements.searchCount.textContent = "";
      renderAlbums();
    }
  } finally {
    updateRepositoryLastUpdateLabel();
    updateIdlePlayerState();
  }
}

function albumPlaceholder() {
  return '<div class="album-cover-placeholder"><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="32" cy="32" r="23"/><circle cx="32" cy="32" r="15"/><circle cx="32" cy="32" r="5" fill="currentColor" stroke="none"/></svg></div>';
}

function rotateIdleAlbumHighlight() {
  if (!elements.dock.classList.contains("player-idle")) return;
  const cards = Array.from(elements.grid.querySelectorAll(".album-card:not(.all-tracks-card)"));
  if (!cards.length) {
    if (idleHighlightedCard && idleHighlightedCard.isConnected) idleHighlightedCard.classList.remove("awaiting-selection");
    idleHighlightedCard = null;
    return;
  }
  let nextIndex = idleHighlightIndex % cards.length;
  let nextCard = cards[nextIndex];
  if (nextCard === idleHighlightedCard && cards.length > 1) {
    nextIndex = (nextIndex + 1) % cards.length;
    nextCard = cards[nextIndex];
  }
  if (nextCard === idleHighlightedCard) return;
  const previousCard = idleHighlightedCard;
  nextCard.classList.add("awaiting-selection");
  idleHighlightedCard = nextCard;
  if (previousCard && previousCard.isConnected) {
    requestAnimationFrame(() => previousCard.classList.remove("awaiting-selection"));
  }
  idleHighlightIndex = (nextIndex + 1) % cards.length;
}

function updateIdlePlayerState() {
  if (!elements.dock || !elements.playerPrompt) return;
  const idle = !currentAlbum || currentTrackIndex < 0 || !currentAlbum.tracks[currentTrackIndex];
  elements.dock.classList.toggle("player-idle", idle);
  if (!idle) {
    elements.playerPrompt.textContent = "";
    if (idleHighlightedCard && idleHighlightedCard.isConnected) idleHighlightedCard.classList.remove("awaiting-selection");
    idleHighlightedCard = null;
    if (idleHighlightTimer) clearInterval(idleHighlightTimer);
    idleHighlightTimer = null;
    return;
  }
  if (elements.overlay.classList.contains("open")) {
    elements.playerPrompt.textContent = "";
    if (idleHighlightedCard && idleHighlightedCard.isConnected) idleHighlightedCard.classList.remove("awaiting-selection");
    idleHighlightedCard = null;
    if (idleHighlightTimer) clearInterval(idleHighlightTimer);
    idleHighlightTimer = null;
    return;
  }
  elements.playerPrompt.textContent = albums.length ? "Выбери альбом, чтобы начать прослушивание" : "Добавь музыку в библиотеку, чтобы начать прослушивание";
  if (!albums.length) {
    if (idleHighlightedCard && idleHighlightedCard.isConnected) idleHighlightedCard.classList.remove("awaiting-selection");
    idleHighlightedCard = null;
    if (idleHighlightTimer) clearInterval(idleHighlightTimer);
    idleHighlightTimer = null;
    return;
  }
  if (!idleHighlightTimer) {
    rotateIdleAlbumHighlight();
    idleHighlightTimer = setInterval(rotateIdleAlbumHighlight, 2400);
  } else if (!idleHighlightedCard || !idleHighlightedCard.isConnected) {
    rotateIdleAlbumHighlight();
  }
}

function allTracksArtMarkup() {
  if (!repositoryAssets.allTracksIcon) return ALL_TRACKS_ART;
  return `<div class="all-tracks-art"><img class="all-tracks-art-icon" src="${escapeHTML(repositoryAssets.allTracksIcon)}" data-fallback-src="${escapeHTML(repositoryAssets.allTracksIconFallback || "")}" alt="Все треки"></div>`;
}

function bindAllTracksArt(container) {
  if (!container) return;
  const image = container.querySelector(".all-tracks-art-icon");
  if (!image) return;
  image.addEventListener("error", () => {
    const fallback = image.dataset.fallbackSrc;
    if (fallback && image.dataset.fallbackUsed !== "1") {
      image.dataset.fallbackUsed = "1";
      image.src = fallback;
    } else {
      const art = image.closest(".all-tracks-art");
      if (art) art.outerHTML = ALL_TRACKS_ART;
    }
  });
}

function renderAlbums() {
  const query = elements.search.value.trim().toLocaleLowerCase("ru");
  const trackHits = renderGlobalTrackResults(query);
  filteredAlbums = albums.filter(album =>
    album.title.toLocaleLowerCase("ru").includes(query) ||
    album.folder.toLocaleLowerCase("ru").includes(query) ||
    album.tracks.some(track => trackMatches(track, query))
  );
  elements.albumCount.textContent = String(albums.length);
  elements.searchCount.textContent = query ? `${pluralAlbums(filteredAlbums.length)} · ${pluralTracks(trackHits)}` : pluralTracks(albums.reduce((sum, album) => sum + album.tracks.length, 0));
  elements.empty.classList.remove("visible");
  const showAllTracks = Boolean(allTracksAlbum && (!query || ["все треки", "вся музыка", "all tracks", "unknown"].some(value => value.includes(query) || query.includes(value))));
  const cards = [...(showAllTracks ? [allTracksAlbum] : []), ...filteredAlbums];
  if (!cards.length) {
    if (albums.length) setEmptyState("Ничего не найдено", "Попробуй другое название альбома или трека.", false);
    else elements.grid.innerHTML = "";
    updateIdlePlayerState();
    return;
  }
  elements.grid.innerHTML = cards.map((album, index) => {
    const isAll = album.isAllTracks;
    let coverContent;
    if (isAll) {
      coverContent = allTracksArtMarkup();
    } else {
      const cover = album.cover || FALLBACK_COVER;
      const coverFallback = album.coverFallback ? `data-fallback-src="${escapeHTML(album.coverFallback)}"` : "";
      coverContent = `<img class="album-cover" crossorigin="anonymous" src="${escapeHTML(cover)}" ${coverFallback} alt="Обложка ${escapeHTML(album.title)}" loading="lazy" draggable="false"><div class="album-cover-placeholder" hidden></div>`;
    }
    return `<article class="album-card${isAll ? " all-tracks-card" : ""}" role="button" tabindex="0" data-album-id="${escapeHTML(album.id)}" style="animation-delay:${Math.min(index * 45, 360)}ms"><div class="album-card-inner"><div class="album-cover-wrap">${coverContent}</div><div class="album-info"><h3 class="album-name">${escapeHTML(album.title)}</h3><span class="album-track-count">${album.tracks.length} TRACK${album.tracks.length === 1 ? "" : "S"}</span></div><div class="album-subline"><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v6"/></svg>${isAll ? "Вся коллекция" : "Альбом"}</span></div></div></article>`;
  }).join("");
  cards.filter(album => !album.isAllTracks).forEach(album => {
    const card = Array.from(elements.grid.querySelectorAll(".album-card")).find(item => item.dataset.albumId === album.id);
    if (!card) return;
    if (album.palette) applyPaletteToCard(card, album.palette);
    const image = card.querySelector(".album-cover");
    if (image) {
      image.addEventListener("load", () => applyImagePalette(album, image), { once: true });
      image.addEventListener("error", () => {
        const fallbackUrl = image.dataset.fallbackSrc;
        if (fallbackUrl && image.dataset.fallbackUsed !== "1") {
          image.dataset.fallbackUsed = "1";
          image.src = fallbackUrl;
          return;
        }
        image.hidden = true;
        const placeholder = card.querySelector(".album-cover-placeholder");
        placeholder.innerHTML = albumPlaceholder();
        placeholder.hidden = false;
      });
      if (image.complete && image.naturalWidth) applyImagePalette(album, image);
    }
  });
  const allCard = elements.grid.querySelector(`[data-album-id="${ALL_TRACKS_ID}"]`);
  if (allTracksAlbum) {
    applyPaletteToCard(allCard, DEFAULT_PALETTE);
    bindAllTracksArt(allCard);
  }
  updateIdlePlayerState();
}

function setImage(image, fallback, url, fallbackUrl = "", albumForPalette = null) {
  if (!url) {
    const overlay = image.parentElement && image.parentElement.querySelector(".image-crossfade-overlay");
    if (overlay) overlay.remove();
    image.style.opacity = "1";
    image.removeAttribute("src");
    image.style.display = "none";
    fallback.style.display = "grid";
    return;
  }
  const normalizedUrl = String(url);
  const currentUrl = image.dataset.renderedUrl || image.currentSrc || image.getAttribute("src") || "";
  const shouldCrossfade = currentUrl && currentUrl !== normalizedUrl && image.naturalWidth > 0 && image.style.display !== "none";
  const fadeToken = shouldCrossfade ? beginImageCrossfade(image) : null;
  image.crossOrigin = "anonymous";
  image.style.display = "block";
  fallback.style.display = "none";
  image.dataset.fallbackUsed = "0";
  const revealImage = loadedUrl => {
    image.dataset.renderedUrl = loadedUrl;
    finishImageCrossfade(image, fadeToken);
    const sourceAlbum = albumForPalette || getTrackSourceAlbum(currentAlbum, currentAlbum && currentAlbum.tracks[currentTrackIndex]);
    if (sourceAlbum && sourceAlbum.cover && image.naturalWidth) applyImagePalette(sourceAlbum, image);
  };
  image.onerror = () => {
    if (fallbackUrl && image.dataset.fallbackUsed !== "1") {
      image.dataset.fallbackUsed = "1";
      image.src = fallbackUrl;
      return;
    }
    const token = imageTransitionStates.get(image);
    if (token && token.overlay) token.overlay.remove();
    imageTransitionStates.delete(image);
    image.style.opacity = "1";
    image.style.display = "none";
    fallback.style.display = "grid";
  };
  image.onload = () => revealImage(image.currentSrc || image.src);
  if ((image.currentSrc || image.src) === normalizedUrl && image.complete && image.naturalWidth) {
    revealImage(normalizedUrl);
    return;
  }
  image.src = normalizedUrl;
  if (image.complete && image.naturalWidth) revealImage(image.currentSrc || image.src);
}

function renderPlaylistCover(album) {
  const mosaic = elements.playlistCoverMosaic;
  if (album && album.isAllTracks) {
    elements.playlistCover.style.display = "none";
    elements.playlistCover.removeAttribute("src");
    elements.playlistCoverFallback.style.display = "none";
    mosaic.classList.add("all-tracks-cover-art");
    mosaic.hidden = false;
    mosaic.removeAttribute("data-count");
    mosaic.style.removeProperty("--mosaic-columns");
    mosaic.style.removeProperty("--mosaic-rows");
    mosaic.innerHTML = allTracksArtMarkup();
    bindAllTracksArt(mosaic);
    return;
  }
  mosaic.classList.remove("all-tracks-cover-art");
  mosaic.hidden = true;
  mosaic.innerHTML = "";
  elements.playlistCover.style.display = "block";
  setImage(elements.playlistCover, elements.playlistCoverFallback, album ? album.cover : "", album ? album.coverFallback : "", album);
}

function setAmbientBackground(url, album = null) {
  const fallbackUrl = album && album.background && url === album.background ? album.backgroundFallback : album && album.cover && url === album.cover ? album.coverFallback : repositoryAssets.backgroundFallback;
  const backgroundUrl = url || "";
  const activeColor = album && validPalette(album.palette) ? album.palette.primary.join(",") : "132,138,148";
  elements.ambient.style.backgroundColor = `rgba(${activeColor},.2)`;
  crossfadeBackground(elements.ambient, backgroundUrl, fallbackUrl, "ambient");
  crossfadeBackground(elements.playlistWindow, backgroundUrl, fallbackUrl, "window");
}

function openAlbum(album) {
  if (!album) return;
  viewedAlbum = album;
  elements.playlistSearch.value = "";
  const activeTrack = currentAlbum && currentTrackIndex >= 0 ? currentAlbum.tracks[currentTrackIndex] : null;
  const viewedActiveIndex = activeTrack ? album.tracks.findIndex(track => track.url === activeTrack.url) : -1;
  const themeAlbum = viewedActiveIndex >= 0 ? getTrackSourceAlbum(album, album.tracks[viewedActiveIndex]) : album;
  applyAlbumTheme(themeAlbum);
  elements.playlistTitle.textContent = album.title;
  elements.playlistMeta.textContent = album.isAllTracks ? `${pluralTracks(album.tracks.length)} · ${albums.length} альбомов` : `${pluralTracks(album.tracks.length)} · ${album.folder}`;
  elements.trackCount.textContent = `${album.tracks.length} TRACK${album.tracks.length === 1 ? "" : "S"}`;
  elements.downloadZip.disabled = zipDownloadActive || !album.tracks.length;
  elements.downloadZipLabel.textContent = "Скачать ZIP";
  renderPlaylistCover(album);
  const backgroundAlbum = album.isAllTracks ? (viewedActiveIndex >= 0 ? getTrackSourceAlbum(album, album.tracks[viewedActiveIndex]) : null) : album;
  setAmbientBackground(backgroundAlbum ? backgroundAlbum.background || repositoryAssets.background || backgroundAlbum.cover : repositoryAssets.background, backgroundAlbum);
  renderTrackList();
  loadAlbumDurations(album);
  updatePlaylistPlayButton();
  elements.overlay.classList.add("open");
  elements.overlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  updateIdlePlayerState();
  elements.closePlaylist.focus({ preventScroll: true });
}

function closeAlbum() {
  elements.overlay.classList.remove("open");
  elements.overlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  viewedAlbum = null;
  if (currentAlbum && currentTrackIndex >= 0 && currentAlbum.tracks[currentTrackIndex]) {
    applyAlbumTheme(getTrackSourceAlbum(currentAlbum, currentAlbum.tracks[currentTrackIndex]));
  } else {
    applyAlbumTheme(null);
  }
  updateIdlePlayerState();
}

function loadAlbumDurations(album) {
  if (!album || !Array.isArray(album.tracks)) return;
  album.tracks.forEach(track => {
    const cached = Number(durationCache[trackDurationKey(track)]);
    if (Number.isFinite(cached) && cached > 0) {
      track.duration = cached;
      track.durationEstimated = false;
    } else if (!(Number.isFinite(track.duration) && track.duration > 0)) {
      track.duration = estimateDurationFromSize(track.fileName, track.size);
      track.durationEstimated = track.duration > 0;
    }
  });
  if (currentAlbum === album) renderTrackList();
}

function renderTrackList() {
  const listAlbum = viewedAlbum;
  if (!listAlbum || !listAlbum.tracks.length) {
    elements.trackList.classList.remove("grouped-tracks");
    elements.trackList.innerHTML = '<div class="track-empty">В этом альбоме пока нет аудиофайлов.</div>';
    elements.trackCount.textContent = "0 TRACKS";
    updateTrackSelectionUI();
    return;
  }
  const activeIndex = getViewedTrackIndex();
  const query = elements.playlistSearch.value.trim().toLocaleLowerCase("ru");
  const visible = listAlbum.tracks.map((track, index) => ({ track, index })).filter(item => !query || trackMatches(item.track, query) || String(item.track.albumTitle || "").toLocaleLowerCase("ru").includes(query));
  elements.trackCount.textContent = query ? visible.length + " / " + listAlbum.tracks.length + " TRACKS" : listAlbum.tracks.length + " TRACK" + (listAlbum.tracks.length === 1 ? "" : "S");
  if (!visible.length) {
    elements.trackList.classList.remove("grouped-tracks");
    elements.trackList.innerHTML = '<div class="track-empty">По этому запросу треков не найдено.</div>';
    updateTrackSelectionUI();
    return;
  }
  const renderRow = (track, index, visibleIndex) => {
    const key = track.path || track.durationKey || track.url;
    const selected = selectedTrackKeys.has(key);
    const subtitle = track.albumTitle || track.fileName || "";
    return '<div class="track-row' + (index === activeIndex ? " active" : "") + (index === activeIndex && !elements.audio.paused ? " is-playing" : "") + '" data-track-index="' + index + '">' +
      '<button class="track-play-area" type="button" data-track-play aria-label="Воспроизвести ' + escapeHTML(track.title) + '">' +
      '<span class="track-number"><span class="track-number-text">' + String(visibleIndex + 1).padStart(2, "0") + '</span><canvas class="track-equalizer" width="76" height="32" aria-hidden="true"></canvas></span>' +
      '<span class="track-title-wrap"><span class="track-title">' + escapeHTML(track.title) + '</span>' + (listAlbum.isAllTracks ? "" : '<span class="track-subtitle">' + escapeHTML(subtitle) + '</span>') + '</span></button>' +
      '<span class="track-duration" data-duration-index="' + index + '">' + formatTrackDuration(track) + '</span>' +
      '<button class="track-select-btn" type="button" data-track-select aria-pressed="' + (selected ? "true" : "false") + '" title="' + (selected ? "Убрать из выборки" : "Добавить в выборку") + '" aria-label="' + (selected ? "Убрать из выборки" : "Добавить в выборку") + '">' +
      (selected ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>') + '</button>' +
      '<button class="track-download-btn" type="button" data-track-download title="Скачать трек" aria-label="Скачать ' + escapeHTML(track.title) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg></button></div>';
  };
  if (!listAlbum.isAllTracks) {
    elements.trackList.classList.remove("grouped-tracks");
    elements.trackList.innerHTML = visible.map(({track,index}, visibleIndex) => renderRow(track,index,visibleIndex)).join("");
    updateTrackListState();
    updateTrackSelectionUI();
    return;
  }
  elements.trackList.classList.add("grouped-tracks");
  const groups = [];
  const groupMap = new Map();
  visible.forEach(item => {
    const key = item.track.albumId || item.track.albumTitle || "__uncategorized__";
    if (!groupMap.has(key)) groupMap.set(key, { key, title: item.track.albumTitle || "Без категории", items: [] });
    groupMap.get(key).items.push(item);
  });
  elements.trackList.innerHTML = Array.from(groupMap.values()).map(group => {
    const heading = '<div class="track-group-heading"><span class="track-group-marker"></span><span class="track-group-title">' + escapeHTML(group.title) + '</span><span class="track-group-count">' + group.items.length + ' TRACK' + (group.items.length === 1 ? "" : "S") + '</span></div>';
    return heading + group.items.map(({track,index}, groupIndex) => renderRow(track,index,groupIndex)).join("");
  }).join("");
  updateTrackListState();
  updateTrackSelectionUI();
}

function updateTrackListState() {
  const rows = elements.trackList.querySelectorAll(".track-row");
  const activeIndex = getViewedTrackIndex();
  rows.forEach(row => {
    const index = Number(row.dataset.trackIndex);
    row.classList.toggle("active", index === activeIndex);
    row.classList.toggle("is-playing", index === activeIndex && !elements.audio.paused);
    const duration = row.querySelector("[data-duration-index]");
    const track = viewedAlbum && viewedAlbum.tracks[index];
    if (duration && track && track.duration) duration.textContent = formatTrackDuration(track);
  });
  updateTrackSelectionUI();
}

function registerShuffleSelection(index) {
  if (!shuffleEnabled) return;
  if (shuffleCursor >= 0 && shuffleHistory[shuffleCursor] === index) return;
  shuffleHistory = shuffleHistory.slice(0, shuffleCursor + 1);
  shuffleHistory.push(index);
  shuffleCursor = shuffleHistory.length - 1;
  shuffleCyclePlayed.add(index);
}

function setCurrentTrack(index, autoplay = false, options = {}) {
  const targetAlbum = options.album || viewedAlbum || currentAlbum;
  if (!targetAlbum || !targetAlbum.tracks.length || index < 0 || index >= targetAlbum.tracks.length) return;
  const track = targetAlbum.tracks[index];
  const albumChanged = !currentAlbum || currentAlbum.id !== targetAlbum.id;
  const sameMedia = Boolean(elements.audio.dataset.trackUrl === track.url && elements.audio.src);
  const changed = !sameMedia;
  if (changed) {
    playbackRequested = false;
    playSequence++;
    clearTimeout(audioFallbackTimer);
    elements.audio.pause();
    elements.audio.preload = autoplay ? "auto" : "metadata";
    elements.audio.fetchPriority = "high";
    elements.audio.dataset.trackUrl = track.url;
    elements.audio.dataset.trackToken = String(playSequence);
    elements.audio.dataset.fallbackUrl = track.fallbackUrl || "";
    elements.audio.dataset.fallbackUsed = "0";
    elements.audio.src = track.url;
    audioReady = false;
  }
  if (albumChanged) {
    shuffleHistory = [];
    shuffleCursor = -1;
    shuffleCyclePlayed = new Set();
  }
  currentAlbum = targetAlbum;
  currentTrackIndex = index;
  const sourceAlbum = getTrackSourceAlbum(currentAlbum, track);
  applyAlbumTheme(sourceAlbum);
  if (viewedAlbum && elements.overlay.classList.contains("open")) {
    if (viewedAlbum.isAllTracks) setAmbientBackground(sourceAlbum.background || repositoryAssets.background || sourceAlbum.cover, sourceAlbum);
    else if (viewedAlbum.id === currentAlbum.id) setAmbientBackground(sourceAlbum.background || repositoryAssets.background || sourceAlbum.cover, sourceAlbum);
  }
  if (options.recordHistory !== false && shuffleEnabled) registerShuffleSelection(index);
  updatePlayer();
  updateTrackListState();
  updateMediaSession();
  updateIdlePlayerState();
  if (autoplay) playAudio();
  else if (changed) updatePlayButton();
}

function updatePlayer() {
  if (!currentAlbum || currentTrackIndex < 0 || !currentAlbum.tracks[currentTrackIndex]) {
    applyAlbumTheme(null);
    elements.playerTitle.textContent = "Выбери альбом";
    elements.playerAlbum.textContent = "Музыка начнётся здесь";
    setImage(elements.playerCover, elements.playerCoverFallback, "");
    elements.currentTime.textContent = "00:00";
    elements.durationTime.textContent = "00:00";
    elements.progress.value = 0;
    elements.progress.style.setProperty("--range-fill", "0%");
    updateIdlePlayerState();
    return;
  }
  const track = currentAlbum.tracks[currentTrackIndex];
  const sourceAlbum = getTrackSourceAlbum(currentAlbum, track);
  applyAlbumTheme(sourceAlbum);
  elements.playerTitle.textContent = track.title;
  elements.playerAlbum.textContent = sourceAlbum ? sourceAlbum.title : currentAlbum.title;
  setImage(elements.playerCover, elements.playerCoverFallback, sourceAlbum ? sourceAlbum.cover : currentAlbum.cover, sourceAlbum ? sourceAlbum.coverFallback : currentAlbum.coverFallback, sourceAlbum);
  elements.currentTime.textContent = formatTime(elements.audio.currentTime || 0);
  const hasExactDuration = Number.isFinite(elements.audio.duration) && elements.audio.duration > 0;
  const duration = hasExactDuration ? elements.audio.duration : track.duration || 0;
  elements.durationTime.textContent = hasExactDuration ? formatTime(duration) : formatTrackDuration(track);
  updateProgress();
  updatePlayButton();
  updateIdlePlayerState();
}

function updatePlaylistPlayButton() {
  const activeIndex = getViewedTrackIndex();
  const track = viewedAlbum && activeIndex >= 0 ? viewedAlbum.tracks[activeIndex] : null;
  const playing = Boolean(track && !elements.audio.paused && elements.audio.dataset.trackUrl === track.url);
  elements.playAll.innerHTML = `${playing ? ICON_PAUSE : ICON_PLAY}<span>${playing ? "Пауза" : "Слушать"}</span>`;
  elements.playAll.setAttribute("aria-label", playing ? "Пауза" : "Слушать");
}

function updatePlayButton() {
  const playing = !elements.audio.paused;
  elements.playPause.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
  elements.playPause.setAttribute("aria-label", playing ? "Пауза" : "Воспроизвести");
  elements.playPause.title = playing ? "Пауза" : "Пробел — воспроизведение";
  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    } catch (error) {
    }
  }
  updateTrackListState();
  updatePlaylistPlayButton();
}

async function initializeAudioAnalyser() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return false;
  try {
    if (!audioContext) audioContext = new AudioContextClass({ latencyHint: "playback" });
    if (!audioContextRecoveryAttached && typeof audioContext.addEventListener === "function") {
      audioContext.addEventListener("statechange", () => {
        if (audioContext && audioContext.state === "suspended" && !elements.audio.paused && document.visibilityState === "visible") audioContext.resume().catch(() => {});
      });
      audioContextRecoveryAttached = true;
    }
    if (audioContext.state === "suspended") await audioContext.resume();
    if (audioContext.state !== "running") return false;
    if (!audioSourceNode) {
      const source = audioContext.createMediaElementSource(elements.audio);
      audioSourceNode = source;
      try {
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = .86;
        const data = new Uint8Array(analyser.frequencyBinCount);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        audioAnalyser = analyser;
        frequencyData = data;
        audioGraphConnected = true;
      } catch (error) {
        audioAnalyser = null;
        frequencyData = null;
        if (!audioDirectConnected) {
          source.connect(audioContext.destination);
          audioDirectConnected = true;
        }
      }
    }
    return Boolean(audioAnalyser);
  } catch (error) {
    audioAnalyser = null;
    frequencyData = null;
    if (audioSourceNode && !audioGraphConnected && !audioDirectConnected && audioContext && audioContext.state === "running") {
      try {
        audioSourceNode.connect(audioContext.destination);
        audioDirectConnected = true;
      } catch (connectionError) {
        audioDirectConnected = false;
      }
    }
    return false;
  }
}

function tryAudioFallback() {
  const fallbackUrl = elements.audio.dataset.fallbackUrl;
  if (!fallbackUrl || elements.audio.dataset.fallbackUsed === "1") return false;
  clearTimeout(audioFallbackTimer);
  elements.audio.dataset.fallbackUsed = "1";
  elements.audio.dataset.fallbackRestoreTime = String(Number(elements.audio.currentTime) || 0);
  elements.audio.src = fallbackUrl;
  return true;
}

function restoreAudioPosition() {
  const position = Number(elements.audio.dataset.fallbackRestoreTime) || 0;
  delete elements.audio.dataset.fallbackRestoreTime;
  if (position > 0 && Number.isFinite(elements.audio.duration) && elements.audio.duration > position) {
    try {
      elements.audio.currentTime = position;
    } catch (error) {
      return;
    }
  }
}

function waitForAudioPlayable(timeout = 16000) {
  return new Promise((resolve, reject) => {
    const audio = elements.audio;
    const expectedSource = audio.src;
    const sourceIsCurrent = () => audio.src === expectedSource;
    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA && sourceIsCurrent()) {
      resolve();
      return;
    }
    let timer = 0;
    const cleanup = () => {
      clearTimeout(timer);
      audio.removeEventListener("canplay", ready);
      audio.removeEventListener("loadeddata", ready);
      audio.removeEventListener("error", failed);
    };
    const ready = () => {
      if (!sourceIsCurrent() || audio.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      cleanup();
      resolve();
    };
    const failed = () => {
      cleanup();
      reject(audio.error || new Error("Источник аудио недоступен."));
    };
    audio.addEventListener("canplay", ready);
    audio.addEventListener("loadeddata", ready);
    audio.addEventListener("error", failed);
    timer = setTimeout(() => {
      cleanup();
      reject(new Error("Аудиофайл слишком долго не отвечает."));
    }, timeout);
  });
}

async function recoverAudioPlayback(error, token) {
  if (audioRecoveryPromise && audioRecoveryToken === token) return audioRecoveryPromise;
  audioRecoveryToken = token;
  const recovery = (async () => {
    if (token !== playSequence || !playbackRequested) return false;
    if (error && error.name === "NotAllowedError") throw error;
    if (error && error.name === "AbortError") {
      await new Promise(resolve => setTimeout(resolve, 120));
      if (token !== playSequence || !playbackRequested) return false;
      if (elements.audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        try {
          await elements.audio.play();
          return true;
        } catch (retryError) {
          error = retryError;
        }
      }
    }
    const mediaError = elements.audio.error;
    const shouldSwitchSource = Boolean(mediaError && mediaError.code >= 2) || Boolean(error && ["NetworkError", "NotSupportedError"].includes(error.name));
    if (shouldSwitchSource && elements.audio.dataset.fallbackUsed !== "1") tryAudioFallback();
    try {
      await waitForAudioPlayable(10000);
      if (token !== playSequence || !playbackRequested) return false;
      restoreAudioPosition();
      await elements.audio.play();
      return true;
    } catch (firstRetryError) {
      if (token !== playSequence || !playbackRequested) return false;
      if (elements.audio.dataset.fallbackUsed !== "1" && tryAudioFallback()) {
        await waitForAudioPlayable(12000);
        if (token !== playSequence || !playbackRequested) return false;
        restoreAudioPosition();
        await elements.audio.play();
        return true;
      }
      throw firstRetryError;
    }
  })().catch(retryError => {
    if (token === playSequence && playbackRequested) {
      const message = retryError && retryError.name === "NotAllowedError" ? "Браузер заблокировал воспроизведение. Нажми Play ещё раз после взаимодействия со страницей." : "Не удалось запустить аудиофайл даже через резервный источник.";
      showToast(message, "error");
    }
    return false;
  }).finally(() => {
    if (audioRecoveryToken === token) audioRecoveryPromise = null;
  });
  audioRecoveryPromise = recovery;
  return recovery;
}

function scheduleAudioFallback(token = playSequence) {
  clearTimeout(audioFallbackTimer);
  audioFallbackTimer = setTimeout(() => {
    if (token !== playSequence || !playbackRequested) return;
    if (elements.audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA && tryAudioFallback()) recoverAudioPlayback(new DOMException("Источник отвечает слишком медленно.", "NetworkError"), token);
  }, 6000);
}

function playAudio() {
  if (!currentAlbum || !currentAlbum.tracks.length || currentTrackIndex < 0) {
    const targetAlbum = viewedAlbum || (albums.length ? albums[0] : null);
    if (!targetAlbum || !targetAlbum.tracks.length) return;
    setCurrentTrack(0, false, { album: targetAlbum, recordHistory: true });
  }
  playbackRequested = true;
  const token = ++playSequence;
  elements.audio.preload = "auto";
  elements.audio.fetchPriority = "high";
  let playPromise;
  try {
    playPromise = elements.audio.play();
  } catch (error) {
    recoverAudioPlayback(error, token);
    return;
  }
  initializeAudioAnalyser().catch(() => {});
  spectrumEnvelope = 0;
  scheduleAudioFallback(token);
  Promise.resolve(playPromise).then(() => {
    if (token === playSequence) clearTimeout(audioFallbackTimer);
  }).catch(error => {
    if (token !== playSequence || !playbackRequested) return;
    recoverAudioPlayback(error, token);
  });
}

function togglePlayPause() {
  if (elements.audio.paused) playAudio();
  else {
    playbackRequested = false;
    playSequence++;
    clearTimeout(audioFallbackTimer);
    elements.audio.pause();
  }
}

function nextShuffleIndex() {
  if (shuffleCursor < shuffleHistory.length - 1) {
    shuffleCursor++;
    return shuffleHistory[shuffleCursor];
  }
  let candidates = currentAlbum.tracks.map((track, index) => index).filter(index => !shuffleCyclePlayed.has(index));
  if (!candidates.length && repeatMode === 1) {
    if (currentAlbum.tracks.length === 1) return currentTrackIndex;
    shuffleCyclePlayed = new Set([currentTrackIndex]);
    candidates = currentAlbum.tracks.map((track, index) => index).filter(index => index !== currentTrackIndex);
  }
  if (!candidates.length) return -1;
  const choice = candidates[Math.floor(Math.random() * candidates.length)];
  shuffleHistory = shuffleHistory.slice(0, shuffleCursor + 1);
  shuffleHistory.push(choice);
  shuffleCursor = shuffleHistory.length - 1;
  shuffleCyclePlayed.add(choice);
  return choice;
}

function nextTrack(automatic = false) {
  if (!currentAlbum || !currentAlbum.tracks.length) return;
  if (repeatMode === 2 && automatic) {
    elements.audio.currentTime = 0;
    playAudio();
    return;
  }
  let nextIndex = -1;
  if (shuffleEnabled) {
    nextIndex = nextShuffleIndex();
  } else if (currentTrackIndex < currentAlbum.tracks.length - 1) {
    nextIndex = currentTrackIndex + 1;
  } else if (repeatMode === 1) {
    nextIndex = 0;
  }
  if (nextIndex < 0) {
    if (automatic) {
      elements.audio.pause();
      elements.audio.currentTime = 0;
      updateProgress();
      updatePlayButton();
    }
    return;
  }
  setCurrentTrack(nextIndex, true, { album: currentAlbum, recordHistory: false });
}

function previousTrack() {
  if (!currentAlbum || currentTrackIndex < 0) return;
  if (elements.audio.currentTime > 3) {
    elements.audio.currentTime = 0;
    updateProgress();
    return;
  }
  let previousIndex = -1;
  if (shuffleEnabled) {
    if (shuffleCursor > 0) {
      shuffleCursor--;
      previousIndex = shuffleHistory[shuffleCursor];
    }
  } else if (currentTrackIndex > 0) {
    previousIndex = currentTrackIndex - 1;
  } else if (repeatMode === 1) {
    previousIndex = currentAlbum.tracks.length - 1;
  }
  if (previousIndex >= 0) setCurrentTrack(previousIndex, true, { album: currentAlbum, recordHistory: false });
  else {
    elements.audio.currentTime = 0;
    updateProgress();
  }
}

function cycleRepeat() {
  repeatMode = (repeatMode + 1) % 3;
  updateModeButtons();
  saveSettings();
  const labels = ["Повтор выключен", "Повтор альбома", "Повтор одного трека"];
  showToast(labels[repeatMode], "info");
}

function toggleShuffle() {
  shuffleEnabled = !shuffleEnabled;
  shuffleHistory = [];
  shuffleCursor = -1;
  shuffleCyclePlayed = new Set();
  if (shuffleEnabled && currentTrackIndex >= 0) {
    shuffleHistory = [currentTrackIndex];
    shuffleCursor = 0;
    shuffleCyclePlayed.add(currentTrackIndex);
  }
  updateModeButtons();
  saveSettings();
  showToast(shuffleEnabled ? "Перемешивание включено" : "Обычный порядок", "info");
}

function updateModeButtons() {
  elements.shuffle.classList.toggle("active", shuffleEnabled);
  elements.shuffle.setAttribute("aria-pressed", String(shuffleEnabled));
  elements.shuffle.title = shuffleEnabled ? "Выключить перемешивание" : "Включить перемешивание";
  elements.repeat.classList.toggle("active", repeatMode > 0);
  elements.repeat.classList.toggle("repeat-one", repeatMode === 2);
  elements.repeat.setAttribute("aria-label", ["Повтор выключен", "Повтор альбома", "Повтор одного трека"][repeatMode]);
  elements.repeat.title = ["Повтор выключен", "Повтор альбома", "Повтор одного трека"][repeatMode];
}

function updateProgress() {
  const track = currentAlbum && currentTrackIndex >= 0 ? currentAlbum.tracks[currentTrackIndex] : null;
  const hasExactDuration = Number.isFinite(elements.audio.duration) && elements.audio.duration > 0;
  const duration = hasExactDuration ? elements.audio.duration : track && track.duration || 0;
  const current = Number.isFinite(elements.audio.currentTime) ? elements.audio.currentTime : 0;
  const percentage = duration > 0 ? Math.min(100, current / duration * 100) : 0;
  if (!isSeeking) elements.progress.value = Math.round(percentage * 10);
  elements.progress.style.setProperty("--range-fill", `${isSeeking ? Number(elements.progress.value) / 10 : percentage}%`);
  elements.currentTime.textContent = formatTime(current);
  elements.durationTime.textContent = hasExactDuration ? formatTime(duration) : formatTrackDuration(track);
  updatePositionState();
}

function seekBy(seconds) {
  if (!Number.isFinite(elements.audio.duration)) return;
  elements.audio.currentTime = Math.max(0, Math.min(elements.audio.duration, elements.audio.currentTime + seconds));
  updateProgress();
}

function updateVolumeUI() {
  const volume = elements.audio.muted ? 0 : elements.audio.volume;
  elements.volume.value = String(volume);
  elements.volume.style.setProperty("--range-fill", `${volume * 100}%`);
  elements.volumePercent.textContent = `${Math.round(volume * 100)}%`;
  elements.mute.innerHTML = volume === 0 ? ICON_MUTE : ICON_VOLUME;
  elements.mute.setAttribute("aria-label", volume === 0 ? "Включить звук" : "Выключить звук");
  elements.mute.title = volume === 0 ? "Включить звук" : "Выключить звук";
}

function toggleMute() {
  if (elements.audio.muted || elements.audio.volume === 0) {
    elements.audio.muted = false;
    elements.audio.volume = previousVolume > 0 ? previousVolume : 0.8;
  } else {
    previousVolume = elements.audio.volume;
    elements.audio.muted = true;
  }
  updateVolumeUI();
  saveSettings();
}

function loadSettings() {
  let settings = {};
  try {
    settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  } catch (error) {
    settings = {};
  }
  const volume = Number.isFinite(settings.volume) ? Math.min(1, Math.max(0, settings.volume)) : 0.8;
  previousVolume = volume > 0 ? volume : 0.8;
  elements.audio.volume = volume;
  elements.audio.muted = Boolean(settings.muted);
  shuffleEnabled = Boolean(settings.shuffle);
  repeatMode = [0, 1, 2].includes(settings.repeat) ? settings.repeat : 0;
  updateVolumeUI();
  updateModeButtons();
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ volume: elements.audio.volume, muted: elements.audio.muted, shuffle: shuffleEnabled, repeat: repeatMode }));
  } catch (error) {
    return;
  }
}

function updateMediaSession() {
  if (!("mediaSession" in navigator) || !currentAlbum || currentTrackIndex < 0) return;
  const track = currentAlbum.tracks[currentTrackIndex];
  const sourceAlbum = getTrackSourceAlbum(currentAlbum, track);
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: sourceAlbum ? sourceAlbum.title : currentAlbum.title,
      album: sourceAlbum ? sourceAlbum.title : currentAlbum.title,
      artwork: sourceAlbum && sourceAlbum.cover ? [{ src: sourceAlbum.cover, sizes: "512x512" }] : []
    });
  } catch (error) {
    return;
  }
}

function updatePositionState() {
  if (!("mediaSession" in navigator) || typeof navigator.mediaSession.setPositionState !== "function") return;
  const duration = elements.audio.duration;
  if (!Number.isFinite(duration) || duration <= 0) return;
  try {
    navigator.mediaSession.setPositionState({ duration, playbackRate: elements.audio.playbackRate || 1, position: Math.min(elements.audio.currentTime, duration) });
  } catch (error) {
    return;
  }
}

function setupMediaSession() {
  if (!("mediaSession" in navigator) || typeof navigator.mediaSession.setActionHandler !== "function") return;
  const actions = {
    play: () => playAudio(),
    pause: () => {
      playbackRequested = false;
      playSequence++;
      clearTimeout(audioFallbackTimer);
      elements.audio.pause();
    },
    previoustrack: () => previousTrack(),
    nexttrack: () => nextTrack(false),
    seekbackward: details => seekBy(-((details && details.seekOffset) || 5)),
    seekforward: details => seekBy((details && details.seekOffset) || 5),
    seekto: details => {
      if (Number.isFinite(details.seekTime)) {
        elements.audio.currentTime = details.seekTime;
        updateProgress();
      }
    }
  };
  Object.entries(actions).forEach(([action, handler]) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch (error) {
      return;
    }
  });
}

function togglePlaylistShuffle() {
  if (!viewedAlbum || !viewedAlbum.tracks.length) return;
  if (!shuffleEnabled) {
    shuffleEnabled = true;
    shuffleHistory = [];
    shuffleCursor = -1;
    shuffleCyclePlayed = new Set();
    const activeTrackIndex = getViewedTrackIndex();
    if (activeTrackIndex >= 0) {
      shuffleHistory = [activeTrackIndex];
      shuffleCursor = 0;
      shuffleCyclePlayed.add(activeTrackIndex);
    }
    updateModeButtons();
    saveSettings();
    showToast("Перемешивание включено", "info");
  }
  const activeIndex = getViewedTrackIndex();
  if (activeIndex < 0) {
    const randomIndex = Math.floor(Math.random() * viewedAlbum.tracks.length);
    setCurrentTrack(randomIndex, true, { album: viewedAlbum, recordHistory: true });
  } else {
    if (currentAlbum.id !== viewedAlbum.id) setCurrentTrack(activeIndex, true, { album: viewedAlbum, recordHistory: true });
    else playAudio();
  }
}

function activateAlbumCard(card) {
  if (!card) return;
  const album = getAlbumById(card.dataset.albumId);
  if (!album) return;
  window.clearTimeout(albumOpenTimer);
  elements.grid.querySelectorAll(".album-card.pop-out").forEach(item => item.classList.remove("pop-out"));
  card.classList.remove("pop-out");
  void card.offsetWidth;
  card.classList.add("pop-out");
  albumOpenTimer = window.setTimeout(() => {
    card.classList.remove("pop-out");
    openAlbum(album);
  }, 540);
}

function updateSpectrumLevels() {
  if (!spectrumLevels.length) spectrumLevels = new Array(84).fill(0);
  const playing = !elements.audio.paused && !elements.audio.ended;
  spectrumEnvelope = playing ? Math.min(1, spectrumEnvelope + .045) : Math.max(0, spectrumEnvelope - .035);
  if (audioAnalyser && frequencyData && playing) {
    audioAnalyser.getByteFrequencyData(frequencyData);
    const maxBin = frequencyData.length;
    for (let index = 0; index < spectrumLevels.length; index++) {
      const start = Math.max(0, Math.floor(Math.pow(index / spectrumLevels.length, 2.15) * maxBin));
      const end = Math.max(start + 1, Math.floor(Math.pow((index + 1) / spectrumLevels.length, 2.15) * maxBin));
      let sum = 0;
      let count = 0;
      for (let bin = start; bin < Math.min(end, maxBin); bin++) {
        sum += frequencyData[bin];
        count++;
      }
      const raw = count ? Math.pow(sum / count / 255, .72) : 0;
      const previous = spectrumLevels[index];
      spectrumLevels[index] = raw > previous ? previous + (raw - previous) * .34 : previous * .91 + raw * .09;
    }
  } else {
    for (let index = 0; index < spectrumLevels.length; index++) spectrumLevels[index] *= .88;
  }
}

function drawBackgroundVisualizer() {
  const canvas = elements.visualizer;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.round(rect.width * dpr);
  const height = Math.round(rect.height * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, width, height);
  const primary = getComputedStyle(document.documentElement).getPropertyValue("--active-main-color").trim() || "#848a94";
  const accent = getComputedStyle(document.documentElement).getPropertyValue("--active-accent-color").trim() || "#4c535e";
  const gradient = context.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, primary);
  gradient.addColorStop(.52, accent);
  gradient.addColorStop(1, primary);
  const count = 84;
  const gap = Math.max(2, width / count * .36);
  const barWidth = Math.max(1.5, width / count - gap);
  const baseline = height * 1.12;
  context.fillStyle = gradient;
  for (let index = 0; index < count; index++) {
    const level = spectrumLevels[index] || 0;
    const barHeight = (2 + Math.pow(level, .88) * height * .58) * dpr;
    const x = index * (barWidth + gap);
    context.globalAlpha = (.045 + level * .26) * spectrumEnvelope;
    context.fillRect(x, baseline - barHeight, barWidth, barHeight);
  }
  context.globalAlpha = 1;
  context.fillStyle = gradient;
  context.globalAlpha = .12 * spectrumEnvelope;
  context.fillRect(0, baseline, width, Math.max(1, dpr));
  context.globalAlpha = 1;
}

function drawMiniEqualizers() {
  const canvases = elements.trackList.querySelectorAll(".track-row.active.is-playing .track-equalizer");
  if (!canvases.length) return;
  const palette = currentAlbum && validPalette(currentAlbum.palette) ? currentAlbum.palette : DEFAULT_PALETTE;
  const primary = `rgb(${palette.primary.join(",")})`;
  const accent = `rgb(${palette.accent.join(",")})`;
  canvases.forEach(canvas => {
    const context = canvas.getContext("2d");
    if (!context) return;
    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);
    const count = 17;
    const gap = 2;
    const barWidth = (width - (count - 1) * gap) / count;
    const gradient = context.createLinearGradient(0, height, width, 0);
    gradient.addColorStop(0, primary);
    gradient.addColorStop(1, accent);
    context.fillStyle = gradient;
    for (let index = 0; index < count; index++) {
      const position = Math.min(spectrumLevels.length - 1, Math.floor(Math.pow((index + .5) / count, 1.7) * spectrumLevels.length));
      const level = spectrumLevels[position] || 0;
      const barHeight = 2 + level * (height - 3);
      context.globalAlpha = (.4 + level * .6) * spectrumEnvelope;
      context.fillRect(index * (barWidth + gap), (height - barHeight) / 2, barWidth, barHeight);
    }
    context.globalAlpha = 1;
  });
}

function visualizerLoop(timestamp = 0) {
  const playing = !elements.audio.paused && !elements.audio.ended;
  const frameInterval = playing || spectrumEnvelope > .01 ? 1000 / 30 : 1000 / 12;
  if (!visualizerLastFrame || timestamp - visualizerLastFrame >= frameInterval) {
    visualizerLastFrame = timestamp;
    updateSpectrumLevels();
    drawBackgroundVisualizer();
    drawMiniEqualizers();
  }
  visualizerFrame = requestAnimationFrame(visualizerLoop);
}

elements.grid.addEventListener("click", event => {
  const card = event.target.closest(".album-card");
  if (!card) return;
  activateAlbumCard(card);
});
elements.grid.addEventListener("keydown", event => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest(".album-card");
  if (!card) return;
  event.preventDefault();
  activateAlbumCard(card);
});
elements.grid.addEventListener("pointermove", event => {
  if (event.pointerType !== "mouse") return;
  const cover = event.target.closest(".album-cover-wrap");
  if (!cover) return;
  const rect = cover.getBoundingClientRect();
  const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
  const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
  const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -11;
  const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 11;
  cover.style.setProperty("--tilt-x", `${rotateX.toFixed(2)}deg`);
  cover.style.setProperty("--tilt-y", `${rotateY.toFixed(2)}deg`);
});
elements.grid.addEventListener("pointerleave", event => {
  const cover = event.target.closest(".album-cover-wrap");
  if (!cover) return;
  cover.style.setProperty("--tilt-x", "0deg");
  cover.style.setProperty("--tilt-y", "0deg");
}, true);
elements.search.addEventListener("input", renderAlbums);
elements.globalTrackResults.addEventListener("click", event => {
  const result = event.target.closest(".global-track-result");
  if (!result) return;
  const album = albums.find(item => item.id === result.dataset.albumId);
  if (!album) return;
  const index = Number(result.dataset.trackIndex);
  openAlbum(album);
  if (Number.isInteger(index) && index >= 0 && index < album.tracks.length) setCurrentTrack(index, true, { album, recordHistory: true });
});
elements.playlistSearch.addEventListener("input", renderTrackList);
elements.emptyRetry.addEventListener("click", () => loadLibrary(true));
elements.closePlaylist.addEventListener("click", closeAlbum);
elements.downloadZip.addEventListener("click", () => {
  if (viewedAlbum) downloadAlbumZip(viewedAlbum, false);
});
elements.scrim.addEventListener("click", closeAlbum);
elements.playAll.addEventListener("click", () => {
  if (!viewedAlbum || !viewedAlbum.tracks.length) return;
  const activeIndex = getViewedTrackIndex();
  const activeTrack = activeIndex >= 0 ? viewedAlbum.tracks[activeIndex] : null;
  const thisAlbumPlaying = Boolean(activeTrack && !elements.audio.paused && elements.audio.dataset.trackUrl === activeTrack.url);
  if (thisAlbumPlaying) {
    playbackRequested = false;
    playSequence++;
    clearTimeout(audioFallbackTimer);
    elements.audio.pause();
    return;
  }
  const startIndex = activeIndex >= 0 ? activeIndex : 0;
  setCurrentTrack(startIndex, true, { album: viewedAlbum, recordHistory: true });
});
elements.shuffleAlbum.addEventListener("click", togglePlaylistShuffle);
elements.selectVisibleTracks.addEventListener("click", () => {
  if (!viewedAlbum) return;
  const query = elements.playlistSearch.value.trim().toLocaleLowerCase("ru");
  const visible = viewedAlbum.tracks.filter(track => !query || trackMatches(track, query) || String(track.albumTitle || "").toLocaleLowerCase("ru").includes(query));
  const allSelected = visible.length > 0 && visible.every(track => selectedTrackKeys.has(track.path || track.durationKey || track.url));
  visible.forEach(track => {
    const key = track.path || track.durationKey || track.url;
    if (allSelected) selectedTrackKeys.delete(key);
    else selectedTrackKeys.add(key);
  });
  renderTrackList();
});
elements.downloadSelected.addEventListener("click", downloadSelectedTracksZip);
elements.trackList.addEventListener("click", event => {
  const row = event.target.closest(".track-row");
  if (!row || !viewedAlbum) return;
  const index = Number(row.dataset.trackIndex);
  const track = viewedAlbum.tracks[index];
  if (event.target.closest("[data-track-select]")) {
    const key = track.path || track.durationKey || track.url;
    if (selectedTrackKeys.has(key)) selectedTrackKeys.delete(key);
    else selectedTrackKeys.add(key);
    renderTrackList();
    return;
  }
  if (event.target.closest("[data-track-download]")) {
    downloadSingleTrack(track);
    return;
  }
  if (event.target.closest("[data-track-play]")) setCurrentTrack(index, true, { album: viewedAlbum, recordHistory: true });
});
elements.shuffle.addEventListener("click", toggleShuffle);
elements.previous.addEventListener("click", previousTrack);
elements.playPause.addEventListener("click", togglePlayPause);
elements.next.addEventListener("click", () => nextTrack(false));
elements.repeat.addEventListener("click", cycleRepeat);
elements.mute.addEventListener("click", toggleMute);
elements.progress.addEventListener("input", () => {
  isSeeking = true;
  const duration = Number.isFinite(elements.audio.duration) ? elements.audio.duration : 0;
  const current = duration * (Number(elements.progress.value) / 1000);
  elements.currentTime.textContent = formatTime(current);
  elements.progress.style.setProperty("--range-fill", `${Number(elements.progress.value) / 10}%`);
});
elements.progress.addEventListener("change", () => {
  const duration = Number.isFinite(elements.audio.duration) ? elements.audio.duration : 0;
  if (duration > 0) elements.audio.currentTime = duration * (Number(elements.progress.value) / 1000);
  isSeeking = false;
  updateProgress();
});
elements.volume.addEventListener("input", () => {
  const volume = Math.min(1, Math.max(0, Number(elements.volume.value)));
  elements.audio.muted = false;
  elements.audio.volume = volume;
  if (volume > 0) previousVolume = volume;
  updateVolumeUI();
  saveSettings();
});
elements.audio.addEventListener("play", () => {
  playbackRequested = true;
  updatePlayButton();
  updateTrackListState();
  updateMediaSession();
});
elements.audio.addEventListener("pause", () => {
  updatePlayButton();
  updateTrackListState();
});
elements.audio.addEventListener("timeupdate", updateProgress);
elements.audio.addEventListener("durationchange", () => {
  if (currentAlbum && currentTrackIndex >= 0 && Number.isFinite(elements.audio.duration)) {
    rememberTrackDuration(currentAlbum.tracks[currentTrackIndex], elements.audio.duration, currentAlbum, currentTrackIndex);
    const viewedIndex = getViewedTrackIndex();
    const duration = viewedIndex >= 0 ? elements.trackList.querySelector(`[data-duration-index="${viewedIndex}"]`) : null;
    if (duration) duration.textContent = formatTime(elements.audio.duration);
  }
  updateProgress();
});
elements.audio.addEventListener("loadedmetadata", () => {
  audioReady = true;
  clearTimeout(audioFallbackTimer);
  updatePlayer();
  updatePositionState();
});
elements.audio.addEventListener("canplay", () => clearTimeout(audioFallbackTimer));
elements.audio.addEventListener("playing", () => clearTimeout(audioFallbackTimer));
elements.audio.addEventListener("waiting", () => {
  if (!elements.audio.paused) scheduleAudioFallback();
});
elements.audio.addEventListener("stalled", () => {
  if (!elements.audio.paused) scheduleAudioFallback();
});
elements.audio.addEventListener("ended", () => nextTrack(true));
elements.audio.addEventListener("error", () => {
  if (!elements.audio.src || elements.audio.networkState === HTMLMediaElement.NETWORK_EMPTY) return;
  if (tryAudioFallback()) {
    if (playbackRequested) recoverAudioPlayback(new DOMException("Основной источник аудио недоступен.", "NetworkError"), playSequence);
    return;
  }
  if (playbackRequested) recoverAudioPlayback(elements.audio.error || new Error("Ошибка загрузки аудио."), playSequence);
  else showToast("Не удалось загрузить трек. Проверь аудиофайл в репозитории.", "error");
  updatePlayButton();
});
elements.audio.addEventListener("volumechange", () => {
  updateVolumeUI();
  saveSettings();
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && !elements.audio.paused && audioContext && audioContext.state === "suspended") audioContext.resume().catch(() => {});
});

window.addEventListener("keydown", event => {
  if (event.key === "Escape" && elements.overlay.classList.contains("open")) {
    closeAlbum();
    return;
  }
  const target = event.target;
  const editing = target && (target.matches("input,textarea,select") || target.isContentEditable);
  const control = target && target.closest("button,a,[role=button]");
  if (editing || control || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.code === "Space") {
    event.preventDefault();
    togglePlayPause();
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    seekBy(-5);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    seekBy(5);
  }
});

initializeBrowserDownloadService();
loadSettings();
setupMediaSession();
visualizerLoop();
startRepositoryUpdateTimer();
loadLibrary(false);
