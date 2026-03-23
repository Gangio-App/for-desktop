import { contextBridge, ipcRenderer } from "electron";

import { version } from "../../package.json";

contextBridge.exposeInMainWorld("native", {
  versions: {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,
    desktop: () => version,
  },

  minimise: () => ipcRenderer.send("minimise"),
  maximise: () => ipcRenderer.send("maximise"),
  close: () => ipcRenderer.send("close"),

  getDesktopSources: (options: any) =>
    ipcRenderer.invoke("get-desktop-sources", options),

  restartToUpdate: () => ipcRenderer.send("restart-to-update"),

  onUpdateReady: (callback: () => void) =>
    ipcRenderer.on("update-ready", () => callback()),

  setBadgeCount: (count: number) => ipcRenderer.send("setBadgeCount", count),
});

// Override web notifications to use native ones
const OldNotification = (window as any).Notification;
class NativeNotification extends (OldNotification as any) {
  constructor(title: string, options: any) {
    super(title, options);
    ipcRenderer.send("notification", { title, ...options });
  }
}

(window as any).Notification = NativeNotification;
(window as any).Notification.permission = "granted";
(window as any).Notification.requestPermission = async () => "granted";
