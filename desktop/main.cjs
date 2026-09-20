const {app,BrowserWindow,protocol,net,ipcMain,screen,Tray,Menu,nativeImage,shell}=require('electron');
const fs=require('node:fs');const path=require('node:path');const {pathToFileURL}=require('node:url');
const smoke=process.argv.includes('--smoke-test');
if(smoke)app.setPath('userData',process.env.FOCUSBASE_SMOKE_PROFILE||path.join(app.getPath('temp'),'focusbase-desktop-smoke-'+process.pid));
else {
  // Keep the existing profile across a display-name change, including IndexedDB.
  const profile=path.join(app.getPath('appData'),'FocusBase');
  app.setPath('userData',profile);app.setPath('sessionData',profile);
}
app.setName('ÇalışBase');
// HTTP headers require an ASCII app token; the window/menu name keeps its accents.
app.userAgentFallback=`Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) CalisBase/${app.getVersion()} Chrome/${process.versions.chrome} Electron/${process.versions.electron} Safari/537.36`;
protocol.registerSchemesAsPrivileged([{scheme:'focusbase',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
if(!app.requestSingleInstanceLock())app.exit(0);
let main,companion,tray,quitting=false,enabled=false,expanded=false,position,drag,moveTimer,menuWindow=null,pendingResize=null;
if(smoke)setTimeout(()=>{console.error('Desktop smoke test timed out');app.exit(1)},45000).unref();
const origin='focusbase://app';const prefsPath=()=>path.join(app.getPath('userData'),'desktop.json');
function prefs(){try{return JSON.parse(fs.readFileSync(prefsPath(),'utf8'))}catch{return {}}}
function savePrefs(){fs.mkdirSync(path.dirname(prefsPath()),{recursive:true});fs.writeFileSync(prefsPath()+'.tmp',JSON.stringify({enabled,position}));fs.renameSync(prefsPath()+'.tmp',prefsPath())}
function visibleBounds(bounds){const area=screen.getDisplayMatching(bounds).workArea;return {...bounds,x:Math.round(Math.max(area.x,Math.min(bounds.x,area.x+area.width-bounds.width))),y:Math.round(Math.max(area.y,Math.min(bounds.y,area.y+area.height-bounds.height)))}}
function rememberPosition(){if(!companion||companion.isDestroyed())return;const b=companion.getBounds();position=expanded?{x:b.x+b.width-96,y:b.y+b.height-112}:{x:b.x,y:b.y};savePrefs()}
function dragCompanion(phase){
  if(!companion||companion.isDestroyed())return;
  if(phase==='start'){drag={cursor:screen.getCursorScreenPoint(),bounds:companion.getBounds()};return}
  if(phase==='end'){drag=null;rememberPosition();return}
  if(phase!=='move'||!drag)return;const cursor=screen.getCursorScreenPoint();
  companion.setBounds(visibleBounds({...drag.bounds,x:drag.bounds.x+cursor.x-drag.cursor.x,y:drag.bounds.y+cursor.y-drag.cursor.y}));
}
function trust(event){if(![main?.webContents,companion?.webContents].includes(event.sender))throw Error('Unknown window')}
function protect(win){
  win.webContents.setWindowOpenHandler(({url})=>{if(/^https?:\/\//i.test(url))void shell.openExternal(url);return {action:'deny'}});
  win.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith(origin+'/')){event.preventDefault();if(/^https?:\/\//i.test(url))void shell.openExternal(url)}});
  win.webContents.session.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
}
function showMain(payload){if(!main||main.isDestroyed())return;main.show();if(main.isMinimized())main.restore();main.focus();if(payload)main.webContents.send('workspace:open',payload)}
function resizeCompanion(value){
  if(menuWindow){pendingResize=value;return}
  if(!companion||companion.isDestroyed())return;expanded=value;const old=companion.getBounds();const area=screen.getDisplayMatching(old).workArea;
  const width=value?Math.min(400,area.width):96;const height=value?Math.min(720,area.height):112;
  const x=Math.max(area.x,Math.min(old.x+old.width-width,area.x+area.width-width));const y=Math.max(area.y,Math.min(old.y+old.height-height,area.y+area.height-height));
  companion.setBounds({x,y,width,height});
}
function createCompanion(){
  if(companion&&!companion.isDestroyed()){companion.setBounds(visibleBounds(companion.getBounds()));companion.setAlwaysOnTop(true,'floating');companion.show();return}
  const area=screen.getPrimaryDisplay().workArea;expanded=false;
  const bounds=visibleBounds({width:96,height:112,x:position?.x??area.x+area.width-120,y:position?.y??area.y+area.height-136});
  companion=new BrowserWindow({...bounds,frame:false,transparent:true,resizable:false,skipTaskbar:true,show:false,alwaysOnTop:false,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false,additionalArguments:['--focusbase-companion']}});
  const win=companion;
  protect(win);win.setAlwaysOnTop(true,'floating');
  win.once('ready-to-show',()=>{if(enabled&&companion===win&&!win.isDestroyed()&&!smoke)win.show()});
  win.on('move',()=>{if(companion===win){clearTimeout(moveTimer);moveTimer=setTimeout(rememberPosition,200)}});
  win.on('closed',()=>{if(companion===win){clearTimeout(moveTimer);drag=null;companion=null}});void win.loadURL(origin+'/#today');
}
function updateMenu(){tray?.setContextMenu(Menu.buildFromTemplate([{label:'Открыть ÇalışBase',click:()=>showMain()},{label:'Иконка поверх окон',type:'checkbox',checked:enabled,click:item=>setEnabled(item.checked)},{type:'separator'},{label:'Выйти из ÇalışBase',click:()=>{quitting=true;app.quit()}}]))}
function setEnabled(value,showWindow=true){if(!value)rememberPosition();enabled=value;savePrefs();if(value)createCompanion();else{companion?.destroy();if(showWindow&&main&&!main.isVisible()&&!smoke)showMain()}updateMenu();main?.webContents.send('companion:enabled',enabled);return enabled}
function companionMenu(english){return Menu.buildFromTemplate([
  {label:'ÇalışBase',enabled:false},
  {id:'open-main',label:english?'Open ÇalışBase':'Открыть ÇalışBase',click:()=>showMain()},
  {type:'separator'},
  {id:'hide-companion',label:english?'Hide icon':'Убрать иконку',click:()=>setEnabled(false,false)}
])}
function showCompanionMenu(english){
  const win=companion;if(!enabled||!win||win.isDestroyed()||menuWindow)return;
  drag=null;menuWindow=win;
  const menu=companionMenu(english);
  menu.popup({window:win,callback:()=>{
    menuWindow=null;const resize=pendingResize;pendingResize=null;
    if(companion!==win||win.isDestroyed()||!enabled)return;
    if(resize!==null)resizeCompanion(resize);
    win.setAlwaysOnTop(true,'floating');if(!smoke)win.showInactive();
  }});return menu;
}
app.on('second-instance',()=>showMain());app.on('before-quit',()=>{rememberPosition();quitting=true});app.on('window-all-closed',()=>{if(!enabled)app.quit()});
app.whenReady().then(async()=>{
  const siteRoot=app.isPackaged?path.join(process.resourcesPath,'site'):path.resolve(__dirname,'../out');
  protocol.handle('focusbase',async request=>{
    try{const url=new URL(request.url);if(url.hostname!=='app')return new Response('Not found',{status:404});const pathname=decodeURIComponent(url.pathname);const relative=pathname==='/'?'index.html':pathname.replace(/^\/+/, '');const file=path.resolve(siteRoot,relative);
      if(!file.startsWith(siteRoot+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return new Response('Not found',{status:404});
      return net.fetch(pathToFileURL(file).href);
    }catch{return new Response('Not found',{status:404})}
  });
  enabled=prefs().enabled===true;
  const saved=prefs().position;if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y))position=saved;
  screen.on('display-removed',()=>{if(companion){companion.setBounds(visibleBounds(companion.getBounds()));rememberPosition()}});
  screen.on('display-metrics-changed',()=>{if(companion){companion.setBounds(visibleBounds(companion.getBounds()));rememberPosition()}});
  main=new BrowserWindow({width:1320,height:900,minWidth:390,minHeight:600,show:false,title:'ÇalışBase',backgroundColor:'#f3f5f2',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  main.setMenuBarVisibility(false);protect(main);
  main.on('close',event=>{if(quitting)return;if(enabled){event.preventDefault();main.hide()}else{quitting=true;app.quit()}});
  const icon=nativeImage.createFromPath(path.join(__dirname,'icon.png')).resize({width:16,height:16});tray=new Tray(icon);tray.setToolTip('ÇalışBase');tray.on('double-click',()=>showMain());updateMenu();
  ipcMain.handle('companion:get-enabled',event=>{trust(event);return enabled});
  ipcMain.handle('companion:set-enabled',(event,value)=>{trust(event);return setEnabled(value===true)});
  ipcMain.handle('companion:expanded',(event,value)=>{trust(event);if(event.sender!==companion?.webContents)return;resizeCompanion(value===true)});
  ipcMain.on('companion:drag',(event,phase)=>{if(event.sender===companion?.webContents)dragCompanion(phase)});
  ipcMain.on('companion:menu',(event,english)=>{if(event.sender===companion?.webContents)showCompanionMenu(english===true)});
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
    const dismissed=showCompanionMenu(false);assert.equal(enabled,true);resizeCompanion(false);
    dismissed.closePopup(companion);await new Promise(resolve=>setTimeout(resolve,100));
    assert.equal(enabled,true);assert.ok(companion&&!companion.isDestroyed());assert.equal(menuWindow,null);
    await companion.webContents.executeJavaScript(`new Promise((resolve,reject)=>{let attempts=0;const timer=setInterval(()=>{if(document.querySelector('.desktop-mini .companion-launcher')){clearInterval(timer);resolve(true)}else if(++attempts>40){clearInterval(timer);reject(Error('Companion UI did not mount: '+document.body.innerText))}},100)})`);
    main.close();assert.equal(main.isDestroyed(),false);assert.equal(main.isVisible(),false);assert.equal(companion.isDestroyed(),false);
    resizeCompanion(true);assert.ok(companion.getBounds().width>=300);resizeCompanion(false);assert.equal(companion.getBounds().width,96);
    const area=screen.getPrimaryDisplay().workArea;companion.setPosition(area.x+70,area.y+80);const moved=companion.getBounds();rememberPosition();assert.deepEqual(prefs().position,{x:moved.x,y:moved.y});
    companion.destroy();createCompanion();assert.ok(Math.abs(companion.getBounds().x-moved.x)<=1);assert.ok(Math.abs(companion.getBounds().y-moved.y)<=1);
    const recovered=visibleBounds({x:100000,y:100000,width:90,height:104});assert.ok(recovered.x<100000&&recovered.y<100000);
    const menu=companionMenu(false);assert.equal(menu.items[0].enabled,false);assert.equal(enabled,true);
    menu.getMenuItemById('hide-companion').click();assert.equal(companion,null);assert.equal(prefs().enabled,false);assert.equal(main.isVisible(),false);
    if(process.env.PORTABLE_EXECUTABLE_FILE){
      // Reopening the same portable EXE must not remove the running copy's site.
      const {spawn}=require('node:child_process');
      await new Promise((resolve,reject)=>{const child=spawn(process.env.PORTABLE_EXECUTABLE_FILE,['--smoke-test'],{windowsHide:true,env:{...process.env,FOCUSBASE_SMOKE_PROFILE:app.getPath('userData')}});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error('Second launch exited '+code)))});
      assert.ok(fs.existsSync(path.join(siteRoot,'index.html')),'Second launch removed the site files');
    }
    setEnabled(true);assert.ok(companion);
    await new Promise((resolve,reject)=>{companion.webContents.once('did-finish-load',resolve);companion.webContents.once('did-fail-load',(_event,code,message)=>reject(Error(code+': '+message)))});
    await companion.webContents.executeJavaScript(`new Promise((resolve,reject)=>{let attempts=0;const timer=setInterval(()=>{if(document.querySelector('.desktop-mini .companion-launcher')){clearInterval(timer);resolve(true)}else if(++attempts>40){clearInterval(timer);reject(Error('Restored companion did not mount'))}},100)})`);
    assert.equal(companion.isAlwaysOnTop(),true);setEnabled(false);assert.equal(companion,null);
    console.log('DESKTOP_SMOKE_PASS: pages load, consent defaults off, companion survives main close, position persists, off-screen recovery and revoke work');quitting=true;app.quit();
  }
}).catch(error=>{console.error(error);app.exit(1)});
