import { useState, useEffect } from 'react'

export default function LoadingScreen() {
  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 7000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',background:'#070810',flexDirection:'column',gap:18,padding:20,textAlign:'center'}}>
      <div style={{fontFamily:'Orbitron,monospace',fontSize:'clamp(26px,7vw,36px)',fontWeight:900,letterSpacing:4,background:'linear-gradient(135deg,#7DF9AA,#00ffcc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',filter:'drop-shadow(0 0 16px rgba(125,249,170,.5))'}}>MANIYARA</div>

      {!timedOut ? (
        <>
          <div style={{display:'flex',gap:7}}>
            {[0,1,2].map(i=>(
              <div key={i} style={{width:9,height:9,borderRadius:'50%',background:'#7DF9AA',animation:`bounce 1.2s ease-in-out ${i*.2}s infinite`,boxShadow:'0 0 10px #7DF9AA'}}/>
            ))}
          </div>
          <div style={{fontSize:12,color:'#4a5070'}}>Connecting...</div>
        </>
      ) : (
        <div style={{maxWidth:300}}>
          <div style={{background:'rgba(255,107,107,.1)',border:'1px solid rgba(255,107,107,.3)',borderRadius:12,padding:16,marginBottom:16,color:'#FF6B6B',fontSize:13,fontWeight:600,lineHeight:1.6}}>
            ⚠️ Cannot connect.<br/>Check your internet and try again.
          </div>
          <button onClick={()=>window.location.reload()} style={{background:'linear-gradient(135deg,#7DF9AA,#00D4AA)',color:'#070810',border:'none',borderRadius:10,padding:'12px 28px',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'Rajdhani,sans-serif'}}>🔄 Retry</button>
        </div>
      )}
    </div>
  )
}
