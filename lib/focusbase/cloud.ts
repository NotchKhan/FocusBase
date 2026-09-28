import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {stateSchema,type State} from './domain';
import type {WorkspaceBackend} from './store';

export const cloudEnabled=process.env.NEXT_PUBLIC_CLOUD_AUTH_ENABLED==='true';
let client:SupabaseClient|null=null;
export function cloudClient(){
  if(!cloudEnabled)throw Error('Вход в аккаунт пока не подключён.');
  if(client)return client;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)throw Error('Настройка входа ещё не завершена. Локальные записи доступны без аккаунта.');
  const parsed=new URL(url);
  if(parsed.protocol!=='https:'||!parsed.hostname.endsWith('.supabase.co')||parsed.username||parsed.password||parsed.port||parsed.search||parsed.hash||parsed.pathname!=='/')throw Error('Некорректный адрес сервиса аккаунтов.');
  if(!key.startsWith('sb_publishable_'))throw Error('Для сайта нужен публичный publishable key Supabase.');
  client=createClient(url,key,{auth:{flowType:'pkce',detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
  return client;
}
export function signInRedirect(){
  const url=new URL(process.env.NEXT_PUBLIC_SITE_URL||'https://calisbase.vercel.app');
  if(url.protocol!=='https:'||url.username||url.password)throw Error('Некорректный адрес возврата после входа.');
  if(window.location.origin===url.origin)return url.origin+'/';
  if(['localhost','127.0.0.1'].includes(window.location.hostname))return window.location.origin+'/';
  throw Error('Вход доступен на основном сайте ÇalışBase.');
}
export function cloudBackend(ownerId:string):WorkspaceBackend{
  const db=cloudClient();
  return {ownerId,
    async load(){
      const {data,error}=await db.from('workspaces').select('state,revision').eq('user_id',ownerId).maybeSingle();
      if(error)throw Error('Не удалось загрузить облачные данные. Проверь соединение и повтори.');
      if(!data)return null;
      const state=stateSchema.parse(data.state);
      if(state.revision!==data.revision)throw Error('Версия облачных данных не совпадает. Обратись в поддержку.');
      return state;
    },
    async save(state:State,expectedRevision:number){
      // SQL also compares the captured account ID to auth.uid(). A changed
      // session cannot cause A's payload to be saved in B's workspace.
      const {data,error}=await db.rpc('save_workspace',{p_account_id:ownerId,p_state:state,p_expected_revision:expectedRevision});
      if(error){
        if(error.code==='40001'){const conflict=Error('Данные изменились в другой вкладке или на другом устройстве. Проверь актуальные записи и повтори действие.');conflict.name='WorkspaceConflict';throw conflict}
        if(['28000','42501','PGRST301'].includes(error.code))throw Error('Сессия закончилась. Войди в аккаунт снова.');
        if(error.code==='22001')throw Error('Пространство превышает лимит 8 МБ. Сохрани резервную копию и сократи объём записей.');
        throw Error('Сервер не подтвердил сохранение. Проверь соединение и повтори действие.');
      }
      return stateSchema.parse(data);
    },
  };
}
