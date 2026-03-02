import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase, updateMember, signOut, COLORS, AVATARS } from '../lib/supabase'
import { ToastProvider, useToast, SecHead, Btn, inp } from '../components/UI'
import { useNavigate } from 'react-router-dom'

function ProfileContent() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [pwForm,   setPwForm]   = useState({ current:'', newPw:'', confirm:'' })
  const [pwSaving, setPwSaving] = useState(false)
  const [showPw,   setShowPw]   = useState(false)

  const handleChangePassword = async () => {
    if (!pwForm.newPw)              { toast('Enter a new password','warn'); return }
    if (pwForm.newPw.length < 6)    { toast('Password must be at least 6 characters','warn'); return }
    if (pwForm.newPw !== pwForm.confirm) { toast('Passwords do not match','warn'); return }
    setPwSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.newPw })
      if (error) throw error
      toast('Password changed successfully! ✅')
      setPwForm({ current:'', newPw:'', confirm:'' })
    } catch(e) { toast('Failed: '+e.message,'error') }
    finally { setPwSaving(false) }
  }

  const doSignOut = async () => { await signOut(); navigate('/auth') }

  const statusColor = profile?.status==='approved' ? '#7DF9AA' : '#FFD93D'

  return (
    <div className="page-anim">

      {/* Header */}
      <div style={{marginBottom:20}}>
        <div style={{fontFamily:'Orbitron,monospace',fontWeight:900,fontSize:'clamp(20px,5.5vw,28px)',letterSpacing:1}}>
          MY <span style={{background:'linear-gradient(135deg,#7DF9AA,#00ffcc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>PROFILE</span>
        </div>
        <div style={{fontSize:12,color:'#8890b0',marginTop:3}}>Account settings & preferences</div>
      </div>

      {/* ── PROFILE CARD ── */}
      <div style={{background:'linear-gradient(135deg,#0a1510,#0a0c1a)',border:'1px solid rgba(125,249,170,.2)',borderRadius:16,padding:20,marginBottom:16,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,transparent,${profile?.color||'#7DF9AA'},transparent)`,opacity:.8}}/>

        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:16}}>
          {/* Avatar */}
          <div style={{position:'relative',flexShrink:0}}>
            <div style={{width:64,height:64,borderRadius:18,background:`${profile?.color||'#7DF9AA'}22`,border:`2px solid ${profile?.color||'#7DF9AA'}55`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:34}}>
              {profile?.avatar||'👤'}
            </div>
            <div style={{position:'absolute',bottom:1,right:1,width:14,height:14,borderRadius:'50%',background:statusColor,border:'2px solid #0a1510',boxShadow:`0 0 8px ${statusColor}`}}/>
          </div>

          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:17,fontWeight:900,color:'#E8F0FF',letterSpacing:.5}}>{profile?.name}</div>
            {profile?.username && <div style={{fontSize:12,color:'#4a5070',marginTop:2}}>@{profile.username}</div>}
            <div style={{display:'flex',gap:6,marginTop:6,flexWrap:'wrap'}}>
              <span style={{fontSize:9,padding:'3px 10px',borderRadius:99,fontWeight:700,background:'rgba(125,249,170,.1)',color:'#7DF9AA',border:'1px solid rgba(125,249,170,.25)',letterSpacing:'.06em'}}>
                {profile?.is_admin ? '⚙ ADMIN' : '👤 MEMBER'}
              </span>
              <span style={{fontSize:9,padding:'3px 10px',borderRadius:99,fontWeight:700,background:'rgba(125,249,170,.1)',color:statusColor,border:`1px solid ${statusColor}44`,letterSpacing:'.06em'}}>
                {profile?.status?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Info rows */}
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {[
            ['📧', 'Email',  user?.email],
            ['📱', 'Phone',  profile?.phone],
          ].map(([icon,label,val]) => val ? (
            <div key={label} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',background:'rgba(255,255,255,.03)',borderRadius:9,border:'1px solid rgba(255,255,255,.06)'}}>
              <span style={{fontSize:16,flexShrink:0}}>{icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:10,color:'#4a5070',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em'}}>{label}</div>
                <div style={{fontSize:13,color:'#E8F0FF',marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{val}</div>
              </div>
            </div>
          ) : null)}
        </div>
      </div>

      {/* ── AVATAR PICKER ── */}
      <SecHead title="🎭 Avatar"/>
      <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:14,marginBottom:14}}>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {AVATARS.map(av => (
            <button key={av} onClick={async () => {
              try {
                await updateMember(profile.id, { avatar: av })
                toast('Avatar updated ✅')
                // Refresh profile
                window.location.reload()
              } catch(e) { toast('Failed: '+e.message,'error') }
            }}
              style={{fontSize:22,padding:'7px 9px',borderRadius:9,cursor:'pointer',transition:'all .1s',
                border:`2px solid ${profile?.avatar===av?profile?.color||'#7DF9AA':'transparent'}`,
                background:profile?.avatar===av?`${profile?.color||'#7DF9AA'}18`:'#131525'}}>
              {av}
            </button>
          ))}
        </div>
      </div>

      {/* ── COLOR PICKER ── */}
      <SecHead title="🎨 Color"/>
      <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:14,marginBottom:14}}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {COLORS.map(c => (
            <button key={c} onClick={async () => {
              try {
                await updateMember(profile.id, { color: c })
                toast('Color updated ✅')
                window.location.reload()
              } catch(e) { toast('Failed: '+e.message,'error') }
            }}
              style={{width:30,height:30,borderRadius:'50%',background:c,cursor:'pointer',transition:'transform .1s',
                border:`3px solid ${profile?.color===c?'#fff':'transparent'}`,
                transform:profile?.color===c?'scale(1.25)':'scale(1)'}}>
            </button>
          ))}
        </div>
      </div>

      {/* ── CHANGE PASSWORD ── */}
      <SecHead title="🔑 Change Password"/>
      <div style={{background:'#0d0e1a',border:'1px solid rgba(123,97,255,.2)',borderRadius:13,padding:14,marginBottom:14}}>
        <div style={{fontSize:12,color:'#8890b0',marginBottom:14,lineHeight:1.6}}>
          Set a new password for your account. Must be at least 6 characters.
        </div>

        <div style={{marginBottom:11}}>
          <label style={{display:'block',fontSize:10,fontWeight:700,color:'#7B61FF',textTransform:'uppercase',letterSpacing:'.09em',marginBottom:5}}>New Password</label>
          <div style={{position:'relative'}}>
            <input
              type={showPw ? 'text' : 'password'}
              value={pwForm.newPw}
              onChange={e=>setPwForm(f=>({...f,newPw:e.target.value}))}
              placeholder="Min 6 characters"
              style={{...inp,padding:'11px 42px 11px 13px',letterSpacing:pwForm.newPw&&!showPw?2:0}}/>
            <button onClick={()=>setShowPw(x=>!x)}
              style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:16,color:'#4a5070',padding:4}}>
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <div style={{marginBottom:14}}>
          <label style={{display:'block',fontSize:10,fontWeight:700,color:'#7B61FF',textTransform:'uppercase',letterSpacing:'.09em',marginBottom:5}}>Confirm Password</label>
          <input
            type={showPw ? 'text' : 'password'}
            value={pwForm.confirm}
            onChange={e=>setPwForm(f=>({...f,confirm:e.target.value}))}
            placeholder="Repeat new password"
            style={{...inp,padding:'11px 13px',
              borderColor: pwForm.confirm
                ? pwForm.confirm===pwForm.newPw ? 'rgba(125,249,170,.4)' : 'rgba(255,107,107,.4)'
                : undefined,
              letterSpacing:pwForm.confirm&&!showPw?2:0}}/>
          {pwForm.confirm && pwForm.confirm===pwForm.newPw && (
            <div style={{fontSize:11,color:'#7DF9AA',marginTop:4,fontWeight:600}}>✅ Passwords match</div>
          )}
          {pwForm.confirm && pwForm.confirm!==pwForm.newPw && (
            <div style={{fontSize:11,color:'#FF6B6B',marginTop:4,fontWeight:600}}>✕ Passwords don't match</div>
          )}
        </div>

        <button onClick={handleChangePassword} disabled={pwSaving}
          style={{width:'100%',padding:13,borderRadius:10,border:'none',cursor:'pointer',
            background:pwSaving?'#1a2030':'linear-gradient(135deg,#A78BFA,#7B61FF)',
            color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:800,fontSize:14,
            letterSpacing:'.06em',opacity:pwSaving?0.6:1,transition:'all .15s',
            boxShadow:pwSaving?'none':'0 4px 16px rgba(123,97,255,.3)'}}>
          {pwSaving ? '⏳ Updating...' : '🔑 Change Password'}
        </button>
      </div>

      {/* ── SIGN OUT ── */}
      <SecHead title="👋 Session"/>
      <div style={{background:'#0d0e1a',border:'1px solid rgba(255,107,107,.12)',borderRadius:13,padding:14}}>
        <div style={{fontSize:12,color:'#8890b0',marginBottom:12,lineHeight:1.6}}>
          Sign out of your account on this device.
        </div>
        <button onClick={doSignOut}
          style={{width:'100%',padding:13,borderRadius:10,fontFamily:'Rajdhani,sans-serif',fontWeight:800,fontSize:14,cursor:'pointer',border:'1px solid rgba(255,107,107,.3)',background:'rgba(255,107,107,.08)',color:'#FF6B6B',letterSpacing:'.06em',transition:'all .15s'}}>
          ⏻ Sign Out
        </button>
      </div>

    </div>
  )
}

export default function Profile() { return <ToastProvider><ProfileContent/></ToastProvider> }
