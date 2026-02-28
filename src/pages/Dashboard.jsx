import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { getCurrentAssignments, getSettings } from '../lib/supabase'
import { Avatar, StatusBadge, SecHead, ToastProvider, useToast } from '../components/UI'

function DashContent() {
  const { profile } = useAuth()
  const toast = useToast()
  const [data, setData]   = useState({ assignments:[], week:1 })
  const [settings, setSt] = useState(null)
  const [loading, setLd]  = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [r, s] = await Promise.all([getCurrentAssignments(), getSettings()])
      setData(r); setSt(s)
    } catch(e) { toast('Failed to load: '+e.message,'error') }
    finally { setLd(false) }
  }

  const done    = data.assignments.filter(a=>a.done).length
  const pending = data.assignments.filter(a=>!a.done).length
  const tot     = data.assignments.length

  if (loading) return <div style={{color:'#8890b0',padding:40,textAlign:'center'}}>Loading...</div>

  return (
    <div className="page-anim">
      {/* Title */}
      <div style={{marginBottom:16}}>
        <div style={{fontFamily:'Orbitron,monospace',fontWeight:900,fontSize:'clamp(20px,5.5vw,28px)',letterSpacing:1,lineHeight:1.2}}>
          WEEK <span style={{background:'linear-gradient(135deg,#7DF9AA,#00ffcc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',filter:'drop-shadow(0 0 12px rgba(125,249,170,.5))'}}>
            {data.week}
          </span> DUTIES
        </div>
        <div style={{fontSize:12,color:'#8890b0',marginTop:3}}>{new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</div>
      </div>

      {/* Hero banner */}
      <div style={{background:'linear-gradient(135deg,#0a1510,#0a0c1a)',border:'1px solid rgba(125,249,170,.18)',borderRadius:13,padding:14,marginBottom:13,display:'flex',alignItems:'center',gap:12}}>
        <div style={{fontSize:38,flexShrink:0}}>🏠</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:16,fontWeight:900,letterSpacing:1}}>{settings?.house_name||'Maniyara'}</div>
          <div style={{fontSize:12,color:'#8890b0',marginTop:2}}>Week {data.week} · Welcome, {profile?.name}!</div>
        </div>
      </div>

      {/* Done / Pending count */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:18}}>
        <div style={{background:'rgba(125,249,170,.07)',border:'1px solid rgba(125,249,170,.25)',borderRadius:13,padding:16,textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:4}}>✅</div>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:32,fontWeight:900,color:'#7DF9AA',lineHeight:1}}>{done}</div>
          <div style={{fontSize:11,color:'#7DF9AA',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',marginTop:5}}>Completed</div>
        </div>
        <div style={{background:'rgba(255,217,61,.06)',border:'1px solid rgba(255,217,61,.22)',borderRadius:13,padding:16,textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:4}}>⏳</div>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:32,fontWeight:900,color:'#FFD93D',lineHeight:1}}>{pending}</div>
          <div style={{fontSize:11,color:'#FFD93D',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',marginTop:5}}>Pending</div>
        </div>
      </div>

      {/* Task cards */}
      <SecHead title="This Week's Assignments" badge={`${tot} tasks`}/>
      {data.assignments.length === 0 ? (
        <div style={{textAlign:'center',padding:40,color:'#4a5070'}}>
          <div style={{fontSize:40,marginBottom:10}}>📋</div>
          <div>No tasks yet. Admin will assign tasks.</div>
        </div>
      ) : data.assignments.map((a) => {
        const t=a.tasks, m=a.members
        if(!t||!m) return null
        return (
          <div key={a.id} style={{background:'#0d0e1a',border:`1px solid ${a.done?'rgba(125,249,170,.3)':'rgba(255,217,61,.15)'}`,borderRadius:13,padding:13,marginBottom:10,position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${a.done?'#7DF9AA':'#FFD93D'},transparent)`,opacity:.5}}/>

            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              <span style={{fontSize:28,lineHeight:1,flexShrink:0}}>{t.emoji}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:'Orbitron,monospace',fontSize:13,fontWeight:700,color:t.color||'#E8F0FF',letterSpacing:.4}}>{t.name}</div>
                <div style={{fontSize:11,color:'#8890b0',marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.description}</div>
              </div>
              {/* Big status badge */}
              <div style={{flexShrink:0,padding:'6px 12px',borderRadius:99,fontWeight:900,fontSize:12,letterSpacing:'.06em',
                background:a.done?'rgba(125,249,170,.12)':'rgba(255,217,61,.1)',
                border:`1px solid ${a.done?'rgba(125,249,170,.3)':'rgba(255,217,61,.25)'}`,
                color:a.done?'#7DF9AA':'#FFD93D'}}>
                {a.done ? '✅ DONE' : '⏳ PENDING'}
              </div>
            </div>

            {/* Who */}
            <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,.04)',borderRadius:8,padding:'8px 10px'}}>
              <Avatar emoji={m.avatar} color={m.color} size={26}/>
              <span style={{fontSize:13,fontWeight:700,flex:1}}>{m.name}</span>
              {a.done && a.done_at && (
                <span style={{fontSize:10,color:'#4a5070'}}>
                  {new Date(a.done_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
                </span>
              )}
              {a.proof_url && (
                <a href={a.proof_url} target="_blank" rel="noreferrer"
                  style={{fontSize:11,color:'#7DF9AA',fontWeight:700,textDecoration:'none',flexShrink:0}}>
                  📸 Proof
                </a>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Dashboard() { return <ToastProvider><DashContent/></ToastProvider> }
