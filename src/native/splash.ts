import { BrowserWindow, nativeImage } from "electron";

import wordmarkAsset from "../../assets/desktop/wordmark.svg?asset";
import windowIconAsset from "../../assets/desktop/hicolor/512x512.png?asset";

export type SplashPhase =
  | "starting"
  | "checking"
  | "update-available"
  | "downloading"
  | "ready"
  | "error";

export type SplashPayload =
  | { phase: SplashPhase; message?: string }
  | {
      phase: "downloading";
      message?: string;
      percent?: number;
      transferred?: number;
      total?: number;
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
        width: 180px;
        height: 60px;
        background: url('${wordmarkAsset}') no-repeat center center;
        background-size: contain;
        filter: invert(1) brightness(2); /* Make it white */
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
        <div class="logo"></div>
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

      const phaseLabel = (p) => {
        switch (p) {
          case 'starting': return 'Starting';
          case 'checking': return 'Checking';
          case 'update-available': return 'Update';
          case 'downloading': return 'Downloading';
          case 'ready': return 'Ready';
          case 'error': return 'Error';
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
