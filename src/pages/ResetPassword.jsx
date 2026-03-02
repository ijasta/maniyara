import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [error,    setError]    = useState('')
  const [ready,    setReady]    = useState(false)

  useEffect(() => {
    // Supabase embeds the token in the URL hash — listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    // Also check if already in recovery session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    return () => subscription.unsubscribe()
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
    <div style={{minHeight:'100vh',background:'#070810',display:'flex',alignItems:'center',justifyContent:'center',padding:20,fontFamily:'Rajdhani,sans-serif'}}>
      {/* Background glow */}
      <div style={{position:'fixed',top:'20%',left:'50%',transform:'translateX(-50%)',width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(125,249,170,.06) 0%,transparent 70%)',pointerEvents:'none'}}/>

      <div style={{width:'100%',maxWidth:380,position:'relative'}}>
        {/* Header */}
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{width:64,height:64,borderRadius:16,background:'rgba(123,97,255,.15)',border:'1px solid rgba(123,97,255,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 16px'}}>🔑</div>
          <div style={{fontFamily:'Orbitron,monospace',fontWeight:900,fontSize:22,letterSpacing:1,color:'#E8F0FF'}}>
            RESET <span style={{background:'linear-gradient(135deg,#A78BFA,#7B61FF)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>PASSWORD</span>
          </div>
          <div style={{fontSize:13,color:'#8890b0',marginTop:6}}>Set a new password for your account</div>
        </div>

        {done ? (
          /* Success state */
          <div style={{background:'rgba(125,249,170,.07)',border:'1px solid rgba(125,249,170,.25)',borderRadius:16,padding:28,textAlign:'center'}}>
            <div style={{fontSize:48,marginBottom:12}}>✅</div>
            <div style={{fontFamily:'Orbitron,monospace',fontWeight:800,color:'#7DF9AA',fontSize:16,marginBottom:8,letterSpacing:.5}}>PASSWORD UPDATED!</div>
            <div style={{fontSize:13,color:'#8890b0',marginBottom:20,lineHeight:1.6}}>Your password has been changed successfully. You can now log in with your new password.</div>
            <a href="https://maniyara.pages.dev"
              style={{display:'block',padding:'14px',borderRadius:11,background:'linear-gradient(135deg,#7DF9AA,#00D4AA)',color:'#070810',fontFamily:'Orbitron,monospace',fontWeight:900,fontSize:13,textDecoration:'none',letterSpacing:1}}>
              → GO TO APP
            </a>
          </div>

        ) : !ready ? (
          /* Waiting for token */
          <div style={{background:'#0d0e1a',border:'1px solid rgba(255,217,61,.15)',borderRadius:16,padding:28,textAlign:'center'}}>
            <div style={{fontSize:36,marginBottom:12}}>⏳</div>
            <div style={{fontWeight:700,color:'#FFD93D',fontSize:14,marginBottom:8}}>Validating reset link...</div>
            <div style={{fontSize:12,color:'#4a5070',lineHeight:1.7}}>
              If this takes too long, the link may have expired.<br/>
              Ask your admin to send a new reset email.
            </div>
          </div>

        ) : (
          /* Password form */
          <div style={{background:'#0d0e1a',border:'1px solid rgba(123,97,255,.2)',borderRadius:16,padding:22,boxShadow:'0 8px 32px rgba(0,0,0,.4)'}}>
            <div style={{marginBottom:14}}>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:'#7B61FF',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:6}}>New Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="Min 6 characters"
                onKeyDown={e=>e.key==='Enter'&&handleReset()}
                style={{width:'100%',background:'#131525',border:'1px solid rgba(123,97,255,.25)',borderRadius:9,padding:'12px 14px',color:'#E8F0FF',fontSize:15,fontFamily:'Rajdhani,sans-serif',outline:'none',boxSizing:'border-box',letterSpacing:1}}/>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:'#7B61FF',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:6}}>Confirm Password</label>
              <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)}
                placeholder="Repeat new password"
                onKeyDown={e=>e.key==='Enter'&&handleReset()}
                style={{width:'100%',background:'#131525',border:`1px solid ${confirm&&confirm!==password?'rgba(255,107,107,.4)':confirm&&confirm===password?'rgba(125,249,170,.3)':'rgba(123,97,255,.25)'}`,borderRadius:9,padding:'12px 14px',color:'#E8F0FF',fontSize:15,fontFamily:'Rajdhani,sans-serif',outline:'none',boxSizing:'border-box',letterSpacing:1}}/>
              {confirm && confirm===password && (
                <div style={{fontSize:11,color:'#7DF9AA',marginTop:4}}>✅ Passwords match</div>
              )}
            </div>
            {error && (
              <div style={{background:'rgba(255,107,107,.1)',border:'1px solid rgba(255,107,107,.25)',borderRadius:8,padding:'9px 12px',marginBottom:14,fontSize:12,color:'#FF6B6B',fontWeight:600}}>
                ⚠️ {error}
              </div>
            )}
            <button onClick={handleReset} disabled={loading}
              style={{width:'100%',padding:14,borderRadius:11,border:'none',cursor:'pointer',
                background:loading?'#1a2030':'linear-gradient(135deg,#A78BFA,#7B61FF)',
                color:'#fff',fontFamily:'Orbitron,monospace',fontWeight:900,fontSize:13,
                letterSpacing:1,opacity:loading?0.6:1,transition:'all .15s',
                boxShadow:loading?'none':'0 4px 20px rgba(123,97,255,.35)'}}>
              {loading ? '⏳ UPDATING...' : '🔑 SET NEW PASSWORD'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
