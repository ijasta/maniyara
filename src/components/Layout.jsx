import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { signOut } from '../lib/supabase'
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

export default function Layout({ siteSettings, isTaskAssigner }) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const cd = useCountdown()

  const doSignOut = async () => { await signOut(); navigate('/auth') }

  const showDash     = siteSettings?.page_dashboard !== false
  const showTask     = siteSettings?.page_mytask    !== false
  const showExpenses = siteSettings?.page_expenses  !== false
  const showFund     = siteSettings?.page_fund      !== false

  const links = [
    ...(showDash     ? [{ to:'/',         icon:'⌂',  label:'Home',    short:'Home',   end:true }] : []),
    ...(showTask     ? [{ to:'/mytask',   icon:'✦',  label:'My Task', short:'Task'   }] : []),
    ...(showExpenses ? [{ to:'/expenses', icon:'💸', label:'Expenses',short:'Money'  }] : []),
    ...(showFund     ? [{ to:'/fund',     icon:'🏦', label:'Fund',    short:'Fund'   }] : []),
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
      <div style={{display:'flex',position:'sticky',top:0,zIndex:300,height:54,padding:'0 14px',alignItems:'center',justifyContent:'space-between',gap:10,background:'rgba(7,8,16,.96)',borderBottom:'1px solid rgba(125,249,170,.09)',backdropFilter:'blur(14px)',WebkitBackdropFilter:'blur(14px)'}}
        className="mob-bar">
        <div style={{fontFamily:'Orbitron,monospace',fontSize:18,fontWeight:900,letterSpacing:2,background:'linear-gradient(135deg,#7DF9AA,#00ffcc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',filter:'drop-shadow(0 0 8px rgba(125,249,170,.5))'}}>MANIYARA</div>
        <div style={{display:'flex',gap:7,flexShrink:0}}>
          <div style={{borderRadius:99,padding:'4px 10px',fontFamily:'Orbitron,monospace',fontSize:10,fontWeight:700,background:'rgba(125,249,170,.1)',border:'1px solid rgba(125,249,170,.22)',color:'#7DF9AA',whiteSpace:'nowrap'}}>WK {getWeek()}</div>
          <div style={{borderRadius:99,padding:'4px 9px',fontFamily:'Orbitron,monospace',fontSize:10,fontWeight:700,background:'rgba(255,217,61,.08)',border:'1px solid rgba(255,217,61,.2)',color:'#FFD93D',whiteSpace:'nowrap'}}>{cd}</div>
        </div>
      </div>

      {/* ── DESKTOP SIDEBAR + MAIN ── */}
      <div style={{display:'flex',minHeight:'calc(100vh - 54px)',position:'relative',zIndex:1}}>
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

          {/* Profile preview — clickable, goes to /profile */}
          <NavLink to="/profile" style={({isActive})=>({
            display:'flex',alignItems:'center',gap:10,
            background:isActive?'rgba(125,249,170,.08)':'#131525',
            border:`1px solid ${isActive?'rgba(125,249,170,.25)':'rgba(125,249,170,.09)'}`,
            borderRadius:9,padding:'9px 11px',marginBottom:8,textDecoration:'none',transition:'all .15s'
          })}>
            <div style={{width:32,height:32,borderRadius:'50%',background:profile?.color||'#7DF9AA',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{profile?.avatar||'🧑'}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:700,color:'#E8F0FF',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.name}</div>
              <div style={{fontSize:10,color:profile?.is_admin?'#7DF9AA':'#8890b0',fontWeight:700,textTransform:'uppercase',letterSpacing:'.06em'}}>{profile?.is_admin?'⚙ Admin':'👤 Member'}</div>
            </div>
            <span style={{fontSize:11,color:'#4a5070'}}>›</span>
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
          <NavLink key={l.to} to={l.to} end={l.end} className={({isActive})=>`mob-nb${isActive?' mob-active':''}`}>
            <span style={{fontSize:21,lineHeight:1}}>{l.icon}</span>
            <span>{l.short}</span>
          </NavLink>
        ))}
      </nav>

      <style>{`
        @media (min-width:768px) {
          .mob-bar  { display:none !important; }
          .mob-nav  { display:none !important; }
          .sidebar  { display:flex !important; }
          .main-wrap{ padding:32px 40px; }
        }
        @media (max-width:767px) {
          .sidebar  { display:none !important; }
          .mob-bar  { display:flex !important; }
          .mob-nav  { display:flex !important; }
          .main-wrap{ padding:12px 12px calc(68px + env(safe-area-inset-bottom,0)) 12px; overflow-x:hidden; }
          .main-wrap * { max-width:100%; }
        }
        .main-wrap { flex:1; min-width:0; overflow-y:auto; position:relative; }
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
        .mob-active { color:#7DF9AA !important; }
      `}</style>
    </>
  )
}
