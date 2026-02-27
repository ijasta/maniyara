import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { getCurrentAssignments, getSettings } from '../lib/supabase'
import { Avatar, Ring, StatusBadge, SecHead, Confetti, ToastProvider, useToast } from '../components/UI'

function DashContent() {
  const { profile } = useAuth()
  const toast = useToast()
  const [data, setData]   = useState({ assignments:[], week:1 })
  const [settings, setSt] = useState(null)
  const [loading, setLd]  = useState(true)
  const [confetti, setCf] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [r, s] = await Promise.all([getCurrentAssignments(), getSettings()])
      setData(r); setSt(s)
    } catch(e) { toast('Failed to load: '+e.message,'error') }
    finally { setLd(false) }
  }

  const done = data.assignments.filter(a=>a.done).length
  const tot  = data.assignments.length
  const pct  = tot ? Math.round(done/tot*100) : 0

  if (loading) return <div style={{color:'#8890b0',padding:40,textAlign:'center'}}>Loading...</div>

  return (
    <div className="page-anim">
      <Confetti active={confetti} onDone={()=>setCf(false)}/>

      {/* Title */}
      <div style={{marginBottom:16}}>
        <div style={{fontFamily:'Orbitron,monospace',fontWeight:900,fontSize:'clamp(20px,5.5vw,28px)',letterSpacing:1,lineHeight:1.2}}>
          WEEK <span style={{background:'linear-gradient(135deg,#7DF9AA,#00ffcc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',filter:'drop-shadow(0 0 12px rgba(125,249,170,.5))'}}>
            {data.week}
          </span> DUTIES
        </div>
        <div style={{fontSize:12,color:'#8890b0',marginTop:3}}>{new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</div>
      </div>

      {/* Hero */}
      <div style={{background:'linear-gradient(135deg,#0a1510,#0a0c1a)',border:'1px solid rgba(125,249,170,.18)',borderRadius:13,padding:14,marginBottom:13,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <div style={{fontSize:38,flexShrink:0}}>🏠</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:16,fontWeight:900,letterSpacing:1}}>{settings?.house_name||'Maniyara'}</div>
          <div style={{fontSize:12,color:'#8890b0',marginTop:2}}>Week {data.week} · {tot} tasks · Welcome, {profile?.name}!</div>
        </div>
        <Ring pct={pct} size={64}/>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
        {[['✅',done,'Done','#7DF9AA'],['⏳',tot-done,'Pending','#FFD93D'],['🔥',pct+'%','Rate','#FF9A3C'],['👥',tot,'Housemates','#FF6B9D']].map(([ic,n,lb,c],i)=>(
          <div key={i} style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:13,position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',bottom:-16,right:-16,width:60,height:60,borderRadius:'50%',background:c,opacity:.08,filter:'blur(12px)'}}/>
            <span style={{fontSize:20,display:'block',marginBottom:5}}>{ic}</span>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:26,fontWeight:700,color:c,lineHeight:1}}>{n}</div>
            <div style={{fontSize:10,color:'#8890b0',textTransform:'uppercase',letterSpacing:'.08em',marginTop:3,fontWeight:700}}>{lb}</div>
          </div>
        ))}
      </div>

      {/* Task cards */}
      <SecHead title="Assignments" badge={`${tot} tasks`}/>
      {data.assignments.length === 0 ? (
        <div style={{textAlign:'center',padding:40,color:'#4a5070'}}>
          <div style={{fontSize:40,marginBottom:10}}>📋</div>
          <div>No tasks yet. Admin rotates on Friday.</div>
        </div>
      ) : data.assignments.map((a,i) => {
        const t=a.tasks, m=a.members
        if(!t||!m) return null
        return (
          <div key={a.id} style={{background:'#0d0e1a',border:`1px solid ${a.done?'rgba(125,249,170,.3)':'rgba(125,249,170,.09)'}`,borderRadius:13,padding:13,marginBottom:10,position:'relative',overflow:'hidden',transition:'all .2s'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${t.color||'#7DF9AA'},transparent)`,opacity:.5}}/>
            {a.done&&<div style={{position:'absolute',top:11,right:11,width:22,height:22,borderRadius:'50%',background:'#7DF9AA',color:'#000',fontSize:10,fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 10px rgba(125,249,170,.6)'}}>✓</div>}
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:9}}>
              <span style={{fontSize:28,lineHeight:1}}>{t.emoji}</span>
              <div>
                <div style={{fontFamily:'Orbitron,monospace',fontSize:13,fontWeight:700,color:t.color||'#E8F0FF',letterSpacing:.4}}>{t.name}</div>
                <div style={{fontSize:11,color:'#8890b0',marginTop:1}}>{a.done?'Completed':'In progress'}</div>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,.04)',borderRadius:8,padding:'7px 9px',marginBottom:8}}>
              <Avatar emoji={m.avatar} color={m.color} size={26}/>
              <span style={{fontSize:13,fontWeight:700,flex:1}}>{m.name}</span>
              <span style={{fontSize:10,color:'#4a5070',fontFamily:'monospace'}}>…{m.phone?.slice(-4)}</span>
            </div>
            <div style={{fontSize:12,color:'#8890b0',lineHeight:1.5,marginBottom:8}}>{t.description}</div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
              <StatusBadge done={a.done}/>
              {a.proof_url && <a href={a.proof_url} target="_blank" rel="noreferrer" style={{fontSize:11,color:'#7DF9AA',fontWeight:700,textDecoration:'none'}}>📸 View Proof</a>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Dashboard() { return <ToastProvider><DashContent/></ToastProvider> }
