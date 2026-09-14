const {app,BrowserWindow,protocol,net,ipcMain,screen,Tray,Menu,nativeImage,shell}=require('electron');
const fs=require('node:fs');const path=require('node:path');const {pathToFileURL}=require('node:url');
const smoke=process.argv.includes('--smoke-test');
if(smoke)app.setPath('userData',path.join(app.getPath('temp'),'focusbase-desktop-smoke-'+process.pid));
protocol.registerSchemesAsPrivileged([{scheme:'focusbase',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
if(!app.requestSingleInstanceLock())app.quit();
let main,companion,tray,quitting=false,enabled=false,expanded=false;
const origin='focusbase://app';const prefsPath=()=>path.join(app.getPath('userData'),'desktop.json');
function prefs(){try{return JSON.parse(fs.readFileSync(prefsPath(),'utf8'))}catch{return {}}}
function savePrefs(){fs.mkdirSync(path.dirname(prefsPath()),{recursive:true});fs.writeFileSync(prefsPath()+'.tmp',JSON.stringify({enabled}));fs.renameSync(prefsPath()+'.tmp',prefsPath())}
function trust(event){if(![main?.webContents,companion?.webContents].includes(event.sender))throw Error('Unknown window')}
function protect(win){
  win.webContents.setWindowOpenHandler(({url})=>{if(/^https?:\/\//i.test(url))void shell.openExternal(url);return {action:'deny'}});
  win.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith(origin+'/')){event.preventDefault();if(/^https?:\/\//i.test(url))void shell.openExternal(url)}});
  win.webContents.session.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
}
function showMain(payload){if(!main||main.isDestroyed())return;main.show();if(main.isMinimized())main.restore();main.focus();if(payload)main.webContents.send('workspace:open',payload)}
function resizeCompanion(value){
  if(!companion||companion.isDestroyed())return;expanded=value;const old=companion.getBounds();const area=screen.getDisplayMatching(old).workArea;
  const width=value?Math.min(400,area.width):90;const height=value?Math.min(720,area.height):104;
  const x=Math.max(area.x,Math.min(old.x+old.width-width,area.x+area.width-width));const y=Math.max(area.y,Math.min(old.y+old.height-height,area.y+area.height-height));
  companion.setBounds({x,y,width,height});
}
function createCompanion(){
  if(companion&&!companion.isDestroyed()){companion.show();return}
  const area=screen.getPrimaryDisplay().workArea;expanded=false;
  companion=new BrowserWindow({width:90,height:104,x:area.x+area.width-114,y:area.y+area.height-128,frame:false,transparent:true,resizable:false,skipTaskbar:true,show:false,alwaysOnTop:false,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false,additionalArguments:['--focusbase-companion']}});
  protect(companion);companion.setAlwaysOnTop(true,'floating');
  companion.once('ready-to-show',()=>{if(enabled&&!smoke)companion.show()});
  companion.on('closed',()=>{companion=null});void companion.loadURL(origin+'/#today');
}
function updateMenu(){tray?.setContextMenu(Menu.buildFromTemplate([{label:'Открыть FocusBase',click:()=>showMain()},{label:'Иконка поверх окон',type:'checkbox',checked:enabled,click:item=>setEnabled(item.checked)},{type:'separator'},{label:'Выйти из FocusBase',click:()=>{quitting=true;app.quit()}}]))}
function setEnabled(value){enabled=value;savePrefs();if(value)createCompanion();else{companion?.destroy();if(main&&!main.isVisible()&&!smoke)showMain()}updateMenu();return enabled}
app.on('second-instance',()=>showMain());app.on('before-quit',()=>{quitting=true});app.on('window-all-closed',()=>{if(!enabled)app.quit()});
app.whenReady().then(async()=>{
  const siteRoot=app.isPackaged?path.join(process.resourcesPath,'site'):path.resolve(__dirname,'../out');
  protocol.handle('focusbase',async request=>{
    try{const url=new URL(request.url);if(url.hostname!=='app')return new Response('Not found',{status:404});const pathname=decodeURIComponent(url.pathname);const relative=pathname==='/'?'index.html':pathname.replace(/^\/+/, '');const file=path.resolve(siteRoot,relative);
      if(!file.startsWith(siteRoot+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return new Response('Not found',{status:404});
      return net.fetch(pathToFileURL(file).href);
    }catch{return new Response('Not found',{status:404})}
  });
  enabled=prefs().enabled===true;
  main=new BrowserWindow({width:1320,height:900,minWidth:390,minHeight:600,show:false,title:'FocusBase',backgroundColor:'#f3f5f2',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  main.setMenuBarVisibility(false);protect(main);
  main.on('close',event=>{if(enabled&&!quitting){event.preventDefault();main.hide()}else{quitting=true;app.quit()}});
  const icon=nativeImage.createFromPath(path.join(__dirname,'icon.png'));tray=new Tray(icon);tray.setToolTip('FocusBase');tray.on('double-click',()=>showMain());updateMenu();
  ipcMain.handle('companion:get-enabled',event=>{trust(event);return enabled});
  ipcMain.handle('companion:set-enabled',(event,value)=>{trust(event);return setEnabled(value===true)});
  ipcMain.handle('companion:expanded',(event,value)=>{trust(event);if(event.sender!==companion?.webContents)return;resizeCompanion(value===true)});
  ipcMain.handle('companion:open',(event,value)=>{trust(event);if(!value||typeof value!=='object')return;
    const views=['Сегодня','Задачи','Фокус','Календарь','Библиотека','Заметки','Обзор недели','Настройки'];const kinds=['tasks','notes','resources','finish'];
    if(typeof value.view==='string'&&views.includes(value.view))showMain({view:value.view});
    else if(value.edit&&kinds.includes(value.edit.kind)){const edit={kind:value.edit.kind};for(const key of ['id','date'])if(typeof value.edit[key]==='string'&&value.edit[key].length<200)edit[key]=value.edit[key];showMain({edit})}
    resizeCompanion(false);
  });
  await main.loadURL(origin+'/');if(!smoke)main.show();if(enabled)createCompanion();
  if(smoke){
    const assert=require('node:assert/strict');assert.equal(enabled,false);assert.equal(companion,undefined);
    setEnabled(true);await new Promise((resolve,reject)=>{companion.webContents.once('did-finish-load',resolve);companion.webContents.once('did-fail-load',(_event,code,message)=>reject(Error(code+': '+message)))});
    assert.equal(companion.isAlwaysOnTop(),true);assert.equal(companion.webContents.getURL(),origin+'/#today');
    main.close();assert.equal(main.isDestroyed(),false);assert.equal(main.isVisible(),false);assert.equal(companion.isDestroyed(),false);
    resizeCompanion(true);assert.ok(companion.getBounds().width>=300);resizeCompanion(false);assert.equal(companion.getBounds().width,90);
    setEnabled(false);assert.equal(companion,null);assert.equal(prefs().enabled,false);
    console.log('DESKTOP_SMOKE_PASS: local pages load, permission defaults off, overlay stays alive after main closes, resize and revoke work');quitting=true;app.quit();
  }
}).catch(error=>{console.error(error);app.exit(1)});
