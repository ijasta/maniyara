import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { signOut, getCurrentAssignments } from '../lib/supabase'
import { useEffect, useState } from 'react'

function getWeek() {
  const d = new Date(), s = new Date(d.getFullYear(),0,1)
  return Math.ceil(((d-s)/86400000 + s.getDay()+1)/7)
}

function useCountdown() {
  const [cd, setCd] = useState('')
  useEffect(() => {
    const tick = () => {
      const now=new Date(), d=(5-now.getDay()+7)%7||7
      const tgt=new Date(now); tgt.setDate(now.getDate()+d); tgt.setHours(23,0,0,0)
      const ms=tgt-now
      const dv=Math.floor(ms/86400000)
      const h=String(Math.floor((ms%86400000)/3600000)).padStart(2,'0')
      const m=String(Math.floor((ms%3600000)/60000)).padStart(2,'0')
      const s=String(Math.floor((ms%60000)/1000)).padStart(2,'0')
      setCd(`${dv}d ${h}:${m}:${s}`)
    }
    tick(); const t=setInterval(tick,1000); return()=>clearInterval(t)
  },[])
  return cd
}


// ── TASK REMINDER BANNER ─────────────────────────────────
function TaskReminderBanner({ profile }) {
  const [show, setShow]       = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!profile?.id || dismissed) return
    getCurrentAssignments().then(({ assignments }) => {
      const mine = assignments.find(a =>
        (a.member_id === profile.id || a.members?.id === profile.id)
      )
      // Show banner if assigned but not done
      if (mine && !mine.done) setShow(true)
      else setShow(false)
    }).catch(() => {})
  }, [profile?.id, dismissed])

  if (!show || dismissed) return null

  return (
    <div style={{
      position:'relative', margin:'0 0 12px 0',
      background:'linear-gradient(135deg,rgba(255,217,61,.08),rgba(255,154,60,.06))',
      border:'1px solid rgba(255,217,61,.25)',
      borderRadius:14, padding:'12px 14px',
      display:'flex', alignItems:'center', gap:12,
      animation:'bannerIn .35s cubic-bezier(.34,1.2,.64,1)'
    }}>
      {/* Glow */}
      <div style={{position:'absolute',inset:0,borderRadius:14,background:'linear-gradient(135deg,rgba(255,217,61,.04),transparent)',pointerEvents:'none'}}/>
      <div style={{position:'absolute',top:0,left:'5%',right:'5%',height:1,background:'linear-gradient(90deg,transparent,rgba(255,217,61,.4),transparent)',borderRadius:99}}/>

      {/* Icon pulsing */}
      <div style={{width:40,height:40,borderRadius:12,background:'rgba(255,217,61,.1)',border:'1px solid rgba(255,217,61,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0,animation:'pulse 2s ease-in-out infinite'}}>
        ⏰
      </div>

      <div style={{flex:1,minWidth:0}}>
        <div style={{fontFamily:'Orbitron,monospace',fontSize:11,fontWeight:800,color:'#FFD93D',letterSpacing:'.08em',marginBottom:3}}>
          TASK PENDING
        </div>
        <div style={{fontSize:12,color:'#c0a830',lineHeight:1.4}}>
          You haven't completed your task this week. Go to <strong style={{color:'#FFD93D'}}>My Task</strong> to mark it done.
        </div>
      </div>

      {/* Dismiss */}
      <button onClick={()=>setDismissed(true)}
        style={{width:28,height:28,borderRadius:8,border:'1px solid rgba(255,217,61,.2)',background:'rgba(255,217,61,.06)',color:'#FFD93D',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        ✕
      </button>
      <style>{`
        @keyframes bannerIn { from { opacity:0; transform:translateY(-8px) } to { opacity:1; transform:none } }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
      `}</style>
    </div>
  )
}

export default function Layout({ siteSettings, isTaskAssigner }) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const cd = useCountdown()

  const doSignOut = async () => { await signOut(); navigate('/auth') }

  const showDash     = siteSettings?.page_dashboard !== false
  const showTask     = siteSettings?.page_mytask    !== false
  const showExpenses = siteSettings?.page_expenses  !== false
  const showFund     = siteSettings?.page_fund      !== false
  const showCooking  = siteSettings?.page_cooking   !== false

  const links = [
    ...(showDash     ? [{ to:'/',         icon:'⌂',  label:'Home',    short:'Home',   end:true }] : []),
    ...(showTask     ? [{ to:'/mytask',   icon:'✦',  label:'My Task', short:'Task'   }] : []),
    ...(showExpenses ? [{ to:'/expenses', icon:'💸', label:'Expenses',short:'Money'  }] : []),
    ...(showFund      ? [{ to:'/fund',     icon:'🏦', label:'Fund',    short:'Fund'   }] : []),
    ...(showCooking  ? [{ to:'/cooking',  icon:'🍳', label:'Kitchen', short:'Cook'   }] : []),
    ...(isTaskAssigner && !profile?.is_admin ? [{ to:'/assign', icon:'📋', label:'Assign', short:'Assign' }] : []),
    ...(profile?.is_admin ? [{ to:'/admin', icon:'⚙', label:'Admin', short:'Admin' }] : []),
    { to:'/profile', icon:'👤', label:'Profile', short:'Me' },
  ]

  const lnkStyle = (active) => ({
    display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
    borderRadius:9, fontSize:13, fontWeight:700, textDecoration:'none',
    border:'1px solid transparent', letterSpacing:'.04em', transition:'all .15s',
    ...(active
      ? {color:'#070810',background:'#7DF9AA',borderColor:'#7DF9AA',boxShadow:'0 0 18px rgba(125,249,170,.3)'}
      : {color:'#8890b0',background:'transparent'}),
  })

  return (
    <>
      {/* ── MOBILE TOPBAR ── */}
      <div style={{display:'flex',position:'fixed',top:0,left:0,right:0,zIndex:9999,
        paddingTop:'env(safe-area-inset-top)',
        height:'calc(54px + env(safe-area-inset-top))',
        padding:'env(safe-area-inset-top) 14px 0 14px',
        alignItems:'center',justifyContent:'space-between',gap:10,
        background:'#070810',
        borderBottom:'1px solid rgba(125,249,170,.09)',
        WebkitTransform:'translate3d(0,0,0)',transform:'translate3d(0,0,0)'}}
        className="mob-bar">
        <div style={{fontFamily:'Orbitron,monospace',fontSize:18,fontWeight:900,letterSpacing:2,background:'linear-gradient(135deg,#7DF9AA,#00ffcc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',filter:'drop-shadow(0 0 8px rgba(125,249,170,.5))'}}>MANIYARA</div>
        <div style={{display:'flex',gap:7,flexShrink:0}}>
          <div style={{borderRadius:99,padding:'4px 10px',fontFamily:'Orbitron,monospace',fontSize:10,fontWeight:700,background:'rgba(125,249,170,.1)',border:'1px solid rgba(125,249,170,.22)',color:'#7DF9AA',whiteSpace:'nowrap'}}>WK {getWeek()}</div>
          <div style={{borderRadius:99,padding:'4px 9px',fontFamily:'Orbitron,monospace',fontSize:10,fontWeight:700,background:'rgba(255,217,61,.08)',border:'1px solid rgba(255,217,61,.2)',color:'#FFD93D',whiteSpace:'nowrap'}}>{cd}</div>
        </div>
      </div>

      {/* ── DESKTOP SIDEBAR + MAIN ── */}
      <div style={{display:'flex',minHeight:'100vh',position:'relative',zIndex:1}}>
        <aside className="sidebar" style={{width:236,flexShrink:0,position:'sticky',top:54,height:'calc(100vh - 54px)',overflowY:'auto',background:'rgba(9,10,20,.98)',borderRight:'1px solid rgba(125,249,170,.09)',padding:'18px 12px',display:'flex',flexDirection:'column',gap:3,boxShadow:'3px 0 28px rgba(0,0,0,.5)'}}>
          <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,#7DF9AA,#FF6B9D,transparent)'}}/>

          <div style={{padding:'4px 6px 12px'}}>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:20,fontWeight:900,letterSpacing:3,background:'linear-gradient(135deg,#7DF9AA,#00ffcc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',filter:'drop-shadow(0 0 10px rgba(125,249,170,.5))'}}>
              MANIYARA
              <span style={{display:'inline-block',width:6,height:6,borderRadius:'50%',background:'#7DF9AA',boxShadow:'0 0 8px #7DF9AA',marginLeft:4,verticalAlign:'middle',animation:'blink 2s infinite'}}/>
            </div>
            <div style={{fontSize:9,color:'#8890b0',letterSpacing:'.12em',textTransform:'uppercase',fontWeight:600,marginTop:3}}>House Management</div>
          </div>

          {/* Week box */}
          <div style={{background:'#131525',border:'1px solid rgba(125,249,170,.09)',borderRadius:9,padding:12,marginBottom:8,position:'relative'}}>
            <div style={{position:'absolute',top:8,right:9,fontSize:9,fontWeight:700,color:'#7DF9AA',letterSpacing:'.1em',animation:'blink 2s infinite'}}>LIVE</div>
            <div style={{fontSize:9,color:'#8890b0',textTransform:'uppercase',letterSpacing:'.1em',fontWeight:700}}>Current</div>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:18,fontWeight:700,color:'#7DF9AA',margin:'3px 0 2px'}}>WEEK {getWeek()}</div>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:11,color:'#FFD93D',letterSpacing:.5}}>{cd}</div>
          </div>

          {/* Profile card — glowing, clickable */}
          <NavLink to="/profile" style={({isActive})=>({
            display:'block', textDecoration:'none', marginBottom:10,
            borderRadius:14, overflow:'hidden', transition:'all .2s',
            boxShadow: isActive
              ? `0 0 24px ${profile?.color||'#7DF9AA'}40`
              : '0 4px 16px rgba(0,0,0,.4)',
          })}>
            {({isActive}) => (
              <div style={{
                background: isActive
                  ? `linear-gradient(135deg, ${profile?.color||'#7DF9AA'}18, rgba(125,249,170,.06))`
                  : 'linear-gradient(135deg,#131525,#0d0e1a)',
                border: `1px solid ${isActive ? profile?.color||'#7DF9AA' : 'rgba(125,249,170,.12)'}`,
                borderRadius:14, padding:'12px 13px', position:'relative', overflow:'hidden',
              }}>
                {/* Top shimmer line */}
                <div style={{position:'absolute',top:0,left:0,right:0,height:2,
                  background:`linear-gradient(90deg,transparent,${profile?.color||'#7DF9AA'},transparent)`,
                  opacity: isActive ? 1 : 0.4}}/>

                <div style={{display:'flex',alignItems:'center',gap:11}}>
                  {/* Avatar with glow ring */}
                  <div style={{position:'relative',flexShrink:0}}>
                    <div style={{
                      width:40,height:40,borderRadius:12,
                      background:`linear-gradient(135deg,${profile?.color||'#7DF9AA'}33,${profile?.color||'#7DF9AA'}11)`,
                      border:`2px solid ${profile?.color||'#7DF9AA'}66`,
                      display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,
                      boxShadow:`0 0 12px ${profile?.color||'#7DF9AA'}33`
                    }}>{profile?.avatar||'🧑'}</div>
                    {/* Online dot */}
                    <div style={{position:'absolute',bottom:0,right:0,width:10,height:10,borderRadius:'50%',
                      background:'#7DF9AA',border:'2px solid #0d0e1a',
                      boxShadow:'0 0 6px rgba(125,249,170,.8)'}}/>
                  </div>

                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:800,color:'#E8F0FF',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',letterSpacing:.3}}>
                      {profile?.name||'Loading...'}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:5,marginTop:3}}>
                      <span style={{
                        fontSize:9,padding:'2px 7px',borderRadius:99,fontWeight:700,
                        letterSpacing:'.07em',textTransform:'uppercase',
                        background: profile?.is_admin ? 'rgba(125,249,170,.15)' : 'rgba(77,150,255,.12)',
                        color: profile?.is_admin ? '#7DF9AA' : '#4D96FF',
                        border: `1px solid ${profile?.is_admin ? 'rgba(125,249,170,.3)' : 'rgba(77,150,255,.25)'}`,
                      }}>{profile?.is_admin ? '⚙ Admin' : '● Member'}</span>
                    </div>
                  </div>

                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,flexShrink:0}}>
                    <span style={{fontSize:14,color:profile?.color||'#7DF9AA',opacity:.7}}>›</span>
                  </div>
                </div>

                {/* Username row */}
                {profile?.username && (
                  <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid rgba(255,255,255,.05)',
                    fontSize:10,color:'#4a5070',fontWeight:600,letterSpacing:'.04em',display:'flex',alignItems:'center',gap:5}}>
                    <span style={{color:'#4a5070'}}>@</span>
                    <span style={{color:'#6a7090'}}>{profile.username}</span>
                    <span style={{marginLeft:'auto',fontSize:9,color:'#4a5070'}}>tap to edit</span>
                  </div>
                )}
              </div>
            )}
          </NavLink>

          <nav style={{display:'flex',flexDirection:'column',gap:2,flex:1}}>
            {links.map(l => (
              <NavLink key={l.to} to={l.to} end={l.end} style={({isActive})=>lnkStyle(isActive)}>
                <span style={{fontSize:17,width:22,textAlign:'center',flexShrink:0}}>{l.icon}</span>
                <span>{l.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="main-wrap">
          <div className="page-anim" key={typeof window!=='undefined'?window.location.hash:''}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="mob-nav">
        {links.map(l => (
          <NavLink key={l.to} to={l.to} end={l.end}
            className={({isActive})=>`mob-nb${isActive?' mob-active':''}`}
            style={l.to==='/profile' ? {flex:'0 0 64px'} : {}}>
            {({isActive}) => l.to === '/profile' ? (
              // Profile tab — show avatar with glow
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                <div style={{
                  width:28,height:28,borderRadius:9,
                  background:`linear-gradient(135deg,${profile?.color||'#7DF9AA'}44,${profile?.color||'#7DF9AA'}22)`,
                  border:`2px solid ${isActive ? profile?.color||'#7DF9AA' : (profile?.color||'#7DF9AA')+'55'}`,
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,
                  boxShadow: isActive ? `0 0 10px ${profile?.color||'#7DF9AA'}66` : 'none',
                  transition:'all .2s'
                }}>{profile?.avatar||'👤'}</div>
                <span style={{fontSize:8,fontWeight:700,letterSpacing:'.05em',textTransform:'uppercase',
                  color: isActive ? profile?.color||'#7DF9AA' : '#6a7090'}}>Me</span>
              </div>
            ) : (
              <>
                <span style={{fontSize:21,lineHeight:1}}>{l.icon}</span>
                <span>{l.short}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <style>{`
        @media (min-width:768px) {
          .mob-bar  { display:none !important; }
          .mob-nav  { display:none !important; }
          .sidebar  { display:flex !important; }
          .main-wrap{ padding:32px 40px; margin-top:0; }
        }
        @media (max-width:767px) {
          .sidebar  { display:none !important; }
          .mob-bar  { display:flex !important; }
          .mob-nav  { display:flex !important; }
          .main-wrap{ margin-top:calc(54px + env(safe-area-inset-top,0px)); padding:4px 12px calc(120px + env(safe-area-inset-bottom,0px)) 12px; overflow-x:hidden; }
          .main-wrap * { max-width:100%; }
        }
        .main-wrap { flex:1; min-width:0; position:relative; }
        .mob-nav {
          display:none; position:fixed; bottom:0; left:0; right:0; z-index:300;
          background:rgba(7,8,16,.97); border-top:1px solid rgba(125,249,170,.09);
          padding-bottom:env(safe-area-inset-bottom,0);
        }
        .mob-nb {
          flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;
          padding:9px 2px 8px; gap:3px; text-decoration:none; color:#8890b0;
          font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.05em;
          min-height:56px; font-family:'Rajdhani',sans-serif;
          border:none; background:none; cursor:pointer; line-height:1;
          -webkit-tap-highlight-color:transparent;
        }
        .page-anim { animation: fadeUp .22s ease; margin-top:0; padding-top:0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
      `}</style>
    </>
  )
}
