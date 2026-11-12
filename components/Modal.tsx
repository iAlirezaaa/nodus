'use client';
import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
export default function Modal({title,children,onClose,wide=false}:{title:string;children:React.ReactNode;onClose:()=>void;wide?:boolean}){
  const ref=useRef<HTMLDivElement>(null); const id=useId(); const closeRef=useRef(onClose);closeRef.current=onClose;
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;
    const timer=setTimeout(()=>ref.current?.querySelector<HTMLElement>('input,textarea,button')?.focus(),30);
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){e.preventDefault();closeRef.current();}
      if(e.key==='Tab'){
        const els=Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,textarea,select,[tabindex="0"]')??[]).filter(e=>e.offsetParent!==null);
        if(!els.length)return;
        if(e.shiftKey&&document.activeElement===els[0]){e.preventDefault();els.at(-1)?.focus();}
        if(!e.shiftKey&&document.activeElement===els.at(-1)){e.preventDefault();els[0].focus();}
      }
    };
    document.addEventListener('keydown',key);
    return()=>{clearTimeout(timer);document.removeEventListener('keydown',key);previous?.focus();};
  },[]);
  return <div className="modal-backdrop" onPointerDown={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className={`modal ${wide?'modal-wide':''}`} ref={ref} role="dialog" aria-modal="true" aria-labelledby={id}>
      <header className="modal-header"><h2 id={id}>{title}</h2><button className="icon-button" aria-label="Close / بستن" onClick={onClose}><X size={19}/></button></header>{children}
    </div>
  </div>;
}
