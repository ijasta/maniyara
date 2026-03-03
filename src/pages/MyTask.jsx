import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase, getMyAssignment, markTaskDone } from '../lib/supabase'

// Compress image before upload — reduces size 80%, much faster on mobile
async function compressImage(file, maxWidth=1200, quality=0.7) {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height, 1)
      canvas.width  = Math.round(img.width  * ratio)
      canvas.height = Math.round(img.height * ratio)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob(blob => resolve(blob || file), 'image/jpeg', quality)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}
import { StatusBadge, Btn, SecHead, ToastProvider, useToast } from '../components/UI'

function MyTaskContent() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const [assignment, setAss]   = useState(null)
  const [loading,    setLd]    = useState(true)
  const [submitting, setSub]   = useState(false)
  const [proof,      setProof] = useState(null)
  const [photoModal, setPhotoModal] = useState(null) // URL to show in modal
  const [viewLoading,setVL]    = useState(false)
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
    if (f.size > 50*1024*1024) { toast('Max 50MB','warn'); return }
    setProof({ file:f, url:URL.createObjectURL(f) })
  }

  const handleSubmit = async () => {
    if (!proof) { toast('Upload a photo first! 📸','warn'); return }
    setSub(true)

    try {
      const now = new Date().toISOString()
      const deleteAt = new Date(Date.now() + 3 * 86400000).toISOString()

      // ── STEP 1: Mark done in DB immediately (no photo yet) ──
      await supabase.from('assignments').update({
        done: true,
        done_at: now,
        proof_expires_at: deleteAt
      }).eq('id', assignment.id)

      // Update member score+streak immediately too
      const { data: m } = await supabase.from('members').select('score,streak').eq('id', user.id).single()
      await supabase.from('members').update({
        score: (m?.score||0) + 10,
        streak: (m?.streak||0) + 1
      }).eq('id', user.id)

      // ── STEP 2: Update UI instantly ──
      setAss(prev => ({ ...prev, done: true, done_at: now }))
      toast('✅ Task marked as done! Photo uploading in background...')
      setSub(false)
      setProof(null)

      // ── STEP 3: Compress + upload photo silently in background ──
      if (proof.file) {
        ;(async () => {
          try {
            // Compress first — reduces 5MB photo to ~300KB, 10x faster upload
            const compressed = await compressImage(proof.file)
            const path = `${user.id}/${Date.now()}.jpg`
            const proxyBase = import.meta.env.VITE_SUPABASE_PROXY_URL || import.meta.env.VITE_SUPABASE_URL
            const uploadUrl = `${proxyBase}/storage/v1/object/task-proofs/${path}`
            const res = await fetch(uploadUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                'Content-Type': 'image/jpeg',
                'x-upsert': 'true'
              },
              body: compressed
            })
            if (res.ok) {
              // Build public URL using original supabase URL (not proxy)
              const publicUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/task-proofs/${path}`
              await supabase.from('assignments').update({
                proof_url: publicUrl,
                proof_path: path
              }).eq('id', assignment.id)
              load() // refresh to show proof button
            }
          } catch(_) {} // silent — task already marked done
        })()
      }

    } catch(e) {
      toast('Failed: '+e.message,'error')
      setSub(false)
    }
  }

  // Show proof photo in inline modal — uses proxy URL so Jio mobile can load it
  // NOTE: We use public URL (not signed URL) through proxy.
  // Signed URLs embed the original domain in the token and break when domain is swapped.
  const viewProof = () => {
    if (!assignment?.proof_url) return
    const proxyBase = import.meta.env.VITE_SUPABASE_PROXY_URL
    const supaBase  = import.meta.env.VITE_SUPABASE_URL

    // Build public storage URL through proxy
    // proof_url looks like: https://xxx.supabase.co/storage/v1/object/public/task-proofs/uid/file.jpg
    // or might be a signed URL — extract the path and rebuild as public
    let photoUrl = assignment.proof_url

    // Extract path after /object/public/ or /object/sign/
    const match = photoUrl.match(/\/object\/(?:public|sign(?:ed)?(?:\/v\d)?)\/(.+?)(\?|$)/)
    if (match) {
      // Rebuild as clean public URL through proxy
      const base = proxyBase || supaBase
      photoUrl = `${base}/storage/v1/object/public/${match[1]}`
    } else if (proxyBase) {
      // Just swap domain
      photoUrl = photoUrl.replace(supaBase, proxyBase)
    }

    setPhotoModal(photoUrl)
  }

  const task = assignment?.tasks
  if (loading) return <div style={{color:'#8890b0',padding:40,textAlign:'center'}}>Loading...</div>

  return (
    <div className="page-anim">
      <div style={{marginBottom:16}}>
        <div style={{fontFamily:'Orbitron,monospace',fontWeight:900,fontSize:'clamp(20px,5.5vw,28px)',letterSpacing:1}}>MY <span style={{background:'linear-gradient(135deg,#7DF9AA,#00ffcc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>TASK</span></div>
        <div style={{fontSize:12,color:'#8890b0',marginTop:3}}>{profile?.name} · {profile?.phone}</div>
      </div>

      {/* No task */}
      {!assignment || !task ? (
        <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:40,textAlign:'center',marginBottom:13}}>
          <div style={{fontSize:48,marginBottom:12}}>📋</div>
          <div style={{fontWeight:700,fontSize:15,marginBottom:6}}>No task assigned yet</div>
          <div style={{color:'#8890b0',fontSize:13}}>Admin will assign your task. Check back soon!</div>
        </div>
      ) : (
        <>
          {/* Task card */}
          <div style={{background:assignment.done?'rgba(125,249,170,.06)':'linear-gradient(135deg,#0a1510,#0a0c1a)',border:`2px solid ${assignment.done?'#7DF9AA':'rgba(125,249,170,.2)'}`,borderRadius:13,padding:20,marginBottom:14,position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,transparent,${task.color},transparent)`,opacity:.7}}/>

            <span style={{fontSize:52,display:'block',marginBottom:12,filter:`drop-shadow(0 0 12px ${task.color}60)`}}>{task.emoji}</span>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:22,fontWeight:700,color:task.color,marginBottom:8}}>{task.name}</div>
            <div style={{fontSize:14,color:'#8890b0',lineHeight:1.65,marginBottom:14}}>{task.description}</div>

            {/* Status badge */}
            <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'10px 18px',borderRadius:99,fontWeight:900,fontSize:14,
              background:assignment.done?'rgba(125,249,170,.15)':'rgba(255,217,61,.1)',
              border:`2px solid ${assignment.done?'#7DF9AA':'#FFD93D'}`,
              color:assignment.done?'#7DF9AA':'#FFD93D',
              boxShadow:assignment.done?'0 0 20px rgba(125,249,170,.2)':'none'}}>
              {assignment.done ? '✅ COMPLETED' : '⏳ PENDING'}
            </div>

            {assignment.done && assignment.done_at && (
              <div style={{fontSize:12,color:'#4a5070',marginTop:10}}>
                Completed on {new Date(assignment.done_at).toLocaleString('en-IN',{weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})}
              </div>
            )}

            {/* PROOF PHOTO — button instead of broken img */}
            {assignment.proof_url && (
              <div style={{marginTop:16}}>
                <button
                  onClick={viewProof}
                  style={{
                    width:'100%',
                    padding:'14px 16px',
                    borderRadius:11,
                    border:'1px solid rgba(125,249,170,.3)',
                    background:'rgba(125,249,170,.07)',
                    color:'#7DF9AA',
                    fontFamily:'Rajdhani,sans-serif',
                    fontWeight:700,
                    fontSize:14,
                    cursor:'pointer',
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center',
                    gap:10,
                    letterSpacing:'.04em',
                    transition:'all .15s',
                    opacity: viewLoading ? 0.6 : 1,
                  }}>
                  <span style={{fontSize:22}}>📸</span>
                  <div style={{textAlign:'left'}}>
                    <div>{viewLoading ? 'Opening...' : 'View Proof Photo'}</div>
                    <div style={{fontSize:11,color:'#4a5070',fontWeight:400,marginTop:1}}>Opens in new tab</div>
                  </div>
                  <span style={{marginLeft:'auto',fontSize:16,opacity:.5}}>→</span>
                </button>
              </div>
            )}
          </div>

          {/* Upload proof section — only if not done */}
          {!assignment.done && (
            <>
              <SecHead title="Mark as Done"/>
              <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:14,marginBottom:12}}>
                <div style={{fontSize:13,color:'#8890b0',marginBottom:14,lineHeight:1.6}}>
                  Upload a photo proof of your completed task, then tap Submit.
                </div>

                <div onClick={()=>fileRef.current.click()}
                  style={{border:'2px dashed rgba(125,249,170,.2)',borderRadius:11,padding:'22px 14px',textAlign:'center',cursor:'pointer',marginBottom:12,transition:'border-color .15s'}}
                  onTouchStart={e=>e.currentTarget.style.borderColor='#7DF9AA'}
                  onTouchEnd={e=>e.currentTarget.style.borderColor='rgba(125,249,170,.2)'}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='#7DF9AA'}
                  onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(125,249,170,.2)'}>
                  <span style={{fontSize:32,display:'block',marginBottom:7}}>📸</span>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:3}}>Tap to take / upload photo</div>
                  <div style={{fontSize:12,color:'#4a5070'}}>JPG · PNG · Max 50MB</div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={handleFile}/>

                {proof && (
                  <div style={{marginBottom:12}}>
                    <img src={proof.url} alt="preview" style={{width:'100%',borderRadius:9,border:'1px solid rgba(125,249,170,.2)',maxHeight:200,objectFit:'cover'}}/>
                    <div style={{fontSize:12,color:'#7DF9AA',marginTop:6,fontWeight:700}}>✅ Ready — {proof.file.name}</div>
                  </div>
                )}

                <Btn full loading={submitting} onClick={handleSubmit} style={{padding:14,fontSize:15}}>
                  ⚡ SUBMIT & MARK DONE
                </Btn>
              </div>
            </>
          )}
        </>
      )}
      {/* ── PHOTO MODAL ── */}
      {photoModal && (
        <div onClick={()=>setPhotoModal(null)}
          style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,.92)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,WebkitTapHighlightColor:'transparent'}}
        >
          <div onClick={e=>e.stopPropagation()} style={{position:'relative',maxWidth:'100%',maxHeight:'90vh'}}>
            <img src={photoModal} alt="Proof"
              style={{maxWidth:'100%',maxHeight:'85vh',borderRadius:12,objectFit:'contain',display:'block',boxShadow:'0 0 40px rgba(0,0,0,.8)'}}
              onError={()=>setPhotoModal(null)}
            />
            <button onClick={()=>setPhotoModal(null)}
              style={{position:'absolute',top:-14,right:-14,width:32,height:32,borderRadius:'50%',background:'#FF6B6B',border:'none',color:'#fff',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,lineHeight:1}}>
              ✕
            </button>
            <a href={photoModal} download="proof.jpg"
              style={{display:'block',marginTop:10,textAlign:'center',color:'#7DF9AA',fontSize:13,fontWeight:700,textDecoration:'none'}}>
              ⬇️ Save Photo
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MyTask() { return <ToastProvider><MyTaskContent/></ToastProvider> }
