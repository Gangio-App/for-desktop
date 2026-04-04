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

// disable hw-accel if so requested
if (!config.hardwareAcceleration) {
  app.disableHardwareAcceleration();
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
 
      autoUpdater.on("checking-for-update", () => {
        sendSplashStatus(splash, {
          phase: "checking",
          message: "Checking for updates…",
        });
      });
 
      autoUpdater.on("update-available", () => {
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
        setUpdateStatus("none");
        sendSplashStatus(splash, {
          phase: "starting",
          message: "All good! Launching…",
        });
        
        // No update needed, proceed to create the main window
        if (!mainWindow || mainWindow.isDestroyed()) {
           bootstrapMainWindow(splash, startHidden);
        }
      });
 
      autoUpdater.on("error", (err: unknown) => {
        sendSplashStatus(splash, {
          phase: "error",
          message: "Update error. Starting normally…",
        });
        console.error("AutoUpdater error", err);
        
        // On error, still try to launch the main app
        if (!mainWindow || mainWindow.isDestroyed()) {
           bootstrapMainWindow(splash, startHidden);
        }
      });
 
      // Start the update scan
      setUpdateStatus("checking");
      autoUpdater.checkForUpdates();
 
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
      createMainWindow({ show: startHidden ? false : false });
 
      // Once the main window has rendered, show it and close splash.
      if (!startHidden) {
        mainWindow.once("ready-to-show", () => {
          if (splash && !splash.isDestroyed()) {
             setTimeout(() => {
                if (!splash.isDestroyed()) splash.close();
                mainWindow.show();
                mainWindow.focus();
             }, 800); // Give some time for the "Launching" message to be seen
          } else {
            mainWindow.show();
            mainWindow.focus();
          }
        });
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
} else {
  app.quit();
}
