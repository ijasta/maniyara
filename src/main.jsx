import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext'
import App from './App'
import './index.css'

function OfflineScreen() {
  return (
    <div style={{
      position:'fixed',inset:0,background:'#070810',
      display:'flex',flexDirection:'column',alignItems:'center',
      justifyContent:'center',padding:32,textAlign:'center',zIndex:99999
    }}>
      {/* Animated wifi icon */}
      <div style={{fontSize:72,marginBottom:24,animation:'bounce 2s ease-in-out infinite'}}>📡</div>

      <div style={{fontFamily:'Orbitron,monospace',fontWeight:900,fontSize:22,
        background:'linear-gradient(135deg,#FF6B6B,#FF9A3C)',
        WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
        marginBottom:10,letterSpacing:1}}>
        NO CONNECTION
      </div>

      <div style={{fontSize:14,color:'#6a7090',lineHeight:1.7,marginBottom:32,maxWidth:280}}>
        Maniyara needs internet to work.<br/>
        Check your WiFi or mobile data<br/>and try again.
      </div>

      {/* Signal bars animation */}
      <div style={{display:'flex',alignItems:'flex-end',gap:5,marginBottom:32,height:32}}>
        {[12,18,24,32].map((h,i)=>(
          <div key={i} style={{width:8,height:h,borderRadius:3,
            background:i===0?'#FF6B6B':'rgba(255,255,255,.08)',
            animation:i===0?`pulse 1s ease-in-out ${i*0.15}s infinite`:'none'}}/>
        ))}
      </div>

      <button onClick={()=>window.location.reload()}
        style={{padding:'14px 32px',borderRadius:12,border:'1px solid rgba(125,249,170,.25)',
          background:'rgba(125,249,170,.08)',color:'#7DF9AA',fontFamily:'Rajdhani,sans-serif',
          fontWeight:800,fontSize:15,cursor:'pointer',letterSpacing:'.06em',
          boxShadow:'0 4px 20px rgba(125,249,170,.08)'}}>
        🔄 Try Again
      </button>

      <style>{`
        @keyframes bounce {
          0%,100%{transform:translateY(0)}
          50%{transform:translateY(-12px)}
        }
        @keyframes pulse {
          0%,100%{opacity:1}
          50%{opacity:.3}
        }
      `}</style>
    </div>
  )
}

function Root() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const goOnline  = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online',  goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online',  goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  if (!online) return <OfflineScreen />

  return (
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
