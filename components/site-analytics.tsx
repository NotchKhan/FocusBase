'use client';
import {Analytics} from '@vercel/analytics/next';
export function SiteAnalytics(){
  // OAuth codes, errors and record IDs must never be sent as page URLs.
  return <Analytics beforeSend={event=>{
    try{const url=new URL(event.url);return {...event,url:url.origin+url.pathname}}catch{return null}
  }}/>;
}
