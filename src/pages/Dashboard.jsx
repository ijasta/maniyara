import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { getMembers, getCurrentAssignments, getSettings, supabase } from '../lib/supabase'
import { Avatar, ToastProvider, useToast } from '../components/UI'

/* ─────────────────────────────────────────
   Design tokens — one place to change them
───────────────────────────────────────── */
const T = {
  // Surfaces
  bg:       '#060810',
  surface:  '#0c0f1d',
  surfaceHi:'#111526',
  border:   'rgba(255,255,255,.07)',
  borderHi: 'rgba(255,255,255,.12)',

  // Accent palette  (muted, not neon)
  green:    '#34d399',   // emerald-400
  greenDim: 'rgba(52,211,153,.12)',
  greenBdr: 'rgba(52,211,153,.22)',
  red:      '#f87171',   // red-400
  redDim:   'rgba(248,113,113,.1)',
  redBdr:   'rgba(248,113,113,.2)',
  purple:   '#a78bfa',   // violet-400
  purpleDim:'rgba(167,139,250,.1)',
  purpleBdr:'rgba(167,139,250,.2)',
  blue:     '#60a5fa',

  // Text
  t1: '#f1f5f9',   // primary
  t2: '#94a3b8',   // secondary
  t3: '#475569',   // tertiary
  t4: '#2a3050',   // muted

  radius: {
    sm: 8, md: 12, lg: 16, xl: 20, full: 9999
  }
}

/* ─────────────────────────────────────────
   Global CSS
───────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0 }

  .dash { font-family: 'Inter', system-ui, sans-serif; color: ${T.t1}; }

  @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
  @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
  @keyframes spin    { to{transform:rotate(360deg)} }
  @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
  @keyframes grow    { from{width:0%} to{width:var(--w)} }

  .card {
    background: ${T.surface};
    border: 1px solid ${T.border};
    border-radius: ${T.radius.lg}px;
    transition: border-color .2s ease, box-shadow .2s ease;
  }
  .card:hover { border-color: ${T.borderHi}; }

  .row-card {
    background: ${T.surface};
    border: 1px solid ${T.border};
    border-radius: ${T.radius.md}px;
    padding: 14px 16px;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 12px;
    transition: border-color .18s, background .18s;
    animation: fadeUp .3s ease both;
    position: relative;
    overflow: hidden;
  }
  .row-card:hover { background: ${T.surfaceHi}; border-color: ${T.borderHi}; }
  .row-card.is-done  { border-color: ${T.greenBdr}; }
  .row-card.is-pend  { border-color: ${T.redBdr}; }

  .chip {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: ${T.radius.full}px;
    font-size: 11px; font-weight: 600; letter-spacing: .02em;
    border: 1px solid ${T.border};
    background: rgba(255,255,255,.04);
    color: ${T.t2}; white-space: nowrap;
  }
  .chip-done { background: ${T.greenDim}; border-color: ${T.greenBdr}; color: ${T.green}; }
  .chip-pend { background: ${T.redDim};   border-color: ${T.redBdr};   color: ${T.red};   }
  .chip-purple { background: ${T.purpleDim}; border-color: ${T.purpleBdr}; color: ${T.purple}; }

  .filter-tab {
    flex: 1; padding: 7px 10px; border-radius: ${T.radius.sm}px;
    font-size: 12px; font-weight: 600; cursor: pointer; border: none;
    font-family: inherit; letter-spacing: .02em;
    background: transparent; color: ${T.t3};
    transition: all .15s;
  }
  .filter-tab.active-all    { background: rgba(255,255,255,.08); color: ${T.t1}; }
  .filter-tab.active-done   { background: ${T.greenDim}; color: ${T.green}; }
  .filter-tab.active-pending{ background: ${T.redDim};   color: ${T.red};   }

  .section-label {
    font-size: 10px; font-weight: 700; letter-spacing: .1em;
    text-transform: uppercase; color: ${T.t3};
    margin-bottom: 10px;
  }

  .mono { font-family: 'JetBrains Mono', monospace; }

  .stat-num {
    font-family: 'JetBrains Mono', monospace;
    font-size: 32px; font-weight: 700; line-height: 1;
    letter-spacing: -1px;
  }

  textarea { font-family: inherit; }
  textarea:focus { outline: none; border-color: ${T.purpleBdr} !important; }
  button { cursor: pointer; font-family: inherit; }

  .btn-primary {
    padding: 10px 20px; border-radius: ${T.radius.sm}px;
    font-size: 13px; font-weight: 600; border: none;
    background: ${T.green}; color: #030a07;
    letter-spacing: .02em;
    transition: opacity .15s, transform .12s;
  }
  .btn-primary:hover { opacity: .9; }
  .btn-primary:active { transform: scale(.97); }
  .btn-primary:disabled { opacity: .35; }

  .btn-ghost {
    padding: 8px 16px; border-radius: ${T.radius.sm}px;
    font-size: 12px; font-weight: 600;
    background: transparent;
    border: 1px solid ${T.border};
    color: ${T.t2};
    transition: border-color .15s, color .15s;
  }
  .btn-ghost:hover { border-color: ${T.borderHi}; color: ${T.t1}; }

  .progress-track {
    height: 4px; border-radius: 99px;
    background: rgba(255,255,255,.05); overflow: hidden;
  }
  .progress-fill {
    height: 100%; border-radius: 99px;
    animation: grow .9s cubic-bezier(.4,0,.2,1) both;
    transition: width .9s cubic-bezier(.4,0,.2,1);
  }

  .divider {
    display: flex; align-items: center; gap: 12px;
    margin: 28px 0 18px;
  }
  .divider-line { flex: 1; height: 1px; background: ${T.border}; }
  .divider-text { font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: ${T.t4}; }

  .complaint-card {
    background: ${T.surface};
    border: 1px solid ${T.border};
    border-radius: ${T.radius.md}px;
    padding: 14px 15px 14px 22px;
    margin-bottom: 6px;
    position: relative; overflow: hidden;
    transition: border-color .18s;
    animation: fadeUp .3s ease both;
  }
  .complaint-card:hover { border-color: ${T.borderHi}; }
  .complaint-card::before {
    content: ''; position: absolute; left: 0; top: 16%; bottom: 16%;
    width: 3px; border-radius: 0 2px 2px 0;
    background: linear-gradient(180deg, ${T.purple}, rgba(167,139,250,.2));
  }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 99px; }
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
  const [showAll,    setShowAll]  = useState(false)
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
    <div className="dash" style={{paddingBottom:48}}>
      <style>{CSS}</style>

      {/* ══════ HEADER ══════ */}
      <header style={{marginBottom:24,paddingTop:2}}>
        <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:10}}>
          <Dot color={T.green} pulse/>
          <span style={{fontSize:11,color:T.t3,fontWeight:500,letterSpacing:.3}}>{dateStr}</span>
        </div>

        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
          <div>
            <h1 style={{fontSize:'clamp(22px,6vw,30px)',fontWeight:700,letterSpacing:-1,lineHeight:1.1,color:T.t1,marginBottom:4}}>
              Week <span style={{color:T.green}}>{week}</span> Duties
            </h1>
            <p style={{fontSize:13,color:T.t3,fontWeight:400}}>
              Hey <span style={{color:T.t2,fontWeight:500}}>{profile?.name?.split(' ')[0]}</span> — here's the current status
            </p>
          </div>

          {/* Live badge */}
          <div className="chip" style={{marginTop:4,flexShrink:0}}>
            <Dot color={T.green} pulse/>
            <span style={{fontWeight:600,fontSize:11}}>Live</span>
          </div>
        </div>
      </header>

      {/* ══════ HOUSE IDENTITY CARD ══════ */}
      <div className="card" style={{padding:'16px 18px',marginBottom:12,position:'relative',overflow:'hidden'}}>
        {/* subtle gradient wash */}
        <div style={{position:'absolute',inset:0,
          background:'radial-gradient(ellipse at 0% 100%,rgba(52,211,153,.05),transparent 60%)',
          pointerEvents:'none'}}/>

        <div style={{position:'relative',display:'flex',alignItems:'center',gap:14}}>
          <div style={{
            width:44,height:44,borderRadius:T.radius.md,flexShrink:0,
            background:T.greenDim,border:`1px solid ${T.greenBdr}`,
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:22
          }}>🏠</div>

          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:15,fontWeight:700,color:T.t1,marginBottom:2}}>
              {settings?.house_name||'Maniyara'}
            </div>
            <div style={{fontSize:12,color:T.t3}}>
              {members.length} residents · Week {week}
            </div>
          </div>

          {/* SVG progress ring */}
          <div style={{position:'relative',flexShrink:0}}>
            <ProgressRing pct={pct} color={allDone?T.green:T.blue}/>
            <div style={{
              position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:10,fontWeight:700,fontFamily:'JetBrains Mono,monospace',
              color:allDone?T.green:T.blue
            }}>{pct}%</div>
          </div>
        </div>
      </div>

      {/* ══════ STAT CARDS ══════ */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
        {/* Completed */}
        <div className="card" style={{padding:'16px 18px',animation:'fadeUp .3s .04s ease both'}}>
          <div className="section-label" style={{color:T.t4,marginBottom:12}}>Completed</div>
          <div style={{display:'flex',alignItems:'flex-end',gap:8,marginBottom:12}}>
            <span className="stat-num" style={{color:T.green}}>{done}</span>
            <span style={{fontSize:13,color:T.t3,marginBottom:4,fontFamily:'JetBrains Mono,monospace'}}>/ {total}</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{
              '--w':`${pct}%`, width:`${pct}%`,
              background:`linear-gradient(90deg,${T.green},#6ee7b7)`,
              boxShadow:`0 0 8px ${T.greenDim}`
            }}/>
          </div>
        </div>

        {/* Pending */}
        <div className="card" style={{padding:'16px 18px',animation:'fadeUp .3s .08s ease both'}}>
          <div className="section-label" style={{color:T.t4,marginBottom:12}}>Pending</div>
          <div style={{display:'flex',alignItems:'flex-end',gap:8,marginBottom:12}}>
            <span className="stat-num" style={{color:pending>0?T.red:T.t3}}>{pending}</span>
            <span style={{fontSize:13,color:T.t3,marginBottom:4,fontFamily:'JetBrains Mono,monospace'}}>tasks</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{
              '--w': total>0?`${Math.round((pending/total)*100)}%`:'0%',
              width: total>0?`${Math.round((pending/total)*100)}%`:'0%',
              background: pending>0 ? `linear-gradient(90deg,${T.red},#fca5a5)` : T.t4,
            }}/>
          </div>
        </div>
      </div>

      {/* ══════ CREW ══════ */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:T.t1}}>The Crew</div>
          <div style={{fontSize:11,color:T.t3,marginTop:1}}>{filtered.length} of {members.length} members</div>
        </div>

        {/* Filter tabs */}
        <div style={{
          display:'flex',gap:2,padding:3,
          background:'rgba(255,255,255,.03)',
          border:`1px solid ${T.border}`,borderRadius:T.radius.sm+2
        }}>
          {[['all','All'],['done','Done'],['pending','Pending']].map(([id,lb])=>(
            <button key={id} className={`filter-tab ${filter===id?`active-${id}`:''}`}
              onClick={()=>setFilter(id)}>
              {lb}
            </button>
          ))}
        </div>
      </div>

      {/* Member rows */}
      {filtered.length===0 ? (
        <div style={{textAlign:'center',padding:'48px 20px',animation:'fadeUp .3s ease'}}>
          <div style={{fontSize:36,marginBottom:12}}>🎉</div>
          <div style={{fontSize:13,fontWeight:600,color:T.t2,marginBottom:4}}>All clear</div>
          <div style={{fontSize:12,color:T.t3}}>
            {filter==='pending'?'Everyone completed their task!':'No members found.'}
          </div>
        </div>
      ) : filtered.map((m,idx) => {
        const a    = assigns.find(x=>x.member_id===m.id||x.members?.id===m.id)
        const t    = a?.tasks
        const isDone = a?.done

        return (
          <div key={m.id} className={`row-card ${isDone?'is-done':'is-pend'}`}
            style={{animationDelay:`${idx*.035}s`}}>

            {/* Accent bar */}
            <div style={{
              position:'absolute',left:0,top:0,bottom:0,width:3,
              background:isDone
                ? `linear-gradient(180deg,${T.green},rgba(52,211,153,.1))`
                : `linear-gradient(180deg,${T.red},rgba(248,113,113,.1))`,
              borderRadius:'0 2px 2px 0'
            }}/>

            {/* Avatar */}
            <div style={{position:'relative',flexShrink:0,marginLeft:4}}>
              <Avatar emoji={m.avatar} color={m.color} size={40}/>
              {isDone && (
                <div style={{
                  position:'absolute',bottom:-2,right:-2,
                  width:14,height:14,borderRadius:'50%',
                  background:T.green,border:`2px solid ${T.surface}`,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:7,color:'#030a07',fontWeight:900
                }}>✓</div>
              )}
            </div>

            {/* Info */}
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:600,color:T.t1,marginBottom:3,
                overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {m.name}
              </div>
              {t ? (
                <div className="chip" style={{maxWidth:'fit-content'}}>
                  <span>{t.emoji}</span>
                  <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:140}}>{t.name}</span>
                </div>
              ) : (
                <span style={{fontSize:11,color:T.t4,fontStyle:'italic'}}>Unassigned</span>
              )}
              {(a?.done_at||a?.proof_url) && (
                <div style={{display:'flex',alignItems:'center',gap:10,marginTop:6}}>
                  {a.done_at && (
                    <span style={{fontSize:10,color:T.t4}}>
                      {new Date(a.done_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                    </span>
                  )}
                  {a.proof_url && (
                    <button onClick={()=>openPhoto(a.proof_url)} style={{
                      fontSize:10,color:T.green,fontWeight:600,background:'none',border:'none',
                      padding:0,display:'flex',alignItems:'center',gap:3
                    }}>
                      View proof →
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Status chip */}
            <div className={`chip ${isDone?'chip-done':'chip-pend'}`} style={{flexShrink:0,fontWeight:700,fontSize:11}}>
              {isDone ? 'Done' : 'Pending'}
            </div>
          </div>
        )
      })}

      {/* ══════ COMPLAINTS ══════ */}
      <div className="divider">
        <div className="divider-line"/>
        <span className="divider-text">Complaints</span>
        <div className="divider-line"/>
      </div>

      {/* Header row */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{
            width:34,height:34,borderRadius:T.radius.sm,flexShrink:0,
            background:T.purpleDim,border:`1px solid ${T.purpleBdr}`,
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:16
          }}>🕵️</div>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:T.t1}}>Anonymous Feed</div>
            <div style={{fontSize:11,color:T.t3,marginTop:1}}>
              {complaints.length > 0 ? `${complaints.length} open` : 'No complaints'}
            </div>
          </div>
        </div>

        <button className="btn-ghost" onClick={()=>setSheet(s=>!s)}>
          {showSheet ? 'Cancel' : '+ Post'}
        </button>
      </div>

      {/* Post form */}
      {showSheet && (
        <div className="card" style={{padding:'16px',marginBottom:12,animation:'fadeUp .2s ease'}}>
          <div style={{
            display:'flex',alignItems:'center',gap:8,marginBottom:12,
            padding:'8px 12px',borderRadius:T.radius.sm,
            background:T.purpleDim,border:`1px solid ${T.purpleBdr}`
          }}>
            <span style={{fontSize:12}}>🔒</span>
            <span style={{fontSize:12,color:T.t3}}>
              You appear as <span style={{color:T.purple,fontWeight:600}}>Anonymous</span> — identity is never revealed
            </span>
          </div>
          <textarea
            value={cMsg}
            onChange={e=>setCMsg(e.target.value.slice(0,400))}
            placeholder="Describe the issue — what happened, when, and where?"
            rows={4}
            style={{
              width:'100%',resize:'none',fontSize:13,lineHeight:1.7,
              borderRadius:T.radius.sm,padding:'11px 13px',display:'block',
              background:'rgba(0,0,0,.3)',border:`1px solid ${T.border}`,
              color:T.t1,marginBottom:10,transition:'border-color .2s'
            }}
          />
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:10,color:T.t4,flex:1}}>{cMsg.length}/400 characters</span>
            <button className="btn-primary" onClick={submitComplaint}
              disabled={cSubmit||!cMsg.trim()}
              style={{
                background:cSubmit||!cMsg.trim()?T.surfaceHi:T.purple,
                color:cSubmit||!cMsg.trim()?T.t4:'#fff',
                boxShadow:!cSubmit&&cMsg.trim()?`0 4px 16px ${T.purpleDim}`:'none'
              }}>
              {cSubmit ? 'Posting…' : 'Post Anonymously'}
            </button>
          </div>
        </div>
      )}

      {/* Complaints list */}
      {complaints.length===0 ? (
        <div className="card" style={{padding:'32px 20px',textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:10}}>✨</div>
          <div style={{fontSize:13,fontWeight:600,color:T.t2,marginBottom:4}}>No complaints</div>
          <div style={{fontSize:12,color:T.t3}}>The house is running smoothly</div>
        </div>
      ) : (
        <>
          {(showAll?complaints:complaints.slice(0,3)).map((c,idx)=>{
            const sender = cSettings?.complaints_reveal_identity
              ? members.find(m=>m.id===c.member_id) : null
            const diff = Date.now()-new Date(c.created_at).getTime()
            const mn=Math.floor(diff/60000),h=Math.floor(diff/3600000),d=Math.floor(diff/86400000)
            const ago = mn<1?'just now':mn<60?`${mn}m ago`:h<24?`${h}h ago`:`${d}d ago`

            return (
              <div key={c.id} className="complaint-card" style={{animationDelay:`${idx*.04}s`}}>
                {/* top row */}
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                  <div style={{
                    width:28,height:28,borderRadius:T.radius.sm,flexShrink:0,
                    background:T.purpleDim,border:`1px solid ${T.purpleBdr}`,
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:13
                  }}>🕵️</div>
                  <div style={{flex:1}}>
                    {sender ? (
                      <span style={{fontSize:12,fontWeight:600,color:T.purple}}>
                        {sender.avatar} {sender.name}
                        <span style={{fontSize:10,color:T.t4,fontWeight:400,marginLeft:6}}>· admin view</span>
                      </span>
                    ) : (
                      <span style={{fontSize:12,fontWeight:500,color:T.t3}}>Anonymous</span>
                    )}
                  </div>
                  <span style={{fontSize:10,color:T.t4,flexShrink:0}}>{ago}</span>
                </div>

                {/* message */}
                <p style={{fontSize:13,color:T.t2,lineHeight:1.7,margin:0}}>{c.message}</p>

                {profile?.is_admin && (
                  <div style={{display:'flex',justifyContent:'flex-end',marginTop:10}}>
                    <button onClick={()=>deleteComplaint(c.id)} className="btn-ghost"
                      style={{fontSize:11,padding:'5px 11px',color:T.red,borderColor:'rgba(248,113,113,.2)'}}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {complaints.length>3 && (
            <button className="btn-ghost" onClick={()=>setShowAll(s=>!s)}
              style={{width:'100%',padding:'10px',borderRadius:T.radius.sm,marginTop:4,fontSize:12}}>
              {showAll ? 'Show less ↑' : `Show ${complaints.length-3} more ↓`}
            </button>
          )}
        </>
      )}

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
          width:'100%',maxHeight:'72vh',borderRadius:T.radius.lg,
          objectFit:'contain',display:'block',
          border:`1px solid ${T.border}`,
          boxShadow:'0 32px 80px rgba(0,0,0,.8)'
        }} onError={onClose}/>

        <a href={url} download="proof.jpg" className="btn-ghost" style={{
          display:'flex',alignItems:'center',justifyContent:'center',gap:6,
          marginTop:10,textDecoration:'none',borderRadius:T.radius.sm,
          padding:'10px',fontSize:12,fontWeight:600
        }}>Download photo</a>
      </div>
    </div>
  )
}

export default function Dashboard() { return <ToastProvider><DashContent/></ToastProvider> }
