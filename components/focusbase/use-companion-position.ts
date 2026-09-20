'use client';
import {useEffect,useRef,useState,type PointerEvent,type MouseEvent} from 'react';

type Position={x:number;y:number};
const key='focusbase-companion-position';
export function useCompanionPosition(desktop:boolean){
  const launcher=useRef<HTMLButtonElement>(null);
  const gesture=useRef<{x:number;y:number;left:number;top:number;moved:boolean}|null>(null);
  const suppressClick=useRef(false);
  const [position,setPosition]=useState<Position|null>(null);
  const clamp=(p:Position)=>({x:Math.max(8,Math.min(p.x,innerWidth-(launcher.current?.offsetWidth||60)-8)),y:Math.max(8,Math.min(p.y,innerHeight-(launcher.current?.offsetHeight||56)-8))});
  useEffect(()=>{
    if(desktop)return;
    try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y))queueMicrotask(()=>setPosition(clamp(saved)))}catch{/* Storage may be unavailable. */}
    const resize=()=>setPosition(p=>p?clamp(p):p);
    const observer=new ResizeObserver(resize);if(launcher.current)observer.observe(launcher.current);
    window.addEventListener('resize',resize);return()=>{observer.disconnect();window.removeEventListener('resize',resize)};
  },[desktop]);
  const onPointerDown=(e:PointerEvent<HTMLButtonElement>)=>{
    if(e.button!==0)return;const box=e.currentTarget.getBoundingClientRect();
    suppressClick.current=false;gesture.current={x:e.screenX,y:e.screenY,left:box.left,top:box.top,moved:false};e.currentTarget.setPointerCapture(e.pointerId);
    if(desktop)window.focusbaseDesktop?.drag('start');
  };
  const onPointerMove=(e:PointerEvent<HTMLButtonElement>)=>{
    const g=gesture.current;if(!g)return;const dx=e.screenX-g.x,dy=e.screenY-g.y;
    if(!g.moved&&Math.hypot(dx,dy)<5)return;g.moved=true;suppressClick.current=true;
    if(desktop)window.focusbaseDesktop?.drag('move');else setPosition(clamp({x:g.left+dx,y:g.top+dy}));
  };
  const finish=()=>{
    const g=gesture.current;if(!g)return;gesture.current=null;
    if(desktop)window.focusbaseDesktop?.drag('end');else if(g.moved&&launcher.current){const box=launcher.current.getBoundingClientRect();try{localStorage.setItem(key,JSON.stringify({x:box.left,y:box.top}))}catch{/* Keep dragging available without storage. */}}
  };
  const onClickCapture=(e:MouseEvent<HTMLButtonElement>)=>{if(suppressClick.current&&e.detail!==0){e.preventDefault();e.stopPropagation()}};
  return {ref:launcher,onPointerDown,onPointerMove,onPointerUp:finish,onPointerCancel:finish,onLostPointerCapture:finish,onClickCapture,style:!desktop&&position?{left:position.x,top:position.y,right:'auto',bottom:'auto'}:undefined};
}
