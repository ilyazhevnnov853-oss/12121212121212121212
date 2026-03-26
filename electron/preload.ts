import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  // Add any needed IPC methods here
});
