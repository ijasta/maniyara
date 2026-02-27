import { useState, useEffect } from 'react'
import {
  getMembers, getPendingMembers, approveMember, rejectMember, deleteMember, updateMember,
  getTasks, addTask, updateTask, deleteTask,
  getCurrentAssignments, forceRotate, swapTasks,
  getSettings, updateSettings, getLogs, buildWALink,
  COLORS, AVATARS
} from '../lib/supabase'
import { Avatar, Toggle, ScoreBar, SecHead, Btn, ToastProvider, useToast, inp } from '../components/UI'

const EMOJIS = ['🍳','🍽️','🧹','🫧','🚿','🗑️','🛒','🧺','🪣','🧽','💡','🔧','🛁','🍱','🏠','⚡','🪥','🌿']

function AdminContent() {
  const toast = useToast()
  const [tab, setTab] = useState('approvals')
  const [pending, setPending]   = useState([])
  const [members, setMembers]   = useState([])
  const [tasks,   setTasks]     = useState([])
  const [assigns, setAssigns]   = useState([])
  const [settings,setSettings]  = useState(null)
  const [logs,    setLogs]      = useState([])
  const [week,    setWeek]      = useState(1)
  const [loading, setLoading]   = useState(true)
  const [rotating,setRotating]  = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [pend, mem, tk, {assignments:a, week:w}, st, lg] = await Promise.all([
        getPendingMembers(), getMembers(), getTasks(),
        getCurrentAssignments(), getSettings(), getLogs()
      ])
      setPending(pend); setMembers(mem); setTasks(tk)
      setAssigns(a); setSettings(st); setLogs(lg); setWeek(w)
    } catch(e) { toast('Load error: '+e.message,'error') }
    finally { setLoading(false) }
  }

  const TABS = [
    { id:'approvals', label:'🔔 Approvals', badge: pending.length || null },
    { id:'members',   label:'👥 Members' },
    { id:'tasks',     label:'📋 Tasks' },
    { id:'rotation',  label:'🔄 Rotation' },
    { id:'whatsapp',  label:'📱 WhatsApp' },
    { id:'settings',  label:'⚙️ Settings' },
    { id:'logs',      label:'📜 Logs' },
  ]

  if (loading) return <div style={{color:'#8890b0',padding:40,textAlign:'center'}}>Loading admin panel...</div>

  return (
    <div className="page-anim">
      <div style={{marginBottom:16}}>
        <div style={{fontFamily:'Orbitron,monospace',fontWeight:900,fontSize:'clamp(20px,5.5vw,28px)',letterSpacing:1}}>⚙ <span style={{background:'linear-gradient(135deg,#7DF9AA,#00ffcc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>ADMIN</span></div>
        <div style={{fontSize:12,color:'#8890b0',marginTop:3}}>Full control panel</div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:5,marginBottom:18,overflowX:'auto',WebkitOverflowScrolling:'touch',scrollbarWidth:'none'}}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:'9px 13px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',border:'none',fontFamily:'Rajdhani,sans-serif',background:tab===t.id?'#7DF9AA':'transparent',color:tab===t.id?'#070810':'#8890b0',transition:'all .15s',letterSpacing:'.04em',whiteSpace:'nowrap',flexShrink:0,position:'relative'}}>
            {t.label}
            {t.badge>0&&<span style={{position:'absolute',top:4,right:4,width:14,height:14,borderRadius:'50%',background:'#FF6B9D',color:'#fff',fontSize:9,fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center'}}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ── APPROVALS ── */}
      {tab==='approvals' && (
        <div>
          <SecHead title="Pending Registrations" badge={`${pending.length} waiting`}/>
          {pending.length===0 ? (
            <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:40,textAlign:'center',color:'#4a5070'}}>
              <div style={{fontSize:36,marginBottom:10}}>✅</div>
              <div>No pending registrations</div>
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
                <Btn style={{flex:1}} onClick={async()=>{
                  await approveMember(m.id)
                  toast(`${m.name} approved! ✅`)
                  load()
                }}>✅ Approve</Btn>
                <Btn variant="danger" style={{flex:1}} onClick={async()=>{
                  if(!confirm(`Reject ${m.name}?`)) return
                  await rejectMember(m.id)
                  toast(`${m.name} rejected`,'warn')
                  load()
                }}>✕ Reject</Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MEMBERS ── */}
      {tab==='members' && (
        <div>
          <SecHead title="All Members" badge={`${members.length} total`}/>
          {members.map(m=>{
            const a=assigns.find(x=>x.member_id===m.id||x.members?.id===m.id), t=a?.tasks
            return (
              <div key={m.id} style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:14,marginBottom:10}}>
                <div style={{position:'absolute',display:'none'}}/>
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
                  <ScoreBar score={m.score}/>
                </div>

                {/* Edit fields */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginBottom:11}}>
                  {[['Name',m.name,'name','text'],['Username',m.username,'username','text'],['Phone',m.phone,'phone','tel'],['Score',m.score,'score','number'],['Streak',m.streak,'streak','number']].map(([lb,val,key,type])=>(
                    <div key={key} style={{gridColumn:key==='name'?'1/-1':undefined}}>
                      <label style={{display:'block',fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:4}}>{lb}</label>
                      <input defaultValue={val} type={type}
                        onBlur={async e=>{
                          const v = type==='number' ? +e.target.value : e.target.value
                          await updateMember(m.id,{[key]:v})
                          toast(`${lb} updated ✅`)
                        }}
                        style={{...inp,padding:'9px 11px',fontSize:'15px'}}/>
                    </div>
                  ))}
                </div>

                {/* Avatar picker */}
                <div style={{marginBottom:10}}>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:6}}>Avatar</label>
                  <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                    {AVATARS.map(av=>(
                      <button key={av} onClick={async()=>{await updateMember(m.id,{avatar:av});toast('Avatar saved');load()}}
                        style={{fontSize:18,padding:'5px 7px',borderRadius:7,border:`1px solid ${m.avatar===av?'#7DF9AA':'transparent'}`,background:m.avatar===av?'rgba(125,249,170,.1)':'#131525',cursor:'pointer'}}>
                        {av}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color picker */}
                <div style={{marginBottom:11}}>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:6}}>Color</label>
                  <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
                    {COLORS.map(c=>(
                      <button key={c} onClick={async()=>{await updateMember(m.id,{color:c});toast('Color saved');load()}}
                        style={{width:24,height:24,borderRadius:'50%',background:c,border:`2px solid ${m.color===c?'#fff':'transparent'}`,cursor:'pointer',transition:'transform .1s'}}/>
                    ))}
                  </div>
                </div>

                {/* CallMeBot key */}
                <div style={{marginBottom:11}}>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:5}}>CallMeBot WhatsApp Key</label>
                  <input defaultValue={m.callmebot_key||''}
                    onBlur={async e=>{await updateMember(m.id,{callmebot_key:e.target.value});toast('Key saved ✅')}}
                    placeholder="Paste API key here..."
                    style={{...inp,padding:'9px 11px',fontSize:'14px'}}/>
                </div>

                {/* Toggles */}
                <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:11}}>
                  {[['Admin Access',m.is_admin,'is_admin'],['Approved',m.status==='approved','status']].map(([lb,val,key])=>(
                    <div key={key} style={{display:'flex',alignItems:'center',gap:8,background:'#131525',borderRadius:8,padding:'8px 12px',flex:1}}>
                      <span style={{fontSize:13,fontWeight:600,flex:1}}>{lb}</span>
                      <Toggle value={!!val} onChange={async v=>{
                        const upd = key==='status' ? {status:v?'approved':'pending'} : {[key]:v}
                        await updateMember(m.id,upd)
                        toast(`${lb} ${v?'enabled':'disabled'}`)
                        load()
                      }}/>
                    </div>
                  ))}
                </div>

                <Btn variant="danger" sm onClick={async()=>{
                  if(!confirm(`Remove ${m.name} permanently?`)) return
                  await deleteMember(m.id); toast(`${m.name} removed`,'warn'); load()
                }}>✕ Remove Member</Btn>
              </div>
            )
          })}
        </div>
      )}

      {/* ── TASKS ── */}
      {tab==='tasks' && (
        <div>
          <SecHead title="Edit Tasks" badge={`${tasks.length} tasks`}/>
          {tasks.map(t=>(
            <div key={t.id} style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:14,marginBottom:10,position:'relative'}}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${t.color},transparent)`,opacity:.5}}/>
              <div style={{display:'flex',gap:10,marginBottom:10,alignItems:'center'}}>
                {/* Emoji picker */}
                <div style={{position:'relative'}}>
                  <button style={{fontSize:24,padding:'6px 10px',borderRadius:8,border:'1px solid rgba(125,249,170,.2)',background:'#131525',cursor:'pointer'}}
                    onClick={e=>{const p=e.currentTarget.nextSibling;p.style.display=p.style.display==='flex'?'none':'flex'}}>
                    {t.emoji}
                  </button>
                  <div style={{display:'none',position:'absolute',top:'110%',left:0,background:'#0d0e1a',border:'1px solid rgba(125,249,170,.2)',borderRadius:9,padding:10,zIndex:80,flexWrap:'wrap',gap:4,width:220,boxShadow:'0 8px 24px rgba(0,0,0,.6)'}}>
                    {EMOJIS.map(em=>(
                      <button key={em} onClick={async e=>{await updateTask(t.id,{emoji:em});toast('Emoji saved');load();e.currentTarget.closest('[style*="220px"]').style.display='none'}}
                        style={{fontSize:20,padding:'4px 7px',borderRadius:6,border:'none',background:'#131525',cursor:'pointer'}}>{em}</button>
                    ))}
                  </div>
                </div>
                <input defaultValue={t.name} onBlur={async e=>{await updateTask(t.id,{name:e.target.value});toast('Name saved ✅')}}
                  style={{...inp,flex:1,padding:'9px 11px'}} placeholder="Task name"/>
              </div>
              <textarea defaultValue={t.description} onBlur={async e=>{await updateTask(t.id,{description:e.target.value});toast('Description saved ✅')}}
                rows={2} style={{...inp,width:'100%',resize:'vertical',marginBottom:10}} placeholder="Task description..."/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:9,marginBottom:10}}>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:5}}>Points</label>
                  <input type="number" defaultValue={t.points||10} onBlur={async e=>{await updateTask(t.id,{points:+e.target.value});toast('Points saved ✅')}}
                    style={{...inp,padding:'9px 11px'}}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:5}}>Color</label>
                  <div style={{display:'flex',gap:5,flexWrap:'wrap',marginTop:4}}>
                    {COLORS.map(c=>(
                      <button key={c} onClick={async()=>{await updateTask(t.id,{color:c});toast('Color saved');load()}}
                        style={{width:22,height:22,borderRadius:'50%',background:c,border:`2px solid ${t.color===c?'#fff':'transparent'}`,cursor:'pointer'}}/>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{display:'flex',gap:9,alignItems:'center'}}>
                <div style={{display:'flex',alignItems:'center',gap:8,flex:1}}>
                  <span style={{fontSize:12,fontWeight:600}}>Active</span>
                  <Toggle value={!!t.active} onChange={async v=>{await updateTask(t.id,{active:v});toast(`Task ${v?'activated':'deactivated'}`);load()}}/>
                </div>
                <Btn variant="danger" sm onClick={async()=>{if(!confirm(`Delete "${t.name}"?`)) return;await deleteTask(t.id);toast('Task deleted','warn');load()}}>🗑️ Delete</Btn>
              </div>
            </div>
          ))}

          {/* Add new task */}
          <AddTaskForm onAdd={()=>{toast('Task added! ✅');load()}}/>
        </div>
      )}

      {/* ── ROTATION ── */}
      {tab==='rotation' && (
        <div>
          <SecHead title={`Week ${week} Assignments`}/>
          <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:14,marginBottom:14}}>
            {assigns.length===0 ? (
              <div style={{textAlign:'center',padding:24,color:'#4a5070'}}>No assignments yet. Force rotate to create.</div>
            ) : assigns.map(a=>{
              const m=a.members||members.find(x=>x.id===a.member_id)
              const t=a.tasks||tasks.find(x=>x.id===a.task_id)
              if(!m||!t) return null
              return (
                <div key={a.id} style={{display:'flex',alignItems:'center',gap:9,padding:'9px 0',borderBottom:'1px solid rgba(125,249,170,.06)'}}>
                  <Avatar emoji={m.avatar} color={m.color} size={28}/>
                  <span style={{fontWeight:700,fontSize:13,flex:1}}>{m.name}</span>
                  <span style={{fontSize:12,color:'#8890b0'}}>{t.emoji} {t.name}</span>
                  <span style={{fontSize:15}}>{a.done?'✅':'⏳'}</span>
                </div>
              )
            })}
          </div>

          <Btn full loading={rotating} variant="danger" style={{marginBottom:18,padding:14}} onClick={async()=>{
            if(!confirm('Force rotate ALL tasks to next week? This cannot be undone.')) return
            setRotating(true)
            try{const w=await forceRotate();toast(`Rotated! Week ${w} started 🔄`);load()}
            catch(e){toast('Rotate failed: '+e.message,'error')}
            finally{setRotating(false)}
          }}>⚡ FORCE ROTATE NOW → Week {week+1}</Btn>

          {/* Swap */}
          <SecHead title="Swap Tasks"/>
          <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:14}}>
            <SwapPanel members={members} assigns={assigns} week={week} toast={toast} onDone={load}/>
          </div>
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
                  <div style={{fontSize:11,color:'#8890b0',marginTop:2}}>{t?`${t.emoji} ${t.name}`:'No task'}</div>
                </div>
                <a href={buildWALink(m.phone,msg)} target="_blank" rel="noreferrer" style={{textDecoration:'none',flexShrink:0}}>
                  <Btn variant="wa" sm onClick={()=>toast('WhatsApp opened 📱')}>📱 Send</Btn>
                </a>
              </div>
            )
          })}

          <SecHead title="CallMeBot API Keys"/>
          <div style={{background:'rgba(77,150,255,.08)',border:'1px solid rgba(77,150,255,.2)',borderRadius:9,padding:'11px 13px',marginBottom:13,fontSize:13,color:'#4D96FF',lineHeight:1.6,fontWeight:500}}>
            ℹ️ Each member must WhatsApp <strong>+34 644 52 74 97</strong> saying <em>"I allow callmebot to send me messages"</em> — they'll receive an API key. Paste it in the Members tab for each person.
          </div>
        </div>
      )}

      {/* ── SETTINGS ── */}
      {tab==='settings' && settings && (
        <div>
          <SecHead title="App Settings"/>
          <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:14,marginBottom:12}}>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:10,fontWeight:700,letterSpacing:2,color:'#7DF9AA',textTransform:'uppercase',marginBottom:13}}>🏠 House Info</div>
            {[['House Name','house_name','text',settings.house_name],['App Tagline','app_tagline','text',settings.app_tagline],['Max Members','max_members','number',settings.max_members]].map(([lb,key,type,val])=>(
              <div key={key} style={{marginBottom:12}}>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:5}}>{lb}</label>
                <input type={type} defaultValue={val} onBlur={async e=>{await updateSettings({[key]:type==='number'?+e.target.value:e.target.value});toast(`${lb} saved ✅`)}}
                  style={{...inp,padding:'10px 13px'}}/>
              </div>
            ))}
          </div>

          <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:14,marginBottom:12}}>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:10,fontWeight:700,letterSpacing:2,color:'#7DF9AA',textTransform:'uppercase',marginBottom:13}}>📅 Rotation Schedule</div>
            <div style={{marginBottom:12}}>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:5}}>Rotation Day</label>
              <select defaultValue={settings.rotation_day} onChange={e=>updateSettings({rotation_day:e.target.value}).then(()=>toast('Saved ✅'))}
                style={{...inp,padding:'10px 13px'}}>
                {['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(d=><option key={d} value={d}>{d.charAt(0).toUpperCase()+d.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label style={{display:'block',fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:5}}>Rotation Time</label>
              <input type="time" defaultValue={settings.rotation_time} onBlur={async e=>{await updateSettings({rotation_time:e.target.value});toast('Saved ✅')}}
                style={{...inp,padding:'10px 13px'}}/>
            </div>
          </div>

          <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:14,marginBottom:12}}>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:10,fontWeight:700,letterSpacing:2,color:'#7DF9AA',textTransform:'uppercase',marginBottom:13}}>🏆 Scoring</div>
            {[['Points per task','points_per_task',settings.points_per_task],['Bonus for proof photo','points_proof',settings.points_proof],['Overdue penalty','penalty_overdue',settings.penalty_overdue],['Photo auto-delete (days)','photo_delete_days',settings.photo_delete_days]].map(([lb,key,val])=>(
              <div key={key} style={{marginBottom:12}}>
                <label style={{display:'block',fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:5}}>{lb}</label>
                <input type="number" defaultValue={val} onBlur={async e=>{await updateSettings({[key]:+e.target.value});toast(`${lb} saved ✅`)}}
                  style={{...inp,padding:'10px 13px'}}/>
              </div>
            ))}
          </div>

          <div style={{background:'#0d0e1a',border:'1px solid rgba(255,107,107,.15)',borderRadius:13,padding:14}}>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:10,fontWeight:700,letterSpacing:2,color:'#FF6B6B',textTransform:'uppercase',marginBottom:13}}>🛠️ Danger Zone</div>
            <div style={{display:'flex',flexDirection:'column',gap:9}}>
              <Btn variant="danger" full onClick={()=>{if(confirm('Reset ALL member scores to 0?')) {members.forEach(m=>updateMember(m.id,{score:0,streak:0}));toast('All scores reset','warn');load()}}}>🔄 Reset All Scores</Btn>
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

function AddTaskForm({ onAdd }) {
  const toast = useToast()
  const [form, setForm] = useState({ name:'', emoji:'📋', description:'', color:'#7DF9AA', points:10 })
  const [loading, setL] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const submit = async () => {
    if (!form.name.trim()) { toast('Enter a task name','warn'); return }
    setL(true)
    try { await addTask({...form, active:true}); setForm({name:'',emoji:'📋',description:'',color:'#7DF9AA',points:10}); onAdd() }
    catch(e) { toast('Failed: '+e.message,'error') }
    finally { setL(false) }
  }

  return (
    <div style={{background:'#0d0e1a',border:'1px dashed rgba(125,249,170,.2)',borderRadius:13,padding:14}}>
      <div style={{fontFamily:'Orbitron,monospace',fontSize:10,fontWeight:700,letterSpacing:2,color:'#7DF9AA',textTransform:'uppercase',marginBottom:13}}>+ Add New Task</div>
      <div style={{display:'flex',gap:9,marginBottom:9}}>
        <select value={form.emoji} onChange={e=>set('emoji',e.target.value)} style={{...inp,width:70,padding:'9px 5px',textAlign:'center',fontSize:'20px'}}>
          {EMOJIS.map(em=><option key={em} value={em}>{em}</option>)}
        </select>
        <input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Task name" style={{...inp,flex:1,padding:'9px 11px'}}/>
      </div>
      <textarea value={form.description} onChange={e=>set('description',e.target.value)} rows={2} placeholder="Description..." style={{...inp,width:'100%',resize:'vertical',marginBottom:9}}/>
      <div style={{display:'flex',gap:9,alignItems:'center',marginBottom:11}}>
        <input type="number" value={form.points} onChange={e=>set('points',+e.target.value)} placeholder="Points" style={{...inp,width:80,padding:'9px 11px'}}/>
        <div style={{display:'flex',gap:5,flex:1,flexWrap:'wrap'}}>
          {COLORS.map(c=>(
            <button key={c} onClick={()=>set('color',c)} style={{width:22,height:22,borderRadius:'50%',background:c,border:`2px solid ${form.color===c?'#fff':'transparent'}`,cursor:'pointer'}}/>
          ))}
        </div>
      </div>
      <Btn full loading={loading} onClick={submit}>+ Add Task</Btn>
    </div>
  )
}

function SwapPanel({ members, assigns, week, toast, onDone }) {
  const [m1, setM1] = useState(members[0]?.id||'')
  const [m2, setM2] = useState(members[1]?.id||'')
  const [loading, setL] = useState(false)
  const s = { ...inp, width:'100%', padding:'10px 13px', marginBottom:9 }

  return (
    <div>
      <div style={{marginBottom:9}}>
        <label style={{display:'block',fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:5}}>Member 1</label>
        <select value={m1} onChange={e=>setM1(e.target.value)} style={s}>
          {members.map(m=>{const a=assigns.find(x=>x.member_id===m.id||x.members?.id===m.id);const t=a?.tasks;return<option key={m.id} value={m.id}>{m.name} → {t?.name||'?'}</option>})}
        </select>
      </div>
      <div style={{marginBottom:13}}>
        <label style={{display:'block',fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:5}}>Member 2</label>
        <select value={m2} onChange={e=>setM2(e.target.value)} style={s}>
          {members.map(m=>{const a=assigns.find(x=>x.member_id===m.id||x.members?.id===m.id);const t=a?.tasks;return<option key={m.id} value={m.id}>{m.name} → {t?.name||'?'}</option>})}
        </select>
      </div>
      <Btn full loading={loading} onClick={async()=>{
        if(m1===m2){toast('Pick 2 different members','warn');return}
        setL(true)
        try{await swapTasks(m1,m2,week);toast('Tasks swapped ✅');onDone()}
        catch(e){toast('Swap failed: '+e.message,'error')}
        finally{setL(false)}
      }}>⇄ SWAP TASKS</Btn>
    </div>
  )
}

export default function AdminPanel() { return <ToastProvider><AdminContent/></ToastProvider> }
