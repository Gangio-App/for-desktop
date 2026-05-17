import { BrowserWindow, nativeImage } from "electron";

import windowIconAsset from "../../assets/desktop/hicolor/512x512.png?asset";

export type SplashPhase =
  | "starting"
  | "checking"
  | "update-available"
  | "downloading"
  | "ready"
  | "error"
  | "offline";

export type SplashPayload =
  | { phase: SplashPhase; message?: string }
  | {
      phase: "downloading";
      message?: string;
      percent?: number;
      transferred?: number;
      total?: number;
    }
  | {
      phase: "offline";
      message?: string;
      retryIn?: number;
    };

export function createSplashWindow() {
  const windowIcon = nativeImage.createFromDataURL(windowIconAsset);

  const splash = new BrowserWindow({
    width: 480,
    height: 300,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    transparent: false,
    frame: false,
    show: true,
    backgroundColor: "#0B0F1A",
    icon: windowIcon,
    title: "Gangio",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self' 'unsafe-inline' data:; img-src 'self' data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Gangio</title>
    <style>
      :root {
        --bg: #0b0f1a;
        --card: rgba(255, 255, 255, 0.03);
        --border: rgba(255, 255, 255, 0.08);
        --text: rgba(255, 255, 255, 0.95);
        --muted: rgba(255, 255, 255, 0.5);
        --accent: #7c5cff;
      }
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        background: var(--bg);
        color: var(--text);
        font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
        user-select: none;
        -webkit-font-smoothing: antialiased;
        overflow: hidden;
      }
      .wrap {
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px;
        box-sizing: border-box;
        position: relative;
      }
      .background-glow {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: 
          radial-gradient(circle at 10% 10%, rgba(124, 92, 255, 0.15) 0%, transparent 40%),
          radial-gradient(circle at 90% 90%, rgba(0, 194, 255, 0.1) 0%, transparent 40%);
        pointer-events: none;
        z-index: 0;
      }
      .content {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 32px;
        width: 100%;
      }
      .logo {
        width: 200px;
        height: 72px;
        color: #ffffff;
        display: block;
      }
      .logo svg {
        width: 100%;
        height: 100%;
        overflow: visible;
      }
      /* All animated letters share these origin rules so squash/scale
         pivots from the bottom-center of the glyph (like a ball landing). */
      #i-dot, #l-g1, #l-a, #l-n, #l-g2, #l-i {
        transform-box: fill-box;
      }
      #i-dot { transform-origin: 50% 50%; }
      #l-g1, #l-a, #l-n, #l-g2, #l-i { transform-origin: 50% 100%; }

      /* Dot pixel offsets are tuned for the 200px-wide rendered SVG.
         Sequence: starts on first 'g' -> a -> n -> second 'g' -> stops on 'i'. */
      #i-dot {
        animation: dotJump 5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        animation-fill-mode: both;
      }
      #l-g1 { animation: squashG1 5s ease-out infinite; transform-origin: 18% 100%; }
      #l-a  { animation: squashA  5s ease-out infinite; transform-origin: 38% 100%; }
      #l-n  { animation: squashN  5s ease-out infinite; transform-origin: 50% 100%; }
      #l-g2 { animation: squashG2 5s ease-out infinite; transform-origin: 65% 100%; }
      #l-i  { animation: squashI  5s ease-out infinite; transform-origin: 80% 100%; }

      @keyframes dotJump {
        /* Tight swoop entrance from upper-left */
        0%   { transform: translate(-168px, -22px) scale(0.85); opacity: 0; }
        3%   { transform: translate(-152px, -14px) scale(0.95); opacity: 1; }
        /* Land on first 'g' */
        5%   { transform: translate(-138px, 0) scale(1); }
        7%   { transform: translate(-138px, 1px) scaleX(1.25) scaleY(0.75); }
        9%   { transform: translate(-138px, 0) scale(1); }
        /* Arc to 'a' */
        12%  { transform: translate(-122px, -16px) scale(1); }
        16%  { transform: translate(-103px, 0); }
        18%  { transform: translate(-103px, 1px) scaleX(1.25) scaleY(0.75); }
        21%  { transform: translate(-103px, 0) scale(1); }
        /* Arc to 'n' */
        25%  { transform: translate(-87px, -16px); }
        30%  { transform: translate(-72px, 0); }
        33%  { transform: translate(-72px, 1px) scaleX(1.25) scaleY(0.75); }
        36%  { transform: translate(-72px, 0) scale(1); }
        /* Arc to second 'g' */
        40%  { transform: translate(-52px, -16px); }
        45%  { transform: translate(-32px, 0); }
        48%  { transform: translate(-32px, 1px) scaleX(1.25) scaleY(0.75); }
        51%  { transform: translate(-32px, 0) scale(1); }
        /* Arc to 'i' (home) and stop */
        55%  { transform: translate(-16px, -14px); }
        60%  { transform: translate(0, 0); }
        63%  { transform: translate(0, 1px) scaleX(1.2) scaleY(0.8); }
        66%  { transform: translate(0, 0) scale(1); }
        /* Rest on i for the rest of the cycle */
        78%  { transform: translate(0, 0) rotate(0deg); }
        /* Spin back home to first 'g' to loop */
        90%  { transform: translate(-70px, -34px) rotate(220deg); }
        100% { transform: translate(-138px, 0) rotate(360deg) scale(1); }
      }

      /* Letter warps fire exactly when the dot lands on them. */
      @keyframes squashG1 {
        0%, 4% { transform: translate(0, 0) scale(1); }
        5%   { transform: translate(0, 3px) scaleY(0.86) scaleX(1.12); }
        10%  { transform: translate(0, 0) scale(1); }
        100% { transform: translate(0, 0) scale(1); }
      }
      @keyframes squashA {
        0%, 14% { transform: translate(0, 0) scale(1); }
        15% { transform: translate(0, 3px) scaleY(0.86) scaleX(1.12); }
        20% { transform: translate(0, 0) scale(1); }
        100% { transform: translate(0, 0) scale(1); }
      }
      @keyframes squashN {
        0%, 29% { transform: translate(0, 0) scale(1); }
        30% { transform: translate(0, 3px) scaleY(0.86) scaleX(1.12); }
        35% { transform: translate(0, 0) scale(1); }
        100% { transform: translate(0, 0) scale(1); }
      }
      @keyframes squashG2 {
        0%, 44% { transform: translate(0, 0) scale(1); }
        45% { transform: translate(0, 3px) scaleY(0.86) scaleX(1.12); }
        50% { transform: translate(0, 0) scale(1); }
        100% { transform: translate(0, 0) scale(1); }
      }
      @keyframes squashI {
        0%, 59% { transform: translate(0, 0) scale(1); }
        60% { transform: translate(0, 2px) scaleY(0.9) scaleX(1.08); }
        65% { transform: translate(0, 0) scale(1); }
        100% { transform: translate(0, 0) scale(1); }
      }

      .status-container {
        width: 100%;
        max-width: 320px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        align-items: center;
      }
      .subtitle {
        font-size: 13px;
        color: var(--muted);
        font-weight: 500;
        letter-spacing: 0.02em;
        height: 1.2em;
      }
      .bar-container {
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.05);
      }
      .fill {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #7c5cff, #00c2ff);
        border-radius: 10px;
        transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 0 12px rgba(124, 92, 255, 0.4);
      }
      .footer {
        position: absolute;
        bottom: 20px;
        font-size: 11px;
        color: var(--muted);
        opacity: 0.7;
      }
      .drag {
        -webkit-app-region: drag;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 60px;
      }
    </style>
  </head>
  <body>
    <div class="background-glow"></div>
    <div class="wrap">
      <div class="drag"></div>
      <div class="content">
        <div class="logo" aria-label="Gangio">
          <svg viewBox="0 0 273.18 98.44" xmlns="http://www.w3.org/2000/svg">
            <g id="l-g1"><path d="M28.23,73.83h-10.55c-9.38,0-12.81-4.69-10.3-14.06l6.61-24.61c2.51-9.38,8.45-14.06,17.82-14.06h28.12l-16.95,63.28c-2.53,9.38-8.48,14.06-17.86,14.06H11.07c-9.37,0-12.8-4.69-10.27-14.06l1.86-7.03H20.25l-.95,3.52h7.03l1.9-7.03Zm-2.32-17.58h7.03l4.71-17.58h-7.03l-4.71,17.58Z" fill="currentColor"/></g>
            <g id="l-a"><path d="M92.39,77.34h-28.12c-9.38,0-12.81-4.69-10.3-14.06l7.56-28.12c2.51-9.38,8.45-14.06,17.82-14.06h28.12l-15.08,56.25Zm-7.21-38.67h-7.03l-5.66,21.09h7.03l5.66-21.09Z" fill="currentColor"/></g>
            <g id="l-n"><path d="M141.47,77.34h-17.58l10.37-38.67h-7.03l-10.37,38.67h-17.58l15.08-56.25h28.12c9.38,0,12.81,4.69,10.3,14.06l-11.32,42.19Z" fill="currentColor"/></g>
            <g id="l-g2"><path d="M172.34,73.83h-10.55c-9.38,0-12.81-4.69-10.3-14.06l6.61-24.61c2.51-9.38,8.45-14.06,17.82-14.06h28.12l-16.95,63.28c-2.53,9.38-8.48,14.06-17.86,14.06h-14.06c-9.37,0-12.8-4.69-10.27-14.06l1.86-7.03h17.58l-.95,3.52h7.03l1.9-7.03Zm-2.32-17.58h7.03l4.71-17.58h-7.03l-4.71,17.58Z" fill="currentColor"/></g>
            <g id="l-i"><path d="M228.58,21.09l-15.08,56.25h-17.58l15.08-56.25h17.58Z" fill="currentColor"/></g>
            <g id="i-dot">
              <path d="M230.99,2.56c1.25,1.71,1.55,3.79,.9,6.22-.66,2.44-2.07,4.51-4.24,6.22-2.17,1.71-4.47,2.57-6.91,2.57s-4.28-.86-5.54-2.57c-1.25-1.71-1.55-3.79-.9-6.22,.66-2.44,2.07-4.51,4.24-6.22,2.17-1.71,4.47-2.57,6.91-2.57s4.28,.86,5.54,2.57Z" fill="currentColor"/>
            </g>
            <path d="M222.64,63.28l7.56-28.12c2.51-9.38,8.45-14.06,17.82-14.06h14.06c9.37,0,12.81,4.69,10.3,14.06l-7.56,28.12c-2.51,9.38-8.45,14.06-17.82,14.06h-14.06c-9.38,0-12.81-4.69-10.3-14.06Zm24.19-24.61l-5.66,21.09h7.03l5.66-21.09h-7.03Z" fill="currentColor"/>
          </svg>
        </div>
        <div class="status-container">
          <div class="subtitle" id="subtitle">Checking for updates...</div>
          <div class="bar-container">
            <div class="fill" id="fill"></div>
          </div>
        </div>
      </div>
      <div class="footer" id="meta"></div>
    </div>

    <script>
      const { ipcRenderer } = require('electron');

      const subtitleEl = document.getElementById('subtitle');
      const fillEl = document.getElementById('fill');
      const metaEl = document.getElementById('meta');
      const barContainerEl = document.querySelector('.bar-container');

      const phaseLabel = (p) => {
        switch (p) {
          case 'starting': return 'Starting';
          case 'checking': return 'Checking';
          case 'update-available': return 'Update';
          case 'downloading': return 'Downloading';
          case 'ready': return 'Ready';
          case 'error': return 'Error';
          case 'offline': return 'Offline';
          default: return 'Status';
        }
      };

      const fmtBytes = (n) => {
        if (typeof n !== 'number' || !isFinite(n)) return '';
        const units = ['B','KB','MB','GB'];
        let i = 0;
        let v = n;
        while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
        return v.toFixed(i === 0 ? 0 : 1) + units[i];
      };

      function setProgress(percent) {
        const p = typeof percent === 'number' && isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
        fillEl.style.width = p + '%';
      }

      function setText(phase, message) {
        subtitleEl.textContent = message || phaseLabel(phase);
      }

      setText('checking', 'Checking for updates…');
      setProgress(8);

      ipcRenderer.on('splash-status', (_evt, payload) => {
        const phase = payload?.phase || 'starting';

        // Hide the progress bar entirely for the offline/retry state so it
        // visually matches the screenshot reference (logo + status text only).
        if (barContainerEl) {
          barContainerEl.style.display = phase === 'offline' ? 'none' : '';
        }

        if (phase === 'offline') {
          const secs = typeof payload?.retryIn === 'number' ? payload.retryIn : 5;
          subtitleEl.textContent = payload?.message
            || ('Update failed \u2014 retrying in ' + secs + ' sec\u2026');
          metaEl.textContent = '';
          return;
        }

        setText(phase, payload?.message);

        if (phase === 'downloading') {
          setProgress(payload?.percent ?? 30);
          const t = payload?.total;
          const x = payload?.transferred;
          if (typeof t === 'number' && typeof x === 'number') {
            metaEl.textContent = fmtBytes(x) + ' / ' + fmtBytes(t);
          } else {
            metaEl.textContent = '';
          }
        } else if (phase === 'ready') {
          setProgress(100);
          metaEl.textContent = 'Launching...';
        } else if (phase === 'error') {
          setProgress(100);
          metaEl.textContent = 'Update failed';
        } else {
          setProgress(18);
          metaEl.textContent = '';
        }
      });
    </script>
  </body>
</html>`;

  splash.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  return splash;
}

export function sendSplashStatus(
  splash: BrowserWindow | undefined,
  payload: SplashPayload,
) {
  if (!splash || splash.isDestroyed()) return;
  splash.webContents.send("splash-status", payload);
}
