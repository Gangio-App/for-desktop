import dbus from "@homebridge/dbus-native";

import { NativeImage, app, ipcMain, nativeImage } from "electron";

import { mainWindow } from "./window";

// internal state
const nativeIcons: Record<number, NativeImage> = {};
let sessionBus: dbus.MessageBus | null;

export async function setBadgeCount(count: number) {
  // Use Electron's built-in badge API where supported (macOS, some Linux)
  if (app.setBadgeCount) {
    app.setBadgeCount(count === -1 ? 1 : count);
  }

  switch (process.platform) {
    case "win32":
      if (count === 0) {
        mainWindow.setOverlayIcon(null, "No Notifications");
      } else {
        if (!nativeIcons[count]) {
          const badgeId = count === -1 ? "-1" : Math.min(count, 10);
          nativeIcons[count] = nativeImage.createFromDataURL(
            await import(`../../assets/desktop/badges/${badgeId}.ico?asset`).then(
              (asset) => asset.default,
            ),
          );
        }
        mainWindow.setOverlayIcon(
          nativeIcons[count],
          count === -1 ? `Unread Messages` : `${count} Notifications`,
        );
      }
      break;

    case "linux":
      // Send D-Bus message for Linux launchers (libunity support)
      try {
        if (!sessionBus) sessionBus = dbus.sessionBus();
        if (sessionBus) {
          // @ts-expect-error undocumented API
          sessionBus.connection.message({
            // @ts-expect-error undocumented API
            type: dbus.messageType.signal,
            serial: 1,
            path: "/",
            interface: "com.canonical.Unity.LauncherEntry",
            member: "Update",
            signature: "sa{sv}",
            body: [
              process.env.container === "1"
                ? "application://pro.gangio.GangioDesktop.desktop" // flatpak handling
                : "application://pro.gangio.GangioDesktop.desktop", // matched with .desktop file ID
              [
                ["count", ["x", Math.max(count, 0)]],
                ["count-visible", ["b", count !== 0]],
              ],
            ],
          });
        }
      } catch (e) {
        // DBus might not be available or supported
      }
      break;

    case "darwin":
      app.dock.setBadge(count === -1 ? "•" : count === 0 ? "" : count.toString());
      break;
  }
}

ipcMain.on("setBadgeCount", (_event, count: number) => setBadgeCount(count));
