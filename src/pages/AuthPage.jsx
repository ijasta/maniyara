import { useState } from 'react'
import { signIn, signUp } from '../lib/supabase'
import { inp } from '../components/UI'

export default function AuthPage() {
  const [tab,     setTab]     = useState('login')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [form,    setForm]    = useState({ email:'', password:'', name:'', username:'', phone:'' })
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const card = { background:'#0d0e1a', border:'1px solid rgba(125,249,170,.2)', borderRadius:18, padding:'28px 20px', width:'100%', maxWidth:420, position:'relative', zIndex:1, boxShadow:'0 20px 60px rgba(0,0,0,.5)' }
  const lbl  = { display:'block', fontSize:10, fontWeight:700, color:'#4a5070', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:5 }
  const btn  = { width:'100%', padding:14, borderRadius:9, fontSize:15, fontWeight:700, cursor:'pointer', border:'none', fontFamily:'Rajdhani,sans-serif', letterSpacing:'.08em', background:'linear-gradient(135deg,#7DF9AA,#00D4AA)', color:'#070810', boxShadow:'0 4px 22px rgba(125,249,170,.35)', marginTop:6, WebkitTapHighlightColor:'transparent' }

  const handleLogin = async e => {
    e.preventDefault(); setError(''); setLoading(true)
    try { await signIn(form.email, form.password) }
    catch(err) { setError(err.message || 'Login failed. Check your credentials.') }
    finally { setLoading(false) }
  }

  const handleRegister = async e => {
    e.preventDefault(); setError(''); setSuccess('')
    if (!form.name || !form.username || !form.phone || !form.email || !form.password) { setError('Fill in all fields.'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (!/^[a-z0-9_]+$/i.test(form.username)) { setError('Username: only letters, numbers and underscore.'); return }
    setLoading(true)
    try {
      await signUp(form.email, form.password, form.name, form.username, form.phone)
      setSuccess('✅ Registration sent! Wait for admin to approve your account.')
      setTab('login')
      setForm(f=>({...f, password:''}))
    }
    catch(err) { setError(err.message || 'Registration failed. Try again.') }
    finally { setLoading(false) }
  }

  const tabBtn = (id,lbl) => (
    <button type="button" onClick={()=>{setTab(id);setError('');setSuccess('')}} style={{flex:1,padding:'10px',borderRadius:8,fontSize:14,fontWeight:700,cursor:'pointer',border:'none',fontFamily:'Rajdhani,sans-serif',background:tab===id?'#7DF9AA':'transparent',color:tab===id?'#070810':'#8890b0',transition:'all .15s',letterSpacing:'.05em'}}>{lbl}</button>
  )

  return (
    <div style={{minHeight:'100dvh',display:'flex',alignItems:'center',justifyContent:'center',background:'#070810',padding:16,position:'relative',overflowX:'hidden',backgroundImage:'radial-gradient(ellipse 70% 55% at 20% 20%,rgba(125,249,170,.06) 0%,transparent 55%), radial-gradient(ellipse 60% 45% at 80% 80%,rgba(255,107,157,.05) 0%,transparent 55%)'}}>
      <div style={card}>
        <div style={{position:'absolute',top:0,left:'15%',right:'15%',height:1,background:'linear-gradient(90deg,transparent,#7DF9AA,transparent)'}}/>

        {/* Logo */}
        <div style={{fontFamily:'Orbitron,monospace',fontSize:'clamp(24px,7vw,34px)',fontWeight:900,letterSpacing:3,textAlign:'center',marginBottom:5,background:'linear-gradient(135deg,#7DF9AA,#00ffcc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',filter:'drop-shadow(0 0 16px rgba(125,249,170,.5))'}}>MANIYARA</div>
        <div style={{fontSize:11,color:'#8890b0',textAlign:'center',marginBottom:24,letterSpacing:'.08em',textTransform:'uppercase'}}>House Management System</div>

        {/* Tabs */}
        <div style={{display:'flex',gap:4,background:'#131525',borderRadius:9,padding:4,marginBottom:20}}>
          {tabBtn('login','Login')}
          {tabBtn('register','Register')}
        </div>

        {error   && <div style={{background:'rgba(255,107,107,.1)',border:'1px solid rgba(255,107,107,.3)',borderRadius:9,padding:'11px 14px',fontSize:13,color:'#FF6B6B',marginBottom:14,fontWeight:600,lineHeight:1.5}}>⚠️ {error}</div>}
        {success && <div style={{background:'rgba(125,249,170,.1)',border:'1px solid rgba(125,249,170,.3)',borderRadius:9,padding:'11px 14px',fontSize:13,color:'#7DF9AA',marginBottom:14,fontWeight:600,lineHeight:1.5}}>{success}</div>}

        {tab==='login' ? (
          <form onSubmit={handleLogin} autoComplete="on">
            <div style={{marginBottom:13}}>
              <label style={lbl}>Email</label>
              <input style={inp} type="email" placeholder="your@email.com" autoComplete="email" inputMode="email"
                value={form.email} onChange={e=>set('email',e.target.value)}
                onFocus={e=>e.target.style.borderColor='#7DF9AA'} onBlur={e=>e.target.style.borderColor='rgba(125,249,170,.2)'} required/>
            </div>
            <div style={{marginBottom:13}}>
              <label style={lbl}>Password</label>
              <input style={inp} type="password" placeholder="Your password" autoComplete="current-password"
                value={form.password} onChange={e=>set('password',e.target.value)}
                onFocus={e=>e.target.style.borderColor='#7DF9AA'} onBlur={e=>e.target.style.borderColor='rgba(125,249,170,.2)'} required/>
            </div>
            <button type="submit" style={{...btn,opacity:loading?.6:1}} disabled={loading}>{loading?'⏳ Logging in...':'⚡ LOGIN'}</button>
            <div style={{fontSize:12,color:'#8890b0',textAlign:'center',marginTop:14}}>New? <span style={{color:'#7DF9AA',cursor:'pointer',fontWeight:700}} onClick={()=>setTab('register')}>Register here</span></div>
          </form>
        ) : (
          <form onSubmit={handleRegister} autoComplete="on">
            <div style={{marginBottom:13}}>
              <label style={lbl}>Full Name</label>
              <input style={inp} type="text" placeholder="Username" autoComplete="name"
                value={form.name} onChange={e=>set('name',e.target.value)}
                onFocus={e=>e.target.style.borderColor='#7DF9AA'} onBlur={e=>e.target.style.borderColor='rgba(125,249,170,.2)'} required/>
            </div>
            <div style={{marginBottom:13}}>
              <label style={lbl}>Username <span style={{color:'#4a5070',fontSize:9,letterSpacing:0,fontWeight:600,textTransform:'none'}}>(used to login · no spaces)</span></label>
              <input style={inp} type="text" placeholder="john_doe" autoComplete="username" autoCapitalize="off"
                value={form.username} onChange={e=>set('username',e.target.value)}
                onFocus={e=>e.target.style.borderColor='#7DF9AA'} onBlur={e=>e.target.style.borderColor='rgba(125,249,170,.2)'} required/>
            </div>
            <div style={{marginBottom:13}}>
              <label style={lbl}>WhatsApp Number</label>
              <input style={inp} type="tel" placeholder="+91 98765 43210" autoComplete="tel" inputMode="tel"
                value={form.phone} onChange={e=>set('phone',e.target.value)}
                onFocus={e=>e.target.style.borderColor='#7DF9AA'} onBlur={e=>e.target.style.borderColor='rgba(125,249,170,.2)'} required/>
            </div>
            <div style={{marginBottom:13}}>
              <label style={lbl}>Email</label>
              <input style={inp} type="email" placeholder="your@email.com" autoComplete="email" inputMode="email"
                value={form.email} onChange={e=>set('email',e.target.value)}
                onFocus={e=>e.target.style.borderColor='#7DF9AA'} onBlur={e=>e.target.style.borderColor='rgba(125,249,170,.2)'} required/>
            </div>
            <div style={{marginBottom:13}}>
              <label style={lbl}>Password</label>
              <input style={inp} type="password" placeholder="Min 6 characters" autoComplete="new-password"
                value={form.password} onChange={e=>set('password',e.target.value)}
                onFocus={e=>e.target.style.borderColor='#7DF9AA'} onBlur={e=>e.target.style.borderColor='rgba(125,249,170,.2)'} required/>
            </div>
            <button type="submit" style={{...btn,opacity:loading?.6:1}} disabled={loading}>{loading?'⏳ Registering...':'🚀 REGISTER'}</button>
            <div style={{fontSize:11,color:'#8890b0',textAlign:'center',marginTop:12,lineHeight:1.6,background:'rgba(255,217,61,.06)',border:'1px solid rgba(255,217,61,.15)',borderRadius:8,padding:'9px 12px'}}>
              ⚠️ Your account must be <strong style={{color:'#FFD93D'}}>approved by admin</strong> before you can log in.
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
