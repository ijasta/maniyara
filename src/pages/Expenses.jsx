import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { getExpenses, addExpense, markSplitPaid, markSplitUnpaid, deleteExpense, calcDebts, getMembers } from '../lib/supabase'
import { Avatar, Btn, SecHead, ToastProvider, useToast, inp } from '../components/UI'

const CATS = [
  { id:'groceries',   label:'Groceries',   emoji:'🛒' },
  { id:'electricity', label:'Electricity', emoji:'💡' },
  { id:'water',       label:'Water',       emoji:'🌊' },
  { id:'food',        label:'Food/Order',  emoji:'🍕' },
  { id:'internet',    label:'Internet',    emoji:'📶' },
  { id:'rent',        label:'Rent',        emoji:'🏠' },
  { id:'cleaning',    label:'Cleaning',    emoji:'🧹' },
  { id:'other',       label:'Other',       emoji:'💸' },
]
const catMeta = id => CATS.find(c => c.id === id) || CATS[7]
const fmt = n => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 })
const lbl = { display:'block', fontSize:10, fontWeight:700, color:'#4a5070', textTransform:'uppercase', letterSpacing:'.09em', marginBottom:6 }

// ── ADD EXPENSE BOTTOM SHEET ──────────────────────────────
function AddSheet({ members, currentUserId, onClose, onAdded }) {
  const toast = useToast()
  const [title,    setTitle]    = useState('')
  const [amount,   setAmount]   = useState('')
  const [category, setCategory] = useState('groceries')
  const [paidBy,   setPaidBy]   = useState(currentUserId || (members[0]?.id || ''))
  const [selected, setSelected] = useState(new Set(members.map(m => m.id)))
  const [note,     setNote]     = useState('')
  const [loading,  setL]        = useState(false)

  const toggle = id => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const share  = selected.size > 0 && amount ? fmt(Number(amount) / selected.size) : '₹0'

  const submit = async () => {
    if (!title.trim())                                    { toast('Enter a title','warn'); return }
    if (!amount || isNaN(+amount) || +amount <= 0)        { toast('Enter a valid amount','warn'); return }
    if (!paidBy)                                          { toast('Select who paid','warn'); return }
    if (selected.size === 0)                              { toast('Select members to split with','warn'); return }
    setL(true)
    try {
      await addExpense(title.trim(), +amount, category, paidBy, note, [...selected])
      toast('Expense added ✅'); onAdded(); onClose()
    } catch(e) { toast('Failed: '+e.message,'error') }
    finally { setL(false) }
  }

  const paidByMember = members.find(m => m.id === paidBy)

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.88)',zIndex:600,display:'flex',alignItems:'flex-end',justifyContent:'center',backdropFilter:'blur(8px)'}}
      onClick={e=>{ if(e.target===e.currentTarget) onClose() }}>
      <div style={{background:'#0b0c1b',border:'1px solid rgba(125,249,170,.22)',borderRadius:'20px 20px 0 0',padding:'0 0 40px',width:'100%',maxWidth:520,maxHeight:'95dvh',overflowY:'auto',animation:'shUp .25s cubic-bezier(.34,1.2,.64,1)'}}>

        {/* Handle + header */}
        <div style={{position:'sticky',top:0,background:'#0b0c1b',padding:'14px 18px 12px',borderBottom:'1px solid rgba(125,249,170,.08)',zIndex:1}}>
          <div style={{width:36,height:4,borderRadius:99,background:'rgba(255,255,255,.12)',margin:'0 auto 14px'}}/>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontFamily:'Orbitron,monospace',fontSize:16,fontWeight:800,letterSpacing:1}}>Add Expense</div>
              <div style={{fontSize:11,color:'#8890b0',marginTop:2}}>Split with your housemates</div>
            </div>
            <button onClick={onClose} style={{width:32,height:32,borderRadius:'50%',border:'1px solid rgba(125,249,170,.15)',background:'rgba(125,249,170,.06)',color:'#7DF9AA',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          </div>
        </div>

        <div style={{padding:'16px 18px'}}>

          {/* Amount — big and prominent */}
          <div style={{background:'linear-gradient(135deg,#0a1510,#070810)',border:'1px solid rgba(125,249,170,.2)',borderRadius:14,padding:'16px 18px',marginBottom:14,textAlign:'center'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:8}}>Amount (₹)</div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
              <span style={{fontFamily:'Orbitron,monospace',fontSize:28,fontWeight:900,color:'#7DF9AA'}}>₹</span>
              <input type="number" inputMode="decimal" placeholder="0"
                value={amount} onChange={e=>setAmount(e.target.value)}
                style={{background:'transparent',border:'none',outline:'none',fontFamily:'Orbitron,monospace',fontSize:36,fontWeight:900,color:'#7DF9AA',width:'160px',textAlign:'center'}}/>
            </div>
            {amount && selected.size > 0 && (
              <div style={{fontSize:12,color:'#8890b0',marginTop:6}}>{share} each × {selected.size} people</div>
            )}
          </div>

          {/* Title */}
          <div style={{marginBottom:12}}>
            <label style={lbl}>What was it for?</label>
            <input style={{...inp,fontSize:'16px'}} placeholder="e.g. Weekly groceries, Pizza night..." value={title} onChange={e=>setTitle(e.target.value)}/>
          </div>

          {/* Category pills */}
          <div style={{marginBottom:14}}>
            <label style={lbl}>Category</label>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {CATS.map(c => (
                <button key={c.id} onClick={()=>setCategory(c.id)}
                  style={{padding:'7px 13px',borderRadius:99,fontSize:12,fontWeight:700,cursor:'pointer',
                    border:`1px solid ${category===c.id?'#7DF9AA':'rgba(125,249,170,.12)'}`,
                    background:category===c.id?'rgba(125,249,170,.15)':'#131525',
                    color:category===c.id?'#7DF9AA':'#8890b0',
                    transition:'all .12s',fontFamily:'Rajdhani,sans-serif'}}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Paid by — member cards */}
          <div style={{marginBottom:14}}>
            <label style={lbl}>Who paid?</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))',gap:8}}>
              {members.map(m => (
                <button key={m.id} onClick={()=>setPaidBy(m.id)}
                  style={{padding:'10px 8px',borderRadius:11,cursor:'pointer',
                    border:`2px solid ${paidBy===m.id?m.color:'rgba(125,249,170,.08)'}`,
                    background:paidBy===m.id?`${m.color}18`:'#131525',
                    transition:'all .12s',display:'flex',flexDirection:'column',alignItems:'center',gap:5}}>
                  <span style={{fontSize:22}}>{m.avatar}</span>
                  <span style={{fontSize:11,fontWeight:700,color:paidBy===m.id?m.color:'#8890b0',textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',width:'100%'}}>{m.name.split(' ')[0]}</span>
                  {paidBy===m.id && <span style={{fontSize:9,fontWeight:900,color:m.color}}>✓ PAID</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Split among — member toggles */}
          <div style={{marginBottom:14}}>
            <label style={{...lbl,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span>Split among</span>
              <span style={{color:'#7DF9AA',fontSize:11,fontWeight:700,letterSpacing:0}}>
                {selected.size} people · {share} each
              </span>
            </label>
            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              {members.map(m => (
                <div key={m.id} onClick={()=>toggle(m.id)}
                  style={{display:'flex',alignItems:'center',gap:11,padding:'11px 13px',borderRadius:11,
                    border:`1px solid ${selected.has(m.id)?m.color+'55':'rgba(125,249,170,.08)'}`,
                    background:selected.has(m.id)?`${m.color}10`:'#131525',
                    cursor:'pointer',transition:'all .12s'}}>
                  <Avatar emoji={m.avatar} color={m.color} size={32}/>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13}}>{m.name}</div>
                    {selected.has(m.id) && amount && (
                      <div style={{fontSize:11,color:m.color,fontWeight:600,marginTop:1}}>{fmt(+amount/selected.size)}</div>
                    )}
                  </div>
                  <div style={{width:22,height:22,borderRadius:'50%',border:`2px solid ${selected.has(m.id)?m.color:'#4a5070'}`,
                    background:selected.has(m.id)?m.color:'transparent',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:11,color:'#070810',fontWeight:900,flexShrink:0}}>
                    {selected.has(m.id)?'✓':''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Note */}
          <div style={{marginBottom:20}}>
            <label style={lbl}>Note (optional)</label>
            <input style={{...inp,fontSize:'16px'}} placeholder="Any extra details..." value={note} onChange={e=>setNote(e.target.value)}/>
          </div>

          {/* Submit */}
          <button onClick={submit} disabled={loading}
            style={{width:'100%',padding:'16px',borderRadius:12,fontSize:16,fontWeight:800,cursor:'pointer',border:'none',
              fontFamily:'Rajdhani,sans-serif',letterSpacing:'.08em',
              background: loading?'#1a2030':'linear-gradient(135deg,#7DF9AA,#00D4AA)',
              color:'#070810',boxShadow:'0 4px 22px rgba(125,249,170,.3)',
              opacity:loading?0.6:1,transition:'all .15s'}}>
            {loading ? '⏳ Saving...' : '💸 Add Expense'}
          </button>
        </div>
      </div>
      <style>{`@keyframes shUp{from{transform:translateY(100%)}to{transform:none}}`}</style>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────
function ExpensesContent() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const [expenses, setExpenses] = useState([])
  const [members,  setMembers]  = useState([])
  const [loading,  setL]        = useState(true)
  const [showAdd,  setShowAdd]  = useState(false)
  const [activeTab,setTab]      = useState('summary')
  const [expandId, setExpandId] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [exp, mem] = await Promise.all([getExpenses(), getMembers()])
      setExpenses(exp)
      setMembers(mem.filter(m => m.status === 'approved'))
    } catch(e) { toast('Failed to load: '+e.message,'error') }
    finally { setL(false) }
  }

  const debts      = calcDebts(expenses)
  const totalSpent = expenses.reduce((s,e) => s + Number(e.amount), 0)
  const mySpent    = expenses.filter(e => e.paid_by === user?.id).reduce((s,e) => s + Number(e.amount), 0)
  const myOwed     = expenses.flatMap(e => e.expense_splits||[]).filter(s => s.member_id===user?.id && !s.paid).reduce((s,sp) => s + Number(sp.amount), 0)
  const myLent     = debts.filter(d => d.to.id===user?.id).reduce((s,d) => s + d.amount, 0)

  if (loading) return <div style={{color:'#8890b0',padding:60,textAlign:'center',fontSize:14}}>Loading expenses...</div>

  return (
    <div className="page-anim">

      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16}}>
        <div>
          <div style={{fontFamily:'Orbitron,monospace',fontWeight:900,fontSize:'clamp(20px,5.5vw,28px)',letterSpacing:1}}>
            💸 <span style={{background:'linear-gradient(135deg,#7DF9AA,#00ffcc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>EXPENSES</span>
          </div>
          <div style={{fontSize:12,color:'#8890b0',marginTop:3}}>{expenses.length} transactions this month</div>
        </div>
        <button onClick={()=>setShowAdd(true)}
          style={{padding:'10px 18px',borderRadius:99,fontFamily:'Rajdhani,sans-serif',fontWeight:800,fontSize:13,
            border:'none',background:'linear-gradient(135deg,#7DF9AA,#00D4AA)',color:'#070810',cursor:'pointer',
            boxShadow:'0 4px 16px rgba(125,249,170,.3)',letterSpacing:'.06em'}}>
          + Add
        </button>
      </div>

      {/* My stats */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:9,marginBottom:12}}>
        {[['💳','I Paid',fmt(mySpent),'#7DF9AA'],['🔴','I Owe',fmt(myOwed),'#FF6B6B'],['🟢','Owed to Me',fmt(myLent),'#6BCB77']].map(([ic,lb,val,c])=>(
          <div key={lb} style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.07)',borderRadius:13,padding:'12px 8px',textAlign:'center'}}>
            <span style={{fontSize:20,display:'block',marginBottom:5}}>{ic}</span>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:12,fontWeight:700,color:c,lineHeight:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{val}</div>
            <div style={{fontSize:9,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.07em',marginTop:3,fontWeight:700}}>{lb}</div>
          </div>
        ))}
      </div>

      {/* Total house card */}
      <div style={{background:'linear-gradient(135deg,#0a1510,#0a0c1a)',border:'1px solid rgba(125,249,170,.18)',borderRadius:13,padding:'14px 16px',marginBottom:14,display:'flex',alignItems:'center',gap:12}}>
        <div style={{fontSize:36}}>🏠</div>
        <div style={{flex:1}}>
          <div style={{fontSize:11,color:'#8890b0',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em'}}>Total House Spending</div>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:26,fontWeight:900,color:'#7DF9AA',marginTop:3}}>{fmt(totalSpent)}</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:10,color:'#4a5070',fontWeight:700}}>BILLS</div>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:22,fontWeight:700,color:'#FFD93D'}}>{expenses.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,background:'#0d0e1a',border:'1px solid rgba(125,249,170,.07)',borderRadius:13,padding:5,marginBottom:16}}>
        {[['summary','⚡ Settle Up'],['history','📋 History']].map(([id,lb])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{flex:1,padding:'10px',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',border:'none',
              fontFamily:'Rajdhani,sans-serif',background:activeTab===id?'#7DF9AA':'transparent',
              color:activeTab===id?'#070810':'#8890b0',transition:'all .15s'}}>
            {lb}
          </button>
        ))}
      </div>

      {/* ── SETTLE UP TAB ── */}
      {activeTab==='summary' && (
        <div>
          {/* Who owes who */}
          <SecHead title="Who Owes Who"/>
          {debts.length === 0 ? (
            <div style={{background:'linear-gradient(135deg,#0a1510,#070810)',border:'1px solid rgba(125,249,170,.2)',borderRadius:13,padding:'40px 20px',textAlign:'center',marginBottom:14}}>
              <div style={{fontSize:52,marginBottom:10}}>🎉</div>
              <div style={{fontFamily:'Orbitron,monospace',fontSize:14,fontWeight:700,color:'#7DF9AA',marginBottom:6}}>ALL SETTLED UP!</div>
              <div style={{fontSize:13,color:'#8890b0'}}>No pending balances. Everyone's even.</div>
            </div>
          ) : debts.map((d,i) => (
            <div key={i} style={{background:'#0d0e1a',border:'1px solid rgba(255,107,107,.15)',borderRadius:13,padding:14,marginBottom:10}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:d.from.id===user?.id||profile?.is_admin?12:0}}>
                <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0}}>
                  <Avatar emoji={d.from.avatar} color={d.from.color} size={38}/>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.from.name}</div>
                    <div style={{fontSize:11,color:'#8890b0',marginTop:1}}>owes <strong style={{color:'#7DF9AA'}}>{d.to.name}</strong></div>
                  </div>
                </div>
                <div style={{fontFamily:'Orbitron,monospace',fontSize:20,fontWeight:900,color:'#FF6B6B',flexShrink:0}}>{fmt(d.amount)}</div>
                <Avatar emoji={d.to.avatar} color={d.to.color} size={38}/>
              </div>
              {(d.from.id===user?.id||profile?.is_admin) && (
                <a href={`https://wa.me/${members.find(m=>m.id===d.to.id)?.phone?.replace(/\D/g,'')}?text=${encodeURIComponent(`Hey ${d.to.name}! Paying you ${fmt(d.amount)} for house expenses 🏠 — ${profile?.name}`)}`}
                  target="_blank" rel="noreferrer" style={{textDecoration:'none',display:'block'}}>
                  <button style={{width:'100%',padding:'10px',borderRadius:9,fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer',border:'1px solid rgba(37,211,102,.3)',background:'rgba(37,211,102,.08)',color:'#25D366',letterSpacing:'.05em'}}>
                    📱 Send via WhatsApp
                  </button>
                </a>
              )}
            </div>
          ))}

          {/* Member totals */}
          <SecHead title="Member Totals"/>
          {members.map(m => {
            const paid  = expenses.filter(e=>e.paid_by===m.id).reduce((s,e)=>s+Number(e.amount),0)
            const share = expenses.flatMap(e=>e.expense_splits||[]).filter(s=>s.member_id===m.id).reduce((s,sp)=>s+Number(sp.amount),0)
            const net   = paid - share
            return (
              <div key={m.id} style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.07)',borderRadius:13,padding:'12px 14px',marginBottom:9,display:'flex',alignItems:'center',gap:11}}>
                <Avatar emoji={m.avatar} color={m.color} size={38}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:13}}>{m.name}</div>
                  <div style={{fontSize:11,color:'#8890b0',marginTop:2}}>Share: <span style={{color:'#FFD93D',fontWeight:700}}>{fmt(share)}</span></div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontFamily:'Orbitron,monospace',fontSize:15,fontWeight:700,color:'#7DF9AA'}}>{fmt(paid)}</div>
                  <div style={{fontSize:9,color:net>=0?'#6BCB77':'#FF6B6B',fontWeight:700,marginTop:2}}>{net>=0?`+${fmt(net)}`:`-${fmt(Math.abs(net))}`}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab==='history' && (
        <div>
          <SecHead title="All Transactions" badge={`${expenses.length} total`}/>
          {expenses.length===0 ? (
            <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.07)',borderRadius:13,padding:'50px 20px',textAlign:'center'}}>
              <div style={{fontSize:44,marginBottom:10}}>📋</div>
              <div style={{color:'#4a5070',fontSize:14}}>No expenses yet.<br/>Tap <strong style={{color:'#7DF9AA'}}>+ Add</strong> to record one!</div>
            </div>
          ) : expenses.map(exp => {
            const cat    = catMeta(exp.category)
            const isExp  = expandId === exp.id
            const payer  = exp.paid_by_member
            const splits = exp.expense_splits || []
            const unpaid = splits.filter(s => !s.paid)
            return (
              <div key={exp.id} style={{background:'#0d0e1a',border:`1px solid ${unpaid.length===0?'rgba(125,249,170,.2)':'rgba(125,249,170,.08)'}`,borderRadius:13,marginBottom:10,overflow:'hidden'}}>
                {/* Main row */}
                <div style={{padding:'13px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:11}} onClick={()=>setExpandId(isExp?null:exp.id)}>
                  <div style={{width:44,height:44,borderRadius:12,background:'rgba(125,249,170,.07)',border:'1px solid rgba(125,249,170,.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{cat.emoji}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{exp.title}</div>
                    <div style={{fontSize:11,color:'#8890b0',marginTop:3,display:'flex',alignItems:'center',gap:5,flexWrap:'wrap'}}>
                      <span style={{background:'rgba(125,249,170,.08)',padding:'2px 7px',borderRadius:99,fontSize:10}}>{cat.label}</span>
                      <span>Paid by <strong style={{color:'#E8F0FF'}}>{payer?.name||'?'}</strong></span>
                      <span>· {new Date(exp.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span>
                    </div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontFamily:'Orbitron,monospace',fontSize:15,fontWeight:700,color:'#7DF9AA'}}>{fmt(exp.amount)}</div>
                    <div style={{fontSize:10,color:unpaid.length===0?'#6BCB77':'#FFD93D',fontWeight:700,marginTop:3}}>
                      {unpaid.length===0?'✅ Settled':`${unpaid.length} pending`}
                    </div>
                  </div>
                  <div style={{fontSize:12,color:'#4a5070',marginLeft:4,flexShrink:0,transform:isExp?'rotate(180deg)':'rotate(0deg)',transition:'transform .15s'}}>▼</div>
                </div>

                {/* Expanded */}
                {isExp && (
                  <div style={{borderTop:'1px solid rgba(125,249,170,.08)',padding:'12px 14px',background:'rgba(0,0,0,.2)'}}>
                    {exp.note && <div style={{fontSize:12,color:'#8890b0',marginBottom:10,fontStyle:'italic',padding:'8px 10px',background:'rgba(125,249,170,.04)',borderRadius:8}}>📝 {exp.note}</div>}
                    <div style={{fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.09em',marginBottom:9}}>Split details</div>
                    {splits.map(sp => (
                      <div key={sp.id} style={{display:'flex',alignItems:'center',gap:9,padding:'9px 0',borderBottom:'1px solid rgba(125,249,170,.04)'}}>
                        <Avatar emoji={sp.member?.avatar} color={sp.member?.color} size={28}/>
                        <span style={{flex:1,fontWeight:600,fontSize:13}}>{sp.member?.name}</span>
                        <span style={{fontFamily:'Orbitron,monospace',fontSize:13,fontWeight:700,color:sp.paid?'#6BCB77':'#FF6B6B'}}>{fmt(sp.amount)}</span>
                        {sp.paid ? (
                          <div style={{display:'flex',alignItems:'center',gap:5}}>
                            <span style={{fontSize:11,color:'#6BCB77',fontWeight:700,padding:'3px 9px',borderRadius:99,background:'rgba(107,203,119,.1)',border:'1px solid rgba(107,203,119,.2)'}}>✅ Paid</span>
                            {(sp.member_id===user?.id||profile?.is_admin) && (
                              <button onClick={async()=>{await markSplitUnpaid(sp.id);toast('Marked unpaid','warn');load()}}
                                style={{fontSize:10,padding:'3px 8px',borderRadius:99,border:'1px solid rgba(255,107,107,.2)',background:'rgba(255,107,107,.07)',color:'#FF6B6B',cursor:'pointer',fontFamily:'Rajdhani,sans-serif'}}>Undo</button>
                            )}
                          </div>
                        ) : (
                          (sp.member_id===user?.id||profile?.is_admin) && (
                            <button onClick={async()=>{await markSplitPaid(sp.id);toast('Marked as paid ✅');load()}}
                              style={{fontSize:11,fontWeight:700,padding:'5px 12px',borderRadius:99,border:'1px solid rgba(125,249,170,.25)',background:'rgba(125,249,170,.08)',color:'#7DF9AA',cursor:'pointer',fontFamily:'Rajdhani,sans-serif',whiteSpace:'nowrap'}}>
                              Mark Paid
                            </button>
                          )
                        )}
                      </div>
                    ))}
                    {(exp.paid_by===user?.id||profile?.is_admin) && (
                      <button onClick={async()=>{if(!confirm('Delete this expense?')) return;await deleteExpense(exp.id);toast('Deleted','warn');load()}}
                        style={{marginTop:12,fontSize:12,fontWeight:700,padding:'7px 14px',borderRadius:8,border:'1px solid rgba(255,107,107,.2)',background:'rgba(255,107,107,.07)',color:'#FF6B6B',cursor:'pointer',fontFamily:'Rajdhani,sans-serif'}}>
                        🗑️ Delete Expense
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add sheet */}
      {showAdd && members.length > 0 && (
        <AddSheet members={members} currentUserId={user?.id} onClose={()=>setShowAdd(false)} onAdded={load}/>
      )}
    </div>
  )
}

export default function Expenses() { return <ToastProvider><ExpensesContent/></ToastProvider> }
