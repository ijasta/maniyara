import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import {
  getMembers, getTasks, getCurrentAssignments,
  adminAssignTasks, rotateToNextWeek,
  clearWeekAssignments, resetWeekDoneStatus,
  deleteAssignment, getSettings, getMyRole
} from '../lib/supabase'
import { Avatar, SecHead, Btn, ToastProvider, useToast, inp } from '../components/UI'

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
  const [autoSaving, setAutoSaving] = useState(null) // member id being auto-saved
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

  const canAccess = profile?.is_admin || role?.isAssigner
  const activeTasks = tasks.filter(t => t.active)
  const allAssigned = members.every(m => taskMap[m.id])

  const rotationPreview = members.map((m, i) => {
    const fromM    = members[(i + 1) % members.length]
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

      {/* ── ROTATE SECTION (TOP) ── */}
      <div style={{background:'rgba(125,249,170,.04)',border:'2px solid rgba(125,249,170,.18)',borderRadius:13,padding:16,marginBottom:16}}>
        <div style={{fontFamily:'Orbitron,monospace',fontSize:12,fontWeight:700,letterSpacing:2,color:'#7DF9AA',marginBottom:6}}>🔄 ROTATE TO NEXT WEEK</div>
        <div style={{fontSize:12,color:'#8890b0',lineHeight:1.6,marginBottom:12}}>
          Each person gets the task of the person <strong style={{color:'#E8F0FF'}}>below them</strong>. Last person gets the <strong style={{color:'#E8F0FF'}}>first person's task</strong>. Creates Week <strong style={{color:'#7DF9AA'}}>{week+1}</strong>.
        </div>

        {/* Rotation preview */}
        {allAssigned && (
          <div style={{background:'#0d0e1a',borderRadius:9,padding:12,marginBottom:12}}>
            <div style={{fontSize:10,color:'#4a5070',fontWeight:700,textTransform:'uppercase',letterSpacing:'.09em',marginBottom:8}}>Preview — Week {week+1}:</div>
            {rotationPreview.map(({member:m, task:t})=>(
              <div key={m.id} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 0',borderBottom:'1px solid rgba(125,249,170,.05)'}}>
                <Avatar emoji={m.avatar} color={m.color} size={22}/>
                <span style={{fontWeight:700,fontSize:12,flex:1}}>{m.name}</span>
                <span style={{fontSize:12,color:'#4a5070',marginRight:4}}>→</span>
                <span style={{fontSize:12,color:'#8890b0'}}>{t?`${t.emoji} ${t.name}`:'—'}</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={doRotate} disabled={rotating || !allAssigned}
          style={{width:'100%',padding:13,borderRadius:11,fontFamily:'Rajdhani,sans-serif',fontWeight:800,fontSize:14,cursor:allAssigned?'pointer':'not-allowed',border:'none',
            background:rotating?'#1a2030':allAssigned?'linear-gradient(135deg,#FFD93D,#FF9A3C)':'rgba(255,255,255,.05)',
            color:allAssigned?'#070810':'#4a5070',letterSpacing:'.06em',opacity:rotating?0.6:1,
            boxShadow:allAssigned?'0 4px 18px rgba(255,217,61,.2)':'none'}}>
          {rotating ? '⏳ Rotating...' : `🔄 ROTATE → WEEK ${week+1}`}
        </button>
        {!allAssigned && (
          <div style={{fontSize:11,color:'#FFD93D',textAlign:'center',marginTop:7}}>⚠️ Assign all members a task first to enable rotate</div>
        )}
      </div>

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
                {/* Status badge */}
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

        {/* Save All button — fallback */}
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

export default function TaskAssigner() { return <ToastProvider><TaskAssignerContent/></ToastProvider> }
