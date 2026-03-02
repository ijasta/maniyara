import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { getMembers, getCurrentAssignments, getSettings } from '../lib/supabase'
import { Avatar, SecHead, ToastProvider, useToast } from '../components/UI'

function DashContent() {
  const { profile } = useAuth()
  const toast = useToast()
  const [members,  setMembers]  = useState([])
  const [assigns,  setAssigns]  = useState([])
  const [settings, setSt]       = useState(null)
  const [week,     setWeek]     = useState(1)
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [m, r, s] = await Promise.all([getMembers(), getCurrentAssignments(), getSettings()])
      setMembers(m); setAssigns(r.assignments); setWeek(r.week); setSt(s)
    } catch(e) { toast('Failed to load: '+e.message,'error') }
    finally { setLoading(false) }
  }

  if (loading) return <div style={{color:'#8890b0',padding:40,textAlign:'center'}}>Loading...</div>

  const doneCount    = assigns.filter(a=>a.done).length
  const pendingCount = assigns.filter(a=>!a.done).length

  const filteredMembers = members.filter(m => {
    const a = assigns.find(x=>x.member_id===m.id||x.members?.id===m.id)
    if (filter==='done')    return a?.done === true
    if (filter==='pending') return !a?.done
    return true
  })

  return (
    <div className="page-anim">

      {/* HEADER */}
      <div style={{marginBottom:14}}>
        <div style={{fontFamily:'Orbitron,monospace',fontWeight:900,fontSize:'clamp(20px,5.5vw,28px)',letterSpacing:1,lineHeight:1.2}}>
          WEEK <span style={{background:'linear-gradient(135deg,#7DF9AA,#00ffcc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',filter:'drop-shadow(0 0 12px rgba(125,249,170,.5))'}}>
            {week}
          </span> DUTIES
        </div>
        <div style={{fontSize:12,color:'#8890b0',marginTop:3}}>{new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</div>
      </div>

      {/* HOUSE BANNER */}
      <div style={{background:'linear-gradient(135deg,#0a1510,#0a0c1a)',border:'1px solid rgba(125,249,170,.18)',borderRadius:13,padding:14,marginBottom:13,display:'flex',alignItems:'center',gap:12}}>
        <div style={{fontSize:38,flexShrink:0}}>🏠</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:16,fontWeight:900,letterSpacing:1}}>{settings?.house_name||'Maniyara'}</div>
          <div style={{fontSize:12,color:'#8890b0',marginTop:2}}>Week {week} · Welcome, {profile?.name}!</div>
        </div>
        <div style={{textAlign:'right',flexShrink:0}}>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:11,color:'#4a5070',marginBottom:2}}>CREW</div>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:20,fontWeight:900,color:'#7DF9AA'}}>{members.length}</div>
        </div>
      </div>

      {/* STATS */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
        <div style={{background:'rgba(125,249,170,.07)',border:'1px solid rgba(125,249,170,.25)',borderRadius:13,padding:14,textAlign:'center'}}>
          <div style={{fontSize:28,marginBottom:3}}>✅</div>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:28,fontWeight:900,color:'#7DF9AA'}}>{doneCount}</div>
          <div style={{fontSize:10,color:'#7DF9AA',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',marginTop:4}}>Completed</div>
        </div>
        <div style={{background:'rgba(255,107,107,.06)',border:'1px solid rgba(255,107,107,.22)',borderRadius:13,padding:14,textAlign:'center'}}>
          <div style={{fontSize:28,marginBottom:3}}>⏳</div>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:28,fontWeight:900,color:'#FF6B6B'}}>{pendingCount}</div>
          <div style={{fontSize:10,color:'#FF6B6B',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',marginTop:4}}>Pending</div>
        </div>
      </div>

      {/* THE CREW */}
      <div style={{fontFamily:'Orbitron,monospace',fontWeight:900,fontSize:'clamp(16px,4vw,20px)',letterSpacing:1,marginBottom:12}}>
        THE <span style={{background:'linear-gradient(135deg,#7DF9AA,#00ffcc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>CREW</span>
        <span style={{fontSize:12,fontFamily:'Rajdhani,sans-serif',color:'#4a5070',marginLeft:8,fontWeight:400}}>{members.length} members</span>
      </div>

      {/* Filter tabs */}
      <div style={{display:'flex',gap:4,background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:5,marginBottom:12}}>
        {[['all','All'],['done','✅ Done'],['pending','⏳ Pending']].map(([id,lb])=>(
          <button key={id} onClick={()=>setFilter(id)}
            style={{flex:1,padding:'8px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',
              border:'none',fontFamily:'Rajdhani,sans-serif',
              background:filter===id?'#7DF9AA':'transparent',
              color:filter===id?'#070810':'#8890b0',transition:'all .15s'}}>
            {lb}
          </button>
        ))}
      </div>

      {/* Member cards */}
      {filteredMembers.length===0 ? (
        <div style={{textAlign:'center',padding:40,color:'#4a5070'}}>
          <div style={{fontSize:36,marginBottom:8}}>🎉</div>
          <div>{filter==='pending'?'Everyone completed their task!':'No members found.'}</div>
        </div>
      ) : filteredMembers.map(m => {
        const a = assigns.find(x=>x.member_id===m.id||x.members?.id===m.id)
        const t = a?.tasks
        return (
          <div key={m.id} style={{background:'#0d0e1a',border:`1px solid ${a?.done?'rgba(125,249,170,.25)':'rgba(255,107,107,.18)'}`,borderRadius:13,padding:13,marginBottom:10,position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${a?.done?'#7DF9AA':'#FF6B6B'},transparent)`,opacity:.4}}/>
            <div style={{display:'flex',alignItems:'center',gap:11}}>
              <Avatar emoji={m.avatar} color={m.color} size={44}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:15,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.name}</div>
                {m.username && <div style={{fontSize:11,color:'#4a5070',marginTop:1}}>@{m.username}</div>}
                {t ? (
                  <div style={{fontSize:12,color:'#8890b0',marginTop:3,display:'flex',alignItems:'center',gap:5}}>
                    <span>{t.emoji}</span>
                    <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.name}</span>
                  </div>
                ) : (
                  <div style={{fontSize:12,color:'#4a5070',marginTop:3}}>No task assigned</div>
                )}
              </div>
              <div style={{flexShrink:0,padding:'8px 14px',borderRadius:99,fontWeight:900,fontSize:13,
                background:a?.done?'rgba(125,249,170,.12)':'rgba(255,107,107,.1)',
                border:`1px solid ${a?.done?'rgba(125,249,170,.3)':'rgba(255,107,107,.25)'}`,
                color:a?.done?'#7DF9AA':'#FF6B6B',
                boxShadow:a?.done?'0 0 12px rgba(125,249,170,.15)':'none'}}>
                {a?.done ? '✅ Done' : '❌ Pending'}
              </div>
            </div>
            {a?.done && a?.done_at && (
              <div style={{marginTop:9,fontSize:11,color:'#4a5070',paddingLeft:55}}>
                Completed {new Date(a.done_at).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
              </div>
            )}
            {a?.proof_url && (
              <div style={{marginTop:6,paddingLeft:55}}>
                <a href={a.proof_url} target="_blank" rel="noreferrer"
                  style={{fontSize:11,color:'#7DF9AA',fontWeight:700,textDecoration:'none'}}>📸 View Proof Photo</a>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function Dashboard() { return <ToastProvider><DashContent/></ToastProvider> }
