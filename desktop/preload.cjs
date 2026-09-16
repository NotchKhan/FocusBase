const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('focusbaseDesktop',{
  mini:process.argv.includes('--focusbase-companion'),
  getEnabled:()=>ipcRenderer.invoke('companion:get-enabled'),
  setEnabled:value=>ipcRenderer.invoke('companion:set-enabled',value===true),
  setExpanded:value=>ipcRenderer.invoke('companion:expanded',value===true),
  drag:phase=>ipcRenderer.send('companion:drag',phase),
  showMenu:english=>ipcRenderer.send('companion:menu',english===true),
  onEnabled:callback=>{const listener=(_event,value)=>callback(value);ipcRenderer.on('companion:enabled',listener);return()=>ipcRenderer.removeListener('companion:enabled',listener)},
  open:payload=>ipcRenderer.invoke('companion:open',payload),
  onOpen:callback=>{const listener=(_event,value)=>callback(value);ipcRenderer.on('workspace:open',listener);return()=>ipcRenderer.removeListener('workspace:open',listener)},
});
