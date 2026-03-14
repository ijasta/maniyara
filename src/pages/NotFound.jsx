import { useEffect, useState, useRef } from 'react'

/* ─── glitch keyframes injected once ─── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;700&family=Syne+Mono&display=swap');

  @keyframes flicker {
    0%,19%,21%,23%,25%,54%,56%,100% { opacity:1 }
    20%,24%,55% { opacity:.4 }
  }
  @keyframes scanline {
    0%   { transform:translateY(-100%) }
    100% { transform:translateY(100vh) }
  }
  @keyframes glitch1 {
    0%,100% { clip-path:inset(0 0 98% 0); transform:translate(-4px,0) }
    20%     { clip-path:inset(30% 0 50% 0); transform:translate(4px,0) }
    40%     { clip-path:inset(70% 0 10% 0); transform:translate(-2px,0) }
    60%     { clip-path:inset(10% 0 80% 0); transform:translate(3px,0) }
    80%     { clip-path:inset(50% 0 30% 0); transform:translate(-3px,0) }
  }
  @keyframes glitch2 {
    0%,100% { clip-path:inset(98% 0 0 0); transform:translate(4px,0) }
    20%     { clip-path:inset(10% 0 70% 0); transform:translate(-4px,0) }
    40%     { clip-path:inset(60% 0 20% 0); transform:translate(2px,0) }
    60%     { clip-path:inset(80% 0 5% 0); transform:translate(-3px,0) }
    80%     { clip-path:inset(20% 0 60% 0); transform:translate(3px,0) }
  }
  @keyframes fadeUp {
    from { opacity:0; transform:translateY(20px) }
    to   { opacity:1; transform:none }
  }
  @keyframes blink {
    0%,100% { opacity:1 } 50% { opacity:0 }
  }
  @keyframes pulse-ring {
    0%   { transform:scale(.95); box-shadow:0 0 0 0 rgba(255,59,48,.5) }
    70%  { transform:scale(1);   box-shadow:0 0 0 16px rgba(255,59,48,0) }
    100% { transform:scale(.95); box-shadow:0 0 0 0 rgba(255,59,48,0) }
  }
  @keyframes float {
    0%,100% { transform:translateY(0px) }
    50%     { transform:translateY(-10px) }
  }
  @keyframes noise {
    0%,100% { background-position:0 0 }
    10%  { background-position:-5% -10% }
    30%  { background-position:3% 5% }
    50%  { background-position:-3% 8% }
    70%  { background-position:5% -5% }
    90%  { background-position:-2% 3% }
  }
`

function GlitchText({ text, size = 80 }) {
  return (
    <div style={{ position:'relative', display:'inline-block', lineHeight:1 }}>
      {/* base */}
      <span style={{
        fontFamily:"'Syne Mono', monospace",
        fontSize:size, fontWeight:700,
        color:'#fff',
        textShadow:'0 0 40px rgba(255,59,48,.6), 0 0 80px rgba(255,59,48,.3)',
        animation:'flicker 4s infinite',
        letterSpacing:'-2px',
        display:'block'
      }}>{text}</span>
      {/* glitch layer 1 */}
      <span aria-hidden style={{
        position:'absolute', inset:0,
        fontFamily:"'Syne Mono', monospace",
        fontSize:size, fontWeight:700, letterSpacing:'-2px',
        color:'#ff3b30',
        animation:'glitch1 2.5s infinite steps(1)',
        pointerEvents:'none'
      }}>{text}</span>
      {/* glitch layer 2 */}
      <span aria-hidden style={{
        position:'absolute', inset:0,
        fontFamily:"'Syne Mono', monospace",
        fontSize:size, fontWeight:700, letterSpacing:'-2px',
        color:'#0af',
        animation:'glitch2 2.5s infinite steps(1)',
        pointerEvents:'none'
      }}>{text}</span>
    </div>
  )
}

function Particles() {
  const particles = Array.from({length:24}, (_,i) => ({
    id: i,
    x: Math.random()*100,
    y: Math.random()*100,
    size: Math.random()*2 + 1,
    dur: Math.random()*8 + 4,
    delay: Math.random()*6,
    opacity: Math.random()*.4 + .1
  }))

  return (
    <div style={{position:'absolute',inset:0,pointerEvents:'none',overflow:'hidden'}}>
      {particles.map(p => (
        <div key={p.id} style={{
          position:'absolute',
          left:`${p.x}%`, top:`${p.y}%`,
          width:p.size, height:p.size,
          borderRadius:'50%',
          background:'rgba(255,59,48,.6)',
          animation:`float ${p.dur}s ${p.delay}s ease-in-out infinite`,
          opacity:p.opacity
        }}/>
      ))}
    </div>
  )
}

export default function NotFound({ isMaintenance = false, isAdmin = false, onOverride = null }) {
  const [countdown, setCountdown] = useState(null)
  const [typed, setTyped] = useState('')
  const fullText = isMaintenance
    ? '> SYSTEM_MAINTENANCE_MODE :: ACTIVE'
    : '> ERROR_CODE :: 404 :: RESOURCE_NOT_FOUND'

  /* typewriter */
  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      setTyped(fullText.slice(0, i + 1))
      i++
      if (i >= fullText.length) clearInterval(interval)
    }, 38)
    return () => clearInterval(interval)
  }, [fullText])

  const codeLines = isMaintenance ? [
    '  status:      MAINTENANCE',
    '  reason:      Scheduled upgrade in progress',
    '  admin:       Maniyara team',
    '  eta:         Back soon™',
  ] : [
    '  status:      404 NOT FOUND',
    '  path:        /unknown',
    '  timestamp:   ' + new Date().toISOString().slice(0,19)+'Z',
    '  trace_id:    mny_' + Math.random().toString(36).slice(2,10),
  ]

  return (
    <>
      <style>{CSS}</style>
      <div style={{
        minHeight:'100vh', width:'100%',
        background:'#060608',
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        position:'relative', overflow:'hidden',
        fontFamily:"'Space Grotesk', sans-serif",
        padding:'24px 20px'
      }}>

        {/* Radial glow bg */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none',
          background:'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,59,48,.07) 0%, transparent 70%)'
        }}/>

        {/* Grid lines */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none', opacity:.06,
          backgroundImage:`
            linear-gradient(rgba(255,59,48,.8) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,59,48,.8) 1px, transparent 1px)
          `,
          backgroundSize:'60px 60px'
        }}/>

        {/* Scanline */}
        <div style={{
          position:'absolute', left:0, right:0, height:2,
          background:'linear-gradient(90deg,transparent,rgba(255,59,48,.15),transparent)',
          animation:'scanline 6s linear infinite',
          pointerEvents:'none'
        }}/>

        {/* Noise overlay */}
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none', opacity:.03,
          backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          animation:'noise 1s steps(2) infinite'
        }}/>

        <Particles/>

        {/* Main content */}
        <div style={{
          position:'relative', zIndex:2,
          display:'flex', flexDirection:'column',
          alignItems:'center', gap:0, maxWidth:560, width:'100%'
        }}>

          {/* Status dot */}
          <div style={{
            width:14, height:14, borderRadius:'50%',
            background:'#ff3b30',
            animation:'pulse-ring 2s infinite',
            marginBottom:32
          }}/>

          {/* Big glitch number */}
          <div style={{marginBottom:8, animation:'fadeUp .5s .1s ease both', opacity:0}}>
            <GlitchText text={isMaintenance ? '503' : '404'} size={96}/>
          </div>

          {/* Sub-headline */}
          <div style={{
            fontFamily:"'Syne Mono', monospace",
            fontSize:14, color:'rgba(255,255,255,.35)',
            letterSpacing:4, textTransform:'uppercase',
            marginBottom:40,
            animation:'fadeUp .5s .25s ease both', opacity:0
          }}>
            {isMaintenance ? 'Service Unavailable' : 'Not Found'}
          </div>

          {/* Terminal card */}
          <div style={{
            width:'100%',
            background:'rgba(255,255,255,.03)',
            border:'1px solid rgba(255,59,48,.2)',
            borderRadius:14,
            overflow:'hidden',
            marginBottom:28,
            animation:'fadeUp .5s .4s ease both', opacity:0,
            boxShadow:'0 0 40px rgba(255,59,48,.06), inset 0 0 40px rgba(0,0,0,.3)'
          }}>
            {/* Terminal top bar */}
            <div style={{
              display:'flex', alignItems:'center', gap:7,
              padding:'10px 16px',
              background:'rgba(255,255,255,.04)',
              borderBottom:'1px solid rgba(255,255,255,.06)'
            }}>
              <div style={{width:10,height:10,borderRadius:'50%',background:'#ff3b30'}}/>
              <div style={{width:10,height:10,borderRadius:'50%',background:'rgba(255,255,255,.1)'}}/>
              <div style={{width:10,height:10,borderRadius:'50%',background:'rgba(255,255,255,.1)'}}/>
              <span style={{
                marginLeft:8, fontSize:10,
                color:'rgba(255,255,255,.25)',
                fontFamily:"'Syne Mono', monospace",
                letterSpacing:2
              }}>maniyara.log</span>
            </div>

            {/* Terminal body */}
            <div style={{padding:'18px 20px'}}>
              {/* Typewriter line */}
              <div style={{
                fontFamily:"'Syne Mono', monospace",
                fontSize:12, color:'#ff3b30',
                marginBottom:16, lineHeight:1.6
              }}>
                {typed}
                <span style={{animation:'blink .7s infinite',marginLeft:2,color:'rgba(255,59,48,.7)'}}>█</span>
              </div>

              {/* Code block */}
              <div style={{
                fontFamily:"'Syne Mono', monospace",
                fontSize:11, lineHeight:2,
                color:'rgba(255,255,255,.35)'
              }}>
                <div style={{color:'rgba(255,255,255,.15)',marginBottom:4}}>{'{'}</div>
                {codeLines.map((line, i) => (
                  <div key={i} style={{
                    paddingLeft:4,
                    animation:`fadeUp .3s ${.55 + i*.08}s ease both`,
                    opacity:0
                  }}>
                    <span style={{color:'rgba(255,59,48,.5)'}}>{line.split(':')[0]}:</span>
                    <span style={{color:'rgba(255,255,255,.5)'}}>{line.split(':').slice(1).join(':')}</span>
                  </div>
                ))}
                <div style={{color:'rgba(255,255,255,.15)',marginTop:4}}>{'}'}</div>
              </div>
            </div>
          </div>

          {/* Message */}
          <p style={{
            fontSize:15, color:'rgba(255,255,255,.4)',
            textAlign:'center', lineHeight:1.7, margin:'0 0 32px',
            animation:'fadeUp .5s .6s ease both', opacity:0,
            fontWeight:300
          }}>
            {isMaintenance
              ? <>The house system is being upgraded.<br/>We'll be back shortly. Sit tight.</>
              : <>This page doesn't exist or has been moved.<br/>Head back home and try again.</>
            }
          </p>

          {/* CTA */}
          <a href="/" style={{
            display:'inline-flex', alignItems:'center', gap:10,
            padding:'13px 28px', borderRadius:10,
            background:'rgba(255,59,48,.1)',
            border:'1px solid rgba(255,59,48,.35)',
            color:'#ff6b6b',
            fontSize:13, fontWeight:700,
            textDecoration:'none',
            letterSpacing:.5,
            transition:'all .2s',
            animation:'fadeUp .5s .75s ease both', opacity:0,
            fontFamily:"'Syne Mono', monospace",
          }}
            onMouseEnter={e=>{
              e.currentTarget.style.background='rgba(255,59,48,.2)'
              e.currentTarget.style.borderColor='rgba(255,59,48,.6)'
              e.currentTarget.style.boxShadow='0 0 24px rgba(255,59,48,.2)'
            }}
            onMouseLeave={e=>{
              e.currentTarget.style.background='rgba(255,59,48,.1)'
              e.currentTarget.style.borderColor='rgba(255,59,48,.35)'
              e.currentTarget.style.boxShadow='none'
            }}
          >
            ← {isMaintenance ? 'RETRY CONNECTION' : 'GO HOME'}
          </a>

          {/* Admin override — only shown to admins on maintenance page */}
          {isMaintenance && onOverride && (
            <button
              onClick={onOverride}
              style={{
                marginTop:16,
                display:'inline-flex', alignItems:'center', gap:8,
                padding:'11px 24px', borderRadius:10,
                background:'rgba(52,211,153,.08)',
                border:'1px solid rgba(52,211,153,.3)',
                color:'#34d399',
                fontSize:12, fontWeight:700,
                letterSpacing:.5,
                cursor:'pointer',
                transition:'all .2s',
                animation:'fadeUp .5s .9s ease both', opacity:0,
                fontFamily:"'Syne Mono', monospace",
              }}
              onMouseEnter={e=>{
                e.currentTarget.style.background='rgba(52,211,153,.16)'
                e.currentTarget.style.borderColor='rgba(52,211,153,.6)'
                e.currentTarget.style.boxShadow='0 0 20px rgba(52,211,153,.2)'
              }}
              onMouseLeave={e=>{
                e.currentTarget.style.background='rgba(52,211,153,.08)'
                e.currentTarget.style.borderColor='rgba(52,211,153,.3)'
                e.currentTarget.style.boxShadow='none'
              }}
            >
              ⚡ ADMIN OVERRIDE — ENTER SITE
            </button>
          )}

          {/* Footer tag */}
          <div style={{
            marginTop:40,
            fontFamily:"'Syne Mono', monospace",
            fontSize:10, color:'rgba(255,255,255,.12)',
            letterSpacing:3,
            animation:'fadeUp .5s .9s ease both', opacity:0
          }}>
            MANIYARA · {new Date().getFullYear()}
          </div>

        </div>
      </div>
    </>
  )
}
