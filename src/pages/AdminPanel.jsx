import { useState, useEffect } from 'react'
import { supabase,
  getMembers, getPendingMembers, approveMember, rejectMember, deleteMember, updateMember,
  getTasks, addTask, updateTask, deleteTask,
  getCurrentAssignments, adminAssignTasks, rotateToNextWeek, deleteAssignment,
  getSettings, updateSettings, getLogs, buildWALink,
  clearAllAssignments, clearWeekAssignments, resetWeekDoneStatus,
  getExpenses, deleteExpense, markSplitPaid, markSplitUnpaid,
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
      // Also fetch treasurer_id from fund_settings (it's NOT in settings table)
      const { data: fs } = await supabase.from('fund_settings').select('treasurer_id').eq('id', 1).single()
      const merged = { ...st, treasurer_id: fs?.treasurer_id ?? null }
      setPending(pend); setMembers(mem); setTasks(tk)
      setAssigns(a); setSt(merged); setLogs(lg); setWeek(w)
    } catch(e) { toast('Load error: '+e.message,'error') }
    finally { setLoading(false) }
  }

  const TABS = [
    { id:'assign',   label:'📋 Assign' },
    { id:'controls', label:'🎛️ Controls' },
    { id:'approvals',label:'🔔 Approvals', badge: pending.length || null },
    { id:'members',  label:'👥 Members' },
    { id:'tasks',    label:'✏️ Tasks' },
    { id:'whatsapp', label:'📱 WhatsApp' },
    { id:'settings', label:'⚙️ Settings' },
    { id:'expenses', label:'💸 Expenses' },
    { id:'logs',     label:'📜 Logs' },
  ]

  if (loading) return <div style={{color:'#8890b0',padding:40,textAlign:'center'}}>Loading...</div>

  return (
    <div className="page-anim">
      <div style={{marginBottom:16}}>
        <div style={{fontFamily:'Orbitron,monospace',fontWeight:900,fontSize:'clamp(20px,5.5vw,28px)',letterSpacing:1}}>⚙ <span style={{background:'linear-gradient(135deg,#7DF9AA,#00ffcc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>ADMIN</span></div>
        <div style={{fontSize:12,color:'#8890b0',marginTop:3}}>Full control panel · Week {week}</div>
      </div>

      <div style={{display:'flex',gap:4,background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:5,marginBottom:18,overflowX:'auto',WebkitOverflowScrolling:'touch',scrollbarWidth:'none'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:'9px 13px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',border:'none',fontFamily:'Rajdhani,sans-serif',background:tab===t.id?'#7DF9AA':'transparent',color:tab===t.id?'#070810':'#8890b0',transition:'all .15s',letterSpacing:'.04em',whiteSpace:'nowrap',flexShrink:0,position:'relative'}}>
            {t.label}
            {t.id==='approvals'&&pending.length>0&&<span style={{position:'absolute',top:3,right:3,width:14,height:14,borderRadius:'50%',background:'#FF6B9D',color:'#fff',fontSize:9,fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center'}}>{pending.length}</span>}
          </button>
        ))}
      </div>

      {tab==='controls'  && <SiteControlsTab settings={settings} toast={toast} onDone={load}/>}
      {tab==='assign'    && <AssignTab members={members} tasks={tasks} assigns={assigns} week={week} toast={toast} onDone={load}/>}
      {tab==='expenses'  && <ExpensesAdminTab toast={toast} members={members}/>}
      {tab==='whatsapp'  && <WhatsAppTab members={members} assigns={assigns} week={week} toast={toast}/>}
      {tab==='settings'  && <SettingsTab settings={settings} week={week} toast={toast} onDone={load} members={members} assigns={assigns} tasks={tasks}/>}
      {tab==='logs'      && <LogsTab logs={logs} members={members} onClear={async()=>{
        if(!confirm('Clear all logs?')) return
        try { await supabase.from('logs').delete().neq('id','00000000-0000-0000-0000-000000000000'); toast('Logs cleared 🗑️','warn'); load() }
        catch(e) { toast('Failed: '+e.message,'error') }
      }}/>}

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

          {/* ── ROLE ASSIGNMENT ── */}
          <SecHead title="🎖️ Assign Roles"/>
          <div style={{fontSize:12,color:'#8890b0',marginBottom:12,lineHeight:1.6}}>Assigned members get extra permissions and a dedicated nav tab.</div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>

            {/* Task Assigner */}
            <div style={{background:'#0d0e1a',border:`2px solid ${settings?.task_assigner_id?'rgba(125,249,170,.3)':'rgba(125,249,170,.1)'}`,borderRadius:13,padding:14,transition:'border-color .2s'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                <div style={{width:40,height:40,borderRadius:10,background:'rgba(125,249,170,.1)',border:'1px solid rgba(125,249,170,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>📋</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:14,color:'#E8F0FF'}}>Task Assigner</div>
                  <div style={{fontSize:11,color:'#8890b0',marginTop:1}}>Assigns & rotates weekly tasks for all members</div>
                </div>
                <div style={{fontSize:10,fontWeight:700,padding:'4px 10px',borderRadius:99,flexShrink:0,
                  background:settings?.task_assigner_id?'rgba(125,249,170,.12)':'rgba(255,255,255,.04)',
                  border:`1px solid ${settings?.task_assigner_id?'rgba(125,249,170,.25)':'rgba(255,255,255,.08)'}`,
                  color:settings?.task_assigner_id?'#7DF9AA':'#4a5070'}}>
                  {settings?.task_assigner_id?'✅ ACTIVE':'NOT SET'}
                </div>
              </div>
              {settings?.task_assigner_id && (() => {
                const m = members.find(x=>x.id===settings.task_assigner_id)
                return m ? (
                  <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:'rgba(125,249,170,.06)',borderRadius:8,marginBottom:10}}>
                    <Avatar emoji={m.avatar} color={m.color} size={26}/>
                    <span style={{fontSize:13,fontWeight:700,color:'#7DF9AA'}}>{m.name}</span>
                    <span style={{fontSize:11,color:'#4a5070',marginLeft:'auto'}}>Current assigner</span>
                  </div>
                ) : null
              })()}
              <select key={`ta-${settings?.task_assigner_id}`} defaultValue={settings?.task_assigner_id||''}
                onChange={async e=>{
                  await updateSettings({task_assigner_id: e.target.value||null})
                  toast(e.target.value?'Task Assigner assigned ✅':'Task Assigner removed','warn'); load()
                }}
                style={{...inp,padding:'10px 13px',width:'100%'}}>
                <option value="">— None (admin only) —</option>
                {members.filter(m=>m.status==='approved'&&!m.is_admin).map(m=>(
                  <option key={m.id} value={m.id}>{m.avatar} {m.name}{m.username?` (@${m.username})`:''}</option>
                ))}
              </select>
            </div>

            {/* Fund Treasurer — FIXED: saves to fund_settings table */}
            <div style={{background:'#0d0e1a',border:`2px solid ${settings?.treasurer_id?'rgba(255,217,61,.3)':'rgba(255,217,61,.1)'}`,borderRadius:13,padding:14,transition:'border-color .2s'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                <div style={{width:40,height:40,borderRadius:10,background:'rgba(255,217,61,.08)',border:'1px solid rgba(255,217,61,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>🏦</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:14,color:'#E8F0FF'}}>Fund Treasurer</div>
                  <div style={{fontSize:11,color:'#8890b0',marginTop:1}}>Manages common fund — add/edit transactions</div>
                </div>
                <div style={{fontSize:10,fontWeight:700,padding:'4px 10px',borderRadius:99,flexShrink:0,
                  background:settings?.treasurer_id?'rgba(255,217,61,.12)':'rgba(255,255,255,.04)',
                  border:`1px solid ${settings?.treasurer_id?'rgba(255,217,61,.25)':'rgba(255,255,255,.08)'}`,
                  color:settings?.treasurer_id?'#FFD93D':'#4a5070'}}>
                  {settings?.treasurer_id?'✅ ACTIVE':'NOT SET'}
                </div>
              </div>
              {settings?.treasurer_id && (() => {
                const m = members.find(x=>x.id===settings.treasurer_id)
                return m ? (
                  <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:'rgba(255,217,61,.06)',borderRadius:8,marginBottom:10}}>
                    <Avatar emoji={m.avatar} color={m.color} size={26}/>
                    <span style={{fontSize:13,fontWeight:700,color:'#FFD93D'}}>{m.name}</span>
                    <span style={{fontSize:11,color:'#4a5070',marginLeft:'auto'}}>Current treasurer</span>
                  </div>
                ) : null
              })()}
              <select key={`tr-${settings?.treasurer_id}`} defaultValue={settings?.treasurer_id||''}
                onChange={async e=>{
                  const val = e.target.value || null
                  try {
                    // treasurer_id lives ONLY in fund_settings, NOT in settings table
                    const { error } = await supabase
                      .from('fund_settings')
                      .update({ treasurer_id: val })
                      .eq('id', 1)
                    if (error) throw error
                    toast(val ? 'Treasurer assigned ✅' : 'Treasurer removed', 'warn')
                    load()
                  } catch(e) { toast('Failed: '+e.message,'error') }
                }}
                style={{...inp,padding:'10px 13px',width:'100%'}}>
                <option value="">— None (admin only) —</option>
                {members.filter(m=>m.status==='approved'&&!m.is_admin).map(m=>(
                  <option key={m.id} value={m.id}>{m.avatar} {m.name}{m.username?` (@${m.username})`:''}</option>
                ))}
              </select>
            </div>

          </div>
        </div>
      )}

      {/* ── MEMBERS ── */}
      {tab==='members' && (
        <div>
          {/* Summary strip */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:9,marginBottom:16}}>
            {[
              { label:'Total',    value:members.length,                               color:'#7DF9AA' },
              { label:'Approved', value:members.filter(m=>m.status==='approved').length, color:'#4D96FF' },
              { label:'Admins',   value:members.filter(m=>m.is_admin).length,            color:'#FFD93D' },
            ].map(s=>(
              <div key={s.label} style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.08)',borderRadius:11,padding:'11px 12px',textAlign:'center'}}>
                <div style={{fontFamily:'Orbitron,monospace',fontSize:20,fontWeight:900,color:s.color}}>{s.value}</div>
                <div style={{fontSize:10,color:'#4a5070',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>

          {members.map(m => {
            const assign = assigns.find(a=>a.member_id===m.id||a.members?.id===m.id)
            const task   = assign?.tasks
            return (
              <MemberCard key={m.id} m={m} task={task} assign={assign} toast={toast} onDone={load}/>
            )
          })}
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
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// MEMBER CARD — attractive redesign
// ══════════════════════════════════════════════════════════
function MemberCard({ m, task, assign, toast, onDone }) {
  const [expanded,  setExpanded]  = useState(false)
  const [newPw,     setNewPw]     = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [showPw,    setShowPw]    = useState(false)

  const statusColor = m.status==='approved' ? '#7DF9AA' : m.status==='rejected' ? '#FF6B6B' : '#FFD93D'
  const statusBg    = m.status==='approved' ? 'rgba(125,249,170,.1)' : m.status==='rejected' ? 'rgba(255,107,107,.1)' : 'rgba(255,217,61,.1)'

  const changePassword = async () => {
    if (!newPw)           { toast('Enter a new password','warn'); return }
    if (newPw.length < 6) { toast('Min 6 characters','warn'); return }
    if (!confirm(`Set new password for ${m.name}?\n\nMake sure to tell them their new password!`)) return
    setPwLoading(true)
    try {
      const res = await fetch(
        `https://fnnnetofvsggioysairt.supabase.co/functions/v1/admin-reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({ user_id: m.id, new_password: newPw })
        }
      )
      let data = {}
      try { data = await res.json() } catch(_) {}
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`)
      toast(`✅ Password changed! Tell ${m.name}: ${newPw}`)
      setNewPw('')
    } catch(e) { toast('Failed: '+e.message,'error') }
    finally { setPwLoading(false) }
  }

  return (
    <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:16,marginBottom:12,overflow:'hidden',transition:'border-color .2s'}}>

      {/* ── TOP COLOR BAR ── */}
      <div style={{height:3,background:`linear-gradient(90deg,transparent,${m.color||'#7DF9AA'},transparent)`,opacity:.7}}/>

      {/* ── HEADER ROW ── */}
      <div style={{padding:'14px 14px 12px',display:'flex',alignItems:'center',gap:12}}>
        {/* Avatar with ring */}
        <div style={{position:'relative',flexShrink:0}}>
          <div style={{width:50,height:50,borderRadius:14,background:`${m.color||'#7DF9AA'}22`,border:`2px solid ${m.color||'#7DF9AA'}55`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26}}>
            {m.avatar||'👤'}
          </div>
          {/* Online-style status dot */}
          <div style={{position:'absolute',bottom:1,right:1,width:12,height:12,borderRadius:'50%',
            background:m.status==='approved'?'#7DF9AA':'#FF6B6B',
            border:'2px solid #0d0e1a',boxShadow:`0 0 6px ${m.status==='approved'?'rgba(125,249,170,.6)':'rgba(255,107,107,.6)'}`}}/>
        </div>

        {/* Name + info */}
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
            <span style={{fontSize:15,fontWeight:800,color:'#E8F0FF'}}>{m.name}</span>
            {m.is_admin && <span style={{fontSize:9,padding:'2px 7px',borderRadius:99,fontWeight:700,background:'rgba(125,249,170,.15)',color:'#7DF9AA',border:'1px solid rgba(125,249,170,.25)',letterSpacing:'.05em'}}>ADMIN</span>}
          </div>
          {m.username && <div style={{fontSize:11,color:'#4a5070',marginTop:1}}>@{m.username}</div>}
          <div style={{fontSize:11,color:'#8890b0',marginTop:2,display:'flex',alignItems:'center',gap:6}}>
            <span>📧</span>
            <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.email}</span>
          </div>
        </div>

        {/* Status + expand */}
        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6,flexShrink:0}}>
          <span style={{fontSize:9,padding:'3px 9px',borderRadius:99,fontWeight:700,background:statusBg,color:statusColor,border:`1px solid ${statusColor}44`,letterSpacing:'.06em'}}>
            {m.status?.toUpperCase()}
          </span>
          <button onClick={()=>setExpanded(x=>!x)}
            style={{fontSize:11,padding:'3px 10px',borderRadius:99,border:'1px solid rgba(125,249,170,.15)',background:'transparent',color:'#4a5070',cursor:'pointer',fontFamily:'Rajdhani,sans-serif',fontWeight:700,transition:'all .15s'}}>
            {expanded ? '▲ Less' : '▼ Edit'}
          </button>
        </div>
      </div>

      {/* ── TASK CHIP ── */}
      <div style={{padding:'0 14px 12px'}}>
        <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,.03)',borderRadius:9,padding:'8px 12px',border:'1px solid rgba(255,255,255,.06)'}}>
          <span style={{fontSize:16}}>{task?.emoji||'📋'}</span>
          <span style={{fontSize:12,color:task?'#8890b0':'#4a5070',flex:1}}>{task?.name||'No task assigned this week'}</span>
          {assign && (
            <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:99,
              background:assign.done?'rgba(125,249,170,.12)':'rgba(255,107,107,.1)',
              border:`1px solid ${assign.done?'rgba(125,249,170,.3)':'rgba(255,107,107,.25)'}`,
              color:assign.done?'#7DF9AA':'#FF6B6B'}}>
              {assign.done?'✅ Done':'⏳ Pending'}
            </span>
          )}
        </div>
      </div>



      {/* ── EXPANDABLE EDIT PANEL ── */}
      {expanded && (
        <div style={{borderTop:'1px solid rgba(125,249,170,.07)',padding:'14px 14px',background:'rgba(0,0,0,.2)'}}>

          {/* Name + Phone */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginBottom:12}}>
            {[['Name',m.name,'name','text'],['Phone',m.phone,'phone','tel']].map(([lb,val,key,type])=>(
              <div key={key} style={{gridColumn:key==='name'?'1/-1':undefined}}>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:4}}>{lb}</label>
                <input defaultValue={val||''} type={type}
                  onBlur={async e=>{await updateMember(m.id,{[key]:e.target.value});toast(`${lb} updated ✅`)}}
                  style={{...inp,padding:'9px 11px',fontSize:'14px'}}/>
              </div>
            ))}
          </div>

          {/* Avatar picker */}
          <div style={{marginBottom:11}}>
            <label style={{display:'block',fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:6}}>Avatar</label>
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {AVATARS.map(av=>(
                <button key={av} onClick={async()=>{await updateMember(m.id,{avatar:av});toast('Saved');onDone()}}
                  style={{fontSize:18,padding:'5px 7px',borderRadius:7,border:`1px solid ${m.avatar===av?'#7DF9AA':'transparent'}`,background:m.avatar===av?'rgba(125,249,170,.1)':'#131525',cursor:'pointer',transition:'all .1s'}}>{av}</button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div style={{marginBottom:12}}>
            <label style={{display:'block',fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:6}}>Color</label>
            <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
              {COLORS.map(c=>(
                <button key={c} onClick={async()=>{await updateMember(m.id,{color:c});toast('Saved');onDone()}}
                  style={{width:26,height:26,borderRadius:'50%',background:c,border:`3px solid ${m.color===c?'#fff':'transparent'}`,cursor:'pointer',transition:'transform .1s',transform:m.color===c?'scale(1.2)':'scale(1)'}}/>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginBottom:12}}>
            {[['Admin',m.is_admin,'is_admin'],['Approved',m.status==='approved','status']].map(([lb,val,key])=>(
              <div key={key} style={{display:'flex',alignItems:'center',gap:8,background:'#131525',borderRadius:9,padding:'10px 12px',border:'1px solid rgba(255,255,255,.05)'}}>
                <span style={{fontSize:12,fontWeight:700,flex:1,color:'#E8F0FF'}}>{lb}</span>
                <Toggle value={!!val} onChange={async v=>{
                  const upd=key==='status'?{status:v?'approved':'pending'}:{[key]:v}
                  await updateMember(m.id,upd);toast(`${lb} ${v?'on':'off'}`);onDone()
                }}/>
              </div>
            ))}
          </div>

          {/* ── CHANGE PASSWORD ── */}
          <div style={{background:'rgba(123,97,255,.07)',border:'1px solid rgba(123,97,255,.2)',borderRadius:10,padding:'12px 13px',marginBottom:12}}>
            <div style={{fontSize:10,fontWeight:700,color:'#A78BFA',textTransform:'uppercase',letterSpacing:'.09em',marginBottom:8}}>🔑 Change Password</div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <div style={{position:'relative',flex:1}}>
                <input
                  type={showPw?'text':'password'}
                  value={newPw}
                  onChange={e=>setNewPw(e.target.value)}
                  placeholder="New password (min 6 chars)"
                  onKeyDown={e=>e.key==='Enter'&&changePassword()}
                  style={{...inp,padding:'10px 38px 10px 12px',fontSize:13,width:'100%',letterSpacing:newPw&&!showPw?2:0}}/>
                <button onClick={()=>setShowPw(x=>!x)}
                  style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:14,color:'#4a5070',padding:2}}>
                  {showPw?'🙈':'👁️'}
                </button>
              </div>
              <button onClick={changePassword} disabled={pwLoading}
                style={{padding:'10px 14px',borderRadius:9,fontFamily:'Rajdhani,sans-serif',fontWeight:800,fontSize:12,cursor:'pointer',flexShrink:0,border:'none',background:pwLoading?'#1a2030':'linear-gradient(135deg,#A78BFA,#7B61FF)',color:'#fff',opacity:pwLoading?0.6:1,whiteSpace:'nowrap',transition:'all .15s'}}>
                {pwLoading?'⏳...':'✓ Set'}
              </button>
            </div>
            {newPw.length>0 && newPw.length<6 && (
              <div style={{fontSize:11,color:'#FF6B6B',marginTop:5}}>⚠️ Too short — min 6 characters</div>
            )}
            {newPw.length>=6 && (
              <div style={{fontSize:11,color:'#7DF9AA',marginTop:5}}>✅ Good — press Set to apply</div>
            )}
          </div>

          {/* Remove button */}
          <Btn variant="danger" full onClick={async()=>{if(!confirm(`Remove ${m.name} from the house?`)) return;await deleteMember(m.id);toast(`${m.name} removed`,'warn');onDone()}}>
            ✕ Remove Member
          </Btn>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// LOGS TAB
// ══════════════════════════════════════════════════════════
function LogsTab({ logs, members, onClear }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const ACTION_TYPES = [
    { key:'all',     label:'All',         color:'#7DF9AA' },
    { key:'task',    label:'📋 Tasks',    color:'#4D96FF' },
    { key:'member',  label:'👥 Members',  color:'#C77DFF' },
    { key:'expense', label:'💸 Expenses', color:'#FF9A3C' },
    { key:'fund',    label:'🏦 Fund',     color:'#FFD93D' },
    { key:'auth',    label:'🔑 Auth',     color:'#FF6B6B' },
  ]

  const getActionType = (action='') => {
    const a = action.toLowerCase()
    if (a.includes('task')||a.includes('assign')||a.includes('rotat')) return 'task'
    if (a.includes('member')||a.includes('approv')||a.includes('reject')||a.includes('register')) return 'member'
    if (a.includes('expense')||a.includes('split')||a.includes('paid')) return 'expense'
    if (a.includes('fund')||a.includes('transaction')||a.includes('treasurer')) return 'fund'
    if (a.includes('login')||a.includes('signup')||a.includes('auth')||a.includes('sign')) return 'auth'
    return 'other'
  }
  const getActionIcon  = a => ({ task:'📋', member:'👥', expense:'💸', fund:'🏦', auth:'🔑', other:'⚡' }[getActionType(a)])
  const getActionColor = a => ({ task:'#4D96FF', member:'#C77DFF', expense:'#FF9A3C', fund:'#FFD93D', auth:'#FF6B6B', other:'#7DF9AA' }[getActionType(a)])

  const filtered = logs.filter(l => {
    const matchFilter = filter==='all' || getActionType(l.action)===filter
    const matchSearch = !search || l.action?.toLowerCase().includes(search.toLowerCase())
      || l.actor?.toLowerCase().includes(search.toLowerCase())
      || l.details?.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const formatTime = ts => {
    const diff = Date.now() - new Date(ts)
    if (diff < 60000)    return 'Just now'
    if (diff < 3600000)  return `${Math.floor(diff/60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`
    if (diff < 604800000)return `${Math.floor(diff/86400000)}d ago`
    return new Date(ts).toLocaleDateString('en-IN',{day:'numeric',month:'short'})
  }

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:9,marginBottom:14}}>
        {[
          {label:'Total Logs',value:logs.length,color:'#7DF9AA'},
          {label:'Today',value:logs.filter(l=>new Date(l.created_at).toDateString()===new Date().toDateString()).length,color:'#4D96FF'},
          {label:'This Week',value:logs.filter(l=>Date.now()-new Date(l.created_at)<604800000).length,color:'#FFD93D'},
        ].map(s=>(
          <div key={s.label} style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.08)',borderRadius:11,padding:'11px 12px',textAlign:'center'}}>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:18,fontWeight:900,color:s.color}}>{s.value}</div>
            <div style={{fontSize:10,color:'#4a5070',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search logs..." style={{...inp,width:'100%',padding:'10px 13px',marginBottom:10}}/>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>
        {ACTION_TYPES.map(t=>(
          <button key={t.key} onClick={()=>setFilter(t.key)}
            style={{padding:'5px 12px',borderRadius:99,fontSize:11,fontWeight:700,cursor:'pointer',
              border:`1px solid ${filter===t.key?t.color:'rgba(255,255,255,.08)'}`,
              background:filter===t.key?`${t.color}18`:'transparent',
              color:filter===t.key?t.color:'#4a5070',transition:'all .15s'}}>
            {t.label} {t.key!=='all'?`(${logs.filter(l=>getActionType(l.action)===t.key).length})`:''}
          </button>
        ))}
      </div>
      {filtered.length===0 ? (
        <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:40,textAlign:'center',color:'#4a5070'}}>
          <div style={{fontSize:32,marginBottom:8}}>📭</div>No logs found
        </div>
      ) : (
        <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,overflow:'hidden',marginBottom:14}}>
          {filtered.map((l,i)=>(
            <div key={l.id} style={{padding:'12px 14px',borderBottom:i<filtered.length-1?'1px solid rgba(125,249,170,.05)':'none',display:'flex',gap:11,alignItems:'flex-start'}}>
              <div style={{width:32,height:32,borderRadius:8,flexShrink:0,background:`${getActionColor(l.action)}18`,border:`1px solid ${getActionColor(l.action)}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,marginTop:1}}>
                {getActionIcon(l.action)}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:'#E8F0FF',lineHeight:1.4}}>{l.action}</div>
                <div style={{display:'flex',gap:8,marginTop:3,flexWrap:'wrap',alignItems:'center'}}>
                  {l.actor&&<span style={{fontSize:11,color:'#8890b0'}}>by <span style={{color:'#7DF9AA',fontWeight:700}}>{l.actor}</span></span>}
                  {l.details&&<span style={{fontSize:11,color:'#4a5070'}}>· {l.details}</span>}
                </div>
              </div>
              <div style={{fontSize:10,color:'#4a5070',whiteSpace:'nowrap',flexShrink:0,marginTop:3}}>{formatTime(l.created_at)}</div>
            </div>
          ))}
        </div>
      )}
      {logs.length>0&&(
        <button onClick={onClear} style={{width:'100%',padding:12,borderRadius:10,fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',border:'1px solid rgba(255,107,107,.25)',background:'rgba(255,107,107,.07)',color:'#FF6B6B',letterSpacing:'.04em'}}>
          🗑️ Clear All Logs
        </button>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// WHATSAPP TAB
// ══════════════════════════════════════════════════════════
function WhatsAppTab({ members, assigns, week, toast }) {
  const approved = members.filter(m => m.status === 'approved')
  const [msgTemplate, setMsgTemplate] = useState(
    `🏠 MANIYARA — Week ${week}\n\nHey {name}! 👋\nYour task this week: {task}\n\nPlease mark it done on the app once completed! ✅\n\nApp: https://maniyara.pages.dev`
  )
  const buildMsg = (member) => {
    const a = assigns.find(x => x.member_id===member.id || x.members?.id===member.id)
    const t = a?.tasks
    return msgTemplate.replace('{name}',member.name).replace('{task}',t?`${t.emoji} ${t.name}`:'No task assigned yet')
  }
  const [queueMode, setQueueMode] = useState(false)
  const [queueIdx,  setQueueIdx]  = useState(0)
  const [sent,      setSent]      = useState([])
  const startQueue = () => { setQueueMode(true); setQueueIdx(0); setSent([]) }
  const stopQueue  = () => { setQueueMode(false); setQueueIdx(0); setSent([]) }
  const currentMember = approved[queueIdx]
  const sendCurrent = () => {
    window.open(buildWALink(currentMember.phone, buildMsg(currentMember)), '_blank')
    setSent(s=>[...s, currentMember.id])
    if (queueIdx < approved.length-1) setQueueIdx(i=>i+1)
    else { toast(`✅ Sent to all ${approved.length} members!`); stopQueue() }
  }
  return (
    <div>
      {queueMode ? (
        <div>
          <div style={{background:'rgba(37,211,102,.07)',border:'2px solid rgba(37,211,102,.3)',borderRadius:14,padding:16,marginBottom:14,textAlign:'center'}}>
            <div style={{fontSize:11,fontWeight:700,color:'#25D366',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:6}}>SENDING {queueIdx+1} of {approved.length}</div>
            <div style={{background:'rgba(255,255,255,.08)',borderRadius:99,height:6,marginBottom:14,overflow:'hidden'}}>
              <div style={{height:'100%',borderRadius:99,background:'linear-gradient(90deg,#25D366,#128C7E)',width:`${(queueIdx/approved.length)*100}%`,transition:'width .3s'}}/>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6,justifyContent:'center',marginBottom:14}}>
              {approved.map((m,i)=>(
                <div key={m.id} style={{fontSize:11,padding:'3px 10px',borderRadius:99,fontWeight:700,
                  background:sent.includes(m.id)?'rgba(37,211,102,.15)':i===queueIdx?'rgba(255,217,61,.15)':'rgba(255,255,255,.05)',
                  border:`1px solid ${sent.includes(m.id)?'rgba(37,211,102,.3)':i===queueIdx?'rgba(255,217,61,.3)':'rgba(255,255,255,.08)'}`,
                  color:sent.includes(m.id)?'#25D366':i===queueIdx?'#FFD93D':'#4a5070'}}>
                  {sent.includes(m.id)?'✅':i===queueIdx?'👉':'⏳'} {m.name}
                </div>
              ))}
            </div>
          </div>
          {currentMember&&(
            <div style={{background:'#0d0e1a',border:'2px solid rgba(255,217,61,.25)',borderRadius:14,padding:16,marginBottom:14,textAlign:'center'}}>
              <Avatar emoji={currentMember.avatar} color={currentMember.color} size={56}/>
              <div style={{fontWeight:800,fontSize:18,marginTop:10,marginBottom:4}}>{currentMember.name}</div>
              <div style={{fontSize:12,color:'#8890b0',marginBottom:16}}>
                {(()=>{const a=assigns.find(x=>x.member_id===currentMember.id||x.members?.id===currentMember.id);const t=a?.tasks;return t?`${t.emoji} ${t.name}`:'⚠️ No task assigned'})()}
              </div>
              <button onClick={sendCurrent} style={{width:'100%',padding:16,borderRadius:12,border:'none',cursor:'pointer',background:'linear-gradient(135deg,#25D366,#128C7E)',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:800,fontSize:16,letterSpacing:'.08em',boxShadow:'0 4px 20px rgba(37,211,102,.35)'}}>
                📱 Send to {currentMember.name} →
              </button>
              <div style={{fontSize:11,color:'#4a5070',marginTop:8}}>Tap → opens WhatsApp → come back → tap next</div>
            </div>
          )}
          <button onClick={stopQueue} style={{width:'100%',padding:12,borderRadius:10,border:'1px solid rgba(255,107,107,.25)',background:'rgba(255,107,107,.07)',color:'#FF6B6B',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>✕ Stop Broadcast</button>
        </div>
      ) : (
        <div>
          <div style={{background:'linear-gradient(135deg,rgba(37,211,102,.1),rgba(37,211,102,.05))',border:'2px solid rgba(37,211,102,.3)',borderRadius:14,padding:18,marginBottom:16,textAlign:'center'}}>
            <div style={{fontSize:36,marginBottom:8}}>📢</div>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:13,fontWeight:800,color:'#25D366',letterSpacing:1,marginBottom:6}}>BROADCAST TO ALL</div>
            <div style={{fontSize:12,color:'#8890b0',marginBottom:16,lineHeight:1.7}}>Guides you through sending WhatsApp to each member one by one.</div>
            <button onClick={startQueue} style={{width:'100%',padding:'15px',borderRadius:12,border:'none',cursor:'pointer',background:'linear-gradient(135deg,#25D366,#128C7E)',color:'#fff',fontFamily:'Rajdhani,sans-serif',fontWeight:800,fontSize:16,letterSpacing:'.08em',boxShadow:'0 4px 20px rgba(37,211,102,.3)'}}>
              📱 Start Broadcast — {approved.length} Members
            </button>
          </div>
          <SecHead title="📝 Message Template"/>
          <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:14,marginBottom:14}}>
            <div style={{fontSize:11,color:'#8890b0',marginBottom:10,lineHeight:1.6}}>Use <span style={{color:'#7DF9AA',fontWeight:700}}>{'{name}'}</span> and <span style={{color:'#7DF9AA',fontWeight:700}}>{'{task}'}</span> placeholders.</div>
            <textarea value={msgTemplate} onChange={e=>setMsgTemplate(e.target.value)} rows={7} style={{...inp,width:'100%',resize:'vertical',fontSize:13,lineHeight:1.7}}/>
            <button onClick={()=>setMsgTemplate(`🏠 MANIYARA — Week ${week}\n\nHey {name}! 👋\nYour task this week: {task}\n\nPlease mark it done on the app once completed! ✅\n\nApp: https://maniyara.pages.dev`)}
              style={{marginTop:9,padding:'7px 14px',borderRadius:8,border:'1px solid rgba(125,249,170,.2)',background:'transparent',color:'#7DF9AA',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'Rajdhani,sans-serif'}}>
              ↺ Reset to Default
            </button>
          </div>
          <SecHead title="📱 Send Individually"/>
          <div style={{display:'flex',flexDirection:'column',gap:9}}>
            {approved.map(m=>{
              const a=assigns.find(x=>x.member_id===m.id||x.members?.id===m.id); const t=a?.tasks
              return (
                <div key={m.id} style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:13,display:'flex',alignItems:'center',gap:10}}>
                  <Avatar emoji={m.avatar} color={m.color} size={38}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:13}}>{m.name}</div>
                    <div style={{fontSize:11,color:'#8890b0',marginTop:2}}>{t?`${t.emoji} ${t.name}`:'⚠️ No task assigned'}</div>
                  </div>
                  <a href={buildWALink(m.phone,buildMsg(m))} target="_blank" rel="noreferrer" style={{textDecoration:'none',flexShrink:0}}>
                    <button style={{padding:'9px 14px',borderRadius:9,border:'1px solid rgba(37,211,102,.3)',background:'rgba(37,211,102,.1)',color:'#25D366',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',whiteSpace:'nowrap'}}>📱 Send</button>
                  </a>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// ASSIGN TAB
// ══════════════════════════════════════════════════════════
function AssignTab({ members, tasks, assigns, week, toast, onDone }) {
  const approved    = members.filter(m => m.status === 'approved')
  const activeTasks = tasks.filter(t => t.active)
  const [taskMap, setTaskMap] = useState(() => {
    const m = {}; assigns.forEach(a=>{ m[a.member_id||a.members?.id] = a.task_id||a.tasks?.id }); return m
  })
  const [saving,   setSaving]   = useState(false)
  const [rotating, setRotating] = useState(false)
  useEffect(() => {
    const m = {}; assigns.forEach(a=>{ m[a.member_id||a.members?.id] = a.task_id||a.tasks?.id }); setTaskMap(m)
  }, [assigns])
  const allAssigned = approved.every(m => taskMap[m.id])
  const rotationPreview = approved.map((m,i) => {
    const nextM = approved[(i+1)%approved.length]
    return { member:m, task:tasks.find(t=>t.id==taskMap[nextM?.id]) }
  })
  const saveAssignments = async () => {
    const unassigned = approved.filter(m=>!taskMap[m.id])
    if (unassigned.length>0) { toast(`Assign tasks to: ${unassigned.map(m=>m.name).join(', ')}`, 'warn'); return }
    setSaving(true)
    try { await adminAssignTasks(approved.map(m=>({member_id:m.id,task_id:taskMap[m.id]}))); toast(`Week ${week} tasks saved ✅`); onDone() }
    catch(e) { toast('Failed: '+e.message,'error') }
    finally { setSaving(false) }
  }
  const doRotate = async () => {
    if (!allAssigned) { toast('Assign tasks to all members first','warn'); return }
    if (!confirm(`Rotate tasks to Week ${week+1}?`)) return
    setRotating(true)
    try { const nw=await rotateToNextWeek(); toast(`✅ Rotated to Week ${nw}!`); onDone() }
    catch(e) { toast('Rotate failed: '+e.message,'error') }
    finally { setRotating(false) }
  }
  return (
    <div>
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
      <SecHead title="Assign Tasks to Members"/>
      <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:14,marginBottom:14}}>
        {approved.map((m,i)=>{
          const cur=assigns.find(a=>a.member_id===m.id||a.members?.id===m.id)
          return (
            <div key={m.id} style={{marginBottom:12,paddingBottom:12,borderBottom:i<approved.length-1?'1px solid rgba(125,249,170,.06)':'none'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                <Avatar emoji={m.avatar} color={m.color} size={36}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14}}>{m.name}</div>
                  {m.username&&<div style={{fontSize:11,color:'#4a5070'}}>@{m.username}</div>}
                </div>
                {cur&&<div style={{fontSize:11,fontWeight:700,padding:'4px 10px',borderRadius:99,background:cur.done?'rgba(125,249,170,.1)':'rgba(255,217,61,.08)',border:`1px solid ${cur.done?'rgba(125,249,170,.25)':'rgba(255,217,61,.2)'}`,color:cur.done?'#7DF9AA':'#FFD93D',flexShrink:0}}>{cur.done?'✅ Done':'⏳ Pending'}</div>}
              </div>
              <div style={{display:'flex',gap:9,alignItems:'center'}}>
                <select value={taskMap[m.id]||''} onChange={e=>setTaskMap(p=>({...p,[m.id]:e.target.value}))}
                  style={{...inp,flex:1,padding:'10px 13px',borderColor:taskMap[m.id]?'rgba(125,249,170,.3)':'rgba(255,107,107,.3)'}}>
                  <option value="">— Pick a task —</option>
                  {activeTasks.map(t=><option key={t.id} value={t.id}>{t.emoji} {t.name}</option>)}
                </select>
                {cur&&<button onClick={async()=>{if(!confirm(`Remove ${m.name}'s task?`)) return;await deleteAssignment(cur.id);setTaskMap(p=>{const n={...p};delete n[m.id];return n});toast(`${m.name}'s task removed`,'warn');onDone()}} style={{padding:'9px 12px',borderRadius:8,border:'1px solid rgba(255,107,107,.25)',background:'rgba(255,107,107,.08)',color:'#FF6B6B',cursor:'pointer',fontSize:14,flexShrink:0}}>🗑️</button>}
              </div>
            </div>
          )
        })}
        <Btn full loading={saving} onClick={saveAssignments} style={{padding:13,fontSize:14,marginTop:4}}>💾 Save Assignments for Week {week}</Btn>
      </div>
      <div style={{background:'rgba(125,249,170,.05)',border:'2px solid rgba(125,249,170,.2)',borderRadius:13,padding:16,marginBottom:16}}>
        <div style={{fontFamily:'Orbitron,monospace',fontSize:12,fontWeight:700,letterSpacing:2,color:'#7DF9AA',marginBottom:8}}>🔄 ROTATE TO NEXT WEEK</div>
        <div style={{fontSize:13,color:'#8890b0',lineHeight:1.7,marginBottom:14}}>Each person gets the task of the person <strong style={{color:'#E8F0FF'}}>below them</strong>. Creates Week <strong style={{color:'#7DF9AA'}}>{week+1}</strong>.</div>
        {allAssigned&&(
          <div style={{background:'#0d0e1a',borderRadius:9,padding:12,marginBottom:14}}>
            <div style={{fontSize:10,color:'#4a5070',fontWeight:700,textTransform:'uppercase',letterSpacing:'.09em',marginBottom:8}}>Preview — Week {week+1}:</div>
            {rotationPreview.map(({member:m,task:t})=>(
              <div key={m.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid rgba(125,249,170,.05)'}}>
                <Avatar emoji={m.avatar} color={m.color} size={22}/>
                <span style={{fontWeight:700,fontSize:12,flex:1}}>{m.name}</span>
                <span style={{fontSize:12,color:'#8890b0'}}>{t?`${t.emoji} ${t.name}`:'—'}</span>
              </div>
            ))}
          </div>
        )}
        <Btn full loading={rotating} variant={allAssigned?'primary':'ghost'} style={{padding:14,fontSize:15,letterSpacing:1}} onClick={doRotate}>🔄 ROTATE → WEEK {week+1}</Btn>
      </div>
      <SecHead title="Delete Options"/>
      <div style={{display:'flex',flexDirection:'column',gap:9}}>
        <Btn variant="warn" full onClick={async()=>{if(!confirm(`Reset done status for Week ${week}?`)) return;try{await resetWeekDoneStatus(week);toast('Done status reset ✅');onDone()}catch(e){toast('Failed: '+e.message,'error')}}}>🔄 Reset Done Status — Keep Tasks</Btn>
        <Btn variant="danger" full onClick={async()=>{if(!confirm(`Delete ALL assignments for Week ${week}?`)) return;try{await clearWeekAssignments(week);toast(`Week ${week} deleted 🗑️`,'warn');onDone()}catch(e){toast('Failed: '+e.message,'error')}}}>🗑️ Delete This Week's Assignments</Btn>
        <Btn variant="danger" full onClick={async()=>{if(!confirm('Delete ALL assignments?')) return;if(!confirm('Final check?')) return;try{await clearAllAssignments();toast('All deleted ☢️','warn');onDone()}catch(e){toast('Failed: '+e.message,'error')}}}>☢️ Delete ALL Assignments</Btn>
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
          {EMOJIS.map(em=><option key={em} value={em}>{em}</option>)}
        </select>
        <input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Task name" style={{...inp,flex:1,padding:'9px 11px'}}/>
      </div>
      <textarea value={form.description} onChange={e=>set('description',e.target.value)} rows={2} placeholder="Description..." style={{...inp,width:'100%',resize:'vertical',marginBottom:9}}/>
      <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:11}}>
        {COLORS.map(c=><button key={c} onClick={()=>set('color',c)} style={{width:22,height:22,borderRadius:'50%',background:c,border:`2px solid ${form.color===c?'#fff':'transparent'}`,cursor:'pointer'}}/>)}
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

// ══════════════════════════════════════════════════════════
// SITE CONTROLS TAB
// ══════════════════════════════════════════════════════════
function SiteControlsTab({ settings, toast, onDone }) {
  const [form, setForm] = useState({
    maintenance_mode:    settings?.maintenance_mode    ?? false,
    maintenance_message: settings?.maintenance_message ?? "We are performing maintenance. Back soon! 🔧",
    page_dashboard:      settings?.page_dashboard      ?? true,
    page_mytask:         settings?.page_mytask         ?? true,
    page_expenses:       settings?.page_expenses       ?? true,
    page_fund:           settings?.page_fund           ?? true,
  })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const save = async () => {
    setSaving(true)
    try { await updateSettings(form); toast('Site controls saved ✅'); onDone() }
    catch(e) { toast('Failed: '+e.message,'error') }
    finally { setSaving(false) }
  }
  const PAGES = [
    { key:'page_dashboard', label:'🏠 Home',       desc:'Main overview — crew + task status' },
    { key:'page_mytask',    label:'✦ My Task',      desc:'Personal task & proof upload' },
    { key:'page_expenses',  label:'💸 Expenses',    desc:'Split bill tracker' },
    { key:'page_fund',      label:'🏦 Common Fund', desc:'Shared house fund page' },
  ]
  return (
    <div>
      <div style={{background:form.maintenance_mode?'rgba(255,107,107,.08)':'rgba(255,217,61,.05)',border:`2px solid ${form.maintenance_mode?'rgba(255,107,107,.35)':'rgba(255,217,61,.2)'}`,borderRadius:14,padding:16,marginBottom:18}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:13,fontWeight:800,color:form.maintenance_mode?'#FF6B6B':'#FFD93D',letterSpacing:1}}>{form.maintenance_mode?'🚨 MAINTENANCE ON':'✅ SITE LIVE'}</div>
            <div style={{fontSize:11,color:'#8890b0',marginTop:3}}>{form.maintenance_mode?'Members see maintenance page':'All members can access the site'}</div>
          </div>
          <div onClick={()=>set('maintenance_mode',!form.maintenance_mode)} style={{width:60,height:32,borderRadius:99,cursor:'pointer',position:'relative',transition:'background .2s',background:form.maintenance_mode?'#FF6B6B':'rgba(255,255,255,.1)',border:`2px solid ${form.maintenance_mode?'#FF6B6B':'rgba(255,255,255,.15)'}`,boxShadow:form.maintenance_mode?'0 0 16px rgba(255,107,107,.4)':'none'}}>
            <div style={{position:'absolute',top:3,transition:'left .2s',left:form.maintenance_mode?28:3,width:22,height:22,borderRadius:'50%',background:form.maintenance_mode?'#fff':'rgba(255,255,255,.4)'}}/>
          </div>
        </div>
        <label style={{display:'block',fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.09em',marginBottom:6}}>Maintenance Message</label>
        <textarea value={form.maintenance_message} onChange={e=>set('maintenance_message',e.target.value)} rows={3} style={{...inp,width:'100%',resize:'vertical',fontSize:'14px',lineHeight:1.6}} placeholder="We are performing maintenance. Back soon! 🔧"/>
        {form.maintenance_mode&&<div style={{marginTop:10,padding:'9px 12px',borderRadius:8,background:'rgba(255,107,107,.1)',border:'1px solid rgba(255,107,107,.2)'}}>
          <div style={{fontSize:12,color:'#FF6B6B',fontWeight:700}}>⚠️ Site is in maintenance mode. Only admin can bypass it.</div>
        </div>}
      </div>
      <div style={{fontFamily:'Orbitron,monospace',fontSize:10,fontWeight:700,letterSpacing:2,color:'#7DF9AA',textTransform:'uppercase',marginBottom:12}}>📱 Page Visibility</div>
      <div style={{display:'flex',flexDirection:'column',gap:9,marginBottom:20}}>
        {PAGES.map(({key,label,desc})=>{
          const isOn=form[key]!==false
          return (
            <div key={key} style={{background:'#0d0e1a',border:`1px solid ${isOn?'rgba(125,249,170,.2)':'rgba(255,255,255,.06)'}`,borderRadius:12,padding:'13px 14px',display:'flex',alignItems:'center',gap:13,transition:'border-color .2s'}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:14,color:isOn?'#E8F0FF':'#4a5070'}}>{label}</div>
                <div style={{fontSize:11,color:'#4a5070',marginTop:2}}>{desc}</div>
              </div>
              <div style={{fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:99,flexShrink:0,background:isOn?'rgba(125,249,170,.1)':'rgba(255,107,107,.08)',border:`1px solid ${isOn?'rgba(125,249,170,.25)':'rgba(255,107,107,.2)'}`,color:isOn?'#7DF9AA':'#FF6B6B'}}>{isOn?'VISIBLE':'HIDDEN'}</div>
              <div onClick={()=>set(key,!isOn)} style={{width:50,height:27,borderRadius:99,cursor:'pointer',position:'relative',flexShrink:0,transition:'background .2s',background:isOn?'#7DF9AA':'rgba(255,255,255,.08)',boxShadow:isOn?'0 0 12px rgba(125,249,170,.3)':'none'}}>
                <div style={{position:'absolute',top:3,transition:'left .2s',left:isOn?24:3,width:21,height:21,borderRadius:'50%',background:isOn?'#070810':'rgba(255,255,255,.3)'}}/>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginBottom:18}}>
        <button onClick={()=>setForm(f=>({...f,page_dashboard:true,page_mytask:true,page_expenses:true,page_fund:true}))} style={{padding:'10px',borderRadius:9,fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer',border:'1px solid rgba(125,249,170,.2)',background:'rgba(125,249,170,.07)',color:'#7DF9AA'}}>✅ Enable All</button>
        <button onClick={()=>setForm(f=>({...f,page_dashboard:true,page_mytask:false,page_expenses:false,page_fund:false}))} style={{padding:'10px',borderRadius:9,fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer',border:'1px solid rgba(255,107,107,.2)',background:'rgba(255,107,107,.07)',color:'#FF6B6B'}}>🚫 Home Only</button>
      </div>
      <button onClick={save} disabled={saving} style={{width:'100%',padding:16,borderRadius:12,fontFamily:'Rajdhani,sans-serif',fontWeight:800,fontSize:15,cursor:'pointer',border:'none',background:saving?'#1a2030':'linear-gradient(135deg,#7DF9AA,#00D4AA)',color:'#070810',letterSpacing:'.08em',boxShadow:'0 4px 20px rgba(125,249,170,.25)',opacity:saving?0.6:1}}>
        {saving?'⏳ Saving...':'💾 Save Site Controls'}
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// EXPENSES ADMIN TAB
// ══════════════════════════════════════════════════════════
const CATS = [
  {id:'groceries',label:'Groceries',emoji:'🛒'},{id:'electricity',label:'Electricity',emoji:'💡'},
  {id:'water',label:'Water',emoji:'🌊'},{id:'food',label:'Food/Order',emoji:'🍕'},
  {id:'internet',label:'Internet',emoji:'📶'},{id:'rent',label:'Rent',emoji:'🏠'},
  {id:'cleaning',label:'Cleaning',emoji:'🧹'},{id:'other',label:'Other',emoji:'💸'},
]
const catMeta = id => CATS.find(c=>c.id===id)||CATS[7]
const fmtAmt  = n => '₹'+Number(n).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})

function ExpensesAdminTab({ toast, members }) {
  const [expenses,setExpenses]=useState([])
  const [loading,setL]=useState(true)
  const [expandId,setExpandId]=useState(null)
  const [editId,setEditId]=useState(null)
  const [editData,setEditData]=useState({})
  const [saving,setSaving]=useState(false)
  useEffect(()=>{loadExp()},[])
  async function loadExp(){setL(true);try{setExpenses(await getExpenses())}catch(e){toast('Failed: '+e.message,'error')}finally{setL(false)}}
  const totalSpent=expenses.reduce((s,e)=>s+Number(e.amount),0)
  const totalUnsettled=expenses.reduce((s,e)=>{const u=(e.expense_splits||[]).filter(sp=>!sp.paid).reduce((a,sp)=>a+Number(sp.amount),0);return s+u},0)
  const startEdit=exp=>{setEditId(exp.id);setEditData({title:exp.title,amount:exp.amount,category:exp.category,note:exp.note||''});setExpandId(exp.id)}
  const saveEdit=async expId=>{
    if(!editData.title?.trim()){toast('Title required','warn');return}
    if(!editData.amount||+editData.amount<=0){toast('Valid amount required','warn');return}
    setSaving(true)
    try{const{error}=await(await import('../lib/supabase')).supabase.from('expenses').update({title:editData.title.trim(),amount:+editData.amount,category:editData.category,note:editData.note}).eq('id',expId);if(error)throw error;toast('Expense updated ✅');setEditId(null);loadExp()}
    catch(e){toast('Failed: '+e.message,'error')}finally{setSaving(false)}
  }
  const delExp=async exp=>{if(!confirm(`Delete "${exp.title}"?`))return;try{await deleteExpense(exp.id);toast('Deleted 🗑️','warn');loadExp()}catch(e){toast('Failed: '+e.message,'error')}}
  const clearAll=async()=>{if(!confirm('Delete ALL expenses?'))return;if(!confirm('Final confirmation.'))return;try{const{supabase:sb}=await import('../lib/supabase');await sb.from('expense_splits').delete().gt('created_at','2000-01-01');await sb.from('expenses').delete().gt('created_at','2000-01-01');toast('All cleared ☢️','warn');loadExp()}catch(e){toast('Failed: '+e.message,'error')}}
  const clearSettled=async()=>{if(!confirm('Delete settled expenses?'))return;try{const settled=expenses.filter(e=>(e.expense_splits||[]).every(s=>s.paid));const{supabase:sb}=await import('../lib/supabase');for(const e of settled){await sb.from('expense_splits').delete().eq('expense_id',e.id);await sb.from('expenses').delete().eq('id',e.id)}toast(`${settled.length} settled cleared ✅`);loadExp()}catch(e){toast('Failed: '+e.message,'error')}}
  if(loading)return <div style={{color:'#8890b0',padding:40,textAlign:'center'}}>Loading...</div>
  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:9,marginBottom:14}}>
        {[['📊','Bills',expenses.length,'#4D96FF'],['💰','Spent',fmtAmt(totalSpent),'#7DF9AA'],['⏳','Unsettled',fmtAmt(totalUnsettled),'#FF6B6B']].map(([ic,lb,val,c])=>(
          <div key={lb} style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.07)',borderRadius:13,padding:'12px 8px',textAlign:'center'}}>
            <span style={{fontSize:20,display:'block',marginBottom:4}}>{ic}</span>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:12,fontWeight:700,color:c,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{val}</div>
            <div style={{fontSize:9,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.07em',marginTop:3,fontWeight:700}}>{lb}</div>
          </div>
        ))}
      </div>
      <div style={{display:'flex',gap:9,marginBottom:16}}>
        <button onClick={clearSettled} style={{flex:1,padding:'10px',borderRadius:9,fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer',border:'1px solid rgba(255,217,61,.25)',background:'rgba(255,217,61,.07)',color:'#FFD93D'}}>🧹 Clear Settled</button>
        <button onClick={clearAll} style={{flex:1,padding:'10px',borderRadius:9,fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:12,cursor:'pointer',border:'1px solid rgba(255,107,107,.25)',background:'rgba(255,107,107,.07)',color:'#FF6B6B'}}>☢️ Clear ALL</button>
      </div>
      <SecHead title="All Expenses" badge={`${expenses.length} total`}/>
      {expenses.length===0?(
        <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.07)',borderRadius:13,padding:'50px 20px',textAlign:'center',color:'#4a5070'}}><div style={{fontSize:44,marginBottom:10}}>💸</div>No expenses yet.</div>
      ):expenses.map(exp=>{
        const cat=catMeta(exp.category),isExp=expandId===exp.id,isEdit=editId===exp.id,payer=exp.paid_by_member,splits=exp.expense_splits||[],unpaid=splits.filter(s=>!s.paid).length,allPaid=unpaid===0
        return (
          <div key={exp.id} style={{background:'#0d0e1a',border:`1px solid ${allPaid?'rgba(125,249,170,.2)':'rgba(125,249,170,.08)'}`,borderRadius:13,marginBottom:10,overflow:'hidden'}}>
            <div style={{padding:'12px 13px',display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:42,height:42,borderRadius:11,background:'rgba(125,249,170,.07)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{cat.emoji}</div>
              <div style={{flex:1,minWidth:0,cursor:'pointer'}} onClick={()=>setExpandId(isExp?null:exp.id)}>
                <div style={{fontWeight:700,fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{exp.title}</div>
                <div style={{fontSize:11,color:'#8890b0',marginTop:2}}>{cat.label} · {payer?.name||'?'} · {new Date(exp.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</div>
              </div>
              <div style={{textAlign:'right',flexShrink:0,marginRight:6}}>
                <div style={{fontFamily:'Orbitron,monospace',fontSize:15,fontWeight:700,color:'#7DF9AA'}}>{fmtAmt(exp.amount)}</div>
                <div style={{fontSize:10,fontWeight:700,color:allPaid?'#6BCB77':'#FFD93D',marginTop:2}}>{allPaid?'✅ Settled':`${unpaid} pending`}</div>
              </div>
              <div style={{display:'flex',gap:5,flexShrink:0}}>
                <button onClick={()=>isEdit?setEditId(null):startEdit(exp)} style={{width:32,height:32,borderRadius:8,border:'1px solid rgba(77,150,255,.25)',background:'rgba(77,150,255,.08)',color:'#4D96FF',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>✏️</button>
                <button onClick={()=>delExp(exp)} style={{width:32,height:32,borderRadius:8,border:'1px solid rgba(255,107,107,.25)',background:'rgba(255,107,107,.08)',color:'#FF6B6B',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center'}}>🗑️</button>
              </div>
            </div>
            {isEdit&&(
              <div style={{borderTop:'1px solid rgba(125,249,170,.08)',padding:'13px',background:'rgba(77,150,255,.04)'}}>
                <div style={{fontSize:10,fontWeight:700,color:'#4D96FF',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:10}}>✏️ Edit Expense</div>
                <div style={{marginBottom:9}}><label style={{display:'block',fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:5}}>Title</label><input value={editData.title||''} onChange={e=>setEditData(d=>({...d,title:e.target.value}))} style={{...inp,padding:'10px 12px',fontSize:'15px'}} placeholder="Title"/></div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginBottom:9}}>
                  <div><label style={{display:'block',fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:5}}>Amount (₹)</label><input type="number" value={editData.amount||''} onChange={e=>setEditData(d=>({...d,amount:e.target.value}))} style={{...inp,padding:'10px 12px',fontSize:'15px',fontFamily:'Orbitron,monospace',color:'#7DF9AA'}}/></div>
                  <div><label style={{display:'block',fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:5}}>Category</label><select value={editData.category||'other'} onChange={e=>setEditData(d=>({...d,category:e.target.value}))} style={{...inp,padding:'10px 12px',fontSize:'15px'}}>{CATS.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}</select></div>
                </div>
                <div style={{marginBottom:11}}><label style={{display:'block',fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:5}}>Note</label><input value={editData.note||''} onChange={e=>setEditData(d=>({...d,note:e.target.value}))} style={{...inp,padding:'10px 12px',fontSize:'15px'}} placeholder="Optional note..."/></div>
                <div style={{display:'flex',gap:9}}>
                  <button onClick={()=>setEditId(null)} style={{flex:1,padding:'10px',borderRadius:9,fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',border:'1px solid rgba(125,249,170,.15)',background:'transparent',color:'#8890b0'}}>Cancel</button>
                  <button onClick={()=>saveEdit(exp.id)} disabled={saving} style={{flex:2,padding:'10px',borderRadius:9,fontFamily:'Rajdhani,sans-serif',fontWeight:800,fontSize:13,cursor:'pointer',border:'none',background:'linear-gradient(135deg,#7DF9AA,#00D4AA)',color:'#070810',opacity:saving?0.6:1}}>{saving?'Saving...':'💾 Save'}</button>
                </div>
              </div>
            )}
            {isExp&&!isEdit&&(
              <div style={{borderTop:'1px solid rgba(125,249,170,.08)',padding:'12px 13px',background:'rgba(0,0,0,.15)'}}>
                {exp.note&&<div style={{fontSize:12,color:'#8890b0',marginBottom:9,fontStyle:'italic',padding:'7px 10px',background:'rgba(125,249,170,.04)',borderRadius:8}}>📝 {exp.note}</div>}
                <div style={{fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.09em',marginBottom:8}}>Split details</div>
                {splits.map(sp=>(
                  <div key={sp.id} style={{display:'flex',alignItems:'center',gap:9,padding:'8px 0',borderBottom:'1px solid rgba(125,249,170,.04)'}}>
                    <Avatar emoji={sp.member?.avatar} color={sp.member?.color} size={26}/>
                    <span style={{flex:1,fontWeight:600,fontSize:13}}>{sp.member?.name}</span>
                    <span style={{fontFamily:'Orbitron,monospace',fontSize:12,fontWeight:700,color:sp.paid?'#6BCB77':'#FF6B6B'}}>{fmtAmt(sp.amount)}</span>
                    {sp.paid?<button onClick={async()=>{await markSplitUnpaid(sp.id);toast('Marked unpaid','warn');loadExp()}} style={{fontSize:10,padding:'3px 9px',borderRadius:99,border:'1px solid rgba(107,203,119,.2)',background:'rgba(107,203,119,.08)',color:'#6BCB77',cursor:'pointer',fontFamily:'Rajdhani,sans-serif',whiteSpace:'nowrap'}}>✅ Undo</button>
                    :<button onClick={async()=>{await markSplitPaid(sp.id);toast('Marked paid ✅');loadExp()}} style={{fontSize:10,padding:'3px 9px',borderRadius:99,border:'1px solid rgba(125,249,170,.2)',background:'rgba(125,249,170,.07)',color:'#7DF9AA',cursor:'pointer',fontFamily:'Rajdhani,sans-serif',whiteSpace:'nowrap'}}>Mark Paid</button>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// SETTINGS TAB
// ══════════════════════════════════════════════════════════
function SettingsTab({ settings, week, toast, onDone, members, assigns, tasks }) {
  const [weekEdit,setWeekEdit]=useState(week)
  const [wSaving,setWSaving]=useState(false)
  const save=async updates=>{try{await updateSettings(updates);toast('Saved ✅');onDone()}catch(e){toast('Failed: '+e.message,'error')}}
  const saveWeek=async()=>{if(!weekEdit||weekEdit<1){toast('Invalid week','warn');return}setWSaving(true);try{await supabase.from('settings').update({current_week:+weekEdit}).eq('id',settings?.id||1);toast(`Week set to ${weekEdit} ✅`);onDone()}catch(e){toast('Failed: '+e.message,'error')}finally{setWSaving(false)}}
  return (
    <div>
      <SecHead title="🏠 House Info"/>
      <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:14,marginBottom:14}}>
        <div style={{marginBottom:12}}>
          <label style={{display:'block',fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:5}}>House Name</label>
          <input type="text" defaultValue={settings?.house_name||''} placeholder="e.g. Maniyara"
            onBlur={async e=>{if(e.target.value!==(settings?.house_name||''))await save({house_name:e.target.value})}}
            style={{...inp,padding:'10px 13px'}}/>
        </div>
      </div>
      <SecHead title="📅 Week Control"/>
      <div style={{background:'#0d0e1a',border:'1px solid rgba(77,150,255,.15)',borderRadius:13,padding:14,marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
          <div style={{flex:1}}>
            <label style={{display:'block',fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:5}}>Current Week</label>
            <input type="number" value={weekEdit} min={1} onChange={e=>setWeekEdit(e.target.value)} style={{...inp,padding:'12px 13px',fontFamily:'Orbitron,monospace',fontSize:20,fontWeight:900,color:'#4D96FF',textAlign:'center'}}/>
          </div>
          <button onClick={saveWeek} disabled={wSaving} style={{marginTop:20,padding:'12px 20px',borderRadius:10,fontFamily:'Rajdhani,sans-serif',fontWeight:800,fontSize:13,cursor:'pointer',border:'none',background:'linear-gradient(135deg,#4D96FF,#7B61FF)',color:'#fff',opacity:wSaving?0.6:1}}>{wSaving?'...':'Set Week'}</button>
        </div>
        <div style={{display:'flex',gap:7}}>
          {[-1,+1].map(d=>(
            <button key={d} onClick={async()=>{const nw=Math.max(1,+weekEdit+d);setWeekEdit(nw);setWSaving(true);try{await supabase.from('settings').update({current_week:nw}).eq('id',settings?.id||1);toast(`Week → ${nw} ✅`);onDone()}catch(e){toast('Failed: '+e.message,'error')}finally{setWSaving(false)}}}
              style={{flex:1,padding:'10px',borderRadius:9,fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',border:`1px solid ${d>0?'rgba(125,249,170,.2)':'rgba(255,107,107,.2)'}`,background:d>0?'rgba(125,249,170,.07)':'rgba(255,107,107,.07)',color:d>0?'#7DF9AA':'#FF6B6B'}}>
              {d>0?'⏩ Next Week':'⏪ Prev Week'}
            </button>
          ))}
        </div>
      </div>
      <SecHead title="📋 Task Settings"/>
      <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:14,marginBottom:14}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:9,marginBottom:14}}>
          {[{label:'Active Tasks',value:tasks?.filter(t=>t.active)?.length||0,color:'#7DF9AA'},{label:'Assigned',value:assigns?.length||0,color:'#4D96FF'},{label:'Completed',value:assigns?.filter(a=>a.done)?.length||0,color:'#FFD93D'}].map(s=>(
            <div key={s.label} style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)',borderRadius:10,padding:'10px',textAlign:'center'}}>
              <div style={{fontFamily:'Orbitron,monospace',fontSize:20,fontWeight:900,color:s.color}}>{s.value}</div>
              <div style={{fontSize:9,color:'#4a5070',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',marginTop:3}}>{s.label}</div>
            </div>
          ))}
        </div>
        <Btn variant="danger" full onClick={async()=>{if(!confirm(`Reset done status for Week ${week}?`))return;await resetWeekDoneStatus(week);toast('Done status reset','warn');onDone()}}>🔄 Reset Done Status</Btn>
      </div>
      <SecHead title="🔔 App Info"/>
      <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:14,marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',background:'rgba(125,249,170,.04)',borderRadius:9,border:'1px solid rgba(125,249,170,.1)'}}>
          <span style={{fontSize:20}}>🌐</span>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:'#7DF9AA'}}>maniyara.pages.dev</div>
            <div style={{fontSize:11,color:'#4a5070',marginTop:2}}>Cloudflare Pages · Auto-deployed from GitHub</div>
          </div>
        </div>
      </div>
      <SecHead title="⚠️ Danger Zone"/>
      <div style={{background:'#0d0e1a',border:'1px solid rgba(255,107,107,.15)',borderRadius:13,padding:14}}>
        <div style={{display:'flex',flexDirection:'column',gap:9}}>
          <Btn variant="danger" full onClick={async()=>{if(!confirm(`Clear Week ${week} assignments?`))return;await clearWeekAssignments(week);toast('Week cleared','warn');onDone()}}>🗑️ Clear This Week's Assignments</Btn>
          <Btn variant="danger" full onClick={async()=>{if(!confirm('Delete ALL assignments?'))return;if(!confirm('Cannot be undone!'))return;await clearAllAssignments();toast('All cleared','warn');onDone()}}>☢️ Clear ALL Assignments Ever</Btn>
          <Btn variant="ghost" full onClick={()=>{const d=JSON.stringify({members,tasks,assigns,settings},null,2);const a=document.createElement('a');a.href='data:text/json,'+encodeURIComponent(d);a.download=`maniyara-backup-week${week}.json`;a.click();toast('Backup exported 📤')}}>📤 Export Full Backup (JSON)</Btn>
        </div>
      </div>
    </div>
  )
}

export default function AdminPanel() { return <ToastProvider><AdminContent/></ToastProvider> }
