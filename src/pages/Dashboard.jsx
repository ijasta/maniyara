import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { getMembers, getCurrentAssignments, getSettings, supabase } from '../lib/supabase'
import { Avatar, ToastProvider, useToast } from '../components/UI'

/* ─── Keyframe styles injected once ─── */
const GLOBAL_STYLES = `
  @keyframes fadeUp   { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:none } }
  @keyframes fadeIn   { from { opacity:0 } to { opacity:1 } }
  @keyframes pulseGlow{ 0%,100%{ box-shadow:0 0 0 0 rgba(125,249,170,.0) } 50%{ box-shadow:0 0 18px 4px rgba(125,249,170,.18) } }
  @keyframes scanline { 0%{ transform:translateY(-100%) } 100%{ transform:translateY(100vh) } }
  @keyframes ticker   { 0%{ transform:translateX(0) } 100%{ transform:translateX(-50%) } }
  @keyframes spin     { to{ transform:rotate(360deg) } }
  @keyframes countUp  { from{ opacity:0;transform:scale(.7) } to{ opacity:1;transform:scale(1) } }
  @keyframes shimmer  { 0%{ background-position:-200% center } 100%{ background-position:200% center } }

  .dash-card {
    transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
  }
  .dash-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0,0,0,.35);
  }
  .member-row { animation: fadeUp .35s ease both; }
  .stat-box   { animation: countUp .4s cubic-bezier(.34,1.56,.64,1) both; }
`

function DashContent() {
  const { profile } = useAuth()
  const toast = useToast()
  const [members,    setMembers]    = useState([])
  const [assigns,    setAssigns]    = useState([])
  const [settings,   setSt]         = useState(null)
  const [week,       setWeek]       = useState(1)
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState('all')
  const [photoModal, setPhotoModal] = useState(null)
  const [complaints, setComplaints] = useState([])
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
    } catch(e) { toast('Failed to load: ' + e.message, 'error') }
    finally { setLoading(false) }
  }

  async function loadComplaints() {
    try {
      const [{ data: c }, { data: cs }] = await Promise.all([
        supabase.from('complaints').select('*').order('created_at', { ascending: false }),
        supabase.from('settings').select('complaints_reveal_identity').eq('id', 1).single()
      ])
      setComplaints(c || [])
      setCSt(cs)
    } catch(_) {}
  }

  const submitComplaint = async () => {
    if (!cMsg.trim() || cMsg.trim().length < 5) { toast('Write more detail', 'warn'); return }
    setCSub(true)
    try {
      const { data: { user: u } } = await supabase.auth.getUser()
      const { error } = await supabase.from('complaints').insert([{ message: cMsg.trim(), member_id: u?.id }])
      if (error) throw error
      toast('Posted anonymously ✅')
      setCMsg(''); setSheet(false); loadComplaints()
    } catch(e) { toast('Failed: ' + e.message, 'error') }
    finally { setCSub(false) }
  }

  const deleteComplaint = async (id) => {
    if (!confirm('Delete this complaint?')) return
    try { await supabase.from('complaints').delete().eq('id', id); toast('Deleted', 'warn'); loadComplaints() }
    catch(_) { toast('Failed', 'error') }
  }

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:80, gap:16 }}>
      <div style={{ width:36, height:36, borderRadius:'50%', border:'3px solid rgba(125,249,170,.15)', borderTopColor:'#7DF9AA', animation:'spin 1s linear infinite' }}/>
      <div style={{ fontFamily:'Orbitron,monospace', fontSize:11, color:'#4a5070', letterSpacing:3 }}>LOADING</div>
      <style>{GLOBAL_STYLES}</style>
    </div>
  )

  const doneCount    = assigns.filter(a => a.done).length
  const pendingCount = assigns.filter(a => !a.done).length
  const totalCount   = assigns.length
  const pct          = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  const filteredMembers = members.filter(m => {
    const a = assigns.find(x => x.member_id === m.id || x.members?.id === m.id)
    if (filter === 'done')    return a?.done === true
    if (filter === 'pending') return !a?.done
    return true
  })

  const today = new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })

  return (
    <div className="page-anim" style={{ paddingBottom: 32 }}>
      <style>{GLOBAL_STYLES}</style>

      {/* ── TOP HEADER ── */}
      <div style={{ marginBottom: 20, position:'relative' }}>
        {/* Ambient glow behind title */}
        <div style={{
          position:'absolute', top:-20, left:-20, width:200, height:80,
          background:'radial-gradient(ellipse,rgba(125,249,170,.12) 0%,transparent 70%)',
          pointerEvents:'none'
        }}/>
        <div style={{
          fontFamily:'Orbitron,monospace', fontWeight:900,
          fontSize:'clamp(22px,6vw,32px)', letterSpacing:2, lineHeight:1.1,
          position:'relative'
        }}>
          <span style={{ color:'#4a5568' }}>WK</span>
          <span style={{
            background:'linear-gradient(135deg,#7DF9AA 30%,#00ffcc)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            filter:'drop-shadow(0 0 16px rgba(125,249,170,.6))',
            margin:'0 8px'
          }}>{week}</span>
          <span style={{ color:'#E8F0FF' }}>DUTIES</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#7DF9AA', boxShadow:'0 0 8px #7DF9AA', animation:'pulseGlow 2s ease-in-out infinite' }}/>
          <span style={{ fontSize:12, color:'#6a7490' }}>{today}</span>
        </div>
      </div>

      {/* ── HOUSE BANNER ── */}
      <div className="dash-card" style={{
        background:'linear-gradient(135deg,#0a1a12 0%,#0a0d1f 60%,#0f0a1a 100%)',
        border:'1px solid rgba(125,249,170,.2)',
        borderRadius:16, padding:'16px 18px', marginBottom:16,
        position:'relative', overflow:'hidden'
      }}>
        {/* Corner accent */}
        <div style={{ position:'absolute', top:0, right:0, width:80, height:80,
          background:'radial-gradient(circle at top right,rgba(125,249,170,.1),transparent 70%)'}}/>
        <div style={{ position:'absolute', bottom:0, left:0, width:120, height:2,
          background:'linear-gradient(90deg,rgba(125,249,170,.4),transparent)'}}/>

        <div style={{ display:'flex', alignItems:'center', gap:14, position:'relative' }}>
          <div style={{
            width:52, height:52, borderRadius:14, flexShrink:0,
            background:'linear-gradient(135deg,rgba(125,249,170,.15),rgba(0,255,204,.08))',
            border:'1px solid rgba(125,249,170,.25)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:26
          }}>🏠</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:17, fontWeight:900, letterSpacing:1, color:'#E8F0FF' }}>
              {settings?.house_name || 'MANIYARA'}
            </div>
            <div style={{ fontSize:12, color:'#6a7490', marginTop:3 }}>
              Hey <span style={{ color:'#7DF9AA', fontWeight:700 }}>{profile?.name?.split(' ')[0]}</span> 👋 — Week {week} is live
            </div>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div style={{ fontSize:9, color:'#4a5070', fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em' }}>Crew</div>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:24, fontWeight:900, color:'#7DF9AA', lineHeight:1, marginTop:2 }}>{members.length}</div>
          </div>
        </div>
      </div>

      {/* ── STATS ROW ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:9, marginBottom:16 }}>
        {/* Done */}
        <div className="dash-card stat-box" style={{
          animationDelay:'.05s',
          background:'linear-gradient(145deg,rgba(125,249,170,.1),rgba(125,249,170,.04))',
          border:'1px solid rgba(125,249,170,.28)', borderRadius:14, padding:'14px 10px',
          textAlign:'center', position:'relative', overflow:'hidden'
        }}>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at 50% 0%,rgba(125,249,170,.08),transparent 70%)' }}/>
          <div style={{ fontSize:22, marginBottom:4 }}>✅</div>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:26, fontWeight:900, color:'#7DF9AA', lineHeight:1 }}>{doneCount}</div>
          <div style={{ fontSize:9, color:'#7DF9AA', fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', marginTop:5, opacity:.8 }}>Done</div>
        </div>

        {/* Pending */}
        <div className="dash-card stat-box" style={{
          animationDelay:'.1s',
          background:'linear-gradient(145deg,rgba(255,107,107,.09),rgba(255,107,107,.03))',
          border:'1px solid rgba(255,107,107,.25)', borderRadius:14, padding:'14px 10px',
          textAlign:'center', position:'relative', overflow:'hidden'
        }}>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at 50% 0%,rgba(255,107,107,.07),transparent 70%)' }}/>
          <div style={{ fontSize:22, marginBottom:4 }}>⏳</div>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:26, fontWeight:900, color:'#FF6B6B', lineHeight:1 }}>{pendingCount}</div>
          <div style={{ fontSize:9, color:'#FF6B6B', fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', marginTop:5, opacity:.8 }}>Pending</div>
        </div>

        {/* Progress % */}
        <div className="dash-card stat-box" style={{
          animationDelay:'.15s',
          background:'linear-gradient(145deg,rgba(77,150,255,.09),rgba(77,150,255,.03))',
          border:'1px solid rgba(77,150,255,.25)', borderRadius:14, padding:'14px 10px',
          textAlign:'center', position:'relative', overflow:'hidden'
        }}>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at 50% 0%,rgba(77,150,255,.07),transparent 70%)' }}/>
          <div style={{ fontSize:22, marginBottom:4 }}>📊</div>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:26, fontWeight:900, color:'#4D96FF', lineHeight:1 }}>{pct}<span style={{fontSize:14}}>%</span></div>
          <div style={{ fontSize:9, color:'#4D96FF', fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', marginTop:5, opacity:.8 }}>Done</div>
        </div>
      </div>

      {/* ── PROGRESS BAR ── */}
      <div style={{ marginBottom:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <span style={{ fontSize:11, color:'#6a7490', fontWeight:600 }}>Week Progress</span>
          <span style={{ fontSize:11, fontFamily:'Orbitron,monospace', fontWeight:700, color: pct===100?'#7DF9AA':'#4a5070' }}>
            {doneCount}/{totalCount}
          </span>
        </div>
        <div style={{ height:7, borderRadius:99, background:'rgba(255,255,255,.06)', overflow:'hidden' }}>
          <div style={{
            height:'100%', borderRadius:99,
            width: `${pct}%`,
            background: pct === 100
              ? 'linear-gradient(90deg,#7DF9AA,#00ffcc)'
              : 'linear-gradient(90deg,#4D96FF,#7DF9AA)',
            boxShadow: pct === 100 ? '0 0 12px rgba(125,249,170,.5)' : '0 0 8px rgba(77,150,255,.4)',
            transition: 'width .6s cubic-bezier(.4,0,.2,1)',
          }}/>
        </div>
      </div>

      {/* ── CREW HEADER + FILTERS ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ fontFamily:'Orbitron,monospace', fontWeight:900, fontSize:'clamp(14px,4vw,18px)', letterSpacing:1 }}>
          THE <span style={{ background:'linear-gradient(135deg,#7DF9AA,#00ffcc)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>CREW</span>
        </div>
        <span style={{ fontSize:11, color:'#4a5070', fontWeight:600 }}>{filteredMembers.length} shown</span>
      </div>

      {/* Filter pills */}
      <div style={{
        display:'flex', gap:6, marginBottom:14,
        background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)',
        borderRadius:12, padding:4
      }}>
        {[['all','All 👥'], ['done','✅ Done'], ['pending','⏳ Pending']].map(([id, lb]) => (
          <button key={id} onClick={() => setFilter(id)} style={{
            flex:1, padding:'8px 4px', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer',
            border:'none', fontFamily:'Rajdhani,sans-serif', letterSpacing:'.04em',
            background: filter === id ? '#7DF9AA' : 'transparent',
            color: filter === id ? '#070810' : '#6a7490',
            transition:'all .15s'
          }}>
            {lb}
          </button>
        ))}
      </div>

      {/* ── MEMBER CARDS ── */}
      {filteredMembers.length === 0 ? (
        <div style={{ textAlign:'center', padding:'48px 20px', color:'#4a5070', animation:'fadeUp .3s ease' }}>
          <div style={{ fontSize:44, marginBottom:10 }}>🎉</div>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:13, fontWeight:700, color:'#7DF9AA', letterSpacing:1 }}>ALL CLEAR</div>
          <div style={{ fontSize:12, marginTop:6, color:'#4a5070' }}>
            {filter === 'pending' ? 'Everyone completed their task!' : 'No members found.'}
          </div>
        </div>
      ) : filteredMembers.map((m, idx) => {
        const a = assigns.find(x => x.member_id === m.id || x.members?.id === m.id)
        const t = a?.tasks
        const done = a?.done

        return (
          <div key={m.id} className="dash-card member-row" style={{
            animationDelay: `${idx * 0.04}s`,
            background: done
              ? 'linear-gradient(135deg,rgba(10,25,16,.9),rgba(10,12,26,.9))'
              : 'linear-gradient(135deg,rgba(20,10,10,.9),rgba(10,12,26,.9))',
            border:`1px solid ${done ? 'rgba(125,249,170,.2)' : 'rgba(255,107,107,.15)'}`,
            borderRadius:14, padding:'13px 14px', marginBottom:9,
            position:'relative', overflow:'hidden'
          }}>
            {/* Top accent line */}
            <div style={{
              position:'absolute', top:0, left:0, right:0, height:2,
              background:`linear-gradient(90deg,transparent 0%,${done?'#7DF9AA':'#FF6B6B'} 40%,transparent 100%)`,
              opacity: done ? .5 : .35
            }}/>

            {/* Subtle side glow */}
            <div style={{
              position:'absolute', left:0, top:0, bottom:0, width:3, borderRadius:'0 2px 2px 0',
              background: done
                ? 'linear-gradient(180deg,#7DF9AA,rgba(125,249,170,.1))'
                : 'linear-gradient(180deg,#FF6B6B,rgba(255,107,107,.1))'
            }}/>

            <div style={{ display:'flex', alignItems:'center', gap:12, paddingLeft:6 }}>
              {/* Avatar */}
              <div style={{ position:'relative', flexShrink:0 }}>
                <Avatar emoji={m.avatar} color={m.color} size={44}/>
                {done && (
                  <div style={{
                    position:'absolute', bottom:-2, right:-2,
                    width:16, height:16, borderRadius:'50%', fontSize:9,
                    background:'#7DF9AA', border:'2px solid #0a0c1a',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    boxShadow:'0 0 8px rgba(125,249,170,.5)'
                  }}>✓</div>
                )}
              </div>

              {/* Info */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:15, fontWeight:800, color:'#E8F0FF', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name}</div>
                {m.username && <div style={{ fontSize:11, color:'#4a5070', marginTop:1 }}>@{m.username}</div>}
                {t ? (
                  <div style={{
                    display:'inline-flex', alignItems:'center', gap:5, marginTop:5,
                    background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)',
                    borderRadius:99, padding:'3px 10px'
                  }}>
                    <span style={{ fontSize:13 }}>{t.emoji}</span>
                    <span style={{ fontSize:12, color:'#8890b0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:160 }}>{t.name}</span>
                  </div>
                ) : (
                  <div style={{ fontSize:11, color:'#3a4060', marginTop:5, fontStyle:'italic' }}>No task assigned</div>
                )}
              </div>

              {/* Status badge */}
              <div style={{
                flexShrink:0, padding:'7px 13px', borderRadius:99, fontWeight:800, fontSize:12,
                fontFamily:'Rajdhani,sans-serif', letterSpacing:'.05em',
                background: done ? 'rgba(125,249,170,.13)' : 'rgba(255,107,107,.1)',
                border:`1px solid ${done ? 'rgba(125,249,170,.3)' : 'rgba(255,107,107,.22)'}`,
                color: done ? '#7DF9AA' : '#FF6B6B',
                boxShadow: done ? '0 0 14px rgba(125,249,170,.12)' : 'none'
              }}>
                {done ? '✅ DONE' : '⏳ PENDING'}
              </div>
            </div>

            {/* Done timestamp + proof */}
            {(a?.done_at || a?.proof_url) && (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:9, paddingLeft:62 }}>
                {a.done_at && (
                  <div style={{ fontSize:10, color:'#3a4a3a' }}>
                    ✓ {new Date(a.done_at).toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                  </div>
                )}
                {a.proof_url && (
                  <button onClick={() => {
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
                    style={{ fontSize:11, color:'#7DF9AA', fontWeight:700, background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'inherit', display:'flex', alignItems:'center', gap:4 }}>
                    📸 View Proof
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* ── COMPLAINTS SECTION ── */}
      <div style={{ marginTop:28 }}>
        {/* Divider */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
          <div style={{ flex:1, height:1, background:'linear-gradient(90deg,rgba(192,132,252,.2),transparent)' }}/>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:11, fontWeight:700, color:'#C084FC', letterSpacing:2 }}>COMPLAINTS</div>
          <div style={{ flex:1, height:1, background:'linear-gradient(90deg,transparent,rgba(192,132,252,.2))' }}/>
        </div>

        {/* Header row */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:20 }}>🕵️</span>
            <span style={{ fontFamily:'Orbitron,monospace', fontWeight:900, fontSize:15, letterSpacing:.5 }}>
              <span style={{ background:'linear-gradient(135deg,#C084FC,#818CF8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>ANONYMOUS</span>
            </span>
            {complaints.length > 0 && (
              <span style={{
                fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99,
                background:'rgba(192,132,252,.12)', border:'1px solid rgba(192,132,252,.25)', color:'#C084FC'
              }}>
                {complaints.length}
              </span>
            )}
          </div>
          <button onClick={() => setSheet(s => !s)} style={{
            padding:'8px 16px', borderRadius:99, fontFamily:'Rajdhani,sans-serif', fontWeight:800, fontSize:12,
            cursor:'pointer', letterSpacing:'.06em',
            border:'1px solid rgba(192,132,252,.3)',
            background: showSheet ? 'rgba(192,132,252,.18)' : 'rgba(192,132,252,.08)',
            color:'#C084FC', transition:'all .15s'
          }}>
            {showSheet ? '✕ Cancel' : '+ Post'}
          </button>
        </div>

        {/* Post sheet */}
        {showSheet && (
          <div style={{
            background:'linear-gradient(135deg,#0c0d1e,#100c1e)',
            border:'1px solid rgba(192,132,252,.2)', borderRadius:16,
            padding:'16px', marginBottom:14, animation:'fadeUp .2s ease'
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12,
              background:'rgba(192,132,252,.07)', borderRadius:9, padding:'8px 12px',
              border:'1px solid rgba(192,132,252,.1)'
            }}>
              <span style={{ fontSize:15 }}>🔒</span>
              <span style={{ fontSize:12, color:'#8a70a0' }}>Posted as <strong style={{ color:'#C084FC' }}>Anonymous</strong> — no one sees your identity</span>
            </div>
            <textarea
              value={cMsg}
              onChange={e => setCMsg(e.target.value.slice(0, 400))}
              placeholder="Describe the issue clearly… What? When? Where?"
              rows={4}
              style={{
                width:'100%', resize:'none', fontSize:13, lineHeight:1.7, borderRadius:11,
                padding:'12px', boxSizing:'border-box', fontFamily:'inherit',
                background:'rgba(0,0,0,.3)', border:'1px solid rgba(192,132,252,.15)',
                color:'#E8F0FF', outline:'none', marginBottom:10,
                transition:'border-color .2s'
              }}
            />
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <span style={{ fontSize:10, color:'#4a5070', flex:1 }}>{cMsg.length}/400</span>
              <button onClick={submitComplaint} disabled={cSubmit || !cMsg.trim()}
                style={{
                  padding:'9px 20px', borderRadius:10, fontSize:13, fontWeight:800, cursor:'pointer', border:'none',
                  fontFamily:'Rajdhani,sans-serif', letterSpacing:'.05em',
                  background: cSubmit || !cMsg.trim() ? '#1a2030' : 'linear-gradient(135deg,#C084FC,#818CF8)',
                  color:'#fff', opacity: cSubmit || !cMsg.trim() ? 0.5 : 1,
                  boxShadow: !cSubmit && cMsg.trim() ? '0 4px 16px rgba(192,132,252,.35)' : 'none',
                  transition:'all .15s'
                }}>
                {cSubmit ? '⏳ Posting...' : '🕵️ Post Anonymously'}
              </button>
            </div>
          </div>
        )}

        {/* Complaints list */}
        {complaints.length === 0 ? (
          <div style={{
            background:'linear-gradient(135deg,#0c0d1e,#0a0c18)',
            border:'1px solid rgba(192,132,252,.08)', borderRadius:16,
            padding:'32px 20px', textAlign:'center'
          }}>
            <div style={{ fontSize:36, marginBottom:10 }}>✨</div>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:12, fontWeight:700, color:'#4a5070', letterSpacing:1 }}>ALL GOOD</div>
            <div style={{ fontSize:12, color:'#3a4060', marginTop:6 }}>No complaints — the house is vibing</div>
          </div>
        ) : (
          <>
            {(showAll ? complaints : complaints.slice(0, 3)).map((c, idx) => {
              const sender = cSettings?.complaints_reveal_identity
                ? members.find(m => m.id === c.member_id)
                : null
              const timeAgo = (() => {
                const diff = Date.now() - new Date(c.created_at).getTime()
                const mn = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000)
                return mn < 1 ? 'just now' : mn < 60 ? `${mn}m ago` : h < 24 ? `${h}h ago` : `${d}d ago`
              })()

              return (
                <div key={c.id} className="dash-card" style={{
                  animation:`fadeUp .3s ease ${idx*.05}s both`,
                  background:'linear-gradient(135deg,#0c0d20,#0a0c1a)',
                  border:'1px solid rgba(192,132,252,.12)',
                  borderRadius:14, padding:'13px 15px', marginBottom:9,
                  position:'relative', overflow:'hidden'
                }}>
                  {/* Left accent */}
                  <div style={{
                    position:'absolute', left:0, top:'12%', bottom:'12%', width:3, borderRadius:'0 3px 3px 0',
                    background:'linear-gradient(180deg,#C084FC,#818CF8)'
                  }}/>
                  <div style={{ paddingLeft:12 }}>
                    {/* Top row */}
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:9 }}>
                      <div style={{
                        width:30, height:30, borderRadius:9, flexShrink:0,
                        background:'rgba(192,132,252,.1)', border:'1px solid rgba(192,132,252,.2)',
                        display:'flex', alignItems:'center', justifyContent:'center', fontSize:15
                      }}>🕵️</div>
                      <div style={{ flex:1 }}>
                        {sender ? (
                          <div style={{ fontSize:12, fontWeight:700, color:'#C084FC' }}>
                            {sender.avatar} {sender.name}
                            <span style={{ fontSize:10, color:'#4a5070', fontWeight:400, marginLeft:6 }}>(visible to admin)</span>
                          </div>
                        ) : (
                          <div style={{ fontSize:12, fontWeight:700, color:'#6a5070' }}>Anonymous Member</div>
                        )}
                      </div>
                      <span style={{ fontSize:10, color:'#3a4060', flexShrink:0 }}>{timeAgo}</span>
                    </div>

                    {/* Message */}
                    <div style={{
                      fontSize:13, color:'#c0c8e0', lineHeight:1.65,
                      background:'rgba(255,255,255,.025)', borderRadius:9, padding:'10px 12px',
                      border:'1px solid rgba(255,255,255,.04)'
                    }}>
                      {c.message}
                    </div>

                    {profile?.is_admin && (
                      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:9 }}>
                        <button onClick={() => deleteComplaint(c.id)} style={{
                          padding:'6px 13px', borderRadius:8, fontSize:11, fontWeight:700, cursor:'pointer',
                          fontFamily:'Rajdhani,sans-serif', border:'1px solid rgba(255,107,107,.2)',
                          background:'rgba(255,107,107,.07)', color:'#FF6B6B',
                          display:'flex', alignItems:'center', gap:5
                        }}>
                          🗑️ Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {complaints.length > 3 && (
              <button onClick={() => setShowAll(s => !s)} style={{
                width:'100%', padding:'10px', borderRadius:11, fontFamily:'Rajdhani,sans-serif',
                fontWeight:700, fontSize:13, cursor:'pointer',
                border:'1px solid rgba(192,132,252,.15)',
                background:'rgba(192,132,252,.05)', color:'#C084FC', marginTop:2
              }}>
                {showAll ? '▲ Show Less' : `▼ Show ${complaints.length - 3} More`}
              </button>
            )}
          </>
        )}
      </div>

      <PhotoModal url={photoModal} onClose={() => setPhotoModal(null)} />
    </div>
  )
}

function PhotoModal({ url, onClose }) {
  if (!url) return null
  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, zIndex:9999,
      background:'rgba(0,0,0,.94)', backdropFilter:'blur(8px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:16,
      animation:'fadeIn .2s ease'
    }}>
      <div onClick={e => e.stopPropagation()} style={{ position:'relative', maxWidth:'100%', maxHeight:'90vh' }}>
        <img src={url} alt="Proof" style={{
          maxWidth:'100%', maxHeight:'85vh', borderRadius:16, objectFit:'contain', display:'block',
          boxShadow:'0 0 60px rgba(0,0,0,.9), 0 0 0 1px rgba(125,249,170,.15)'
        }} onError={onClose}/>
        <button onClick={onClose} style={{
          position:'absolute', top:-14, right:-14, width:34, height:34, borderRadius:'50%',
          background:'#FF6B6B', border:'2px solid #0a0c1a', color:'#fff', fontSize:16,
          cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          fontWeight:900, boxShadow:'0 4px 12px rgba(255,107,107,.4)'
        }}>✕</button>
        <a href={url} download="proof.jpg" style={{
          display:'block', marginTop:12, textAlign:'center',
          color:'#7DF9AA', fontSize:13, fontWeight:700, textDecoration:'none',
          fontFamily:'Rajdhani,sans-serif', letterSpacing:'.05em'
        }}>⬇️ SAVE PHOTO</a>
      </div>
    </div>
  )
}

export default function Dashboard() { return <ToastProvider><DashContent /></ToastProvider> }
