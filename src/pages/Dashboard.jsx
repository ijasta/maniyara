import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { getMembers, getCurrentAssignments, getSettings } from '../lib/supabase'
import { Avatar, ToastProvider, useToast } from '../components/UI'

function DashContent() {
  const { profile } = useAuth()
  const toast = useToast()
  const [members,    setMembers]  = useState([])
  const [assigns,    setAssigns]  = useState([])
  const [settings,   setSt]       = useState(null)
  const [week,       setWeek]     = useState(1)
  const [loading,    setLoading]  = useState(true)
  const [filter,     setFilter]   = useState('all')
  const [photoModal, setPhotoModal] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [m, r, s] = await Promise.all([getMembers(), getCurrentAssignments(), getSettings()])
      setMembers(m); setAssigns(r.assignments); setWeek(r.week); setSt(s)
    } catch(e) { toast('Failed to load','error') }
    finally { setLoading(false) }
  }

  if (loading) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:80,gap:14}}>
      <div style={{width:44,height:44,borderRadius:'50%',border:'3px solid rgba(125,249,170,.12)',borderTopColor:'#7DF9AA',animation:'spin 1s linear infinite'}}/>
      <div style={{fontSize:11,color:'#4a5070',fontWeight:700,letterSpacing:'.12em'}}>LOADING...</div>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  )

  const approved      = members.filter(m => m.status === 'approved')
  const doneCount     = assigns.filter(a => a.done).length
  const pendingCount  = assigns.filter(a => !a.done).length
  const totalAssigned = assigns.length
  const pct           = totalAssigned > 0 ? Math.round((doneCount / totalAssigned) * 100) : 0
  const ringColor     = pct === 100 ? '#7DF9AA' : pct > 50 ? '#FFD93D' : '#FF6B6B'
  const circ          = 2 * Math.PI * 26
  const hour          = new Date().getHours()
  const greeting      = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const today         = new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })

  const filteredMembers = approved.filter(m => {
    const a = assigns.find(x => x.member_id===m.id || x.members?.id===m.id)
    if (filter==='done')    return a?.done === true
    if (filter==='pending') return !a?.done
    return true
  })

  const openPhoto = (proof_url) => {
    const proxyBase = import.meta.env.VITE_SUPABASE_PROXY_URL
    const supaBase  = import.meta.env.VITE_SUPABASE_URL
    let url = proof_url
    const match = url.match(/\/object\/(?:public|sign(?:ed)?(?:\/v\d)?)\/(.+?)(\?|$)/)
    if (match) url = `${proxyBase || supaBase}/storage/v1/object/public/${match[1]}`
    else if (proxyBase) url = url.replace(supaBase, proxyBase)
    setPhotoModal(url)
  }

  return (
    <div className="page-anim" style={{paddingBottom:8}}>
      <style>{"@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}} @keyframes spin{to{transform:rotate(360deg)}}"}</style>

      {/* HEADER */}
      <div style={{marginBottom:20}}>
        <div style={{fontSize:11,color:'#5a6080',fontWeight:700,letterSpacing:'.14em',textTransform:'uppercase',marginBottom:5}}>{greeting}, {profile?.name?.split(' ')[0]} 👋</div>
        <div style={{fontFamily:'Orbitron,monospace',fontWeight:900,fontSize:'clamp(22px,6vw,30px)',letterSpacing:1,lineHeight:1.1}}>
          WEEK{' '}<span style={{background:'linear-gradient(135deg,#7DF9AA,#00ffcc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',filter:'drop-shadow(0 0 16px rgba(125,249,170,.45))'}}>{week}</span>{' '}DUTIES
        </div>
        <div style={{fontSize:11,color:'#5a6080',marginTop:6,display:'flex',alignItems:'center',gap:7}}>
          <span style={{width:6,height:6,borderRadius:'50%',background:'#7DF9AA',display:'inline-block',boxShadow:'0 0 8px rgba(125,249,170,.9)',animation:'pulse 2s ease-in-out infinite'}}/>
          {today}
        </div>
      </div>

      {/* HOUSE HERO CARD */}
      <div style={{background:'linear-gradient(145deg,#0c1220,#090b18)',border:'1px solid rgba(125,249,170,.14)',borderRadius:20,padding:'18px 20px',marginBottom:14,position:'relative',overflow:'hidden',boxShadow:'0 8px 40px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.04)'}}>
        <div style={{position:'absolute',top:-40,right:-20,width:140,height:140,borderRadius:'50%',background:'#7DF9AA',opacity:.05,filter:'blur(40px)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:-30,left:0,width:100,height:100,borderRadius:'50%',background:'#4D96FF',opacity:.04,filter:'blur(28px)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',top:0,left:'10%',right:'10%',height:1,background:'linear-gradient(90deg,transparent,rgba(125,249,170,.35),transparent)'}}/>
        <div style={{display:'flex',alignItems:'center',gap:14,position:'relative'}}>
          <div style={{width:56,height:56,borderRadius:17,flexShrink:0,background:'linear-gradient(135deg,rgba(125,249,170,.14),rgba(125,249,170,.04))',border:'1px solid rgba(125,249,170,.18)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,boxShadow:'0 4px 20px rgba(125,249,170,.1)'}}>🏠</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:19,fontWeight:900,letterSpacing:.5,color:'#E8F0FF',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{settings?.house_name || 'MANIYARA'}</div>
            <div style={{display:'flex',alignItems:'center',gap:7,marginTop:5}}>
              <span style={{background:'rgba(125,249,170,.08)',border:'1px solid rgba(125,249,170,.16)',borderRadius:99,padding:'2px 9px',color:'#7DF9AA',fontWeight:700,fontSize:9,letterSpacing:'.08em'}}>WEEK {week}</span>
              <span style={{fontSize:11,color:'#5a6080'}}>House Management</span>
            </div>
          </div>
          <div style={{textAlign:'center',flexShrink:0,background:'rgba(125,249,170,.05)',border:'1px solid rgba(125,249,170,.1)',borderRadius:12,padding:'10px 14px'}}>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:24,fontWeight:900,color:'#7DF9AA',lineHeight:1,textShadow:'0 0 20px rgba(125,249,170,.4)'}}>{approved.length}</div>
            <div style={{fontSize:8,color:'#4a5070',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',marginTop:3}}>Members</div>
          </div>
        </div>
      </div>

      {/* STATS: DONUT + CARDS */}
      <div style={{display:'grid',gridTemplateColumns:'104px 1fr',gap:10,marginBottom:14}}>
        <div style={{background:'#0c0e1c',border:'1px solid rgba(255,255,255,.06)',borderRadius:18,padding:'14px 10px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6}}>
          <div style={{position:'relative',width:68,height:68}}>
            <svg width="68" height="68" viewBox="0 0 68 68" style={{transform:'rotate(-90deg)'}}>
              <circle cx="34" cy="34" r="26" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="7"/>
              <circle cx="34" cy="34" r="26" fill="none" stroke={ringColor} strokeWidth="7" strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={circ*(1-pct/100)}
                style={{transition:'stroke-dashoffset .7s cubic-bezier(.4,0,.2,1)',filter:`drop-shadow(0 0 5px ${ringColor}88)`}}/>
            </svg>
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{fontFamily:'Orbitron,monospace',fontSize:13,fontWeight:900,color:ringColor,lineHeight:1}}>{pct}%</div>
            </div>
          </div>
          <div style={{fontSize:8,color:'#4a5070',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',textAlign:'center'}}>Complete</div>
        </div>
        <div style={{display:'grid',gridTemplateRows:'1fr 1fr',gap:8}}>
          <div style={{background:'linear-gradient(135deg,rgba(125,249,170,.07),rgba(125,249,170,.02))',border:'1px solid rgba(125,249,170,.16)',borderRadius:14,padding:'11px 16px',display:'flex',alignItems:'center',gap:12}}>
            <div style={{fontSize:22}}>✅</div>
            <div>
              <div style={{fontFamily:'Orbitron,monospace',fontSize:24,fontWeight:900,color:'#7DF9AA',lineHeight:1}}>{doneCount}</div>
              <div style={{fontSize:8,color:'#7DF9AA',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',marginTop:3,opacity:.75}}>Completed</div>
            </div>
          </div>
          <div style={{background:'linear-gradient(135deg,rgba(255,107,107,.07),rgba(255,107,107,.02))',border:'1px solid rgba(255,107,107,.16)',borderRadius:14,padding:'11px 16px',display:'flex',alignItems:'center',gap:12}}>
            <div style={{fontSize:22}}>⏳</div>
            <div>
              <div style={{fontFamily:'Orbitron,monospace',fontSize:24,fontWeight:900,color:'#FF6B6B',lineHeight:1}}>{pendingCount}</div>
              <div style={{fontSize:8,color:'#FF6B6B',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',marginTop:3,opacity:.75}}>Pending</div>
            </div>
          </div>
        </div>
      </div>

      {/* PROGRESS BAR */}
      {totalAssigned > 0 && (
        <div style={{background:'#0c0e1c',border:'1px solid rgba(255,255,255,.05)',borderRadius:14,padding:'13px 16px',marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:9}}>
            <div style={{fontSize:10,fontWeight:700,color:'#5a6080',textTransform:'uppercase',letterSpacing:'.1em'}}>Weekly Progress</div>
            <div style={{fontSize:11,fontWeight:700,color:'#E8F0FF'}}>{doneCount} of {totalAssigned} tasks</div>
          </div>
          <div style={{height:9,background:'rgba(255,255,255,.05)',borderRadius:99,overflow:'hidden'}}>
            <div style={{height:'100%',borderRadius:99,transition:'width .7s cubic-bezier(.4,0,.2,1)',width:`${pct}%`,
              background:pct===100?'linear-gradient(90deg,#7DF9AA,#00D4AA)':pct>50?'linear-gradient(90deg,#FFD93D,#7DF9AA)':'linear-gradient(90deg,#FF6B6B,#FFD93D)',
              boxShadow:pct===100?'0 0 12px rgba(125,249,170,.5)':pct>50?'0 0 8px rgba(255,217,61,.4)':'none'}}/>
          </div>
          {pct===100
            ? <div style={{fontSize:11,color:'#7DF9AA',fontWeight:700,marginTop:7}}>🎉 All tasks completed this week!</div>
            : <div style={{fontSize:10,color:'#4a5070',marginTop:6}}>{pct}% done · {pendingCount} still pending</div>}
        </div>
      )}

      {/* CREW HEADER + FILTER */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
        <div style={{fontFamily:'Orbitron,monospace',fontWeight:900,fontSize:'clamp(14px,4vw,18px)',letterSpacing:1}}>
          THE <span style={{background:'linear-gradient(135deg,#7DF9AA,#00ffcc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>CREW</span>
        </div>
        <div style={{fontSize:10,color:'#4a5070',fontWeight:600}}>{filteredMembers.length} shown</div>
      </div>
      <div style={{display:'flex',background:'#0c0e1c',border:'1px solid rgba(255,255,255,.06)',borderRadius:14,padding:4,marginBottom:14}}>
        {[{id:'all',label:'All',count:approved.length},{id:'done',label:'✅ Done',count:doneCount},{id:'pending',label:'⏳ Pending',count:pendingCount}].map(f=>(
          <button key={f.id} onClick={()=>setFilter(f.id)}
            style={{flex:1,padding:'9px 4px',borderRadius:10,fontSize:12,fontWeight:700,cursor:'pointer',border:'none',fontFamily:'Rajdhani,sans-serif',transition:'all .18s',
              background:filter===f.id?'#7DF9AA':'transparent',color:filter===f.id?'#070810':'#5a6080',
              boxShadow:filter===f.id?'0 2px 12px rgba(125,249,170,.28)':'none'}}>
            {f.label}
            <span style={{marginLeft:5,fontSize:10,fontWeight:900,background:filter===f.id?'rgba(0,0,0,.12)':'rgba(255,255,255,.06)',padding:'1px 6px',borderRadius:99}}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* MEMBER CARDS */}
      {filteredMembers.length === 0 ? (
        <div style={{background:'#0c0e1c',border:'1px solid rgba(255,255,255,.05)',borderRadius:18,padding:'52px 20px',textAlign:'center'}}>
          <div style={{fontSize:48,marginBottom:12}}>🎉</div>
          <div style={{fontWeight:800,fontSize:15,color:'#E8F0FF',marginBottom:6}}>{filter==='pending'?'All tasks done!':'No members here'}</div>
          <div style={{fontSize:12,color:'#4a5070'}}>{filter==='pending'?'Everyone completed their duties 💪':'Try a different filter'}</div>
        </div>
      ) : filteredMembers.map(m => {
        const a      = assigns.find(x => x.member_id===m.id || x.members?.id===m.id)
        const t      = a?.tasks
        const isDone = a?.done
        const ac     = isDone ? '#7DF9AA' : '#FF6B6B'
        return (
          <div key={m.id} style={{background:'#0c0e1c',border:`1px solid ${isDone?'rgba(125,249,170,.15)':'rgba(255,107,107,.12)'}`,borderRadius:17,padding:'14px 15px',marginBottom:9,position:'relative',overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.3)'}}>
            <div style={{position:'absolute',top:0,left:'8%',right:'8%',height:1.5,borderRadius:99,background:`linear-gradient(90deg,transparent,${ac}88,transparent)`}}/>
            <div style={{position:'absolute',left:0,top:'18%',bottom:'18%',width:3,borderRadius:'0 3px 3px 0',background:`linear-gradient(180deg,${ac},${ac}33)`}}/>
            <div style={{display:'flex',alignItems:'center',gap:12,paddingLeft:7}}>
              <div style={{position:'relative',flexShrink:0}}>
                <Avatar emoji={m.avatar} color={m.color} size={46}/>
                {isDone && <div style={{position:'absolute',bottom:-2,right:-2,width:17,height:17,borderRadius:'50%',background:'linear-gradient(135deg,#7DF9AA,#00D4AA)',border:'2px solid #0c0e1c',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:900,color:'#070810',boxShadow:'0 0 8px rgba(125,249,170,.5)'}}>✓</div>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:4}}>
                  <div style={{fontSize:14,fontWeight:800,color:'#E8F0FF',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.name}</div>
                  {m.is_admin && <span style={{fontSize:8,fontWeight:700,padding:'2px 7px',borderRadius:99,flexShrink:0,background:'rgba(125,249,170,.1)',border:'1px solid rgba(125,249,170,.2)',color:'#7DF9AA',textTransform:'uppercase',letterSpacing:'.07em'}}>Admin</span>}
                </div>
                {t ? (
                  <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.05)',borderRadius:99,padding:'3px 10px 3px 6px',maxWidth:'100%'}}>
                    <span style={{fontSize:13}}>{t.emoji}</span>
                    <span style={{fontSize:11,color:'#8890b0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.name}</span>
                  </div>
                ) : <div style={{fontSize:11,color:'#3a4060',fontStyle:'italic'}}>No task assigned</div>}
              </div>
              <div style={{flexShrink:0,padding:'7px 12px',borderRadius:99,fontWeight:900,fontSize:11,background:isDone?'rgba(125,249,170,.08)':'rgba(255,107,107,.08)',border:`1px solid ${isDone?'rgba(125,249,170,.22)':'rgba(255,107,107,.18)'}`,color:ac,boxShadow:isDone?'0 0 16px rgba(125,249,170,.1)':'none'}}>
                {isDone ? '✅ Done' : '⏳ Pending'}
              </div>
            </div>
            {isDone && a?.done_at && (
              <div style={{marginTop:10,paddingLeft:65}}>
                <div style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:10,color:'#4a5070',background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.05)',borderRadius:99,padding:'3px 10px'}}>
                  🕐 {new Date(a.done_at).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})} · {new Date(a.done_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                </div>
              </div>
            )}
            {a?.proof_url && (
              <div style={{marginTop:8,paddingLeft:65}}>
                <button onClick={()=>openPhoto(a.proof_url)}
                  style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:11,color:'#7DF9AA',fontWeight:700,background:'rgba(125,249,170,.06)',border:'1px solid rgba(125,249,170,.16)',borderRadius:99,padding:'5px 13px',cursor:'pointer',fontFamily:'inherit'}}>
                  📸 View Proof
                </button>
              </div>
            )}
          </div>
        )
      })}
      <PhotoModal url={photoModal} onClose={()=>setPhotoModal(null)}/>
    </div>
  )
}

function PhotoModal({ url, onClose }) {
  if (!url) return null
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,.93)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,backdropFilter:'blur(10px)'}}>
      <div onClick={e=>e.stopPropagation()} style={{position:'relative',maxWidth:'100%',maxHeight:'90vh'}}>
        <img src={url} alt="Proof" style={{maxWidth:'100%',maxHeight:'85vh',borderRadius:14,objectFit:'contain',display:'block',boxShadow:'0 0 60px rgba(0,0,0,.9)'}} onError={onClose}/>
        <button onClick={onClose} style={{position:'absolute',top:-14,right:-14,width:34,height:34,borderRadius:'50%',background:'#FF6B6B',border:'2px solid rgba(0,0,0,.4)',color:'#fff',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,boxShadow:'0 4px 14px rgba(255,107,107,.5)'}}>✕</button>
        <a href={url} download="proof.jpg" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:7,marginTop:12,color:'#7DF9AA',fontSize:13,fontWeight:700,textDecoration:'none',background:'rgba(125,249,170,.08)',border:'1px solid rgba(125,249,170,.2)',borderRadius:99,padding:'9px 22px'}}>⬇️ Save Photo</a>
      </div>
    </div>
  )
}

export default function Dashboard() { return <ToastProvider><DashContent/></ToastProvider> }
