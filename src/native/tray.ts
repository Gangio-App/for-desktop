import { Menu, Tray, nativeImage } from "electron";

import trayIconAsset from "../../assets/desktop/icon.png?asset";
import macOsTrayIconAsset from "../../assets/desktop/iconTemplate.png?asset";
import { version } from "../../package.json";

import { mainWindow, quitApp } from "./window";

// internal tray state
let tray: Tray = null;
let updateStatus: "none" | "checking" | "downloading" | "ready" = "none";

/**
 * Set the update status and refresh the tray menu
 */
export function setUpdateStatus(status: typeof updateStatus) {
  updateStatus = status;
  updateTrayMenu();
}

// Create and resize tray icon for macOS
function createTrayIcon() {
  if (process.platform === "darwin") {
    const image = nativeImage.createFromDataURL(macOsTrayIconAsset);
    const resized = image.resize({ width: 20, height: 20 });
    resized.setTemplateImage(true);
    return resized;
  } else {
    return nativeImage.createFromDataURL(trayIconAsset);
  }
}

export function initTray() {
  const trayIcon = createTrayIcon();
  tray = new Tray(trayIcon);
  updateTrayMenu();
  tray.setToolTip("Gangio for Desktop");
  tray.setImage(trayIcon);
  tray.on("click", () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

export function updateTrayMenu() {
  const menuItems: any[] = [
    { label: "Gangio for Desktop", type: "normal", enabled: false },
    {
      label: "Version",
      type: "submenu",
      submenu: Menu.buildFromTemplate([
        {
          label: version,
          type: "normal",
          enabled: false,
        },
      ]),
    },
    { type: "separator" },
  ];

  if (updateStatus === "checking") {
    menuItems.push({ label: "Checking for updates...", enabled: false });
    menuItems.push({ type: "separator" });
  } else if (updateStatus === "downloading") {
    menuItems.push({ label: "Downloading update...", enabled: false });
    menuItems.push({ type: "separator" });
  } else if (updateStatus === "ready") {
    menuItems.push({
      label: "Restart to Update",
      click: () => {
        const { autoUpdater } = require("electron");
        autoUpdater.quitAndInstall();
      },
    });
    menuItems.push({ type: "separator" });
  }

  // Add the check for updates button
  menuItems.push({
    label: "Check for Updates",
    click: () => {
      setUpdateStatus("checking");
      const { autoUpdater } = require("electron");
      autoUpdater.checkForUpdates();
    },
  });

  menuItems.push(
    {
      label: mainWindow.isVisible() ? "Hide Gangio" : "Show Gangio",
      type: "normal",
      click() {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
        }
      },
    },
    {
      label: "Quit Gangio",
      type: "normal",
      click: quitApp,
    },
  );

  tray.setContextMenu(Menu.buildFromTemplate(menuItems));
}
