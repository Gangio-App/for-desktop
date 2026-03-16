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
