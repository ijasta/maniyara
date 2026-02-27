import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'

// ── TOAST ─────────────────────────────────────────────────
const ToastCtx = createContext(null)
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const add = useCallback((msg, type='ok') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200)
  }, [])
  return (
    <ToastCtx.Provider value={add}>
      {children}
      <div style={{ position:'fixed', bottom:74, left:10, right:10, zIndex:9999, display:'flex', flexDirection:'column', gap:7, pointerEvents:'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background:'#131525', borderRadius:10, padding:'11px 14px',
            fontSize:13, fontWeight:700, display:'flex', alignItems:'center', gap:8,
            boxShadow:'0 6px 20px rgba(0,0,0,.55)',
            border: t.type==='ok' ? '1px solid rgba(125,249,170,.35)' : t.type==='warn' ? '1px solid rgba(255,217,61,.35)' : '1px solid rgba(255,107,107,.35)',
            animation:'toastIn .2s cubic-bezier(.34,1.5,.64,1)',
          }}>
            {t.type==='ok'?'✅':t.type==='warn'?'⚠️':'❌'} {t.msg}
          </div>
        ))}
      </div>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
    </ToastCtx.Provider>
  )
}
export const useToast = () => useContext(ToastCtx)

// ── AVATAR ────────────────────────────────────────────────
export function Avatar({ emoji='🧑', color='#7DF9AA', size=34 }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%', background:color, flexShrink:0,
      display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*.52,
    }}>{emoji}</div>
  )
}

// ── RING ─────────────────────────────────────────────────
export function Ring({ pct=0, size=70, color='#7DF9AA' }) {
  const sk=5, r=(size-sk*2)/2, ci=2*Math.PI*r, off=ci*(1-pct/100)
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={sk}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sk}
        strokeDasharray={ci} strokeDashoffset={off} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x="50%" y="50%" textAnchor="middle" dy=".35em" fill={color}
        fontSize={size*.19} fontFamily="Orbitron,monospace" fontWeight="700">{pct}%</text>
    </svg>
  )
}

// ── BTN ───────────────────────────────────────────────────
export function Btn({ children, onClick, variant='primary', sm, full, loading:ld, disabled, style={} }) {
  const base = {
    display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6,
    padding: sm ? '8px 13px' : '11px 18px',
    borderRadius:9, fontSize: sm ? 12 : 14, fontWeight:700,
    cursor: (ld||disabled) ? 'not-allowed' : 'pointer',
    border:'none', fontFamily:'Rajdhani,sans-serif', letterSpacing:'.05em',
    transition:'transform .1s', opacity:(ld||disabled)?.6:1,
    WebkitTapHighlightColor:'transparent', whiteSpace:'nowrap',
    width: full ? '100%' : undefined,
    ...style,
  }
  const variants = {
    primary: { background:'linear-gradient(135deg,#7DF9AA,#00D4AA)', color:'#070810', boxShadow:'0 3px 14px rgba(125,249,170,.25)' },
    ghost:   { background:'rgba(255,255,255,.05)', color:'#E8F0FF', border:'1px solid rgba(125,249,170,.18)' },
    danger:  { background:'rgba(255,107,107,.1)', color:'#FF6B6B', border:'1px solid rgba(255,107,107,.22)' },
    wa:      { background:'linear-gradient(135deg,#25D366,#128C7E)', color:'#fff' },
    warn:    { background:'rgba(255,217,61,.1)', color:'#FFD93D', border:'1px solid rgba(255,217,61,.22)' },
  }
  return (
    <button style={{ ...base, ...variants[variant] }} onClick={onClick} disabled={ld||disabled}
      onMouseDown={e=>e.currentTarget.style.transform='scale(.93)'}
      onMouseUp={e=>e.currentTarget.style.transform=''}
      onMouseLeave={e=>e.currentTarget.style.transform=''}>
      {ld ? '⏳' : children}
    </button>
  )
}

// ── TOGGLE ────────────────────────────────────────────────
export function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} style={{
      width:44, height:24, borderRadius:99, border:'none', cursor:'pointer',
      background: value ? '#7DF9AA' : '#1a1d30', position:'relative',
      transition:'background .15s', flexShrink:0,
      boxShadow: value ? '0 0 10px rgba(125,249,170,.4)' : 'none',
    }}>
      <span style={{
        position:'absolute', top:3, left: value ? 'calc(100% - 21px)' : 3,
        width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left .15s',
      }}/>
    </button>
  )
}

// ── CARD ─────────────────────────────────────────────────
export function Card({ children, color, style={} }) {
  return (
    <div style={{
      background:'#0d0e1a', border:'1px solid rgba(125,249,170,.09)',
      borderRadius:13, padding:14, position:'relative', overflow:'hidden',
      marginBottom:10, ...style,
    }}>
      {color && <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${color},transparent)`,opacity:.5}}/>}
      {children}
    </div>
  )
}

// ── SCORE BAR ────────────────────────────────────────────
export function ScoreBar({ score=0 }) {
  const pct = Math.min(100, score)
  return (
    <div style={{display:'flex',alignItems:'center',gap:7}}>
      <div style={{flex:1,height:5,background:'rgba(255,255,255,.06)',borderRadius:99,overflow:'hidden'}}>
        <div style={{width:`${pct}%`,height:'100%',background:'linear-gradient(90deg,#7DF9AA,#4DF8C8)',borderRadius:99}}/>
      </div>
      <span style={{fontFamily:'Orbitron,monospace',fontSize:11,color:'#7DF9AA',fontWeight:700,flexShrink:0}}>{score}</span>
    </div>
  )
}

// ── SEC HEADER ───────────────────────────────────────────
export function SecHead({ title, badge }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:9,margin:'18px 0 11px',fontFamily:'Orbitron,monospace',fontSize:10,fontWeight:700,letterSpacing:2,color:'#7DF9AA',textTransform:'uppercase'}}>
      {title}
      {badge && <span style={{fontSize:11,color:'#8890b0',fontFamily:'Rajdhani,sans-serif',letterSpacing:0,fontWeight:600}}>{badge}</span>}
      <div style={{flex:1,height:1,background:'linear-gradient(90deg,rgba(125,249,170,.2),transparent)'}}/>
    </div>
  )
}

// ── STATUS BADGE ─────────────────────────────────────────
export function StatusBadge({ done, overdue }) {
  const cfg = done
    ? { bg:'rgba(125,249,170,.1)', border:'rgba(125,249,170,.2)', color:'#7DF9AA', label:'✓ DONE' }
    : overdue
    ? { bg:'rgba(255,107,107,.1)', border:'rgba(255,107,107,.2)', color:'#FF6B6B', label:'⚠ OVERDUE' }
    : { bg:'rgba(255,217,61,.1)',  border:'rgba(255,217,61,.2)',  color:'#FFD93D', label:'⏳ PENDING' }
  return (
    <div style={{display:'inline-flex',alignItems:'center',gap:4,marginTop:10,padding:'4px 10px',borderRadius:99,
      background:cfg.bg,border:`1px solid ${cfg.border}`,color:cfg.color,fontSize:10,fontWeight:700,letterSpacing:'.07em'}}>
      {cfg.label}
    </div>
  )
}

// ── CONFETTI ─────────────────────────────────────────────
export function Confetti({ active, onDone }) {
  const ref = useRef()
  useEffect(() => {
    if (!active) return
    const c = ref.current, ctx = c.getContext('2d')
    c.width = window.innerWidth; c.height = window.innerHeight
    const n = window.innerWidth < 600 ? 40 : 80
    const COLORS = ['#FF6B6B','#FFD93D','#6BCB77','#4D96FF','#C77DFF','#FF9A3C','#00D4AA']
    const p = Array.from({length:n}, () => ({
      x:Math.random()*c.width, y:-20, vx:(Math.random()-.5)*5,
      vy:Math.random()*3+1.5, rot:Math.random()*360,
      rv:(Math.random()-.5)*6, sz:Math.random()*7+3,
      color:COLORS[Math.floor(Math.random()*COLORS.length)], circ:Math.random()>.5
    }))
    let alive = true
    const loop = () => {
      if (!alive) return
      ctx.clearRect(0,0,c.width,c.height)
      let done = true
      p.forEach(q => {
        q.x+=q.vx; q.y+=q.vy; q.rot+=q.rv; q.vy+=.08
        if (q.y < c.height+10) done = false
        ctx.save(); ctx.translate(q.x,q.y); ctx.rotate(q.rot*Math.PI/180)
        ctx.fillStyle=q.color; ctx.globalAlpha=Math.max(0,1-q.y/c.height)
        q.circ ? (ctx.beginPath(),ctx.arc(0,0,q.sz/2,0,Math.PI*2),ctx.fill())
               : ctx.fillRect(-q.sz/2,-q.sz/4,q.sz,q.sz/2)
        ctx.restore()
      })
      if (done) { alive=false; onDone?.(); return }
      requestAnimationFrame(loop)
    }
    loop()
    return () => { alive = false }
  }, [active])
  return <canvas ref={ref} style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:9998,display:active?'block':'none'}}/>
}

// ── FORM FIELD ───────────────────────────────────────────
export function Field({ label, children }) {
  return (
    <div style={{marginBottom:12}}>
      {label && <label style={{display:'block',fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.09em',marginBottom:5}}>{label}</label>}
      {children}
    </div>
  )
}

export const inp = {
  width:'100%', background:'#131525', border:'1px solid rgba(125,249,170,.2)',
  borderRadius:8, padding:'11px 13px', color:'#E8F0FF', fontSize:'16px',
  fontFamily:'Rajdhani,sans-serif', fontWeight:500, outline:'none',
  WebkitAppearance:'none', appearance:'none', transition:'border-color .15s',
}
