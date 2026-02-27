import { useState, useEffect } from 'react'
import { getMembers, getCurrentAssignments } from '../lib/supabase'
import { Avatar, ScoreBar, ToastProvider, useToast } from '../components/UI'

function BoardContent() {
  const toast = useToast()
  const [members, setM] = useState([])
  const [assigns, setA] = useState([])
  const [loading, setL] = useState(true)

  useEffect(() => {
    Promise.all([getMembers(), getCurrentAssignments()])
      .then(([m,{assignments:a}])=>{ setM(m.sort((a,b)=>b.score-a.score)); setA(a) })
      .catch(e=>toast('Load error','error'))
      .finally(()=>setL(false))
  }, [])

  if (loading) return <div style={{color:'#8890b0',padding:40,textAlign:'center'}}>Loading...</div>

  const [gold,silver,bronze] = members
  const podium = [silver,gold,bronze]
  const podC   = ['#FFD93D','#7DF9AA','#FF9A3C']
  const podR   = [2,1,3]

  return (
    <div className="page-anim">
      <div style={{marginBottom:16}}>
        <div style={{fontFamily:'Orbitron,monospace',fontWeight:900,fontSize:'clamp(20px,5.5vw,28px)',letterSpacing:1}}>🏆 <span style={{background:'linear-gradient(135deg,#7DF9AA,#00ffcc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>LEADERBOARD</span></div>
        <div style={{fontSize:12,color:'#8890b0',marginTop:3}}>Ranked by total score</div>
      </div>

      {/* Podium */}
      {members.length >= 3 && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1.12fr 1fr',gap:8,marginBottom:14,alignItems:'end'}}>
          {podium.map((m,vi) => {
            if (!m) return <div key={vi}/>
            const a=assigns.find(x=>x.member_id===m.id||x.members?.id===m.id), t=a?.tasks
            return (
              <div key={m.id} style={{background:vi===1?'linear-gradient(155deg,#0d1c12,#0d0e1a)':'#0d0e1a',border:`1px solid ${vi===1?'rgba(125,249,170,.28)':'rgba(125,249,170,.09)'}`,borderRadius:13,padding:vi===1?'14px 8px':'10px 5px',textAlign:'center',position:'relative',overflow:'hidden'}}>
                <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${podC[vi]},transparent)`}}/>
                {vi===1&&<span style={{position:'absolute',top:7,right:9,fontSize:16,animation:'float 3s ease-in-out infinite'}}>👑</span>}
                <div style={{fontFamily:'Orbitron,monospace',fontSize:`clamp(${vi===1?26:20}px,${vi===1?8:6}vw,${vi===1?42:32}px)`,fontWeight:900,color:vi===1?'#7DF9AA':'rgba(255,255,255,.05)',lineHeight:1,marginBottom:5,textShadow:vi===1?'0 0 20px rgba(125,249,170,.5)':'none'}}>{podR[vi]}</div>
                <Avatar emoji={m.avatar} color={m.color} size={vi===1?44:36} />
                <div style={{fontFamily:'Orbitron,monospace',fontSize:'clamp(9px,2.5vw,11px)',fontWeight:700,marginTop:6,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.name}</div>
                {t&&<div style={{fontSize:'clamp(9px,2.3vw,11px)',color:'#8890b0',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.emoji} {t.name}</div>}
                <div style={{fontFamily:'Orbitron,monospace',fontSize:'clamp(10px,3vw,13px)',fontWeight:700,color:podC[vi],marginTop:3}}>{m.score}pts</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Full table */}
      <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr>{['#','Member','Score','Streak'].map(h=><th key={h} style={{fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.09em',padding:'10px 11px',borderBottom:'1px solid rgba(125,249,170,.09)',textAlign:'left',whiteSpace:'nowrap'}}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {members.map((m,i)=>(
              <tr key={m.id}>
                <td style={{padding:'10px 11px',borderBottom:'1px solid rgba(255,255,255,.025)',fontFamily:'Orbitron,monospace',fontWeight:700,fontSize:16,color:i<3?'#7DF9AA':'#4a5070'}}>{i+1}</td>
                <td style={{padding:'10px 11px',borderBottom:'1px solid rgba(255,255,255,.025)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,fontWeight:700}}>
                    <Avatar emoji={m.avatar} color={m.color} size={26}/>{m.name}
                  </div>
                </td>
                <td style={{padding:'10px 11px',borderBottom:'1px solid rgba(255,255,255,.025)'}}><ScoreBar score={m.score}/></td>
                <td style={{padding:'10px 11px',borderBottom:'1px solid rgba(255,255,255,.025)',fontFamily:'Orbitron,monospace',fontSize:12,color:'#FFD93D',fontWeight:700,whiteSpace:'nowrap'}}>🔥{m.streak}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}`}</style>
    </div>
  )
}

export default function Leaderboard() { return <ToastProvider><BoardContent/></ToastProvider> }
