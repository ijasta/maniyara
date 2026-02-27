import { useState, useEffect } from 'react'
import { getMembers, getCurrentAssignments } from '../lib/supabase'
import { Avatar, ScoreBar, SecHead, ToastProvider, useToast } from '../components/UI'

function MembersContent() {
  const toast = useToast()
  const [members, setM] = useState([])
  const [assigns, setA] = useState([])
  const [loading, setL] = useState(true)

  useEffect(() => {
    Promise.all([getMembers(), getCurrentAssignments()])
      .then(([m,{assignments:a}])=>{ setM(m); setA(a) })
      .catch(e=>toast('Load error: '+e.message,'error'))
      .finally(()=>setL(false))
  }, [])

  if (loading) return <div style={{color:'#8890b0',padding:40,textAlign:'center'}}>Loading...</div>

  return (
    <div className="page-anim">
      <div style={{marginBottom:16}}>
        <div style={{fontFamily:'Orbitron,monospace',fontWeight:900,fontSize:'clamp(20px,5.5vw,28px)',letterSpacing:1}}>THE <span style={{background:'linear-gradient(135deg,#7DF9AA,#00ffcc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>CREW</span></div>
        <div style={{fontSize:12,color:'#8890b0',marginTop:3}}>{members.length} housemates</div>
      </div>

      {members.map(m => {
        const a = assigns.find(x=>x.member_id===m.id||x.members?.id===m.id)
        const t = a?.tasks
        return (
          <div key={m.id} style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:13,marginBottom:10,position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${m.color},transparent)`,opacity:.4}}/>
            <div style={{display:'flex',alignItems:'center',gap:11,marginBottom:11}}>
              <Avatar emoji={m.avatar} color={m.color} size={42}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:15,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.name}</div>
                {m.username && <div style={{fontSize:11,color:'#4a5070',marginTop:1}}>@{m.username}</div>}
                <div style={{fontSize:11,color:'#8890b0',marginTop:1}}>{m.phone}</div>
              </div>
              <div style={{padding:'3px 9px',borderRadius:99,fontSize:10,fontWeight:700,background:a?.done?'rgba(125,249,170,.1)':'rgba(255,217,61,.1)',border:`1px solid ${a?.done?'rgba(125,249,170,.2)':'rgba(255,217,61,.2)'}`,color:a?.done?'#7DF9AA':'#FFD93D',flexShrink:0}}>
                {a?.done?'✅ Done':'⏳ Pending'}
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
              {[['Task',t?`${t.emoji} ${t.name}`:'—','#8890b0'],['Score','',m.color],['Streak',`🔥 ${m.streak}wk`,'#FFD93D']].map(([lb,val,c],i)=>(
                <div key={i} style={{background:'#131525',borderRadius:8,padding:'8px',textAlign:'center'}}>
                  <div style={{fontSize:9,color:'#4a5070',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:4}}>{lb}</div>
                  {i===1 ? <ScoreBar score={m.score}/> : <div style={{fontSize:i===0?11:13,fontWeight:700,color:c,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{val}</div>}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Members() { return <ToastProvider><MembersContent/></ToastProvider> }
