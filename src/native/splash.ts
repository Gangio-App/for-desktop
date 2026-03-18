import { BrowserWindow, nativeImage } from "electron";

import windowIconAsset from "../../assets/desktop/icon.png?asset";

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
        --card: rgba(255, 255, 255, 0.06);
        --border: rgba(255, 255, 255, 0.10);
        --text: rgba(255, 255, 255, 0.92);
        --muted: rgba(255, 255, 255, 0.64);
        --accent: #7c5cff;
      }
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        background: radial-gradient(1200px 400px at 20% 0%, rgba(124,92,255,0.22), transparent 60%),
                    radial-gradient(1000px 380px at 80% 100%, rgba(0,194,255,0.14), transparent 60%),
                    var(--bg);
        color: var(--text);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, sans-serif;
        user-select: none;
        -webkit-font-smoothing: antialiased;
      }
      .wrap {
        height: 100%;
        padding: 18px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .top {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 14px;
        border-radius: 16px;
        border: 1px solid var(--border);
        background: var(--card);
      }
      .logo {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background: linear-gradient(135deg, rgba(124,92,255,0.95), rgba(0,194,255,0.75));
        box-shadow: 0 12px 30px rgba(124, 92, 255, 0.25);
      }
      .title {
        font-size: 16px;
        font-weight: 700;
        letter-spacing: 0.2px;
        line-height: 1.1;
      }
      .subtitle {
        margin-top: 2px;
        font-size: 12px;
        color: var(--muted);
      }
      .spacer {
        flex: 1;
      }
      .status {
        padding: 14px;
        border-radius: 16px;
        border: 1px solid var(--border);
        background: var(--card);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .label {
        font-size: 12px;
        color: var(--muted);
      }
      .value {
        font-size: 13px;
        font-weight: 600;
      }
      .bar {
        height: 10px;
        border-radius: 999px;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.10);
        overflow: hidden;
      }
      .fill {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, rgba(124,92,255,1), rgba(0,194,255,1));
        border-radius: 999px;
        transition: width 160ms linear;
      }
      .footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 11px;
        color: rgba(255,255,255,0.46);
        padding: 0 4px;
      }
      .drag {
        -webkit-app-region: drag;
      }
      .no-drag {
        -webkit-app-region: no-drag;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="top drag">
        <div class="logo"></div>
        <div>
          <div class="title">Gangio</div>
          <div class="subtitle" id="subtitle">Starting…</div>
        </div>
      </div>

      <div class="spacer"></div>

      <div class="status">
        <div class="row">
          <div class="label" id="phase">Status</div>
          <div class="value" id="message">Starting…</div>
        </div>
        <div class="bar" aria-hidden="true">
          <div class="fill" id="fill"></div>
        </div>
      </div>

      <div class="footer">
        <div class="no-drag" id="meta"> </div>
        <div class="no-drag"> </div>
      </div>
    </div>

    <script>
      const { ipcRenderer } = require('electron');

      const phaseEl = document.getElementById('phase');
      const msgEl = document.getElementById('message');
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
        phaseEl.textContent = phaseLabel(phase);
        msgEl.textContent = message || '…';
        subtitleEl.textContent = message || '…';
      }

      setText('starting', 'Starting…');
      setProgress(8);

      ipcRenderer.on('splash-status', (_evt, payload) => {
        const phase = payload?.phase || 'starting';
        setText(phase, payload?.message || msgEl.textContent);

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
          metaEl.textContent = '';
        } else if (phase === 'error') {
          setProgress(100);
          metaEl.textContent = '';
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
