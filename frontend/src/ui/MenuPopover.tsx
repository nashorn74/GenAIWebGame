// src/ui/MenuPopover.tsx
import React,{useState} from 'react'

export default function MenuPopover(
  {bgmOn,onToggleBgm,onLogout}:{bgmOn:boolean,onToggleBgm:()=>void,onLogout:()=>void}
){
  const [open,setOpen]=useState(false)
  return (
    <div>
      <button onClick={()=>setOpen(o=>!o)}
              style={{width:42,height:42,border:'none',borderRadius:4}}>☰</button>

      {open && (
        <div style={{
          position:'absolute',right:0,bottom:48,
          width:160,background:'#333',color:'#fff',padding:8,borderRadius:6}}>
          <button onClick={onToggleBgm} style={{width:'100%'}}>
            BGM {bgmOn?'OFF':'ON'}
          </button>
          <button onClick={onLogout} style={{marginTop:8,width:'100%'}}>Logout</button>
        </div>
      )}
    </div>
  )
}
