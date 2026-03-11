import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { getMembers, getCurrentAssignments, getSettings, supabase } from '../lib/supabase'
import { Avatar, ToastProvider, useToast } from '../components/UI'

function DashContent() {
  const { profile } = useAuth()
  const toast = useToast()
  const [members,  setMembers]  = useState([])
  const [assigns,  setAssigns]  = useState([])
  const [settings, setSt]       = useState(null)
  const [week,     setWeek]     = useState(1)
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')
  const [photoModal, setPhotoModal] = useState(null)
  const [complaints, setComplaints] = useState([])
  const [cLoading,   setCL]         = useState(false)
  const [showSheet,  setSheet]      = useState(false)
  const [cMsg,       setCMsg]       = useState('')
  const [cSubmit,    setCSub]       = useState(false)
  const [showAll,    setShowAll]    = useState(false)
  const [cSettings,  setCSt]        = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [m, r, s] = await Promise.all([getMembers(), getCurrentAssignments(), getSettings()])
      setMembers(m); setAssigns(r.assignments); setWeek(r.week); setSt(s)
      loadComplaints()
    } catch(e) { toast('Failed to load: '+e.message,'error') }
    finally { setLoading(false) }
  }

  async function loadComplaints() {
    try {
      const [{ data: c }, { data: cs }] = await Promise.all([
        supabase.from('complaints').select('*').order('created_at', { ascending: false }),
        supabase.from('settings').select('complaints_reveal_identity').eq('id',1).single()
      ])
      const all = c || []
      setComplaints(all)
      setCSt(cs)
    } catch(_) {}
  }

  const submitComplaint = async () => {
    if (!cMsg.trim() || cMsg.trim().length < 5) { toast('Write more detail','warn'); return }
    setCSub(true)
    try {
      const { data: { user: u } } = await supabase.auth.getUser()
      const { error } = await supabase.from('complaints').insert([{ message: cMsg.trim(), member_id: u?.id }])
      if (error) throw error
      toast('Posted anonymously ✅')
      setCMsg(''); setSheet(false); loadComplaints()
    } catch(e) { toast('Failed: '+e.message,'error') }
    finally { setCSub(false) }
  }

  const deleteComplaint = async (id) => {
    if (!confirm('Delete this complaint? This cannot be undone.')) return
    try { await supabase.from('complaints').delete().eq('id', id); toast('Deleted','warn'); loadComplaints() }
    catch(_) { toast('Failed','error') }
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
                <button onClick={()=>{
                    const proxyBase = import.meta.env.VITE_SUPABASE_PROXY_URL
                    const supaBase  = import.meta.env.VITE_SUPABASE_URL
                    let photoUrl = a.proof_url
                    const match = photoUrl.match(/\/object\/(?:public|sign(?:ed)?(?:\/v\d)?)\/(.+?)(\?|$)/)
                    if (match) {
                      const base = proxyBase || supaBase
                      photoUrl = `${base}/storage/v1/object/public/${match[1]}`
                    } else if (proxyBase) {
                      photoUrl = photoUrl.replace(supaBase, proxyBase)
                    }
                    setPhotoModal(photoUrl)
                  }}
                  style={{fontSize:11,color:'#7DF9AA',fontWeight:700,background:'none',border:'none',cursor:'pointer',padding:0,textDecoration:'underline',fontFamily:'inherit'}}>
                  📸 View Proof Photo
                </button>
              </div>
            )}
          </div>
        )
      })}
      {/* ── COMPLAINTS BOX ── */}
      <div style={{marginTop:20,marginBottom:4}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontFamily:'Orbitron,monospace',fontWeight:900,fontSize:'clamp(15px,4vw,18px)',letterSpacing:.5}}>
              🕵️ <span style={{background:'linear-gradient(135deg,#C084FC,#818CF8)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>COMPLAINTS</span>
            </span>
            {complaints.length > 0 && (
              <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:99,
                background:'rgba(192,132,252,.12)',border:'1px solid rgba(192,132,252,.25)',color:'#C084FC'}}>
                {complaints.length} open
              </span>
            )}
          </div>
          <button onClick={()=>setSheet(s=>!s)}
            style={{padding:'8px 16px',borderRadius:99,fontFamily:'Rajdhani,sans-serif',fontWeight:800,fontSize:12,
              cursor:'pointer',letterSpacing:'.06em',border:'1px solid rgba(192,132,252,.3)',
              background:'rgba(192,132,252,.08)',color:'#C084FC',transition:'all .15s'}}>
            + Post
          </button>
        </div>

        {/* Post sheet inline */}
        {showSheet && (
          <div style={{background:'#0c0e1c',border:'1px solid rgba(192,132,252,.2)',borderRadius:16,padding:'14px 16px',marginBottom:12,animation:'fadeIn .2s ease'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
              <span style={{fontSize:16}}>🔒</span>
              <span style={{fontSize:12,color:'#8a70a0'}}>You appear as <strong style={{color:'#C084FC'}}>Anonymous</strong> to all members</span>
            </div>
            <textarea
              value={cMsg}
              onChange={e=>setCMsg(e.target.value.slice(0,400))}
              placeholder="Describe the issue clearly... What? When? Where?"
              rows={4}
              style={{width:'100%',resize:'none',fontSize:13,lineHeight:1.6,borderRadius:11,
                padding:'12px',boxSizing:'border-box',fontFamily:'inherit',
                background:'#111320',border:'1px solid rgba(192,132,252,.15)',
                color:'#E8F0FF',outline:'none',marginBottom:8}}
            />
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <span style={{fontSize:10,color:'#4a5070',flex:1}}>{cMsg.length}/400</span>
              <button onClick={()=>{setSheet(false);setCMsg('')}}
                style={{padding:'8px 14px',borderRadius:9,fontSize:12,fontWeight:700,cursor:'pointer',
                  border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.03)',color:'#6a7090',fontFamily:'Rajdhani,sans-serif'}}>
                Cancel
              </button>
              <button onClick={submitComplaint} disabled={cSubmit||!cMsg.trim()}
                style={{padding:'8px 18px',borderRadius:9,fontSize:13,fontWeight:800,cursor:'pointer',border:'none',
                  fontFamily:'Rajdhani,sans-serif',letterSpacing:'.05em',
                  background:cSubmit||!cMsg.trim()?'#1a2030':'linear-gradient(135deg,#C084FC,#818CF8)',
                  color:'#fff',opacity:cSubmit||!cMsg.trim()?0.5:1}}>
                {cSubmit ? '⏳' : '🕵️ Post'}
              </button>
            </div>
          </div>
        )}

        {/* Complaints list */}
        {complaints.length === 0 ? (
          <div style={{background:'#0c0e1c',border:'1px solid rgba(192,132,252,.07)',borderRadius:14,
            padding:'28px 20px',textAlign:'center'}}>
            <div style={{fontSize:32,marginBottom:8}}>✨</div>
            <div style={{fontSize:13,color:'#4a5070',fontWeight:600}}>No open complaints</div>
            <div style={{fontSize:11,color:'#3a4060',marginTop:4}}>Everything is good in the house!</div>
          </div>
        ) : (
          <>
            {(showAll ? complaints : complaints.slice(0,3)).map(c => {
              const sender = cSettings?.complaints_reveal_identity
                ? members.find(m=>m.id===c.member_id)
                : null
              return (
                <div key={c.id} style={{background:'#0c0e1c',border:'1px solid rgba(192,132,252,.1)',
                  borderRadius:14,padding:'13px 15px',marginBottom:8,position:'relative',overflow:'hidden'}}>
                  <div style={{position:'absolute',left:0,top:'15%',bottom:'15%',width:3,borderRadius:'0 3px 3px 0',
                    background:'linear-gradient(180deg,#C084FC,#818CF8)'}}/>
                  <div style={{paddingLeft:10}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                      <div style={{width:28,height:28,borderRadius:9,background:'rgba(192,132,252,.1)',
                        border:'1px solid rgba(192,132,252,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>
                        🕵️
                      </div>
                      <div style={{flex:1}}>
                        {sender ? (
                          <span style={{fontSize:12,fontWeight:700,color:'#C084FC'}}>
                            {sender.avatar} {sender.name} <span style={{fontSize:10,color:'#4a5070',fontWeight:400}}>(admin view)</span>
                          </span>
                        ) : (
                          <span style={{fontSize:12,fontWeight:700,color:'#8a70a0'}}>Anonymous Member</span>
                        )}
                      </div>
                      <span style={{fontSize:10,color:'#4a5070'}}>
                        {(() => {
                          const diff = Date.now() - new Date(c.created_at).getTime()
                          const m = Math.floor(diff/60000), h = Math.floor(diff/3600000), d = Math.floor(diff/86400000)
                          return m<1?'just now':m<60?`${m}m ago`:h<24?`${h}h ago`:`${d}d ago`
                        })()}
                      </span>
                    </div>
                    <div style={{fontSize:13,color:'#c0c8e0',lineHeight:1.6,
                      background:'rgba(255,255,255,.02)',borderRadius:9,padding:'10px 12px',
                      border:'1px solid rgba(255,255,255,.04)'}}>
                      {c.message}
                    </div>
                    {profile?.is_admin && (
                      <div style={{display:'flex',gap:7,marginTop:9,justifyContent:'flex-end'}}>
                        <button onClick={()=>deleteComplaint(c.id)}
                          style={{padding:'7px 14px',borderRadius:8,fontSize:11,fontWeight:700,cursor:'pointer',
                            fontFamily:'Rajdhani,sans-serif',border:'1px solid rgba(255,107,107,.2)',
                            background:'rgba(255,107,107,.07)',color:'#FF6B6B',display:'flex',alignItems:'center',gap:6}}>
                          🗑️ Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {complaints.length > 3 && (
              <button onClick={()=>setShowAll(s=>!s)}
                style={{width:'100%',padding:'10px',borderRadius:11,fontFamily:'Rajdhani,sans-serif',fontWeight:700,
                  fontSize:13,cursor:'pointer',border:'1px solid rgba(192,132,252,.15)',
                  background:'rgba(192,132,252,.05)',color:'#C084FC',marginTop:2}}>
                {showAll ? '▲ Show Less' : `▼ Show ${complaints.length - 3} More`}
              </button>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}`}</style>

      <PhotoModal url={photoModal} onClose={()=>setPhotoModal(null)}/>
    </div>
  )
}

// Photo modal shared component
function PhotoModal({ url, onClose }) {
  if (!url) return null
  return (
    <div onClick={onClose}
      style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,.92)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{position:'relative',maxWidth:'100%',maxHeight:'90vh'}}>
        <img src={url} alt="Proof"
          style={{maxWidth:'100%',maxHeight:'85vh',borderRadius:12,objectFit:'contain',display:'block',boxShadow:'0 0 40px rgba(0,0,0,.8)'}}
          onError={onClose}/>
        <button onClick={onClose}
          style={{position:'absolute',top:-14,right:-14,width:32,height:32,borderRadius:'50%',background:'#FF6B6B',border:'none',color:'#fff',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900}}>
          ✕
        </button>
        <a href={url} download="proof.jpg"
          style={{display:'block',marginTop:10,textAlign:'center',color:'#7DF9AA',fontSize:13,fontWeight:700,textDecoration:'none'}}>
          ⬇️ Save Photo
        </a>
      </div>
    </div>
  )
}

export default function Dashboard() { return <ToastProvider><DashContent/></ToastProvider> }
