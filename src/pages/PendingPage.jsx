import { useAuth } from '../lib/AuthContext'
import { signOut } from '../lib/supabase'

export default function PendingPage() {
  const { profile, refreshProfile } = useAuth()

  return (
    <div style={{minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',background:'#070810',padding:20,backgroundImage:'radial-gradient(ellipse 60% 40% at 50% 50%,rgba(255,217,61,.04) 0%,transparent 60%)'}}>
      <div style={{background:'#0d0e1a',border:'1px solid rgba(255,217,61,.2)',borderRadius:18,padding:'36px 24px',maxWidth:400,width:'100%',textAlign:'center',boxShadow:'0 20px 60px rgba(0,0,0,.5)'}}>
        <div style={{fontSize:56,marginBottom:16}}>⏳</div>
        <div style={{fontFamily:'Orbitron,monospace',fontSize:'clamp(18px,5vw,24px)',fontWeight:900,letterSpacing:2,marginBottom:10,color:'#FFD93D',textShadow:'0 0 20px rgba(255,217,61,.4)'}}>AWAITING APPROVAL</div>
        <div style={{fontSize:14,color:'#8890b0',lineHeight:1.7,marginBottom:24,fontWeight:500}}>
          Hey <strong style={{color:'#E8F0FF'}}>{profile?.name}</strong>! 👋<br/>
          Your registration is pending admin review.<br/>
          You'll get access as soon as the admin approves your account.
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <button onClick={refreshProfile} style={{padding:'12px',borderRadius:9,fontSize:14,fontWeight:700,cursor:'pointer',border:'1px solid rgba(125,249,170,.2)',background:'rgba(125,249,170,.08)',color:'#7DF9AA',fontFamily:'Rajdhani,sans-serif',letterSpacing:'.06em'}}>
            🔄 Check Again
          </button>
          <button onClick={()=>signOut().then(()=>window.location.reload())} style={{padding:'12px',borderRadius:9,fontSize:14,fontWeight:700,cursor:'pointer',border:'1px solid rgba(255,255,255,.07)',background:'transparent',color:'#4a5070',fontFamily:'Rajdhani,sans-serif'}}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
