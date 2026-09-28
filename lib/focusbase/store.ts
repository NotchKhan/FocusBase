'use client';
import {useSyncExternalStore,useEffect} from 'react';
import {expireTasks,protectExpiredTasks} from './task-expiry';
import {emptyState,stateSchema,State} from './domain';

export type WorkspaceBackend={ownerId:string;load:()=>Promise<State|null>;save:(state:State,expectedRevision:number)=>Promise<State>};
let current:State|null=null,error='',dbPromise:Promise<IDBDatabase>|null=null,channel:BroadcastChannel|null=null;
let backend:WorkspaceBackend|null=null,generation=0,suspended=false,cloudSaving=0;
let cloudQueue:Promise<unknown>=Promise.resolve();
const listeners=new Set<()=>void>();
const emit=()=>listeners.forEach(f=>f());
export const getWorkspaceScope=()=>backend?'account:'+backend.ownerId:'local';
export const getWorkspaceGeneration=()=>generation;
export const isCloudWorkspace=()=>backend!==null;
export function suspendWorkspace(){generation++;suspended=true;backend=null;current=null;error='';cloudSaving=0;emit()}
export async function configureWorkspace(next:WorkspaceBackend|null){generation++;backend=next;suspended=false;current=null;error='';cloudSaving=0;cloudQueue=Promise.resolve();emit();await reload()}
const assertScope=(ticket:number)=>{if(suspended||ticket!==generation)throw Error('Аккаунт изменился. Открой запись заново.')};
function database(){
  if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const r=indexedDB.open('focusbase',1);r.onupgradeneeded=()=>r.result.createObjectStore('workspace');r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();dbPromise=null};resolve(r.result)};r.onerror=()=>{dbPromise=null;reject(r.error)};r.onblocked=()=>{error='Закройте другие вкладки ÇalışBase и обновите страницу.';emit()}});
  return dbPromise;
}
export async function readLocalWorkspace(){
  const db=await database();
  const value=await new Promise<unknown>((resolve,reject)=>{const r=db.transaction('workspace','readonly').objectStore('workspace').get('personal');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
  return value?stateSchema.parse(value):null;
}
export async function reload(){
  if(suspended||cloudSaving)return;
  const ticket=generation,remote=backend;
  try{
    const loaded=(remote?await remote.load():await readLocalWorkspace())||emptyState();assertScope(ticket);
    if(!current||loaded.revision>=current.revision)current=loaded;
    error='';emit();
    if(expireTasks(structuredClone(loaded)))await mutate(()=>{});
  }catch(e){if(ticket===generation&&!suspended){error='Не удалось открыть хранилище. '+(e instanceof Error?e.message:String(e));emit()}}
}
function prepare(before:State,fn:(draft:State)=>void,restoringBackup=false){
  let next=stateSchema.parse(before);expireTasks(next);
  const locked=structuredClone(next.tasks.filter(t=>t.status==='missed'));
  fn(next);
  if(!restoringBackup){protectExpiredTasks(locked,next.tasks);if(next.active?.runSince!==null&&locked.some(t=>t.id===next.active?.taskId))throw Error('Срок задачи прошёл. Повторный запуск недоступен.')}
  expireTasks(next);next.revision=before.revision+1;next=stateSchema.parse(next);return next;
}
export async function mutate(fn:(draft:State)=>void,options:{restoringBackup?:boolean;generation?:number}={}){
  if(options.generation!==undefined)assertScope(options.generation);
  const ticket=generation,remote=backend;assertScope(ticket);
  const perform=async()=>{
    assertScope(ticket);
    try{
      let saved:State;
      if(remote){
        if(!current)throw Error('Сначала дождись загрузки облачных данных.');
        cloudSaving++;
        const before=current;
        saved=await remote.save(prepare(before,fn,options.restoringBackup),before.revision);
      }else{
        const db=await database();assertScope(ticket);
        saved=await new Promise<State>((resolve,reject)=>{const tx=db.transaction('workspace','readwrite'),store=tx.objectStore('workspace');let next:State,failure:unknown;const r=store.get('personal');r.onsuccess=()=>{try{assertScope(ticket);next=prepare(stateSchema.parse(r.result||emptyState()),fn,options.restoringBackup);store.put(next,'personal')}catch(e){failure=e;tx.abort()}};tx.oncomplete=()=>resolve(next);tx.onabort=()=>reject(failure||tx.error||new Error('Запись отменена'));tx.onerror=()=>reject(tx.error)});
      }
      assertScope(ticket);
      if(!current||saved.revision>=current.revision)current=saved;
      error='';emit();channel?.postMessage({scope:getWorkspaceScope()});return saved;
    }catch(e){
      if(ticket===generation&&!suspended){
        if(remote&&e instanceof Error&&e.name==='WorkspaceConflict'){
          try{const latest=await remote.load();assertScope(ticket);if(latest)current=latest}catch{}
        }
        if(ticket===generation&&!suspended){error='Не удалось сохранить: '+(e instanceof Error?e.message:String(e));emit()}
      }
      throw e;
    }finally{if(remote&&ticket===generation)cloudSaving=Math.max(0,cloudSaving-1)}
  };
  if(!remote)return perform();
  const result=cloudQueue.then(perform);cloudQueue=result.catch(()=>{});return result;
}
function subscribe(f:()=>void){listeners.add(f);return()=>{listeners.delete(f)}}
let initialized=false;
export function useData(){
  const data=useSyncExternalStore(subscribe,()=>current,()=>null),storageError=useSyncExternalStore(subscribe,()=>error,()=>'');
  useEffect(()=>{if(initialized)return;initialized=true;void reload();if(typeof BroadcastChannel!=='undefined'){channel=new BroadcastChannel('focusbase-changes');channel.onmessage=event=>{if(event.data==='changed'&&!backend||event.data?.scope===getWorkspaceScope())void reload()}}window.addEventListener('focus',()=>void reload());window.addEventListener('online',()=>void reload());setInterval(()=>void reload(),30000)},[]);
  return {data,storageError};
}
export function download(content:string,name:string,type='application/json'){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
