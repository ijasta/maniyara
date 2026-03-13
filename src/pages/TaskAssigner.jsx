import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../lib/AuthContext'
import {
  getMembers, getTasks, getCurrentAssignments,
  adminAssignTasks, rotateToNextWeek,
  clearWeekAssignments, resetWeekDoneStatus,
  deleteAssignment, getSettings, getMyRole
} from '../lib/supabase'
import { Avatar, SecHead, Btn, ToastProvider, useToast, inp } from '../components/UI'
import { useAutoRotateTimer } from './autoRotateTimer'

function TaskAssignerContent() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const [members,  setMembers]  = useState([])
  const [tasks,    setTasks]    = useState([])
  const [assigns,  setAssigns]  = useState([])
  const [settings, setSettings] = useState(null)
  const [week,     setWeek]     = useState(1)
  const [role,     setRole]     = useState(null)
  const [loading,  setL]        = useState(true)
  const [taskMap,  setTaskMap]  = useState({})
  const [saving,   setSaving]   = useState(false)
  const [autoSaving, setAutoSaving] = useState(null)
  const [rotating, setRotating] = useState(false)

  useEffect(() => { load() }, [user])

  async function load() {
    if (!user) return
    try {
      const [mem, tk, { assignments:a, week:w }, st, r] = await Promise.all([
        getMembers(), getTasks(), getCurrentAssignments(), getSettings(), getMyRole(user.id)
      ])
      const approved = mem.filter(m => m.status === 'approved')
      setMembers(approved); setTasks(tk); setAssigns(a)
      setSettings(st); setWeek(w); setRole(r)
      const map = {}
      a.forEach(x => { map[x.member_id || x.members?.id] = x.task_id || x.tasks?.id })
      setTaskMap(map)
    } catch(e) { toast('Load error: '+e.message,'error') }
    finally { setL(false) }
  }

  // Auto-save single member task immediately on select
  const autoSaveTask = async (memberId, taskId) => {
    setTaskMap(p => ({ ...p, [memberId]: taskId }))
    if (!taskId) return
    setAutoSaving(memberId)
    try {
      await adminAssignTasks([{ member_id: memberId, task_id: taskId }])
      const { assignments: a } = await getCurrentAssignments()
      setAssigns(a)
    } catch(e) { toast('Auto-save failed: '+e.message,'error') }
    finally { setAutoSaving(null) }
  }

  // Save all at once (fallback)
  const saveAssignments = async () => {
    const unassigned = members.filter(m => !taskMap[m.id])
    if (unassigned.length > 0) {
      toast(`Assign tasks to: ${unassigned.map(m => m.name).join(', ')}`, 'warn'); return
    }
    setSaving(true)
    try {
      const rows = members.map(m => ({ member_id: m.id, task_id: taskMap[m.id] }))
      await adminAssignTasks(rows)
      toast(`✅ All Week ${week} tasks saved!`); load()
    } catch(e) { toast('Failed: '+e.message,'error') }
    finally { setSaving(false) }
  }

  // Auto-rotate handler — fires automatically when Friday 12AM hits
  const handleAutoRotate = useCallback(async () => {
    const allAssigned = members.every(m => assigns.find(a => a.member_id === m.id || a.members?.id === m.id))
    if (!allAssigned) {
      toast('⚠️ Auto-rotation skipped: not all members have tasks','warn')
      return
    }
    try {
      const newWeek = await rotateToNextWeek()
      toast(`🔄 Auto-rotated to Week ${newWeek}! (Friday 12:00 AM)`)
      load()
    } catch(e) {
      toast('Auto-rotation failed: '+e.message,'error')
    }
  }, [members, assigns])

  const canAccess = profile?.is_admin || role?.isAssigner
  const activeTasks = tasks.filter(t => t.active)
  const allAssigned = members.every(m => taskMap[m.id])

  const rotationPreview = members.map((m, i) => {
    const fromM    = members[(i - 1 + members.length) % members.length]
    const nextTask = tasks.find(t => t.id == taskMap[fromM?.id])
    return { member: m, task: nextTask }
  })

  const doRotate = async () => {
    if (!allAssigned) { toast('Assign all tasks first before rotating','warn'); return }
    if (!confirm(`Rotate to Week ${week+1}?\n\nEach member gets the task of the person below them.`)) return
    setRotating(true)
    try {
      const newWeek = await rotateToNextWeek()
      toast(`✅ Rotated to Week ${newWeek}!`); load()
    } catch(e) { toast('Rotate failed: '+e.message,'error') }
    finally { setRotating(false) }
  }

  if (loading) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:80,gap:14}}>
      <div style={{width:40,height:40,borderRadius:'50%',border:'3px solid rgba(125,249,170,.15)',borderTopColor:'#7DF9AA',animation:'spin 1s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!canAccess) return (
    <div style={{padding:40,textAlign:'center'}}>
      <div style={{fontSize:48,marginBottom:12}}>🔒</div>
      <div style={{fontFamily:'Orbitron,monospace',fontSize:16,fontWeight:700,color:'#FF6B6B',marginBottom:8}}>Access Denied</div>
      <div style={{fontSize:13,color:'#8890b0'}}>Only the assigned Task Assigner or Admin can access this page.</div>
    </div>
  )

  return (
    <div className="page-anim">

      {/* Header */}
      <div style={{marginBottom:16}}>
        <div style={{fontFamily:'Orbitron,monospace',fontWeight:900,fontSize:'clamp(20px,5.5vw,26px)',letterSpacing:1}}>
          📋 <span style={{background:'linear-gradient(135deg,#7DF9AA,#00ffcc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>TASK ASSIGNER</span>
        </div>
        <div style={{fontSize:12,color:'#8890b0',marginTop:3}}>
          {profile?.is_admin ? 'Admin access' : `Assigned to you — ${profile?.name}`} · Week {week}
        </div>
      </div>

      {/* Role badge */}
      {!profile?.is_admin && role?.isAssigner && (
        <div style={{background:'rgba(125,249,170,.07)',border:'1px solid rgba(125,249,170,.2)',borderRadius:11,padding:'10px 14px',marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:24}}>🎖️</span>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:'#7DF9AA',textTransform:'uppercase',letterSpacing:'.08em'}}>Task Assigner Role</div>
            <div style={{fontSize:12,color:'#8890b0',marginTop:1}}>You are assigned by admin to manage weekly task assignments</div>
          </div>
        </div>
      )}

      {/* Week banner */}
      <div style={{background:'linear-gradient(135deg,#0a1510,#0a0c1a)',border:'1px solid rgba(125,249,170,.2)',borderRadius:13,padding:'13px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:12}}>
        <div style={{fontSize:32}}>📋</div>
        <div style={{flex:1}}>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:18,fontWeight:900,color:'#7DF9AA'}}>WEEK {week}</div>
          <div style={{fontSize:12,color:'#8890b0',marginTop:2}}>{members.length} members · {assigns.length} assigned</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:10,color:'#4a5070',fontWeight:700,textTransform:'uppercase'}}>Status</div>
          <div style={{fontSize:13,fontWeight:700,color:allAssigned?'#7DF9AA':'#FFD93D',marginTop:2}}>
            {allAssigned ? '✅ All Set' : '⚠️ Incomplete'}
          </div>
        </div>
      </div>

      {/* ── ROTATE SECTION WITH TIMER ── */}
      <TaskAssignerRotateSection week={week} onAutoRotate={handleAutoRotate} rotationPreview={rotationPreview} allAssigned={allAssigned} />

      {/* ── ASSIGN DROPDOWNS ── */}
      <SecHead title="Assign Tasks to Each Member"/>
      <div style={{fontSize:11,color:'#6a7090',marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
        <span style={{width:8,height:8,borderRadius:'50%',background:'#7DF9AA',display:'inline-block',animation:'pulse 2s ease-in-out infinite'}}/>
        Tasks auto-save when you select them
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
      </div>

      <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:14,marginBottom:14}}>
        {members.length === 0 ? (
          <div style={{textAlign:'center',padding:30,color:'#4a5070'}}>No approved members yet.</div>
        ) : members.map((m, i) => {
          const curAssign = assigns.find(a => a.member_id === m.id || a.members?.id === m.id)
          const isSaving  = autoSaving === m.id
          return (
            <div key={m.id} style={{marginBottom:12,paddingBottom:12,borderBottom:i<members.length-1?'1px solid rgba(125,249,170,.06)':'none'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                <Avatar emoji={m.avatar} color={m.color} size={36}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14}}>{m.name}</div>
                  {m.username && <div style={{fontSize:11,color:'#4a5070'}}>@{m.username}</div>}
                </div>
                {isSaving ? (
                  <div style={{fontSize:11,fontWeight:700,padding:'4px 10px',borderRadius:99,background:'rgba(77,150,255,.1)',border:'1px solid rgba(77,150,255,.25)',color:'#4D96FF'}}>
                    💾 Saving...
                  </div>
                ) : curAssign ? (
                  <div style={{fontSize:11,fontWeight:700,padding:'4px 10px',borderRadius:99,flexShrink:0,
                    background:curAssign.done?'rgba(125,249,170,.1)':'rgba(255,217,61,.08)',
                    border:`1px solid ${curAssign.done?'rgba(125,249,170,.25)':'rgba(255,217,61,.2)'}`,
                    color:curAssign.done?'#7DF9AA':'#FFD93D'}}>
                    {curAssign.done ? '✅ Done' : '⏳ Pending'}
                  </div>
                ) : taskMap[m.id] ? (
                  <div style={{fontSize:11,fontWeight:700,padding:'4px 10px',borderRadius:99,background:'rgba(125,249,170,.06)',border:'1px solid rgba(125,249,170,.15)',color:'#7DF9AA'}}>
                    ✓ Assigned
                  </div>
                ) : null}
              </div>

              <div style={{display:'flex',gap:9,alignItems:'center'}}>
                <select
                  value={taskMap[m.id] || ''}
                  onChange={e => autoSaveTask(m.id, e.target.value)}
                  disabled={isSaving}
                  style={{...inp,flex:1,padding:'10px 13px',
                    borderColor:taskMap[m.id]?'rgba(125,249,170,.3)':'rgba(255,107,107,.3)',
                    opacity:isSaving?0.6:1}}>
                  <option value="">— Pick a task —</option>
                  {activeTasks.map(t=>(
                    <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>
                  ))}
                </select>
                {curAssign && (
                  <button onClick={async()=>{
                    if(!confirm(`Remove ${m.name}'s task?`)) return
                    await deleteAssignment(curAssign.id)
                    setTaskMap(p=>{const n={...p};delete n[m.id];return n})
                    toast(`${m.name}'s task removed`,'warn'); load()
                  }} style={{padding:'10px 12px',borderRadius:8,border:'1px solid rgba(255,107,107,.25)',background:'rgba(255,107,107,.08)',color:'#FF6B6B',cursor:'pointer',fontSize:14,flexShrink:0}}>
                    🗑️
                  </button>
                )}
              </div>
            </div>
          )
        })}

        <button onClick={saveAssignments} disabled={saving}
          style={{width:'100%',padding:13,borderRadius:11,fontFamily:'Rajdhani,sans-serif',fontWeight:800,fontSize:14,cursor:'pointer',border:'1px solid rgba(125,249,170,.2)',marginTop:4,
            background:saving?'#1a2030':'rgba(125,249,170,.08)',
            color:'#7DF9AA',opacity:saving?0.6:1,letterSpacing:'.06em'}}>
          {saving ? '⏳ Saving All...' : `💾 Save All — Week ${week}`}
        </button>
      </div>

      {/* ── CLEAR OPTIONS ── */}
      <SecHead title="Reset Options"/>
      <div style={{display:'flex',flexDirection:'column',gap:9}}>
        <button onClick={async()=>{
          if(!confirm(`Reset done status for Week ${week}? Tasks stay, marked as not done.`)) return
          try{await resetWeekDoneStatus(week);toast('Done status reset ✅');load()}
          catch(e){toast('Failed: '+e.message,'error')}
        }} style={{padding:12,borderRadius:10,fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',
          border:'1px solid rgba(255,217,61,.25)',background:'rgba(255,217,61,.07)',color:'#FFD93D',letterSpacing:'.04em'}}>
          🔄 Reset Done Status — Keep Tasks
        </button>
        <button onClick={async()=>{
          if(!confirm(`Delete all assignments for Week ${week}?`)) return
          try{await clearWeekAssignments(week);toast(`Week ${week} cleared 🗑️`,'warn');load()}
          catch(e){toast('Failed: '+e.message,'error')}
        }} style={{padding:12,borderRadius:10,fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',
          border:'1px solid rgba(255,107,107,.25)',background:'rgba(255,107,107,.07)',color:'#FF6B6B',letterSpacing:'.04em'}}>
          🗑️ Clear This Week's Assignments
        </button>
      </div>
    </div>
  )
}

// ==========================================
// AUTO-ROTATE TIMER DISPLAY (no button)
// ==========================================
function TaskAssignerRotateSection({ week, onAutoRotate, rotationPreview = [], allAssigned }) {
  const { label, isImminent, timeLeft, nextFriday } = useAutoRotateTimer(onAutoRotate)
  const [showPreview, setShowPreview] = useState(false)

  const color     = timeLeft === 0 ? '#7DF9AA' : isImminent ? '#FF6B6B' : '#7DF9AA'
  const borderCol = timeLeft === 0 ? 'rgba(125,249,170,.35)' : isImminent ? 'rgba(255,107,107,.35)' : 'rgba(125,249,170,.2)'
  const bg        = timeLeft === 0 ? 'rgba(125,249,170,.07)' : isImminent ? 'rgba(255,107,107,.07)' : 'rgba(125,249,170,.04)'
  const glow      = isImminent ? `0 0 24px ${timeLeft===0?'rgba(125,249,170,.4)':'rgba(255,107,107,.3)'}` : 'none'

  const hasPreview = rotationPreview.length > 0 && allAssigned

  return (
    <div style={{
      background: bg, border:`2px solid ${borderCol}`,
      borderRadius:13, marginBottom:16,
      boxShadow: glow, transition:'all .4s', overflow:'hidden'
    }}>
      <style>{`
        @keyframes timerPulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes previewIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
      `}</style>

      <div style={{padding:'14px 18px'}}>
        <div style={{display:'flex', alignItems:'center', gap:14}}>
          <div style={{
            width:48, height:48, borderRadius:12, flexShrink:0,
            background:`${color}18`, border:`1px solid ${color}35`,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:24
          }}>⏰</div>

          <div style={{flex:1}}>
            <div style={{fontSize:10, fontWeight:700, color, textTransform:'uppercase', letterSpacing:'.12em', marginBottom:4}}>
              {timeLeft === 0 ? '🔄 AUTO-ROTATING NOW' : isImminent ? '⚡ ROTATION IMMINENT' : '🔄 AUTO-ROTATION'}
            </div>
            <div style={{
              fontFamily:'Orbitron,monospace', fontSize:26, fontWeight:900,
              color, letterSpacing:3, lineHeight:1,
              textShadow:`0 0 20px ${color}55`,
              animation: isImminent ? 'timerPulse 1s ease-in-out infinite' : 'none'
            }}>
              {label}
            </div>
            <div style={{fontSize:11, color:'#4a5070', marginTop:5}}>
              Every Friday 12:00 AM
              {nextFriday && ` · ${nextFriday.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}`}
            </div>
          </div>

          <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0}}>
            <div style={{
              textAlign:'center',
              background:'rgba(125,249,170,.06)', border:'1px solid rgba(125,249,170,.15)',
              borderRadius:10, padding:'6px 12px'
            }}>
              <div style={{fontSize:9,color:'#4a5070',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em'}}>Next</div>
              <div style={{fontFamily:'Orbitron,monospace',fontSize:16,fontWeight:900,color:'#7DF9AA',marginTop:1}}>WK {week+1}</div>
            </div>
            {hasPreview && (
              <button onClick={() => setShowPreview(p => !p)} style={{
                fontSize:10, fontWeight:700, padding:'4px 10px', borderRadius:99,
                border:`1px solid ${color}40`, background:`${color}10`,
                color, cursor:'pointer', letterSpacing:'.05em',
                transition:'all .15s', whiteSpace:'nowrap'
              }}>
                {showPreview ? '▲ Hide' : '▼ Preview'}
              </button>
            )}
            {!hasPreview && rotationPreview.length > 0 && !allAssigned && (
              <div style={{fontSize:9,color:'#4a5070',textAlign:'center',maxWidth:70}}>Assign all to see preview</div>
            )}
          </div>
        </div>

        {timeLeft === 0 && (
          <div style={{marginTop:10,padding:'8px 12px',borderRadius:8,background:'rgba(125,249,170,.1)',border:'1px solid rgba(125,249,170,.25)'}}>
            <div style={{fontSize:12,color:'#7DF9AA',fontWeight:700}}>✅ Tasks rotated to Week {week+1} automatically!</div>
          </div>
        )}
        {isImminent && timeLeft > 0 && (
          <div style={{marginTop:10,padding:'8px 12px',borderRadius:8,background:'rgba(255,107,107,.08)',border:'1px solid rgba(255,107,107,.2)'}}>
            <div style={{fontSize:12,color:'#FF6B6B',fontWeight:700}}>⚠️ Rotation fires in under 1 hour — assignments will update automatically.</div>
          </div>
        )}
      </div>

      {showPreview && hasPreview && (
        <div style={{
          borderTop:`1px solid ${borderCol}`,
          background:'rgba(0,0,0,.25)',
          padding:'12px 18px 14px',
          animation:'previewIn .2s ease'
        }}>
          <div style={{
            fontSize:10, fontWeight:700, letterSpacing:'.12em',
            textTransform:'uppercase', color:'#4a5070', marginBottom:10,
            display:'flex', alignItems:'center', gap:6
          }}>
            <span style={{width:6,height:6,borderRadius:'50%',background:'#7DF9AA',display:'inline-block'}}/>
            Week {week+1} — What happens after rotation
          </div>

          {rotationPreview.map(({ member: m, task: t }, idx) => (
            <div key={m.id} style={{
              display:'flex', alignItems:'center', gap:10,
              padding:'7px 0',
              borderBottom: idx < rotationPreview.length - 1 ? '1px solid rgba(125,249,170,.06)' : 'none'
            }}>
              <Avatar emoji={m.avatar} color={m.color} size={28}/>
              <span style={{
                fontSize:13, fontWeight:700, color:'#E8F0FF',
                minWidth:90, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'
              }}>{m.name}</span>
              <span style={{fontSize:11, color:'#3a4060', flexShrink:0}}>→</span>
              {t ? (
                <div style={{
                  display:'flex', alignItems:'center', gap:5, flex:1,
                  background:'rgba(125,249,170,.06)', border:'1px solid rgba(125,249,170,.12)',
                  borderRadius:99, padding:'4px 10px', minWidth:0
                }}>
                  <span style={{fontSize:14, flexShrink:0}}>{t.emoji}</span>
                  <span style={{fontSize:12, color:'#8890b0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{t.name}</span>
                </div>
              ) : (
                <span style={{fontSize:11,color:'#3a4060',fontStyle:'italic'}}>—</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TaskAssigner() { return <ToastProvider><TaskAssignerContent/></ToastProvider> }
