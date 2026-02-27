import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../lib/AuthContext'
import { getMyAssignment, markTaskDone } from '../lib/supabase'
import { StatusBadge, Btn, Confetti, SecHead, ToastProvider, useToast } from '../components/UI'

function MyTaskContent() {
  const { user, profile, refreshProfile } = useAuth()
  const toast = useToast()
  const [assignment, setAss] = useState(null)
  const [loading,  setLd]    = useState(true)
  const [submitting,setSub]  = useState(false)
  const [proof,    setProof] = useState(null)
  const [confetti, setCf]    = useState(false)
  const fileRef = useRef()

  useEffect(() => { load() }, [user])

  async function load() {
    if (!user) return
    try { setAss(await getMyAssignment(user.id)) }
    catch(e) { toast('Could not load your task','error') }
    finally { setLd(false) }
  }

  const handleFile = e => {
    const f = e.target.files[0]; if (!f) return
    if (f.size > 5*1024*1024) { toast('Max 5MB','warn'); return }
    setProof({ file:f, url:URL.createObjectURL(f) })
  }

  const handleSubmit = async () => {
    if (!proof) { toast('Upload a photo first! 📸','warn'); return }
    setSub(true)
    try {
      await markTaskDone(assignment.id, user.id, proof.file)
      toast('Task done! +10pts 🎉'); setCf(true); refreshProfile(); load()
    } catch(e) { toast('Failed: '+e.message,'error') }
    finally { setSub(false) }
  }

  const task = assignment?.tasks
  if (loading) return <div style={{color:'#8890b0',padding:40,textAlign:'center'}}>Loading...</div>

  return (
    <div className="page-anim">
      <Confetti active={confetti} onDone={()=>setCf(false)}/>
      <div style={{marginBottom:16}}>
        <div style={{fontFamily:'Orbitron,monospace',fontWeight:900,fontSize:'clamp(20px,5.5vw,28px)',letterSpacing:1}}>MY <span style={{background:'linear-gradient(135deg,#7DF9AA,#00ffcc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>MISSION</span></div>
        <div style={{fontSize:12,color:'#8890b0',marginTop:3}}>{profile?.name} · {profile?.phone}</div>
      </div>

      {/* Mission card */}
      {!assignment||!task ? (
        <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:40,textAlign:'center',marginBottom:13}}>
          <div style={{fontSize:40,marginBottom:10}}>📋</div>
          <div style={{color:'#8890b0'}}>No task assigned yet. Admin rotates every Friday!</div>
        </div>
      ) : (
        <div style={{background:'linear-gradient(135deg,#0a1510,#0a0c1a)',border:`1px solid ${assignment.done?'rgba(125,249,170,.3)':'rgba(125,249,170,.15)'}`,borderRadius:13,padding:16,marginBottom:13,position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${task.color},transparent)`,opacity:.6}}/>
          <div style={{fontSize:9,color:'#7DF9AA',textTransform:'uppercase',letterSpacing:'.12em',fontWeight:700,marginBottom:10}}>◈ YOUR MISSION THIS WEEK</div>
          <span style={{fontSize:46,display:'block',marginBottom:10,filter:`drop-shadow(0 0 10px ${task.color}60)`}}>{task.emoji}</span>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:20,fontWeight:700,color:task.color,marginBottom:7}}>{task.name}</div>
          <div style={{fontSize:13,color:'#8890b0',lineHeight:1.6,marginBottom:10}}>{task.description}</div>
          <StatusBadge done={assignment.done}/>
          {assignment.done && assignment.done_at && (
            <div style={{fontSize:11,color:'#8890b0',marginTop:8}}>✅ Completed {new Date(assignment.done_at).toLocaleString()}</div>
          )}
          {assignment.proof_url && (
            <div style={{marginTop:12}}>
              <img src={assignment.proof_url} alt="proof" style={{width:'100%',borderRadius:9,border:'1px solid rgba(125,249,170,.2)',maxHeight:200,objectFit:'cover'}}/>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
        {[['⭐','Score',profile?.score||0,'#7DF9AA'],['🔥','Streak',`${profile?.streak||0}wk`,'#FFD93D']].map(([ic,lb,v,c],i)=>(
          <div key={i} style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:13,textAlign:'center'}}>
            <span style={{fontSize:20,display:'block',marginBottom:5}}>{ic}</span>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:24,fontWeight:700,color:c}}>{v}</div>
            <div style={{fontSize:10,color:'#8890b0',textTransform:'uppercase',letterSpacing:'.08em',marginTop:3,fontWeight:700}}>{lb}</div>
          </div>
        ))}
      </div>

      {/* Upload section */}
      {assignment && !assignment.done && (
        <>
          <SecHead title="Upload Proof"/>
          <div onClick={()=>fileRef.current.click()} style={{border:'2px dashed rgba(125,249,170,.2)',borderRadius:13,padding:'24px 14px',textAlign:'center',cursor:'pointer',marginBottom:10,transition:'all .15s'}}
            onTouchStart={e=>e.currentTarget.style.borderColor='#7DF9AA'}
            onTouchEnd={e=>e.currentTarget.style.borderColor='rgba(125,249,170,.2)'}
            onMouseEnter={e=>e.currentTarget.style.borderColor='#7DF9AA'}
            onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(125,249,170,.2)'}>
            <span style={{fontSize:32,display:'block',marginBottom:7}}>📸</span>
            <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>Tap to take / upload photo</div>
            <div style={{fontSize:12,color:'#4a5070'}}>JPG · PNG · Max 5MB</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={handleFile}/>

          {proof && (
            <div style={{marginBottom:10}}>
              <img src={proof.url} alt="preview" style={{width:'100%',borderRadius:9,border:'1px solid rgba(125,249,170,.2)',maxHeight:220,objectFit:'cover'}}/>
              <div style={{fontSize:12,color:'#7DF9AA',marginTop:6,fontWeight:700}}>✅ {proof.file.name}</div>
            </div>
          )}

          <Btn full loading={submitting} onClick={handleSubmit} style={{padding:14,fontSize:15,letterSpacing:1}}>⚡ SUBMIT & MARK DONE</Btn>
        </>
      )}
    </div>
  )
}

export default function MyTask() { return <ToastProvider><MyTaskContent/></ToastProvider> }
