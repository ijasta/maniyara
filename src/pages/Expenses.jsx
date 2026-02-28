import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { getExpenses, addExpense, markSplitPaid, markSplitUnpaid, deleteExpense, calcDebts, getMembers } from '../lib/supabase'
import { Avatar, Btn, SecHead, ToastProvider, useToast, inp } from '../components/UI'

const CATEGORIES = [
  { id:'groceries', label:'Groceries',    emoji:'🛒' },
  { id:'electricity',label:'Electricity', emoji:'💡' },
  { id:'water',     label:'Water',        emoji:'🌊' },
  { id:'food',      label:'Food/Order',   emoji:'🍕' },
  { id:'internet',  label:'Internet',     emoji:'📶' },
  { id:'rent',      label:'Rent',         emoji:'🏠' },
  { id:'cleaning',  label:'Cleaning',     emoji:'🧹' },
  { id:'other',     label:'Other',        emoji:'💸' },
]
const catMeta = id => CATEGORIES.find(c=>c.id===id) || CATEGORIES[7]

function fmt(n) { return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

// ── ADD EXPENSE SHEET ─────────────────────────────────────
function AddSheet({ members, currentUserId, onClose, onAdded }) {
  const toast = useToast()
  const [form, setForm] = useState({
    title: '', amount: '', category: 'groceries', paidBy: currentUserId, note: ''
  })
  const [selected, setSelected] = useState(new Set(members.map(m => m.id)))
  const [loading, setL] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleMember = id => setSelected(s => {
    const n = new Set(s)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  const share = selected.size > 0 && form.amount
    ? fmt(Number(form.amount) / selected.size)
    : '₹0'

  const submit = async () => {
    if (!form.title.trim()) { toast('Enter a title', 'warn'); return }
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) { toast('Enter a valid amount', 'warn'); return }
    if (selected.size === 0) { toast('Select at least one member to split with', 'warn'); return }
    setL(true)
    try {
      await addExpense(form.title.trim(), Number(form.amount), form.category, form.paidBy, form.note, [...selected])
      toast('Expense added! ✅')
      onAdded()
      onClose()
    } catch(e) { toast('Failed: ' + e.message, 'error') }
    finally { setL(false) }
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.85)',zIndex:500,display:'flex',alignItems:'flex-end',justifyContent:'center',backdropFilter:'blur(6px)'}}>
      <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.2)',borderRadius:'18px 18px 0 0',padding:'20px 16px 32px',width:'100%',maxWidth:520,maxHeight:'92dvh',overflowY:'auto',animation:'shUp .22s cubic-bezier(.34,1.38,.64,1)'}}>
        <div style={{width:36,height:4,borderRadius:99,background:'rgba(255,255,255,.15)',margin:'0 auto 18px'}}/>
        <div style={{fontFamily:'Orbitron,monospace',fontSize:16,fontWeight:700,letterSpacing:1,marginBottom:3}}>Add Expense</div>
        <div style={{fontSize:12,color:'#8890b0',marginBottom:16}}>Split the bill with selected members</div>

        {/* Title */}
        <div style={{marginBottom:12}}>
          <label style={lbl}>Title</label>
          <input style={inp} placeholder="e.g. Weekly groceries" value={form.title} onChange={e=>set('title',e.target.value)}/>
        </div>

        {/* Amount */}
        <div style={{marginBottom:12}}>
          <label style={lbl}>Amount (₹)</label>
          <input style={{...inp,fontFamily:'Orbitron,monospace',fontSize:20,fontWeight:700,color:'#7DF9AA'}}
            type="number" inputMode="decimal" placeholder="0.00"
            value={form.amount} onChange={e=>set('amount',e.target.value)}/>
        </div>

        {/* Category */}
        <div style={{marginBottom:12}}>
          <label style={lbl}>Category</label>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={()=>set('category',c.id)} style={{padding:'7px 12px',borderRadius:99,fontSize:12,fontWeight:700,cursor:'pointer',border:`1px solid ${form.category===c.id?'#7DF9AA':'rgba(125,249,170,.15)'}`,background:form.category===c.id?'rgba(125,249,170,.12)':'#131525',color:form.category===c.id?'#7DF9AA':'#8890b0',fontFamily:'Rajdhani,sans-serif',transition:'all .12s'}}>
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Paid by */}
        <div style={{marginBottom:12}}>
          <label style={lbl}>Paid by</label>
          <select style={{...inp,padding:'11px 13px'}} value={form.paidBy} onChange={e=>set('paidBy',e.target.value)}>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        {/* Split with */}
        <div style={{marginBottom:12}}>
          <label style={{...lbl,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span>Split among</span>
            <span style={{color:'#7DF9AA',fontSize:11,fontWeight:700,letterSpacing:0}}>{selected.size} selected · {share} each</span>
          </label>
          <div style={{display:'flex',flexDirection:'column',gap:7}}>
            {members.map(m => (
              <div key={m.id} onClick={()=>toggleMember(m.id)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:9,border:`1px solid ${selected.has(m.id)?'rgba(125,249,170,.3)':'rgba(125,249,170,.09)'}`,background:selected.has(m.id)?'rgba(125,249,170,.07)':'#131525',cursor:'pointer',transition:'all .12s'}}>
                <Avatar emoji={m.avatar} color={m.color} size={30}/>
                <span style={{flex:1,fontWeight:700,fontSize:13}}>{m.name}</span>
                <div style={{width:20,height:20,borderRadius:'50%',border:`2px solid ${selected.has(m.id)?'#7DF9AA':'#4a5070'}`,background:selected.has(m.id)?'#7DF9AA':'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#070810',fontWeight:900,flexShrink:0}}>
                  {selected.has(m.id)?'✓':''}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Note */}
        <div style={{marginBottom:18}}>
          <label style={lbl}>Note (optional)</label>
          <input style={inp} placeholder="Any details..." value={form.note} onChange={e=>set('note',e.target.value)}/>
        </div>

        <div style={{display:'flex',gap:9}}>
          <Btn variant="ghost" style={{flex:1}} onClick={onClose}>Cancel</Btn>
          <Btn style={{flex:2}} loading={loading} onClick={submit}>💸 Add Expense</Btn>
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
  const [activeTab,setActiveTab]= useState('summary') // summary | history
  const [expandId, setExpandId] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [exp, mem] = await Promise.all([getExpenses(), getMembers()])
      setExpenses(exp)
      setMembers(mem.filter(m => m.status === 'approved'))
    } catch(e) { toast('Failed to load: '+e.message, 'error') }
    finally { setL(false) }
  }

  // ── derived data ──
  const debts = calcDebts(expenses)

  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0)

  const mySpent = expenses
    .filter(e => e.paid_by === user?.id)
    .reduce((s, e) => s + Number(e.amount), 0)

  const myOwed = expenses
    .flatMap(e => e.expense_splits || [])
    .filter(s => s.member_id === user?.id && !s.paid)
    .reduce((s, sp) => s + Number(sp.amount), 0)

  const myLent = debts
    .filter(d => d.to.id === user?.id)
    .reduce((s, d) => s + d.amount, 0)

  if (loading) return <div style={{color:'#8890b0',padding:40,textAlign:'center'}}>Loading...</div>

  return (
    <div className="page-anim">
      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16,gap:10}}>
        <div>
          <div style={{fontFamily:'Orbitron,monospace',fontWeight:900,fontSize:'clamp(20px,5.5vw,28px)',letterSpacing:1}}>
            💸 <span style={{background:'linear-gradient(135deg,#7DF9AA,#00ffcc)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>EXPENSES</span>
          </div>
          <div style={{fontSize:12,color:'#8890b0',marginTop:3}}>House spending tracker</div>
        </div>
        <Btn sm onClick={()=>setShowAdd(true)}>+ Add</Btn>
      </div>

      {/* My stats strip */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:9,marginBottom:14}}>
        {[
          ['💳','I Paid',fmt(mySpent),'#7DF9AA'],
          ['🔴','I Owe',fmt(myOwed),'#FF6B6B'],
          ['🟢','Owed to Me',fmt(myLent),'#6BCB77'],
        ].map(([ic,lb,val,c])=>(
          <div key={lb} style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:'12px 10px',textAlign:'center'}}>
            <span style={{fontSize:18,display:'block',marginBottom:4}}>{ic}</span>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:13,fontWeight:700,color:c,lineHeight:1}}>{val}</div>
            <div style={{fontSize:9,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.07em',marginTop:3,fontWeight:700}}>{lb}</div>
          </div>
        ))}
      </div>

      {/* Total house spend */}
      <div style={{background:'linear-gradient(135deg,#0a1510,#0a0c1a)',border:'1px solid rgba(125,249,170,.18)',borderRadius:13,padding:'13px 16px',marginBottom:14,display:'flex',alignItems:'center',gap:12}}>
        <div style={{fontSize:32}}>🏠</div>
        <div style={{flex:1}}>
          <div style={{fontSize:11,color:'#8890b0',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em'}}>Total House Spending</div>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:24,fontWeight:900,color:'#7DF9AA',marginTop:2}}>{fmt(totalSpent)}</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:10,color:'#4a5070',fontWeight:700}}>TRANSACTIONS</div>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:20,fontWeight:700,color:'#FFD93D'}}>{expenses.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:5,marginBottom:16}}>
        {[['summary','⚡ Who Owes Who'],['history','📋 History']].map(([id,lb])=>(
          <button key={id} onClick={()=>setActiveTab(id)} style={{flex:1,padding:'9px',borderRadius:8,fontSize:13,fontWeight:700,cursor:'pointer',border:'none',fontFamily:'Rajdhani,sans-serif',background:activeTab===id?'#7DF9AA':'transparent',color:activeTab===id?'#070810':'#8890b0',transition:'all .15s'}}>
            {lb}
          </button>
        ))}
      </div>

      {/* ── SUMMARY TAB ── */}
      {activeTab==='summary' && (
        <div>
          <SecHead title="Settle Up"/>
          {debts.length === 0 ? (
            <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:'36px 20px',textAlign:'center'}}>
              <div style={{fontSize:44,marginBottom:10}}>🎉</div>
              <div style={{fontFamily:'Orbitron,monospace',fontSize:14,fontWeight:700,color:'#7DF9AA',marginBottom:6}}>ALL SETTLED UP!</div>
              <div style={{fontSize:13,color:'#8890b0'}}>No outstanding balances. Everyone's even.</div>
            </div>
          ) : debts.map((d,i)=>(
            <div key={i} style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:14,marginBottom:10}}>
              <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                <Avatar emoji={d.from.avatar} color={d.from.color} size={36}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700}}>{d.from.name}</div>
                  <div style={{fontSize:11,color:'#8890b0',marginTop:1}}>owes <strong style={{color:'#7DF9AA'}}>{d.to.name}</strong></div>
                </div>
                <div style={{fontFamily:'Orbitron,monospace',fontSize:18,fontWeight:900,color:'#FF6B6B',flexShrink:0}}>{fmt(d.amount)}</div>
                <Avatar emoji={d.to.avatar} color={d.to.color} size={36}/>
              </div>
              {/* Show settle button if it involves current user */}
              {(d.from.id===user?.id||profile?.is_admin) && (
                <div style={{marginTop:11}}>
                  <a href={`https://wa.me/${members.find(m=>m.id===d.to.id)?.phone?.replace(/\D/g,'')}?text=${encodeURIComponent(`Hey ${d.to.name}! I'm paying you ${fmt(d.amount)} for house expenses. — ${profile?.name}`)}`}
                    target="_blank" rel="noreferrer" style={{textDecoration:'none'}}>
                    <Btn variant="wa" sm style={{width:'100%'}}>📱 Pay via WhatsApp</Btn>
                  </a>
                </div>
              )}
            </div>
          ))}

          {/* Per-member total */}
          <SecHead title="Member Totals"/>
          {members.map(m=>{
            const paid  = expenses.filter(e=>e.paid_by===m.id).reduce((s,e)=>s+Number(e.amount),0)
            const share = expenses.flatMap(e=>e.expense_splits||[]).filter(s=>s.member_id===m.id).reduce((s,sp)=>s+Number(sp.amount),0)
            return (
              <div key={m.id} style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:'12px 14px',marginBottom:9,display:'flex',alignItems:'center',gap:10}}>
                <Avatar emoji={m.avatar} color={m.color} size={36}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:13}}>{m.name}</div>
                  <div style={{fontSize:11,color:'#8890b0',marginTop:2}}>Total share: <span style={{color:'#FFD93D',fontWeight:700}}>{fmt(share)}</span></div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontFamily:'Orbitron,monospace',fontSize:15,fontWeight:700,color:'#7DF9AA'}}>{fmt(paid)}</div>
                  <div style={{fontSize:9,color:'#4a5070',fontWeight:700,textTransform:'uppercase'}}>paid</div>
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
            <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.09)',borderRadius:13,padding:'40px 20px',textAlign:'center',color:'#4a5070'}}>
              <div style={{fontSize:40,marginBottom:10}}>📋</div>
              <div>No expenses yet. Add one!</div>
            </div>
          ) : expenses.map(exp=>{
            const cat   = catMeta(exp.category)
            const isExp = expandId===exp.id
            const payer = exp.paid_by_member
            const splits= exp.expense_splits || []
            const unpaid= splits.filter(s=>!s.paid)
            return (
              <div key={exp.id} style={{background:'#0d0e1a',border:`1px solid ${unpaid.length===0?'rgba(125,249,170,.2)':'rgba(125,249,170,.09)'}`,borderRadius:13,marginBottom:10,overflow:'hidden'}}>
                {/* Main row */}
                <div style={{padding:'13px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:11}} onClick={()=>setExpandId(isExp?null:exp.id)}>
                  <div style={{width:42,height:42,borderRadius:11,background:'rgba(125,249,170,.08)',border:'1px solid rgba(125,249,170,.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{cat.emoji}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{exp.title}</div>
                    <div style={{fontSize:11,color:'#8890b0',marginTop:2,display:'flex',align:'center',gap:6,flexWrap:'wrap'}}>
                      <span>{cat.label}</span>
                      <span>·</span>
                      <span>Paid by <strong style={{color:'#E8F0FF'}}>{payer?.name||'?'}</strong></span>
                      <span>·</span>
                      <span>{new Date(exp.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span>
                    </div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontFamily:'Orbitron,monospace',fontSize:16,fontWeight:700,color:'#7DF9AA'}}>{fmt(exp.amount)}</div>
                    <div style={{fontSize:10,color:unpaid.length===0?'#6BCB77':'#FFD93D',fontWeight:700,marginTop:2}}>{unpaid.length===0?'✅ Settled':`${unpaid.length} pending`}</div>
                  </div>
                  <div style={{fontSize:14,color:'#4a5070',marginLeft:4,flexShrink:0,transform:isExp?'rotate(180deg)':'',transition:'transform .15s'}}>▼</div>
                </div>

                {/* Expanded splits */}
                {isExp && (
                  <div style={{borderTop:'1px solid rgba(125,249,170,.09)',padding:'12px 14px'}}>
                    {exp.note && <div style={{fontSize:12,color:'#8890b0',marginBottom:10,fontStyle:'italic'}}>📝 {exp.note}</div>}
                    <div style={{fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.09em',marginBottom:8}}>Split details</div>
                    {splits.map(sp=>(
                      <div key={sp.id} style={{display:'flex',alignItems:'center',gap:9,padding:'8px 0',borderBottom:'1px solid rgba(125,249,170,.05)'}}>
                        <Avatar emoji={sp.member?.avatar} color={sp.member?.color} size={26}/>
                        <span style={{flex:1,fontWeight:600,fontSize:13}}>{sp.member?.name}</span>
                        <span style={{fontFamily:'Orbitron,monospace',fontSize:13,fontWeight:700,color:sp.paid?'#6BCB77':'#FF6B6B'}}>{fmt(sp.amount)}</span>
                        {sp.paid
                          ? <span style={{fontSize:11,color:'#6BCB77',fontWeight:700,padding:'3px 9px',borderRadius:99,background:'rgba(107,203,119,.1)',border:'1px solid rgba(107,203,119,.2)',whiteSpace:'nowrap'}}>✅ Paid</span>
                          : (sp.member_id===user?.id||profile?.is_admin) && (
                            <button onClick={async()=>{await markSplitPaid(sp.id);toast('Marked as paid ✅');load()}}
                              style={{fontSize:11,fontWeight:700,padding:'4px 10px',borderRadius:99,border:'1px solid rgba(125,249,170,.25)',background:'rgba(125,249,170,.08)',color:'#7DF9AA',cursor:'pointer',fontFamily:'Rajdhani,sans-serif',whiteSpace:'nowrap'}}>
                              Mark Paid
                            </button>
                          )
                        }
                        {sp.paid && (sp.member_id===user?.id||profile?.is_admin) && (
                          <button onClick={async()=>{await markSplitUnpaid(sp.id);toast('Marked unpaid','warn');load()}}
                            style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:99,border:'1px solid rgba(255,107,107,.2)',background:'rgba(255,107,107,.07)',color:'#FF6B6B',cursor:'pointer',fontFamily:'Rajdhani,sans-serif',whiteSpace:'nowrap'}}>
                            Undo
                          </button>
                        )}
                      </div>
                    ))}
                    {(exp.paid_by===user?.id||profile?.is_admin) && (
                      <button onClick={async()=>{if(!confirm('Delete this expense?')) return;await deleteExpense(exp.id);toast('Deleted','warn');load()}}
                        style={{marginTop:12,fontSize:12,fontWeight:700,padding:'6px 13px',borderRadius:8,border:'1px solid rgba(255,107,107,.2)',background:'rgba(255,107,107,.07)',color:'#FF6B6B',cursor:'pointer',fontFamily:'Rajdhani,sans-serif'}}>
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
      {showAdd && (
        <AddSheet
          members={members}
          currentUserId={user?.id}
          onClose={()=>setShowAdd(false)}
          onAdded={load}
        />
      )}
    </div>
  )
}

const lbl = { display:'block', fontSize:10, fontWeight:700, color:'#4a5070', textTransform:'uppercase', letterSpacing:'.09em', marginBottom:5 }

export default function Expenses() { return <ToastProvider><ExpensesContent/></ToastProvider> }
