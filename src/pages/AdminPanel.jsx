import { useState, useEffect } from 'react'
import {
  getMembers, getPendingMembers, approveMember, rejectMember, deleteMember, updateMember,
  getTasks, addTask, updateTask, deleteTask,
  getCurrentAssignments, adminAssignTasks, rotateToNextWeek, deleteAssignment,
  getSettings, updateSettings, getLogs, buildWALink,
  clearAllAssignments, clearWeekAssignments, resetWeekDoneStatus,
  COLORS, AVATARS
} from '../lib/supabase'
import { Avatar, Toggle, Btn, SecHead, ToastProvider, useToast, inp } from '../components/UI'

const EMOJIS = ['🍳','🍽️','🧹','🫧','🚿','🗑️','🛒','🧺','🪣','🧽','💡','🔧','🛁','🍱','🏠','⚡','🪥','🌿']

function AdminContent() {
  const toast = useToast()
  const [tab, setTab]         = useState('assign')
  const [pending, setPending] = useState([])
  const [members, setMembers] = useState([])
  const [tasks,   setTasks]   = useState([])
  const [assigns, setAssigns] = useState([])
  const [settings,setSt]      = useState(null)
  const [logs,    setLogs]    = useState([])
  const [week,    setWeek]    = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [pend, mem, tk, {assignments:a, week:w}, st, lg] = await Promise.all([
        getPendingMembers(), getMembers(), getTasks(),
        getCurrentAssignments(), getSettings(), getLogs()
      ])
      setPending(pend); setMembers(mem); setTasks(tk)
      setAssigns(a); setSt(st); setLogs(lg); setWeek(w)
    } catch(e) { toast('Load error: '+e.message,'error') }
    finally { setLoading(false) }
  }

  const TABS = [
    { id:'assign',   label:'📋 Assign Tasks', badge: pending.length || null },
    { id:'approvals',label:'🔔 Approvals', badge: pending.length || null },
    { id:'members',  label:'👥 Members' },
    { id:'tasks',    label:'✏️ Edit Tasks' },
    { id:'whatsapp', label:'📱 WhatsApp' },
    { id:'settings', label:'⚙️ Settings' },
    { id:'logs',     label:'📜 Logs' },
  ]

  if (loading) return <div style={{color:'#8890b0',padding:40,textAlign:'center'}}>Loading...</div>

  return (
    <div className="page-anim">
      <div style={{marginBottom:16}}>
        <div style={{fontFamily:'Orbitron,monospace',fontWeight:900,fontSize:'clamp(20px,5.5vw,28px)',letterSpacing:1}}>⚙ <span style={{background:'linear-gradient(135deg,#7DF9AA,#00ffcc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>ADMIN</span></div>
        <div style={{fontSize:12,color:'#8890b0',marginTop:3}}>Full control panel · Week {week}</div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:5,marginBottom:18,overflowX:'auto',WebkitOverflowScrolling:'touch',scrollbarWidth:'none'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:'9px 13px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',border:'none',fontFamily:'Rajdhani,sans-serif',background:tab===t.id?'#7DF9AA':'transparent',color:tab===t.id?'#070810':'#8890b0',transition:'all .15s',letterSpacing:'.04em',whiteSpace:'nowrap',flexShrink:0,position:'relative'}}>
            {t.label}
            {t.id==='approvals'&&pending.length>0&&<span style={{position:'absolute',top:3,right:3,width:14,height:14,borderRadius:'50%',background:'#FF6B9D',color:'#fff',fontSize:9,fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center'}}>{pending.length}</span>}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          ASSIGN TASKS TAB — main new feature
      ══════════════════════════════════════════ */}
      {tab==='assign' && (
        <AssignTab
          members={members} tasks={tasks} assigns={assigns}
          week={week} toast={toast} onDone={load}
        />
      )}

      {/* ── APPROVALS ── */}
      {tab==='approvals' && (
        <div>
          <SecHead title="Pending Registrations" badge={`${pending.length} waiting`}/>
          {pending.length===0 ? (
            <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:40,textAlign:'center',color:'#4a5070'}}>
              <div style={{fontSize:36,marginBottom:10}}>✅</div>No pending registrations
            </div>
          ) : pending.map(m=>(
            <div key={m.id} style={{background:'#0d0e1a',border:'1px solid rgba(255,217,61,.18)',borderRadius:13,padding:14,marginBottom:10}}>
              <div style={{display:'flex',alignItems:'center',gap:11,marginBottom:12}}>
                <Avatar emoji={m.avatar} color={m.color} size={42}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:15,fontWeight:700}}>{m.name}</div>
                  {m.username&&<div style={{fontSize:11,color:'#4a5070'}}>@{m.username}</div>}
                  <div style={{fontSize:12,color:'#8890b0'}}>{m.email}</div>
                  <div style={{fontSize:12,color:'#8890b0'}}>{m.phone}</div>
                  <div style={{fontSize:10,color:'#4a5070',marginTop:2}}>Registered {new Date(m.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              <div style={{display:'flex',gap:9}}>
                <Btn style={{flex:1}} onClick={async()=>{await approveMember(m.id);toast(`${m.name} approved ✅`);load()}}>✅ Approve</Btn>
                <Btn variant="danger" style={{flex:1}} onClick={async()=>{if(!confirm(`Reject ${m.name}?`)) return;await rejectMember(m.id);toast(`${m.name} rejected`,'warn');load()}}>✕ Reject</Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MEMBERS ── */}
      {tab==='members' && (
        <div>
          <SecHead title="All Members" badge={`${members.length} total`}/>
          {members.map(m=>(
            <div key={m.id} style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:14,marginBottom:10}}>
              <div style={{display:'flex',alignItems:'center',gap:11,marginBottom:13}}>
                <Avatar emoji={m.avatar} color={m.color} size={42}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:15,fontWeight:700}}>{m.name}</div>
                  {m.username&&<div style={{fontSize:11,color:'#4a5070'}}>@{m.username}</div>}
                  <div style={{fontSize:12,color:'#8890b0'}}>{m.email}</div>
                  <div style={{display:'flex',gap:6,marginTop:4,flexWrap:'wrap'}}>
                    <span style={{fontSize:9,padding:'2px 8px',borderRadius:99,fontWeight:700,background:m.status==='approved'?'rgba(125,249,170,.1)':m.status==='rejected'?'rgba(255,107,107,.1)':'rgba(255,217,61,.1)',color:m.status==='approved'?'#7DF9AA':m.status==='rejected'?'#FF6B6B':'#FFD93D',border:`1px solid ${m.status==='approved'?'rgba(125,249,170,.2)':m.status==='rejected'?'rgba(255,107,107,.2)':'rgba(255,217,61,.2)'}`}}>{m.status?.toUpperCase()}</span>
                    {m.is_admin&&<span style={{fontSize:9,padding:'2px 8px',borderRadius:99,fontWeight:700,background:'rgba(125,249,170,.1)',color:'#7DF9AA',border:'1px solid rgba(125,249,170,.2)'}}>ADMIN</span>}
                  </div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginBottom:11}}>
                {[['Name',m.name,'name','text'],['Phone',m.phone,'phone','tel']].map(([lb,val,key,type])=>(
                  <div key={key} style={{gridColumn:key==='name'?'1/-1':undefined}}>
                    <label style={{display:'block',fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:4}}>{lb}</label>
                    <input defaultValue={val} type={type} onBlur={async e=>{await updateMember(m.id,{[key]:e.target.value});toast(`${lb} updated ✅`)}} style={{...inp,padding:'9px 11px',fontSize:'15px'}}/>
                  </div>
                ))}
              </div>
              {/* Avatar picker */}
              <div style={{marginBottom:10}}>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:6}}>Avatar</label>
                <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                  {AVATARS.map(av=>(
                    <button key={av} onClick={async()=>{await updateMember(m.id,{avatar:av});toast('Saved');load()}}
                      style={{fontSize:18,padding:'5px 7px',borderRadius:7,border:`1px solid ${m.avatar===av?'#7DF9AA':'transparent'}`,background:m.avatar===av?'rgba(125,249,170,.1)':'#131525',cursor:'pointer'}}>{av}</button>
                  ))}
                </div>
              </div>
              {/* Color picker */}
              <div style={{marginBottom:11}}>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:6}}>Color</label>
                <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
                  {COLORS.map(c=>(
                    <button key={c} onClick={async()=>{await updateMember(m.id,{color:c});toast('Saved');load()}}
                      style={{width:24,height:24,borderRadius:'50%',background:c,border:`2px solid ${m.color===c?'#fff':'transparent'}`,cursor:'pointer'}}/>
                  ))}
                </div>
              </div>
              <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:11}}>
                {[['Admin',m.is_admin,'is_admin'],['Approved',m.status==='approved','status']].map(([lb,val,key])=>(
                  <div key={key} style={{display:'flex',alignItems:'center',gap:8,background:'#131525',borderRadius:8,padding:'8px 12px',flex:1}}>
                    <span style={{fontSize:13,fontWeight:600,flex:1}}>{lb}</span>
                    <Toggle value={!!val} onChange={async v=>{
                      const upd=key==='status'?{status:v?'approved':'pending'}:{[key]:v}
                      await updateMember(m.id,upd);toast(`${lb} ${v?'on':'off'}`);load()
                    }}/>
                  </div>
                ))}
              </div>
              <Btn variant="danger" sm onClick={async()=>{if(!confirm(`Remove ${m.name}?`)) return;await deleteMember(m.id);toast(`${m.name} removed`,'warn');load()}}>✕ Remove Member</Btn>
            </div>
          ))}
        </div>
      )}

      {/* ── EDIT TASKS ── */}
      {tab==='tasks' && (
        <div>
          <SecHead title="Edit Tasks" badge={`${tasks.length} tasks`}/>
          {tasks.map(t=>(
            <div key={t.id} style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:14,marginBottom:10,position:'relative'}}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${t.color},transparent)`,opacity:.5}}/>
              <div style={{display:'flex',gap:10,marginBottom:10,alignItems:'center'}}>
                <div style={{position:'relative'}}>
                  <button style={{fontSize:24,padding:'6px 10px',borderRadius:8,border:'1px solid rgba(125,249,170,.2)',background:'#131525',cursor:'pointer'}}
                    onClick={e=>{const p=e.currentTarget.nextSibling;p.style.display=p.style.display==='flex'?'none':'flex'}}>{t.emoji}</button>
                  <div style={{display:'none',position:'absolute',top:'110%',left:0,background:'#0d0e1a',border:'1px solid rgba(125,249,170,.2)',borderRadius:9,padding:10,zIndex:80,flexWrap:'wrap',gap:4,width:220,boxShadow:'0 8px 24px rgba(0,0,0,.6)'}}>
                    {EMOJIS.map(em=>(
                      <button key={em} onClick={async e=>{await updateTask(t.id,{emoji:em});toast('Saved');load();e.currentTarget.closest('[style*="220px"]').style.display='none'}}
                        style={{fontSize:20,padding:'4px 7px',borderRadius:6,border:'none',background:'#131525',cursor:'pointer'}}>{em}</button>
                    ))}
                  </div>
                </div>
                <input defaultValue={t.name} onBlur={async e=>{await updateTask(t.id,{name:e.target.value});toast('Saved ✅')}}
                  style={{...inp,flex:1,padding:'9px 11px'}} placeholder="Task name"/>
              </div>
              <textarea defaultValue={t.description} onBlur={async e=>{await updateTask(t.id,{description:e.target.value});toast('Saved ✅')}}
                rows={2} style={{...inp,width:'100%',resize:'vertical',marginBottom:10}} placeholder="Description..."/>
              <div style={{display:'flex',gap:7,flexWrap:'wrap',marginBottom:10,alignItems:'center'}}>
                {COLORS.map(c=>(
                  <button key={c} onClick={async()=>{await updateTask(t.id,{color:c});toast('Color saved');load()}}
                    style={{width:22,height:22,borderRadius:'50%',background:c,border:`2px solid ${t.color===c?'#fff':'transparent'}`,cursor:'pointer'}}/>
                ))}
                <div style={{display:'flex',alignItems:'center',gap:7,marginLeft:'auto'}}>
                  <span style={{fontSize:12,fontWeight:600}}>Active</span>
                  <Toggle value={!!t.active} onChange={async v=>{await updateTask(t.id,{active:v});toast(`Task ${v?'on':'off'}`);load()}}/>
                </div>
              </div>
              <Btn variant="danger" sm onClick={async()=>{if(!confirm(`Delete "${t.name}"?`)) return;await deleteTask(t.id);toast('Deleted','warn');load()}}>🗑️ Delete Task</Btn>
            </div>
          ))}
          <AddTaskForm onAdd={()=>{toast('Task added ✅');load()}}/>
        </div>
      )}

      {/* ── WHATSAPP ── */}
      {tab==='whatsapp' && (
        <div>
          <SecHead title="Send WhatsApp Alerts"/>
          {members.filter(m=>m.status==='approved').map(m=>{
            const a=assigns.find(x=>x.member_id===m.id||x.members?.id===m.id), t=a?.tasks
            const msg=`🏠 MANIYARA — Week ${week}\n\nHey ${m.name}! 👋\nYour task: ${t?.emoji||''} ${t?.name||'No task yet'}\n${t?.description||''}\n\nMark done on the app! ✅`
            return (
              <div key={m.id} style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:13,marginBottom:10,display:'flex',alignItems:'center',gap:10}}>
                <Avatar emoji={m.avatar} color={m.color} size={38}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:13}}>{m.name}</div>
                  <div style={{fontSize:11,color:'#8890b0',marginTop:2}}>{t?`${t.emoji} ${t.name}`:'No task assigned'}</div>
                </div>
                <a href={buildWALink(m.phone,msg)} target="_blank" rel="noreferrer" style={{textDecoration:'none',flexShrink:0}}>
                  <Btn variant="wa" sm>📱 Send</Btn>
                </a>
              </div>
            )
          })}
        </div>
      )}

      {/* ── SETTINGS ── */}
      {tab==='settings' && setSt && (
        <div>
          <SecHead title="App Settings"/>
          <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:14,marginBottom:12}}>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:10,fontWeight:700,letterSpacing:2,color:'#7DF9AA',textTransform:'uppercase',marginBottom:13}}>🏠 House Info</div>
            {[['House Name','house_name','text',settings?.house_name],['App Tagline','app_tagline','text',settings?.app_tagline]].map(([lb,key,type,val])=>(
              <div key={key} style={{marginBottom:12}}>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:5}}>{lb}</label>
                <input type={type} defaultValue={val} onBlur={async e=>{await updateSettings({[key]:e.target.value});toast(`${lb} saved ✅`)}} style={{...inp,padding:'10px 13px'}}/>
              </div>
            ))}
          </div>
          <div style={{background:'#0d0e1a',border:'1px solid rgba(255,107,107,.15)',borderRadius:13,padding:14}}>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:10,fontWeight:700,letterSpacing:2,color:'#FF6B6B',textTransform:'uppercase',marginBottom:13}}>🛠️ Danger Zone</div>
            <div style={{display:'flex',flexDirection:'column',gap:9}}>
              <Btn variant="danger" full onClick={async()=>{if(!confirm(`Clear all assignments for Week ${week}?`)) return;await clearWeekAssignments(week);toast('Week cleared','warn');load()}}>🗑️ Clear This Week's Tasks</Btn>
              <Btn variant="danger" full onClick={async()=>{if(!confirm('Delete ALL assignments ever?')) return;if(!confirm('Are you sure?')) return;await clearAllAssignments();toast('All cleared','warn');load()}}>☢️ Clear ALL Assignments Ever</Btn>
              <Btn variant="ghost" full onClick={()=>{const d=JSON.stringify({members,tasks,assigns,settings},null,2);const a=document.createElement('a');a.href='data:text/json,'+encodeURIComponent(d);a.download='maniyara-backup.json';a.click();toast('Exported 📤')}}>📤 Export Data (JSON)</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── LOGS ── */}
      {tab==='logs' && (
        <div>
          <SecHead title="Activity Log" badge={`${logs.length} entries`}/>
          {logs.length===0 ? (
            <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:40,textAlign:'center',color:'#4a5070'}}>No logs yet</div>
          ) : (
            <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,overflow:'hidden'}}>
              {logs.map((l,i)=>(
                <div key={l.id} style={{padding:'11px 13px',borderBottom:i<logs.length-1?'1px solid rgba(125,249,170,.06)':'none',display:'flex',gap:10,alignItems:'flex-start'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700}}>{l.action}</div>
                    {l.actor&&<div style={{fontSize:11,color:'#8890b0',marginTop:1}}>by {l.actor}</div>}
                    {l.details&&<div style={{fontSize:11,color:'#4a5070',marginTop:1}}>{l.details}</div>}
                  </div>
                  <div style={{fontSize:10,color:'#4a5070',whiteSpace:'nowrap',flexShrink:0}}>{new Date(l.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// ASSIGN TAB — The main new page
// ══════════════════════════════════════════════════════════
function AssignTab({ members, tasks, assigns, week, toast, onDone }) {
  const approved   = members.filter(m => m.status === 'approved')
  const activeTasks = tasks.filter(t => t.active)

  // Local map: memberId → taskId (starts from current DB state)
  const [taskMap, setTaskMap] = useState(() => {
    const m = {}
    assigns.forEach(a => { m[a.member_id || a.members?.id] = a.task_id || a.tasks?.id })
    return m
  })
  const [saving,   setSaving]   = useState(false)
  const [rotating, setRotating] = useState(false)

  // Sync when assigns prop changes
  useEffect(() => {
    const m = {}
    assigns.forEach(a => { m[a.member_id || a.members?.id] = a.task_id || a.tasks?.id })
    setTaskMap(m)
  }, [assigns])

  const allAssigned = approved.every(m => taskMap[m.id])

  // Preview of what rotation will look like
  const rotationPreview = approved.map((m, i) => {
    const nextM = approved[(i + 1) % approved.length]
    const nextTaskId = taskMap[nextM?.id]
    const nextTask = tasks.find(t => t.id == nextTaskId)
    return { member: m, task: nextTask }
  })

  const saveAssignments = async () => {
    const unassigned = approved.filter(m => !taskMap[m.id])
    if (unassigned.length > 0) {
      toast(`Assign tasks to: ${unassigned.map(m => m.name).join(', ')}`, 'warn')
      return
    }
    setSaving(true)
    try {
      const rows = approved.map(m => ({ member_id: m.id, task_id: taskMap[m.id] }))
      await adminAssignTasks(rows)
      toast(`Week ${week} tasks saved ✅`)
      onDone()
    } catch(e) { toast('Failed: ' + e.message, 'error') }
    finally { setSaving(false) }
  }

  const doRotate = async () => {
    if (!allAssigned) { toast('Assign tasks to all members first before rotating', 'warn'); return }
    if (!confirm(`Rotate tasks to Week ${week + 1}?\n\nEach member gets the task of the person below them. Last person gets the first person's task.`)) return
    setRotating(true)
    try {
      const newWeek = await rotateToNextWeek()
      toast(`✅ Rotated to Week ${newWeek}! Tasks shifted up.`)
      onDone()
    } catch(e) { toast('Rotate failed: ' + e.message, 'error') }
    finally { setRotating(false) }
  }

  return (
    <div>
      {/* Week banner */}
      <div style={{background:'linear-gradient(135deg,#0a1510,#0a0c1a)',border:'1px solid rgba(125,249,170,.2)',borderRadius:13,padding:'13px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:12}}>
        <div style={{fontSize:32}}>📋</div>
        <div style={{flex:1}}>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:18,fontWeight:900,color:'#7DF9AA'}}>WEEK {week}</div>
          <div style={{fontSize:12,color:'#8890b0',marginTop:2}}>{approved.length} members · {assigns.length} assigned</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:10,color:'#4a5070',fontWeight:700,textTransform:'uppercase'}}>Status</div>
          <div style={{fontSize:13,fontWeight:700,color:allAssigned?'#7DF9AA':'#FFD93D',marginTop:2}}>{allAssigned?'✅ All Set':'⚠️ Incomplete'}</div>
        </div>
      </div>

      {/* ── ASSIGN DROPDOWNS ── */}
      <SecHead title="Assign Tasks to Members"/>
      <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:14,marginBottom:14}}>
        {approved.length === 0 ? (
          <div style={{textAlign:'center',padding:30,color:'#4a5070'}}>
            <div style={{fontSize:32,marginBottom:8}}>👥</div>
            No approved members yet. Approve members first.
          </div>
        ) : approved.map((m, i) => {
          const currentAssign = assigns.find(a => a.member_id === m.id || a.members?.id === m.id)
          return (
            <div key={m.id} style={{marginBottom:12,paddingBottom:12,borderBottom:i<approved.length-1?'1px solid rgba(125,249,170,.06)':'none'}}>
              {/* Member info */}
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                <Avatar emoji={m.avatar} color={m.color} size={36}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14}}>{m.name}</div>
                  {m.username&&<div style={{fontSize:11,color:'#4a5070'}}>@{m.username}</div>}
                </div>
                {/* Current status badge */}
                {currentAssign && (
                  <div style={{fontSize:11,fontWeight:700,padding:'4px 10px',borderRadius:99,
                    background:currentAssign.done?'rgba(125,249,170,.1)':'rgba(255,217,61,.08)',
                    border:`1px solid ${currentAssign.done?'rgba(125,249,170,.25)':'rgba(255,217,61,.2)'}`,
                    color:currentAssign.done?'#7DF9AA':'#FFD93D',flexShrink:0}}>
                    {currentAssign.done?'✅ Done':'⏳ Pending'}
                  </div>
                )}
              </div>

              {/* Task dropdown */}
              <div style={{display:'flex',gap:9,alignItems:'center'}}>
                <select
                  value={taskMap[m.id] || ''}
                  onChange={e => setTaskMap(prev => ({...prev, [m.id]: e.target.value}))}
                  style={{...inp, flex:1, padding:'10px 13px',
                    borderColor: taskMap[m.id] ? 'rgba(125,249,170,.3)' : 'rgba(255,107,107,.3)'}}>
                  <option value="">— Pick a task —</option>
                  {activeTasks.map(t => (
                    <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>
                  ))}
                </select>
                {/* Delete this member's assignment */}
                {currentAssign && (
                  <button onClick={async () => {
                    if(!confirm(`Remove ${m.name}'s task assignment?`)) return
                    await deleteAssignment(currentAssign.id)
                    setTaskMap(prev => {const n={...prev};delete n[m.id];return n})
                    toast(`${m.name}'s task removed`,'warn')
                    onDone()
                  }} style={{padding:'9px 12px',borderRadius:8,border:'1px solid rgba(255,107,107,.25)',background:'rgba(255,107,107,.08)',color:'#FF6B6B',cursor:'pointer',fontSize:14,flexShrink:0}}>
                    🗑️
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {/* Save button */}
        <Btn full loading={saving} onClick={saveAssignments} style={{padding:13,fontSize:14,marginTop:4}}>
          💾 Save Assignments for Week {week}
        </Btn>
      </div>

      {/* ── ROTATE BUTTON ── */}
      <div style={{background:'rgba(125,249,170,.05)',border:'2px solid rgba(125,249,170,.2)',borderRadius:13,padding:16,marginBottom:16}}>
        <div style={{fontFamily:'Orbitron,monospace',fontSize:12,fontWeight:700,letterSpacing:2,color:'#7DF9AA',marginBottom:8}}>🔄 ROTATE TO NEXT WEEK</div>
        <div style={{fontSize:13,color:'#8890b0',lineHeight:1.7,marginBottom:14}}>
          Each person gets the task of the person <strong style={{color:'#E8F0FF'}}>below them</strong> in the list.<br/>
          The last person gets the <strong style={{color:'#E8F0FF'}}>first person's task</strong>.<br/>
          This creates Week <strong style={{color:'#7DF9AA'}}>{week + 1}</strong> automatically.
        </div>

        {/* Rotation preview */}
        {allAssigned && (
          <div style={{background:'#0d0e1a',borderRadius:9,padding:12,marginBottom:14}}>
            <div style={{fontSize:10,color:'#4a5070',fontWeight:700,textTransform:'uppercase',letterSpacing:'.09em',marginBottom:8}}>Preview — Week {week+1} will look like:</div>
            {rotationPreview.map(({member:m, task:t}) => (
              <div key={m.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid rgba(125,249,170,.05)'}}>
                <Avatar emoji={m.avatar} color={m.color} size={22}/>
                <span style={{fontWeight:700,fontSize:12,flex:1}}>{m.name}</span>
                <span style={{fontSize:13,marginRight:4}}>←</span>
                <span style={{fontSize:12,color:'#8890b0'}}>{t ? `${t.emoji} ${t.name}` : '—'}</span>
              </div>
            ))}
          </div>
        )}

        <Btn full loading={rotating} variant={allAssigned?'primary':'ghost'} style={{padding:14,fontSize:15,letterSpacing:1}} onClick={doRotate}>
          🔄 ROTATE → WEEK {week + 1}
        </Btn>
      </div>

      {/* ── CLEAR BUTTONS ── */}
      <SecHead title="Delete Options"/>
      <div style={{display:'flex',flexDirection:'column',gap:9}}>
        <Btn variant="warn" full onClick={async()=>{
          if(!confirm(`Reset all DONE status for Week ${week}? Tasks stay, just marked undone.`)) return
          try{await resetWeekDoneStatus(week);toast('Done status reset ✅');onDone()}
          catch(e){toast('Failed: '+e.message,'error')}
        }}>🔄 Reset Done Status — Keep Tasks</Btn>

        <Btn variant="danger" full onClick={async()=>{
          if(!confirm(`Delete ALL task assignments for Week ${week}?\nMembers will have no tasks.`)) return
          try{await clearWeekAssignments(week);toast(`Week ${week} assignments deleted 🗑️`,'warn');onDone()}
          catch(e){toast('Failed: '+e.message,'error')}
        }}>🗑️ Delete This Week's Assignments</Btn>

        <Btn variant="danger" full onClick={async()=>{
          if(!confirm('Delete ALL assignments across ALL weeks? Cannot undo!')) return
          if(!confirm('Final check — are you really sure?')) return
          try{await clearAllAssignments();toast('All assignments deleted ☢️','warn');onDone()}
          catch(e){toast('Failed: '+e.message,'error')}
        }}>☢️ Delete ALL Assignments (All Weeks)</Btn>
      </div>
    </div>
  )
}

function AddTaskForm({ onAdd }) {
  const toast = useToast()
  const [form, setForm] = useState({ name:'', emoji:'📋', description:'', color:'#7DF9AA' })
  const [loading, setL] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  return (
    <div style={{background:'#0d0e1a',border:'1px dashed rgba(125,249,170,.2)',borderRadius:13,padding:14,marginTop:4}}>
      <div style={{fontFamily:'Orbitron,monospace',fontSize:10,fontWeight:700,letterSpacing:2,color:'#7DF9AA',textTransform:'uppercase',marginBottom:13}}>+ Add New Task</div>
      <div style={{display:'flex',gap:9,marginBottom:9}}>
        <select value={form.emoji} onChange={e=>set('emoji',e.target.value)} style={{...inp,width:70,padding:'9px 5px',textAlign:'center',fontSize:'20px'}}>
          {['🍳','🍽️','🧹','🫧','🚿','🗑️','🛒','🧺','🪣','🧽','💡','🔧','🛁','🍱','🏠','⚡','🪥','🌿'].map(em=><option key={em} value={em}>{em}</option>)}
        </select>
        <input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Task name" style={{...inp,flex:1,padding:'9px 11px'}}/>
      </div>
      <textarea value={form.description} onChange={e=>set('description',e.target.value)} rows={2} placeholder="Description..." style={{...inp,width:'100%',resize:'vertical',marginBottom:9}}/>
      <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:11}}>
        {COLORS.map(c=>(
          <button key={c} onClick={()=>set('color',c)} style={{width:22,height:22,borderRadius:'50%',background:c,border:`2px solid ${form.color===c?'#fff':'transparent'}`,cursor:'pointer'}}/>
        ))}
      </div>
      <Btn full loading={loading} onClick={async()=>{
        if(!form.name.trim()){toast('Enter a task name','warn');return}
        setL(true)
        try{await addTask({...form,active:true});setForm({name:'',emoji:'📋',description:'',color:'#7DF9AA'});onAdd()}
        catch(e){toast('Failed: '+e.message,'error')}
        finally{setL(false)}
      }}>+ Add Task</Btn>
    </div>
  )
}

export default function AdminPanel() { return <ToastProvider><AdminContent/></ToastProvider> }
