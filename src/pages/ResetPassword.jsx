import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    // Supabase puts the token in the URL hash — this handles it automatically
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User is now in password recovery mode, form is ready
      }
    })
  }, [])

  const handleReset = async () => {
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setDone(true)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{minHeight:'100vh',background:'#070810',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{width:'100%',maxWidth:380}}>
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{fontSize:40,marginBottom:12}}>🔑</div>
          <div style={{fontFamily:'Orbitron,monospace',fontWeight:900,fontSize:22,letterSpacing:1,color:'#E8F0FF'}}>
            RESET <span style={{background:'linear-gradient(135deg,#7DF9AA,#00ffcc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>PASSWORD</span>
          </div>
          <div style={{fontSize:12,color:'#8890b0',marginTop:6}}>Enter your new password below</div>
        </div>

        {done ? (
          <div style={{background:'rgba(125,249,170,.08)',border:'1px solid rgba(125,249,170,.25)',borderRadius:13,padding:24,textAlign:'center'}}>
            <div style={{fontSize:36,marginBottom:10}}>✅</div>
            <div style={{fontWeight:700,color:'#7DF9AA',fontSize:16,marginBottom:6}}>Password Updated!</div>
            <div style={{fontSize:12,color:'#8890b0',marginBottom:16}}>Your password has been changed successfully.</div>
            <a href="/" style={{display:'block',padding:'12px',borderRadius:10,background:'linear-gradient(135deg,#7DF9AA,#00D4AA)',color:'#070810',fontFamily:'Rajdhani,sans-serif',fontWeight:800,fontSize:14,textDecoration:'none',letterSpacing:'.06em'}}>
              → Go to App
            </a>
          </div>
        ) : (
          <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.12)',borderRadius:13,padding:20}}>
            <div style={{marginBottom:14}}>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.09em',marginBottom:6}}>New Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="Min 6 characters"
                style={{width:'100%',background:'#131525',border:'1px solid rgba(125,249,170,.15)',borderRadius:9,padding:'12px 14px',color:'#E8F0FF',fontSize:15,fontFamily:'Rajdhani,sans-serif',outline:'none',boxSizing:'border-box'}}/>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.09em',marginBottom:6}}>Confirm Password</label>
              <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)}
                placeholder="Repeat new password"
                style={{width:'100%',background:'#131525',border:'1px solid rgba(125,249,170,.15)',borderRadius:9,padding:'12px 14px',color:'#E8F0FF',fontSize:15,fontFamily:'Rajdhani,sans-serif',outline:'none',boxSizing:'border-box'}}/>
            </div>
            {error && (
              <div style={{background:'rgba(255,107,107,.1)',border:'1px solid rgba(255,107,107,.25)',borderRadius:8,padding:'9px 12px',marginBottom:14,fontSize:12,color:'#FF6B6B'}}>
                ⚠️ {error}
              </div>
            )}
            <button onClick={handleReset} disabled={loading}
              style={{width:'100%',padding:14,borderRadius:10,border:'none',cursor:'pointer',
                background:loading?'#1a2030':'linear-gradient(135deg,#7DF9AA,#00D4AA)',
                color:'#070810',fontFamily:'Rajdhani,sans-serif',fontWeight:800,fontSize:15,
                letterSpacing:'.08em',opacity:loading?0.6:1}}>
              {loading ? '⏳ Updating...' : '🔑 Set New Password'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
