import dns from "node:dns/promises";
import { join } from "node:path";
import { IUpdateInfo, UpdateSourceType, updateElectronApp } from "update-electron-app";

import { BrowserWindow, Notification, app, ipcMain, shell } from "electron";
import started from "electron-squirrel-startup";

import { autoLaunch } from "./native/autoLaunch";
import { config } from "./native/config";
import { initDiscordRpc } from "./native/discordRpc";
import { createSplashWindow, sendSplashStatus } from "./native/splash";
import { initTray, setUpdateStatus } from "./native/tray";
import { BUILD_URL, createMainWindow, mainWindow } from "./native/window";

// Squirrel-specific logic
// create/remove shortcuts on Windows when installing / uninstalling
// we just need to close out of the app immediately
if (started) {
  app.quit();
}

// Register gangio:// protocol
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient("gangio", process.execPath, [
      join(__dirname, "..", "main.js"),
    ]);
  }
} else {
  app.setAsDefaultProtocolClient("gangio");
}

// disable hw-accel if so requested
if (!config.hardwareAcceleration) {
  app.disableHardwareAcceleration();
} else {
  // Optimize for high-performance voice and video (safe flags only)
  app.commandLine.appendSwitch('enable-features', 'WebRtcHideLocalIpsWithMdns');
}

// ensure only one copy of the application can run
const acquiredLock = app.requestSingleInstanceLock();

if (acquiredLock) {
  // start auto update logic
  updateElectronApp({
    updateSource: {
      type: UpdateSourceType.ElectronPublicUpdateService,
      repo: "Gangio-App/for-desktop",
    },
    onNotifyUser: (info: IUpdateInfo) => {
      const notification = new Notification({
        title: "Update Available",
        body: "A new version of Gangio is being downloaded.",
        silent: true,
      });
      notification.show();
      setUpdateStatus("downloading");
      mainWindow?.webContents.send("update-available", info);
    },
    updateInterval: "1 hour",
  });

  // create and configure the app when electron is ready
  app.on("ready", () => {
    const startHidden =
      app.commandLine.hasSwitch("hidden") || config.startMinimisedToTray;

    // Show splash only when we're going to show the main window.
    const splash = startHidden ? undefined : createSplashWindow();
    sendSplashStatus(splash, { phase: "starting", message: "Starting…" });

    const { autoUpdater } = require("electron");

    // Timers shared by the update flow. The safety timer guards against the
    // updater hanging once a check has been issued; the retry timer drives
    // the visible offline countdown shown on the splash.
    let safetyTimer: NodeJS.Timeout | undefined;
    let retryCountdownTimer: NodeJS.Timeout | undefined;
    let isRetryingOffline = false;
    let hasBootstrapped = false;

    const clearSafetyTimer = () => {
      if (safetyTimer) {
        clearTimeout(safetyTimer);
        safetyTimer = undefined;
      }
    };

    const clearRetryTimer = () => {
      if (retryCountdownTimer) {
        clearInterval(retryCountdownTimer);
        retryCountdownTimer = undefined;
      }
      isRetryingOffline = false;
    };

    const clearAllTimers = () => {
      clearSafetyTimer();
      clearRetryTimer();
    };

    const bootstrapOnce = () => {
      if (hasBootstrapped) return;
      hasBootstrapped = true;
      clearAllTimers();
      bootstrapMainWindow(splash, startHidden);
    };

    // Connectivity preflight: a quick DNS lookup against the update host.
    // Falls back to github.com so corporate DNS that rejects unknown hosts
    // still gets a chance to confirm we have a working internet connection.
    const isOnline = async (): Promise<boolean> => {
      const hosts = ["update.electronjs.org", "github.com"];
      for (const host of hosts) {
        try {
          await dns.lookup(host);
          return true;
        } catch {
          // try next host
        }
      }
      return false;
    };

    const RETRY_SECONDS = 5;

    const scheduleOfflineRetry = () => {
      // If we can't show a splash (hidden launch) there's nothing to count
      // down on, so just bootstrap and let the in-app updater retry later.
      if (!splash || splash.isDestroyed()) {
        bootstrapOnce();
        return;
      }
      if (isRetryingOffline) return;

      clearAllTimers();
      isRetryingOffline = true;
      setUpdateStatus("none");

      let seconds = RETRY_SECONDS;
      sendSplashStatus(splash, {
        phase: "offline",
        message: `Update failed \u2014 retrying in ${seconds} sec\u2026`,
        retryIn: seconds,
      });

      retryCountdownTimer = setInterval(() => {
        seconds -= 1;
        if (seconds <= 0) {
          clearRetryTimer();
          void startUpdateCheck();
          return;
        }
        sendSplashStatus(splash, {
          phase: "offline",
          message: `Update failed \u2014 retrying in ${seconds} sec\u2026`,
          retryIn: seconds,
        });
      }, 1000);
    };

    const startUpdateCheck = async () => {
      if (hasBootstrapped) return;

      // Preflight: don't even try the updater while offline; just show the
      // countdown on the splash and retry once the timer elapses.
      const online = await isOnline();
      if (!online) {
        scheduleOfflineRetry();
        return;
      }

      sendSplashStatus(splash, {
        phase: "checking",
        message: "Checking for updates…",
      });
      setUpdateStatus("checking");

      // Safety timer only starts once we've actually issued a check: if the
      // updater stalls for >5s while we *do* have connectivity, fall through
      // to launching the app normally.
      clearSafetyTimer();
      if (!startHidden) {
        safetyTimer = setTimeout(() => {
          if (!mainWindow || mainWindow.isDestroyed()) {
            console.log("Update check timed out, launching...");
            setUpdateStatus("none");
            bootstrapOnce();
          }
        }, 5000);
      }

      try {
        autoUpdater.checkForUpdates();
      } catch (e) {
        clearSafetyTimer();
        console.error("Manual update check failed", e);
        // If connectivity dropped between preflight and the call, treat it
        // as an offline failure and retry instead of opening the window.
        const stillOnline = await isOnline();
        if (!stillOnline) {
          scheduleOfflineRetry();
        } else {
          setUpdateStatus("none");
          bootstrapOnce();
        }
      }
    };

    autoUpdater.on("checking-for-update", () => {
      sendSplashStatus(splash, {
        phase: "checking",
        message: "Checking for updates…",
      });
    });

    autoUpdater.on("update-available", () => {
      clearSafetyTimer();
      clearRetryTimer();
      sendSplashStatus(splash, {
        phase: "update-available",
        message: "Update found. Downloading…",
      });
      setUpdateStatus("downloading");
    });

    autoUpdater.on("download-progress", (progress: any) => {
      const percent =
        typeof progress?.percent === "number" ? progress.percent : undefined;

      sendSplashStatus(splash, {
        phase: "downloading",
        message: "Downloading update…",
        percent,
        transferred:
          typeof progress?.transferred === "number"
            ? progress.transferred
            : undefined,
        total: typeof progress?.total === "number" ? progress.total : undefined,
      });
    });

    autoUpdater.on(
      "update-downloaded",
      (_event: any, _releaseNotes: any, releaseName: string) => {
        clearAllTimers();
        setUpdateStatus("ready");
        mainWindow?.webContents.send("update-ready", { releaseName });
        sendSplashStatus(splash, {
          phase: "ready",
          message: "Update ready. Restarting…",
        });

        const notification = new Notification({
          title: "Update Ready",
          body: "Restart Gangio to apply the update.",
        });
        notification.show();

        // Re-launch app for update
        if (splash && !splash.isDestroyed()) {
          setTimeout(() => autoUpdater.quitAndInstall(), 1500);
        }
      },
    );

    autoUpdater.on("update-not-available", () => {
      clearAllTimers();
      setUpdateStatus("none");
      sendSplashStatus(splash, {
        phase: "starting",
        message: "All good! Launching…",
      });

      if (!mainWindow || mainWindow.isDestroyed()) {
        bootstrapOnce();
      }
    });

    autoUpdater.on("error", async (err: unknown) => {
      clearSafetyTimer();
      console.error("AutoUpdater error", err);

      // If we already shipped the main window we don't want to disturb the
      // user — let the next scheduled update-electron-app tick handle it.
      if (hasBootstrapped) return;

      // If the failure is just because we're offline, stay on the splash and
      // retry instead of falling through to launching the app.
      const stillOnline = await isOnline();
      if (!stillOnline) {
        scheduleOfflineRetry();
        return;
      }

      sendSplashStatus(splash, {
        phase: "error",
        message: "Update error. Starting normally…",
      });
      if (!mainWindow || mainWindow.isDestroyed()) {
        bootstrapOnce();
      }
    });

    // Kick off the (possibly retrying) update flow.
    void startUpdateCheck();

    // enable auto start on Windows and MacOS
    if (config.firstLaunch) {
      if (process.platform === "win32" || process.platform === "darwin") {
        autoLaunch.enable();
      }
      config.firstLaunch = false;
    }

    // Setup UI/Tray
    initTray();
    initDiscordRpc("Gangio");

    // Fix for notifications
    app.name = "Gangio";
    app.setAppUserModelId("Gangio");
  });

  function bootstrapMainWindow(splash: any, startHidden: boolean) {
    // Create and show the main window immediately
    createMainWindow({ show: !startHidden });

    // Close splash after a brief delay for smooth transition
    if (splash && !splash.isDestroyed()) {
      setTimeout(() => {
        if (!splash.isDestroyed()) splash.close();
      }, 1200);
    }
  }

  // focus the window if we try to launch again
  app.on("second-instance", () => {
    mainWindow.show();
    mainWindow.restore();
    mainWindow.focus();
  });

  // macOS specific behaviour to keep app active in dock:
  // (irrespective of the minimise-to-tray option)

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // ensure URLs launch in external context
  app.on("web-contents-created", (_, contents) => {
    // prevent navigation out of build URL origin
    contents.on("will-navigate", (event, navigationUrl) => {
      if (new URL(navigationUrl).origin !== BUILD_URL.origin) {
        event.preventDefault();
      }
    });

    // handle links externally
    contents.setWindowOpenHandler(({ url }) => {
      if (
        url.startsWith("http:") ||
        url.startsWith("https:") ||
        url.startsWith("mailto:")
      ) {
        setImmediate(() => {
          shell.openExternal(url);
        });
      }

      return { action: "deny" };
    });
  });

  // Handle deep links on macOS
  app.on("open-url", (event, url) => {
    event.preventDefault();
    if (mainWindow) {
      mainWindow.show();
      mainWindow.restore();
      mainWindow.focus();
    }
  });
} else {
  app.quit();
}
