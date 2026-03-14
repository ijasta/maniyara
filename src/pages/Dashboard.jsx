import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { getMembers, getCurrentAssignments, getSettings, supabase } from '../lib/supabase'
import { Avatar, ToastProvider, useToast } from '../components/UI'
import NotFound from './NotFound'

const T = {
  bg:'#05060f', surface:'#0b0d1c', surfaceHi:'#10132a',
  border:'rgba(255,255,255,.07)', borderHi:'rgba(255,255,255,.14)',
  green:'#34d399',  greenDim:'rgba(52,211,153,.13)',  greenBdr:'rgba(52,211,153,.25)',
  red:'#f87171',    redDim:'rgba(248,113,113,.12)',    redBdr:'rgba(248,113,113,.22)',
  purple:'#a78bfa', purpleDim:'rgba(167,139,250,.12)',purpleBdr:'rgba(167,139,250,.22)',
  amber:'#fbbf24',  amberDim:'rgba(251,191,36,.1)',   amberBdr:'rgba(251,191,36,.2)',
  blue:'#60a5fa',   blueDim:'rgba(96,165,250,.1)',    blueBdr:'rgba(96,165,250,.2)',
  t1:'#f0f4ff', t2:'#8892b0', t3:'#4a5270', t4:'#242840',
  r:{ sm:8, md:12, lg:16, xl:22, full:9999 }
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&family=Orbitron:wght@700;900&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0 }
  .dash { font-family:'Inter',system-ui,sans-serif; color:${T.t1}; background:${T.bg}; min-height:100vh; }

  @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
  @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes spin    { to{transform:rotate(360deg)} }
  @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.35} }
  @keyframes grow    { from{width:0%} to{width:var(--w)} }
  @keyframes floatOrb{ 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-18px) scale(1.04)} }
  @keyframes checkPop{ 0%{transform:scale(0)} 70%{transform:scale(1.25)} 100%{transform:scale(1)} }
  @keyframes heroPulse{ 0%,100%{opacity:.55} 50%{opacity:.85} }

  .dash { font-family:'Inter',system-ui,sans-serif; color:${T.t1}; }

  .card {
    background:${T.surface}; border:1px solid ${T.border};
    border-radius:16px; transition:border-color .2s,box-shadow .2s;
  }
  .card:hover { border-color:${T.borderHi}; }

  .chip {
    display:inline-flex; align-items:center; gap:5px;
    padding:4px 10px; border-radius:9999px;
    font-size:11px; font-weight:600; letter-spacing:.02em;
    border:1px solid ${T.border}; background:rgba(255,255,255,.04);
    color:${T.t2}; white-space:nowrap;
  }
  .chip-done  { background:${T.greenDim};  border-color:${T.greenBdr};  color:${T.green};  }
  .chip-pend  { background:${T.redDim};    border-color:${T.redBdr};    color:${T.red};    }
  .chip-purple{ background:${T.purpleDim}; border-color:${T.purpleBdr}; color:${T.purple}; }
  .chip-amber { background:${T.amberDim};  border-color:${T.amberBdr};  color:${T.amber};  }

  .filter-tab {
    flex:1; padding:7px 10px; border-radius:8px;
    font-size:12px; font-weight:600; cursor:pointer; border:none;
    font-family:inherit; background:transparent; color:${T.t3}; transition:all .15s;
  }
  .filter-tab.active-all    { background:rgba(255,255,255,.08); color:${T.t1}; }
  .filter-tab.active-done   { background:${T.greenDim};  color:${T.green};  }
  .filter-tab.active-pending{ background:${T.redDim};    color:${T.red};    }

  .member-grid { display:flex; flex-direction:column; gap:8px; }
  .member-card {
    border-radius:14px; border:1px solid ${T.border};
    background:${T.surface}; overflow:hidden; position:relative;
    animation:fadeUp .3s ease both; cursor:pointer;
    transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease;
  }
  .member-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.4); border-color:${T.borderHi}; }
  .member-card:active { transform:scale(.985); }
  .member-card.mc-done { border-color:rgba(52,211,153,.25); }
  .member-card.mc-pend { border-color:rgba(248,113,113,.16); }
  .check-badge { animation:checkPop .3s ease both; }

  .member-modal-bg {
    position:fixed; inset:0; z-index:9998;
    background:rgba(2,4,12,.88); backdrop-filter:blur(18px) saturate(.4);
    display:flex; align-items:center; justify-content:center;
    padding:20px; animation:fadeIn .18s ease;
  }
  .member-modal {
    background:#0e1128; border:1px solid ${T.borderHi};
    border-radius:22px; width:100%; max-width:360px;
    overflow:hidden; animation:fadeUp .2s ease;
    box-shadow:0 32px 80px rgba(0,0,0,.7);
  }

  .progress-track { height:5px; border-radius:99px; background:rgba(255,255,255,.05); overflow:hidden; }
  .progress-fill  { height:100%; border-radius:99px; animation:grow .9s cubic-bezier(.4,0,.2,1) both; }

  .complaint-card {
    background:${T.surface}; border:1px solid ${T.border};
    border-radius:12px; padding:14px 15px 14px 22px;
    margin-bottom:6px; position:relative; overflow:hidden;
    transition:border-color .18s; animation:fadeUp .3s ease both;
  }
  .complaint-card:hover { border-color:${T.borderHi}; }
  .complaint-card::before {
    content:''; position:absolute; left:0; top:16%; bottom:16%;
    width:3px; border-radius:0 2px 2px 0;
    background:linear-gradient(180deg,${T.purple},rgba(167,139,250,.1));
  }

  .btn-primary {
    padding:10px 20px; border-radius:8px; font-size:13px; font-weight:600; border:none;
    background:${T.green}; color:#030a07; letter-spacing:.02em;
    transition:opacity .15s, transform .12s;
  }
  .btn-primary:hover { opacity:.9; }
  .btn-primary:active { transform:scale(.97); }
  .btn-primary:disabled { opacity:.35; }

  .btn-ghost {
    padding:8px 16px; border-radius:8px; font-size:12px; font-weight:600;
    background:transparent; border:1px solid ${T.border}; color:${T.t2};
    transition:border-color .15s, color .15s;
  }
  .btn-ghost:hover { border-color:${T.borderHi}; color:${T.t1}; }

  .divider { display:flex; align-items:center; gap:12px; margin:28px 0 18px; }
  .divider-line { flex:1; height:1px; background:${T.border}; }
  .divider-text { font-size:10px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:${T.t4}; }

  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:${T.border}; border-radius:99px; }
  textarea { font-family:inherit; }
  textarea:focus { outline:none; border-color:${T.purpleBdr} !important; }
  button { cursor:pointer; font-family:inherit; }
`
/* ─────────────────────────────────────────
   Tiny helpers
───────────────────────────────────────── */
function Dot({ color, pulse }) {
  return (
    <span style={{
      display:'inline-block', width:6, height:6, borderRadius:'50%',
      background: color, flexShrink:0,
      animation: pulse ? 'pulse 2.5s ease-in-out infinite' : 'none'
    }}/>
  )
}

function ProgressRing({ pct, size=52, stroke=3, color }) {
  const r = (size/2) - stroke*1.5
  const circ = 2 * Math.PI * r
  return (
    <svg width={size} height={size} style={{transform:'rotate(-90deg)',flexShrink:0}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="rgba(255,255,255,.05)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={circ*(1-pct/100)}
        strokeLinecap="round"
        style={{transition:'stroke-dashoffset .9s cubic-bezier(.4,0,.2,1)'}}/>
    </svg>
  )
}

/* ─────────────────────────────────────────
   Main component
───────────────────────────────────────── */
function DashContent() {
  const { profile } = useAuth()
  const toast = useToast()
  const [members,    setMembers]  = useState([])
  const [assigns,    setAssigns]  = useState([])
  const [settings,   setSt]       = useState(null)
  const [week,       setWeek]     = useState(1)
  const [loading,    setLoading]  = useState(true)
  const [filter,     setFilter]   = useState('all')
  const [photoModal, setPhoto]    = useState(null)
  const [complaints, setComplaints] = useState([])
  const [showSheet,  setSheet]    = useState(false)
  const [cMsg,       setCMsg]     = useState('')
  const [cSubmit,    setCSub]     = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [cSettings,  setCSt]     = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [m, r, s] = await Promise.all([getMembers(), getCurrentAssignments(), getSettings()])
      setMembers(m); setAssigns(r.assignments); setWeek(r.week); setSt(s)
      loadComplaints()
    } catch(e) { toast('Failed: '+e.message,'error') }
    finally { setLoading(false) }
  }

  async function loadComplaints() {
    try {
      const [{data:c},{data:cs}] = await Promise.all([
        supabase.from('complaints').select('*').order('created_at',{ascending:false}),
        supabase.from('settings').select('complaints_reveal_identity').eq('id',1).single()
      ])
      setComplaints(c||[]); setCSt(cs)
    } catch(_){}
  }

  const submitComplaint = async () => {
    if (!cMsg.trim() || cMsg.trim().length<5) { toast('Write more detail','warn'); return }
    setCSub(true)
    try {
      const {data:{user:u}} = await supabase.auth.getUser()
      const {error} = await supabase.from('complaints').insert([{message:cMsg.trim(),member_id:u?.id}])
      if (error) throw error
      toast('Posted anonymously'); setCMsg(''); setSheet(false); loadComplaints()
    } catch(e){ toast('Failed: '+e.message,'error') }
    finally { setCSub(false) }
  }

  const deleteComplaint = async id => {
    if (!confirm('Delete this complaint?')) return
    try { await supabase.from('complaints').delete().eq('id',id); toast('Deleted','warn'); loadComplaints() }
    catch(_){ toast('Failed','error') }
  }

  const openPhoto = rawUrl => {
    const proxyBase = import.meta.env.VITE_SUPABASE_PROXY_URL
    const supaBase  = import.meta.env.VITE_SUPABASE_URL
    let url = rawUrl
    const match = url.match(/\/object\/(?:public|sign(?:ed)?(?:\/v\d)?)\/(.+?)(\?|$)/)
    if (match) url = `${proxyBase||supaBase}/storage/v1/object/public/${match[1]}`
    else if (proxyBase) url = url.replace(supaBase, proxyBase)
    setPhoto(url)
  }

  if (loading) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:300,gap:12}}>
      <style>{CSS}</style>
      <div style={{width:28,height:28,borderRadius:'50%',border:`2px solid ${T.border}`,borderTopColor:T.green,animation:'spin 1s linear infinite'}}/>
      <span style={{fontSize:11,color:T.t3,letterSpacing:2,fontFamily:'JetBrains Mono,monospace'}}>LOADING</span>
    </div>
  )

  // Maintenance gate — non-admins see the 503 page
  if (settings?.maintenance_mode && !profile?.is_admin) {
    return <NotFound isMaintenance={true}/>
  }

  const done    = assigns.filter(a=>a.done).length
  const pending = assigns.filter(a=>!a.done).length
  const total   = assigns.length
  const pct     = total>0 ? Math.round((done/total)*100) : 0
  const allDone = total>0 && done===total

  const filtered = members.filter(m => {
    const a = assigns.find(x=>x.member_id===m.id||x.members?.id===m.id)
    if (filter==='done')    return a?.done===true
    if (filter==='pending') return !a?.done
    return true
  })

  const dateStr = new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})

  return (
    <div className="dash" style={{paddingBottom:56}}>
      <style>{CSS}</style>

      {/* ══════ HERO BANNER ══════ */}
      <div style={{
        position:'relative', overflow:'hidden',
        borderRadius:22, marginBottom:14,
        border:`1px solid ${allDone ? T.greenBdr : T.border}`,
        background: allDone
          ? 'linear-gradient(135deg,#071a10 0%,#050e1a 60%,#08071a 100%)'
          : 'linear-gradient(135deg,#07080f 0%,#0a0b1d 60%,#0d0815 100%)',
        minHeight:168, transition:'border-color .6s'
      }}>
        <div style={{position:'absolute',top:-40,right:-30,width:200,height:200,borderRadius:'50%',
          background: allDone ? 'radial-gradient(circle,rgba(52,211,153,.18),transparent 70%)' : 'radial-gradient(circle,rgba(96,165,250,.12),transparent 70%)',
          animation:'floatOrb 7s ease-in-out infinite',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:-60,left:-20,width:160,height:160,borderRadius:'50%',
          background:'radial-gradient(circle,rgba(167,139,250,.1),transparent 70%)',
          animation:'floatOrb 9s ease-in-out infinite reverse',pointerEvents:'none'}}/>
        <div style={{position:'absolute',inset:0,
          backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(255,255,255,.012) 3px,rgba(255,255,255,.012) 4px)',
          pointerEvents:'none'}}/>
        <div style={{position:'relative',padding:'22px 20px 20px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <div style={{display:'flex',alignItems:'center',gap:7}}>
              <Dot color={T.green} pulse/>
              <span style={{fontSize:11,color:T.t3,fontWeight:500,letterSpacing:.4}}>{dateStr}</span>
            </div>
            <div style={{
              display:'flex',alignItems:'center',gap:5,padding:'3px 10px',borderRadius:99,
              background: allDone ? T.greenDim : 'rgba(255,255,255,.05)',
              border:`1px solid ${allDone ? T.greenBdr : T.border}`,
              fontSize:10,fontWeight:700,color: allDone ? T.green : T.t3,letterSpacing:.08
            }}>
              <Dot color={allDone ? T.green : T.t3} pulse={!allDone}/>
              {allDone ? 'ALL DONE' : 'LIVE'}
            </div>
          </div>
          <div style={{marginBottom:18}}>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:10,fontWeight:700,
              color:T.t3,letterSpacing:3,textTransform:'uppercase',marginBottom:6}}>
              {settings?.house_name || 'Maniyara'}
            </div>
            <div style={{display:'flex',alignItems:'baseline',gap:10}}>
              <span style={{fontFamily:'Orbitron,monospace',fontSize:34,fontWeight:900,
                color: allDone ? T.green : T.t1, letterSpacing:-1, lineHeight:1,
                textShadow: allDone ? '0 0 32px rgba(52,211,153,.35)' : 'none',
                transition:'all .6s'}}>Week {week}</span>
              <span style={{fontSize:15,color:T.t2,fontWeight:500}}>Duties</span>
            </div>
            <div style={{fontSize:13,color:T.t3,marginTop:5}}>
              Hey <span style={{color:T.t2,fontWeight:600}}>{profile?.name?.split(' ')[0]}</span>
              {allDone ? " — everyone crushed it ✨" : " — here's what's happening"}
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{flex:1,height:6,borderRadius:99,background:'rgba(255,255,255,.07)',overflow:'hidden'}}>
              <div style={{
                height:'100%',borderRadius:99,width:`${pct}%`,
                background: allDone
                  ? 'linear-gradient(90deg,#34d399,#6ee7b7)'
                  : pct>60 ? 'linear-gradient(90deg,#fbbf24,#34d399)'
                  : 'linear-gradient(90deg,#f87171,#fbbf24)',
                transition:'width 1.2s cubic-bezier(.4,0,.2,1), background .6s',
                boxShadow: allDone ? '0 0 10px rgba(52,211,153,.4)' : 'none'
              }}/>
            </div>
            <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:700,
              color: allDone ? T.green : T.t2,minWidth:36,textAlign:'right'}}>{pct}%</span>
          </div>
        </div>
      </div>

      {/* ══════ STAT ROW ══════ */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:20}}>
        {[
          {label:'Done',    val:done,    color:T.green, bg:T.greenDim,  br:T.greenBdr},
          {label:'Pending', val:pending, color:pending>0?T.red:T.t3, bg:pending>0?T.redDim:'rgba(255,255,255,.03)', br:pending>0?T.redBdr:T.border},
          {label:'Total',   val:total,   color:T.blue,  bg:T.blueDim,   br:T.blueBdr},
        ].map(({label,val,color,bg,br},i) => (
          <div key={label} style={{
            background:T.surface, border:`1px solid ${T.border}`,
            borderRadius:16, padding:'14px 14px 12px',
            animation:`fadeUp .3s ${i*.06}s ease both`,
            position:'relative', overflow:'hidden'
          }}>
            <div style={{position:'absolute',top:0,right:0,width:60,height:60,
              background:`radial-gradient(circle at top right,${bg},transparent 70%)`,pointerEvents:'none'}}/>
            <div style={{fontSize:10,color:T.t3,fontWeight:700,textTransform:'uppercase',letterSpacing:.1,marginBottom:8}}>{label}</div>
            <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:28,fontWeight:700,color,lineHeight:1}}>{val}</span>
            <div style={{marginTop:8,height:3,borderRadius:99,background:'rgba(255,255,255,.05)',overflow:'hidden'}}>
              <div style={{height:'100%',borderRadius:99,background:color,opacity:.7,
                width:`${total>0?Math.round((val/total)*100):0}%`,transition:'width 1s ease'}}/>
            </div>
          </div>
        ))}
      </div>

      {/* ══════ CREW HEADER ══════ */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:32,height:32,borderRadius:10,flexShrink:0,
            background:'rgba(255,255,255,.04)',border:`1px solid ${T.border}`,
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>👥</div>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:T.t1,lineHeight:1.1}}>The Crew</div>
            <div style={{fontSize:11,color:T.t3,marginTop:1}}>{filtered.length} of {members.length} shown</div>
          </div>
        </div>
        <div style={{display:'flex',gap:2,padding:3,background:'rgba(255,255,255,.03)',
          border:`1px solid ${T.border}`,borderRadius:10}}>
          {[['all','All'],['done','Done'],['pending','Pend']].map(([id,lb])=>(
            <button key={id} className={`filter-tab ${filter===id?`active-${id}`:''}`}
              onClick={()=>setFilter(id)}>{lb}</button>
          ))}
        </div>
      </div>


      {/* Member cards */}
      {filtered.length===0 ? (
        <div style={{textAlign:'center',padding:'40px 20px',animation:'fadeUp .3s ease'}}>
          <div style={{fontSize:32,marginBottom:10}}>🎉</div>
          <div style={{fontSize:13,fontWeight:600,color:T.t2,marginBottom:4}}>All clear</div>
          <div style={{fontSize:12,color:T.t3}}>{filter==='pending'?'Everyone completed their task!':'No members found.'}</div>
        </div>
      ) : (
        <div className="member-grid" style={{marginBottom:4}}>
          {filtered.map((m, idx) => {
            const a      = assigns.find(x => x.member_id===m.id || x.members?.id===m.id)
            const t      = a?.tasks
            const isDone = a?.done
            const mColor = m.color || T.purple

            return (
              <div key={m.id}
                className={`member-card ${isDone ? 'mc-done' : 'mc-pend'}`}
                style={{animationDelay:`${idx*.04}s`}}
                onClick={()=>setSelectedMember({m,a,t,isDone,mColor})}
              >
                {/* Left accent bar */}
                <div style={{
                  position:'absolute',left:0,top:0,bottom:0,width:3,
                  background: isDone
                    ? `linear-gradient(180deg,${T.green},rgba(52,211,153,.1))`
                    : `linear-gradient(180deg,${mColor},rgba(0,0,0,0))`
                }}/>

                <div style={{padding:'12px 14px 12px 18px',display:'flex',alignItems:'center',gap:12}}>

                  {/* Avatar */}
                  <div style={{position:'relative',flexShrink:0}}>
                    <div style={{
                      width:44,height:44,borderRadius:'50%',
                      background:`${mColor}20`,
                      border:`2px solid ${isDone ? T.green+'55' : mColor+'40'}`,
                      display:'flex',alignItems:'center',justifyContent:'center',fontSize:22
                    }}>{m.avatar||'👤'}</div>
                    <div style={{
                      position:'absolute',bottom:0,right:0,
                      width:15,height:15,borderRadius:'50%',
                      background: isDone ? T.green : T.red,
                      border:`2px solid ${T.surface}`,
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:7,fontWeight:900,color:'#000'
                    }}>{isDone?'✓':'!'}</div>
                  </div>

                  {/* Name + task */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{
                      fontSize:15,fontWeight:800,color:T.t1,
                      letterSpacing:-.3,lineHeight:1,marginBottom:7,
                      overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'
                    }}>{m.name}</div>
                    {t ? (
                      <div style={{
                        display:'inline-flex',alignItems:'center',gap:5,
                        padding:'3px 9px',borderRadius:7,
                        background: isDone ? T.greenDim : 'rgba(255,255,255,.05)',
                        border:`1px solid ${isDone ? T.greenBdr : T.border}`,
                        maxWidth:'100%',overflow:'hidden'
                      }}>
                        <span style={{fontSize:12,flexShrink:0}}>{t.emoji}</span>
                        <span style={{
                          fontSize:11,fontWeight:600,
                          color: isDone ? T.green : T.t2,
                          overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'
                        }}>{t.name}</span>
                      </div>
                    ) : (
                      <span style={{fontSize:11,color:T.t4,fontStyle:'italic'}}>No task assigned</span>
                    )}
                  </div>

                  {/* Status + tap hint */}
                  <div style={{flexShrink:0,display:'flex',flexDirection:'column',alignItems:'flex-end',gap:5}}>
                    <div style={{
                      fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:6,
                      background: isDone ? T.greenDim : T.redDim,
                      border:`1px solid ${isDone ? T.greenBdr : T.redBdr}`,
                      color: isDone ? T.green : T.red,whiteSpace:'nowrap'
                    }}>{isDone ? '✓ Done' : 'Pending'}</div>
                    <div style={{fontSize:9,color:T.t4,letterSpacing:.2}}>
                      {a?.proof_url ? '📷 has proof' : 'tap to view'}
                    </div>
                  </div>

                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Member detail modal ── */}
      {selectedMember && (() => {
        const {m, a, t, isDone, mColor} = selectedMember
        return (
          <div className="member-modal-bg" onClick={()=>setSelectedMember(null)}>
            <div className="member-modal" onClick={e=>e.stopPropagation()}>

              {/* Header */}
              <div style={{
                position:'relative',overflow:'hidden',
                padding:'22px 20px 18px',
                background:`linear-gradient(135deg,${mColor}18,rgba(0,0,0,0))`,
                borderBottom:`1px solid ${T.border}`
              }}>
                <div style={{position:'absolute',top:-30,right:-30,width:120,height:120,borderRadius:'50%',
                  background:`radial-gradient(circle,${mColor}22,transparent 70%)`,pointerEvents:'none'}}/>
                <button onClick={()=>setSelectedMember(null)} style={{
                  position:'absolute',top:14,right:14,width:28,height:28,borderRadius:'50%',
                  background:'rgba(255,255,255,.07)',border:`1px solid ${T.border}`,
                  color:T.t2,fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700
                }}>✕</button>
                <div style={{display:'flex',alignItems:'center',gap:14,position:'relative'}}>
                  <div style={{
                    width:62,height:62,borderRadius:'50%',flexShrink:0,
                    background:`${mColor}25`,
                    border:`2.5px solid ${isDone ? T.green : mColor}60`,
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:30,
                    boxShadow:`0 0 24px ${isDone ? 'rgba(52,211,153,.2)' : mColor+'22'}`
                  }}>{m.avatar||'👤'}</div>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:20,fontWeight:800,color:T.t1,letterSpacing:-.4,lineHeight:1.1,marginBottom:4}}>{m.name}</div>
                    {m.username && <div style={{fontSize:12,color:T.t3,marginBottom:8}}>@{m.username}</div>}
                    <span style={{
                      fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:6,
                      background: isDone ? T.greenDim : T.redDim,
                      border:`1px solid ${isDone ? T.greenBdr : T.redBdr}`,
                      color: isDone ? T.green : T.red
                    }}>{isDone ? '✓ Done' : '⏳ Pending'}</span>
                  </div>
                </div>
              </div>

              {/* Task */}
              <div style={{padding:'16px 20px',borderBottom:`1px solid ${T.border}`}}>
                <div style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:'uppercase',letterSpacing:.1,marginBottom:10}}>This week's task</div>
                {t ? (
                  <div style={{
                    display:'flex',alignItems:'center',gap:12,
                    padding:'12px 14px',borderRadius:12,
                    background: isDone ? T.greenDim : 'rgba(255,255,255,.04)',
                    border:`1px solid ${isDone ? T.greenBdr : T.border}`
                  }}>
                    <span style={{fontSize:26,flexShrink:0}}>{t.emoji}</span>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color: isDone ? T.green : T.t1}}>{t.name}</div>
                      {a?.done_at && <div style={{fontSize:11,color:T.t3,marginTop:3}}>
                        Completed {new Date(a.done_at).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                      </div>}
                    </div>
                  </div>
                ) : (
                  <div style={{fontSize:13,color:T.t4,fontStyle:'italic'}}>No task assigned yet</div>
                )}
              </div>

              {/* Proof */}
              <div style={{padding:'16px 20px 20px'}}>
                <div style={{fontSize:10,fontWeight:700,color:T.t4,textTransform:'uppercase',letterSpacing:.1,marginBottom:12}}>Proof photo</div>
                {a?.proof_url ? (
                  <>
                    <img src={a.proof_url} alt="Proof"
                      onClick={()=>{ setSelectedMember(null); openPhoto(a.proof_url) }}
                      style={{width:'100%',borderRadius:12,objectFit:'cover',maxHeight:200,
                        display:'block',cursor:'zoom-in',border:`1px solid ${T.border}`}}
                      onError={e=>e.target.style.display='none'}/>
                    <button onClick={()=>{ setSelectedMember(null); openPhoto(a.proof_url) }} style={{
                      marginTop:10,width:'100%',padding:'10px',borderRadius:10,
                      background:T.greenDim,border:`1px solid ${T.greenBdr}`,
                      color:T.green,fontSize:13,fontWeight:700
                    }}>View full photo →</button>
                  </>
                ) : (
                  <div style={{
                    padding:'24px 16px',borderRadius:12,textAlign:'center',
                    background:'rgba(255,255,255,.03)',border:`1px solid ${T.border}`
                  }}>
                    <div style={{fontSize:28,marginBottom:8}}>📷</div>
                    <div style={{fontSize:12,color:T.t4}}>{isDone ? 'No photo uploaded' : 'Task not completed yet'}</div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )
      })()}


      {/* ══════ COMPLAINTS ══════ */}
      <div style={{marginTop:32,marginBottom:18}}>

        {/* Section header — bold, not a faint divider */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'14px 18px',
          background:`linear-gradient(135deg,${T.purpleDim},rgba(167,139,250,.04))`,
          border:`1px solid ${T.purpleBdr}`,
          borderRadius:16, marginBottom:14,
          position:'relative', overflow:'hidden'
        }}>
          {/* bg orb */}
          <div style={{position:'absolute',right:-20,top:-20,width:100,height:100,borderRadius:'50%',
            background:'radial-gradient(circle,rgba(167,139,250,.12),transparent 70%)',pointerEvents:'none'}}/>

          <div style={{position:'relative',display:'flex',alignItems:'center',gap:12}}>
            <div style={{
              width:38,height:38,borderRadius:12,flexShrink:0,
              background:T.purpleDim, border:`1px solid ${T.purpleBdr}`,
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:18
            }}>🕵️</div>
            <div>
              <div style={{fontSize:15,fontWeight:700,color:T.t1,lineHeight:1.1}}>Anonymous Feed</div>
              <div style={{fontSize:11,color:T.t3,marginTop:2}}>
                {complaints.length>0
                  ? <><span style={{color:T.purple,fontWeight:600}}>{complaints.length}</span> {complaints.length===1?'complaint':'complaints'} open</>
                  : 'No complaints — house is chill'}
              </div>
            </div>
          </div>

          <button onClick={()=>setSheet(s=>!s)} style={{
            position:'relative',flexShrink:0,
            padding:'8px 16px', borderRadius:9999,
            border:`1px solid ${showSheet ? T.purpleBdr : T.border}`,
            background: showSheet ? T.purpleDim : 'rgba(255,255,255,.04)',
            color: showSheet ? T.purple : T.t2,
            fontSize:12, fontWeight:700, transition:'all .15s'
          }}>
            {showSheet ? '✕ Cancel' : '＋ Post'}
          </button>
        </div>

        {/* Post form */}
        {showSheet && (
          <div style={{
            background:T.surface, border:`1px solid ${T.purpleBdr}`,
            borderRadius:16, padding:'16px', marginBottom:12,
            animation:'fadeUp .2s ease'
          }}>
            <div style={{
              display:'flex',alignItems:'center',gap:8,marginBottom:12,
              padding:'9px 13px',borderRadius:10,
              background:'rgba(167,139,250,.07)',border:`1px solid rgba(167,139,250,.15)`
            }}>
              <span style={{fontSize:14,flexShrink:0}}>🔒</span>
              <span style={{fontSize:12,color:T.t3,lineHeight:1.5}}>
                Posted as <span style={{color:T.purple,fontWeight:700}}>Anonymous</span> — your identity is never stored or revealed
              </span>
            </div>
            <textarea
              value={cMsg}
              onChange={e=>setCMsg(e.target.value.slice(0,400))}
              placeholder="What's the issue? Be specific — what happened, when, and where?"
              rows={4}
              style={{
                width:'100%',resize:'none',fontSize:13,lineHeight:1.75,
                borderRadius:10,padding:'12px 14px',display:'block',
                background:'rgba(0,0,0,.35)',border:`1px solid ${T.border}`,
                color:T.t1,marginBottom:10,transition:'border-color .2s'
              }}
            />
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{flex:1}}>
                <div style={{height:2,borderRadius:99,background:'rgba(255,255,255,.05)',overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:99,
                    background:`linear-gradient(90deg,${T.purple},#c4b5fd)`,
                    width:`${(cMsg.length/400)*100}%`,transition:'width .2s'
                  }}/>
                </div>
                <div style={{fontSize:10,color:T.t4,marginTop:4}}>{cMsg.length}/400</div>
              </div>
              <button onClick={submitComplaint} disabled={cSubmit||!cMsg.trim()} style={{
                padding:'10px 20px', borderRadius:9999,
                border:'none', fontSize:13, fontWeight:700,
                background: cSubmit||!cMsg.trim() ? 'rgba(255,255,255,.06)' : T.purple,
                color: cSubmit||!cMsg.trim() ? T.t4 : '#fff',
                transition:'all .15s', flexShrink:0,
                boxShadow: !cSubmit&&cMsg.trim() ? '0 4px 20px rgba(167,139,250,.3)' : 'none'
              }}>
                {cSubmit ? 'Posting…' : 'Post Anonymously'}
              </button>
            </div>
          </div>
        )}

        {/* Complaints list */}
        {complaints.length===0 ? (
          <div style={{
            textAlign:'center', padding:'36px 20px',
            background:T.surface, border:`1px solid ${T.border}`,
            borderRadius:16
          }}>
            <div style={{fontSize:36,marginBottom:10}}>✨</div>
            <div style={{fontSize:14,fontWeight:700,color:T.t2,marginBottom:4}}>All quiet</div>
            <div style={{fontSize:12,color:T.t3}}>No open complaints. The house is running smoothly.</div>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {(showAll?complaints:complaints.slice(0,3)).map((c,idx)=>{
              const sender = cSettings?.complaints_reveal_identity
                ? members.find(m=>m.id===c.member_id) : null
              const diff = Date.now()-new Date(c.created_at).getTime()
              const mn=Math.floor(diff/60000),h=Math.floor(diff/3600000),d=Math.floor(diff/86400000)
              const ago = mn<1?'just now':mn<60?`${mn}m ago`:h<24?`${h}h ago`:`${d}d ago`

              return (
                <div key={c.id} style={{
                  background:T.surface,
                  border:`1px solid ${T.border}`,
                  borderRadius:14,
                  overflow:'hidden',
                  animation:`fadeUp .3s ${idx*.05}s ease both`,
                  transition:'border-color .18s',
                  position:'relative'
                }}>
                  {/* Left accent stripe */}
                  <div style={{
                    position:'absolute',left:0,top:0,bottom:0,width:3,
                    background:`linear-gradient(180deg,${T.purple},rgba(167,139,250,.1))`
                  }}/>

                  <div style={{padding:'14px 16px 14px 20px'}}>
                    {/* Top row */}
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                      <div style={{
                        width:30,height:30,borderRadius:9999,flexShrink:0,
                        background:T.purpleDim,border:`1px solid ${T.purpleBdr}`,
                        display:'flex',alignItems:'center',justifyContent:'center',fontSize:13
                      }}>🕵️</div>
                      <div style={{flex:1,minWidth:0}}>
                        {sender ? (
                          <div style={{display:'flex',alignItems:'center',gap:6}}>
                            <span style={{fontSize:13,fontWeight:700,color:T.purple}}>{sender.avatar} {sender.name}</span>
                            <span style={{
                              fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:4,
                              background:'rgba(167,139,250,.1)',border:'1px solid rgba(167,139,250,.2)',
                              color:T.purple,letterSpacing:.05,textTransform:'uppercase'
                            }}>admin</span>
                          </div>
                        ) : (
                          <span style={{fontSize:12,fontWeight:600,color:T.t3,letterSpacing:.02}}>Anonymous</span>
                        )}
                      </div>
                      <span style={{
                        fontSize:10,color:T.t4,flexShrink:0,
                        fontFamily:'JetBrains Mono,monospace'
                      }}>{ago}</span>
                    </div>

                    {/* Message */}
                    <p style={{
                      fontSize:13,color:T.t2,lineHeight:1.75,margin:0,
                      paddingLeft:2
                    }}>{c.message}</p>

                    {/* Admin delete */}
                    {profile?.is_admin && (
                      <div style={{display:'flex',justifyContent:'flex-end',marginTop:10}}>
                        <button onClick={()=>deleteComplaint(c.id)} style={{
                          fontSize:11,padding:'4px 12px',borderRadius:8,
                          background:'rgba(248,113,113,.07)',
                          border:'1px solid rgba(248,113,113,.2)',
                          color:T.red,fontWeight:600
                        }}>Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {complaints.length>3 && (
              <button onClick={()=>setShowAll(s=>!s)} style={{
                width:'100%',padding:'11px',borderRadius:12,
                background:'rgba(255,255,255,.03)',
                border:`1px solid ${T.border}`,
                color:T.t3,fontSize:12,fontWeight:600,marginTop:2,
                transition:'all .15s'
              }}>
                {showAll ? '↑ Show less' : `↓ Show ${complaints.length-3} more`}
              </button>
            )}
          </div>
        )}
      </div>

      <PhotoModal url={photoModal} onClose={()=>setPhoto(null)}/>
    </div>
  )
}

/* ─────────────────────────────────────────
   Photo modal
───────────────────────────────────────── */
function PhotoModal({ url, onClose }) {
  if (!url) return null
  return (
    <div onClick={onClose} style={{
      position:'fixed',inset:0,zIndex:9999,
      background:'rgba(2,4,10,.97)',backdropFilter:'blur(16px) saturate(.5)',
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      padding:20,animation:'fadeIn .2s ease'
    }}>
      <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:520}}>
        {/* modal header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <span style={{fontSize:11,fontWeight:700,letterSpacing:.1,color:T.t3,textTransform:'uppercase'}}>Proof Photo</span>
          <button onClick={onClose} style={{
            width:28,height:28,borderRadius:'50%',border:`1px solid ${T.border}`,
            background:T.surface,color:T.t2,fontSize:13,
            display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700
          }}>✕</button>
        </div>

        <img src={url} alt="Proof" style={{
          width:'100%',maxHeight:'72vh',borderRadius:16,
          objectFit:'contain',display:'block',
          border:`1px solid ${T.border}`,
          boxShadow:'0 32px 80px rgba(0,0,0,.8)'
        }} onError={onClose}/>

        <a href={url} download="proof.jpg" className="btn-ghost" style={{
          display:'flex',alignItems:'center',justifyContent:'center',gap:6,
          marginTop:10,textDecoration:'none',borderRadius:8,
          padding:'10px',fontSize:12,fontWeight:600
        }}>Download photo</a>
      </div>
    </div>
  )
}

export default function Dashboard() { return <ToastProvider><DashContent/></ToastProvider> }
