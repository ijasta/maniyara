import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { getFundData, addFundTransaction, updateFundTransaction, deleteFundTransaction, updateFundSettings, getMembers } from '../lib/supabase'
import { Avatar, SecHead, ToastProvider, useToast, inp } from '../components/UI'

const fmt = n => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 })
const lbl = { display:'block', fontSize:10, fontWeight:700, color:'#4a5070', textTransform:'uppercase', letterSpacing:'.09em', marginBottom:6 }

// ── ADD TRANSACTION SHEET ─────────────────────────────────
function AddSheet({ type, onClose, onDone }) {
  const toast   = useToast()
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setL]     = useState(false)

  const presets = type === 'credit'
    ? ['Monthly collection', 'Extra contribution', 'Returned change', 'Rent collection']
    : ['Groceries', 'Electricity bill', 'Water bill', 'Cleaning supplies', 'Internet bill', 'Maintenance', 'Other house expense']

  const submit = async () => {
    if (!amount || isNaN(+amount) || +amount <= 0) { toast('Enter a valid amount','warn'); return }
    if (!reason.trim()) { toast('Enter a reason','warn'); return }
    setL(true)
    try {
      await addFundTransaction(type, +amount, reason.trim())
      toast(type==='credit' ? '💰 Money added to fund ✅' : '💸 Expense recorded ✅')
      onDone(); onClose()
    } catch(e) { toast('Failed: '+e.message,'error') }
    finally { setL(false) }
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.88)',zIndex:600,display:'flex',alignItems:'flex-end',justifyContent:'center',backdropFilter:'blur(8px)'}}
      onClick={e=>{ if(e.target===e.currentTarget) onClose() }}>
      <div style={{background:'#0b0c1b',border:`1px solid ${type==='credit'?'rgba(125,249,170,.25)':'rgba(255,107,107,.25)'}`,borderRadius:'20px 20px 0 0',padding:0,width:'100%',maxWidth:520,maxHeight:'90dvh',overflowY:'auto',animation:'shUp .22s cubic-bezier(.34,1.2,.64,1)'}}>

        {/* Header */}
        <div style={{position:'sticky',top:0,background:'#0b0c1b',padding:'14px 18px 12px',borderBottom:`1px solid ${type==='credit'?'rgba(125,249,170,.1)':'rgba(255,107,107,.1)'}`,zIndex:1}}>
          <div style={{width:36,height:4,borderRadius:99,background:'rgba(255,255,255,.1)',margin:'0 auto 14px'}}/>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontFamily:'Orbitron,monospace',fontSize:16,fontWeight:800,color:type==='credit'?'#7DF9AA':'#FF6B6B'}}>
                {type==='credit' ? '💰 Add Money' : '💸 Record Spending'}
              </div>
              <div style={{fontSize:11,color:'#8890b0',marginTop:2}}>
                {type==='credit' ? 'Add collected money to the common fund' : 'Record money spent from the fund'}
              </div>
            </div>
            <button onClick={onClose} style={{width:32,height:32,borderRadius:'50%',border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.05)',color:'#8890b0',fontSize:16,cursor:'pointer'}}>✕</button>
          </div>
        </div>

        <div style={{padding:'16px 18px 32px'}}>
          {/* Amount */}
          <div style={{background:type==='credit'?'rgba(125,249,170,.05)':'rgba(255,107,107,.05)',border:`1px solid ${type==='credit'?'rgba(125,249,170,.15)':'rgba(255,107,107,.15)'}`,borderRadius:14,padding:'16px',marginBottom:14,textAlign:'center'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:8}}>Amount (₹)</div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
              <span style={{fontFamily:'Orbitron,monospace',fontSize:26,fontWeight:900,color:type==='credit'?'#7DF9AA':'#FF6B6B'}}>₹</span>
              <input type="number" inputMode="decimal" placeholder="0"
                value={amount} onChange={e=>setAmount(e.target.value)}
                style={{background:'transparent',border:'none',outline:'none',fontFamily:'Orbitron,monospace',fontSize:36,fontWeight:900,color:type==='credit'?'#7DF9AA':'#FF6B6B',width:160,textAlign:'center'}}/>
            </div>
          </div>

          {/* Reason presets */}
          <div style={{marginBottom:12}}>
            <label style={lbl}>Quick Select Reason</label>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:9}}>
              {presets.map(p=>(
                <button key={p} onClick={()=>setReason(p)}
                  style={{padding:'6px 12px',borderRadius:99,fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'Rajdhani,sans-serif',
                    border:`1px solid ${reason===p?(type==='credit'?'#7DF9AA':'#FF6B6B'):'rgba(125,249,170,.1)'}`,
                    background:reason===p?(type==='credit'?'rgba(125,249,170,.12)':'rgba(255,107,107,.1)'):'#131525',
                    color:reason===p?(type==='credit'?'#7DF9AA':'#FF6B6B'):'#8890b0',transition:'all .12s'}}>
                  {p}
                </button>
              ))}
            </div>
            <label style={lbl}>Or type custom reason</label>
            <input style={{...inp,fontSize:'16px'}} placeholder="e.g. Bought new broom ₹150..."
              value={reason} onChange={e=>setReason(e.target.value)}/>
          </div>

          <button onClick={submit} disabled={loading}
            style={{width:'100%',padding:16,borderRadius:12,fontSize:15,fontWeight:800,cursor:'pointer',border:'none',
              fontFamily:'Rajdhani,sans-serif',letterSpacing:'.08em',
              background:type==='credit'?'linear-gradient(135deg,#7DF9AA,#00D4AA)':'linear-gradient(135deg,#FF6B6B,#FF9A3C)',
              color:'#070810',opacity:loading?0.6:1,transition:'all .15s',
              boxShadow:type==='credit'?'0 4px 20px rgba(125,249,170,.25)':'0 4px 20px rgba(255,107,107,.25)'}}>
            {loading ? '⏳ Saving...' : type==='credit' ? '💰 Add to Fund' : '💸 Record Spending'}
          </button>
        </div>
      </div>
      <style>{`@keyframes shUp{from{transform:translateY(100%)}to{transform:none}}`}</style>
    </div>
  )
}

// ── EDIT TRANSACTION SHEET ────────────────────────────────
function EditSheet({ txn, onClose, onDone }) {
  const toast = useToast()
  const [amount, setAmount] = useState(String(txn.amount))
  const [reason, setReason] = useState(txn.reason)
  const [loading, setL]     = useState(false)

  const save = async () => {
    if (!amount || +amount <= 0) { toast('Valid amount required','warn'); return }
    if (!reason.trim())          { toast('Reason required','warn'); return }
    setL(true)
    try {
      await updateFundTransaction(txn.id, { amount: +amount, reason: reason.trim() })
      toast('Updated ✅'); onDone(); onClose()
    } catch(e) { toast('Failed: '+e.message,'error') }
    finally { setL(false) }
  }

  const c = txn.type==='credit' ? '#7DF9AA' : '#FF6B6B'
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.88)',zIndex:600,display:'flex',alignItems:'center',justifyContent:'center',padding:16,backdropFilter:'blur(8px)'}}
      onClick={e=>{ if(e.target===e.currentTarget) onClose() }}>
      <div style={{background:'#0b0c1b',border:`1px solid ${c}44`,borderRadius:18,padding:20,width:'100%',maxWidth:400}}>
        <div style={{fontFamily:'Orbitron,monospace',fontSize:14,fontWeight:800,color:c,marginBottom:4}}>✏️ Edit Transaction</div>
        <div style={{fontSize:11,color:'#8890b0',marginBottom:16}}>{txn.type==='credit'?'💰 Money In':'💸 Money Out'}</div>
        <div style={{marginBottom:12}}>
          <label style={lbl}>Amount (₹)</label>
          <input type="number" value={amount} onChange={e=>setAmount(e.target.value)}
            style={{...inp,fontFamily:'Orbitron,monospace',fontSize:20,fontWeight:700,color:c}}/>
        </div>
        <div style={{marginBottom:16}}>
          <label style={lbl}>Reason</label>
          <input value={reason} onChange={e=>setReason(e.target.value)} style={{...inp,fontSize:'16px'}}/>
        </div>
        <div style={{display:'flex',gap:9}}>
          <button onClick={onClose} style={{flex:1,padding:11,borderRadius:9,border:'1px solid rgba(125,249,170,.15)',background:'transparent',color:'#8890b0',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>Cancel</button>
          <button onClick={save} disabled={loading} style={{flex:2,padding:11,borderRadius:9,border:'none',background:`linear-gradient(135deg,${c},${txn.type==='credit'?'#00D4AA':'#FF9A3C'})`,color:'#070810',fontFamily:'Rajdhani,sans-serif',fontWeight:800,fontSize:13,cursor:'pointer',opacity:loading?0.6:1}}>
            {loading?'Saving...':'💾 Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────
function CommonFundContent() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const [data,    setData]    = useState({ txns:[], settings:{}, balance:0 })
  const [members, setMembers] = useState([])
  const [loading, setL]       = useState(true)
  const [sheet,   setSheet]   = useState(null)  // 'credit' | 'debit' | null
  const [editTxn, setEditTxn] = useState(null)
  const [filter,  setFilter]  = useState('all') // all | credit | debit
  const [showSettings, setShowSettings] = useState(false)
  const [stForm,  setStForm]  = useState({})
  const [stSaving,setStSaving]= useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [d, mem] = await Promise.all([getFundData(), getMembers()])
      setData(d)
      setMembers(mem.filter(m=>m.status==='approved'))
      setStForm({ monthly_target: d.settings?.monthly_target||1000, low_balance_alert: d.settings?.low_balance_alert||200, treasurer_id: d.settings?.treasurer_id||'' })
    } catch(e) { toast('Failed to load: '+e.message,'error') }
    finally { setL(false) }
  }

  const canEdit = profile?.is_admin || user?.id === data.settings?.treasurer_id

  const filtered = data.txns.filter(t => filter==='all' || t.type===filter)
  const totalIn   = data.txns.filter(t=>t.type==='credit').reduce((s,t)=>s+Number(t.amount),0)
  const totalOut  = data.txns.filter(t=>t.type==='debit').reduce((s,t)=>s+Number(t.amount),0)
  const isLow     = data.balance <= (data.settings?.low_balance_alert||200) && data.balance >= 0
  const isNeg     = data.balance < 0
  const treasurer = data.settings?.treasurer

  if (loading) return <div style={{color:'#8890b0',padding:60,textAlign:'center'}}>Loading...</div>

  return (
    <div className="page-anim">

      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16}}>
        <div>
          <div style={{fontFamily:'Orbitron,monospace',fontWeight:900,fontSize:'clamp(20px,5.5vw,26px)',letterSpacing:1}}>
            🏦 <span style={{background:'linear-gradient(135deg,#FFD93D,#FF9A3C)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>COMMON FUND</span>
          </div>
          <div style={{fontSize:12,color:'#8890b0',marginTop:3}}>Shared house money pot</div>
        </div>
        {profile?.is_admin && (
          <button onClick={()=>setShowSettings(s=>!s)}
            style={{padding:'8px 14px',borderRadius:99,fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:12,border:'1px solid rgba(255,217,61,.25)',background:showSettings?'rgba(255,217,61,.12)':'rgba(255,217,61,.06)',color:'#FFD93D',cursor:'pointer'}}>
            ⚙️ Settings
          </button>
        )}
      </div>

      {/* Admin settings panel */}
      {showSettings && profile?.is_admin && (
        <div style={{background:'rgba(255,217,61,.05)',border:'1px solid rgba(255,217,61,.2)',borderRadius:13,padding:16,marginBottom:16}}>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:11,fontWeight:700,color:'#FFD93D',letterSpacing:2,marginBottom:14}}>⚙️ FUND SETTINGS</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
            <div>
              <label style={lbl}>Monthly Target (₹)</label>
              <input type="number" value={stForm.monthly_target||''} onChange={e=>setStForm(f=>({...f,monthly_target:e.target.value}))}
                style={{...inp,fontSize:'15px'}}/>
            </div>
            <div>
              <label style={lbl}>Low Balance Alert (₹)</label>
              <input type="number" value={stForm.low_balance_alert||''} onChange={e=>setStForm(f=>({...f,low_balance_alert:e.target.value}))}
                style={{...inp,fontSize:'15px'}}/>
            </div>
          </div>
          <div style={{marginBottom:14}}>
            <label style={lbl}>Treasurer (can add/edit transactions)</label>
            <select value={stForm.treasurer_id||''} onChange={e=>setStForm(f=>({...f,treasurer_id:e.target.value}))}
              style={{...inp,padding:'10px 13px',fontSize:'15px'}}>
              <option value="">— None (admin only) —</option>
              {members.map(m=><option key={m.id} value={m.id}>{m.name} (@{m.username})</option>)}
            </select>
          </div>
          <button onClick={async()=>{
            setStSaving(true)
            try {
              await updateFundSettings({ monthly_target:+stForm.monthly_target, low_balance_alert:+stForm.low_balance_alert, treasurer_id:stForm.treasurer_id||null })
              toast('Fund settings saved ✅'); load(); setShowSettings(false)
            } catch(e) { toast('Failed: '+e.message,'error') }
            finally { setStSaving(false) }
          }} disabled={stSaving} style={{width:'100%',padding:11,borderRadius:9,fontFamily:'Rajdhani,sans-serif',fontWeight:800,fontSize:13,cursor:'pointer',border:'none',background:'linear-gradient(135deg,#FFD93D,#FF9A3C)',color:'#070810',opacity:stSaving?0.6:1}}>
            {stSaving?'Saving...':'💾 Save Settings'}
          </button>
        </div>
      )}

      {/* Treasurer badge */}
      {treasurer && (
        <div style={{background:'rgba(255,217,61,.06)',border:'1px solid rgba(255,217,61,.15)',borderRadius:11,padding:'10px 14px',marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
          <Avatar emoji={treasurer.avatar} color={treasurer.color} size={30}/>
          <div>
            <div style={{fontSize:11,color:'#FFD93D',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em'}}>Treasurer</div>
            <div style={{fontSize:13,fontWeight:700,marginTop:1}}>{treasurer.name}</div>
          </div>
          <div style={{marginLeft:'auto',fontSize:11,color:'#8890b0'}}>Can manage fund</div>
        </div>
      )}

      {/* Low balance / negative warning */}
      {isNeg && (
        <div style={{background:'rgba(255,107,107,.1)',border:'1px solid rgba(255,107,107,.3)',borderRadius:13,padding:'13px 16px',marginBottom:14,display:'flex',gap:10,alignItems:'center'}}>
          <span style={{fontSize:28}}>🚨</span>
          <div>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:13,fontWeight:700,color:'#FF6B6B'}}>FUND IN DEFICIT!</div>
            <div style={{fontSize:12,color:'#FF6B6B',marginTop:2,opacity:.8}}>Spending exceeds collected amount by {fmt(Math.abs(data.balance))}</div>
          </div>
        </div>
      )}
      {isLow && !isNeg && (
        <div style={{background:'rgba(255,217,61,.08)',border:'1px solid rgba(255,217,61,.25)',borderRadius:13,padding:'13px 16px',marginBottom:14,display:'flex',gap:10,alignItems:'center'}}>
          <span style={{fontSize:28}}>⚠️</span>
          <div>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:13,fontWeight:700,color:'#FFD93D'}}>LOW BALANCE!</div>
            <div style={{fontSize:12,color:'#FFD93D',marginTop:2,opacity:.8}}>Only {fmt(data.balance)} left. Consider collecting more.</div>
          </div>
        </div>
      )}

      {/* Main balance card */}
      <div style={{background:'linear-gradient(135deg,#0e1208,#0a0c1a)',border:`2px solid ${isNeg?'#FF6B6B':isLow?'#FFD93D':'rgba(255,217,61,.35)'}`,borderRadius:16,padding:'22px 20px',marginBottom:14,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-30,right:-30,width:120,height:120,borderRadius:'50%',background:isNeg?'#FF6B6B':isLow?'#FFD93D':'#FFD93D',opacity:.06,filter:'blur(24px)'}}/>
        <div style={{fontSize:11,color:'#8890b0',fontWeight:700,textTransform:'uppercase',letterSpacing:'.12em',marginBottom:6}}>Current Balance</div>
        <div style={{fontFamily:'Orbitron,monospace',fontSize:'clamp(32px,9vw,48px)',fontWeight:900,color:isNeg?'#FF6B6B':isLow?'#FFD93D':'#FFD93D',lineHeight:1,marginBottom:10}}>
          {fmt(data.balance)}
        </div>
        <div style={{display:'flex',gap:18,flexWrap:'wrap'}}>
          <div>
            <div style={{fontSize:10,color:'#4a5070',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em'}}>Total In</div>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:16,fontWeight:700,color:'#7DF9AA',marginTop:2}}>+{fmt(totalIn)}</div>
          </div>
          <div style={{width:1,background:'rgba(255,255,255,.06)'}}/>
          <div>
            <div style={{fontSize:10,color:'#4a5070',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em'}}>Total Out</div>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:16,fontWeight:700,color:'#FF6B6B',marginTop:2}}>-{fmt(totalOut)}</div>
          </div>
          <div style={{width:1,background:'rgba(255,255,255,.06)'}}/>
          <div>
            <div style={{fontSize:10,color:'#4a5070',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em'}}>Transactions</div>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:16,fontWeight:700,color:'#E8F0FF',marginTop:2}}>{data.txns.length}</div>
          </div>
        </div>
      </div>

      {/* Monthly target progress */}
      {data.settings?.monthly_target > 0 && (
        <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.08)',borderRadius:13,padding:'12px 16px',marginBottom:14}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div style={{fontSize:12,fontWeight:700,color:'#8890b0'}}>Monthly Target</div>
            <div style={{fontSize:13,fontWeight:700,color:'#FFD93D'}}>{fmt(Math.min(totalIn,data.settings.monthly_target))} / {fmt(data.settings.monthly_target)}</div>
          </div>
          <div style={{height:8,background:'rgba(255,255,255,.06)',borderRadius:99,overflow:'hidden'}}>
            <div style={{height:'100%',borderRadius:99,background:'linear-gradient(90deg,#FFD93D,#FF9A3C)',width:`${Math.min(100,(totalIn/data.settings.monthly_target)*100)}%`,transition:'width .4s'}}/>
          </div>
          <div style={{fontSize:11,color:'#4a5070',marginTop:5}}>{Math.round(Math.min(100,(totalIn/data.settings.monthly_target)*100))}% of target collected</div>
        </div>
      )}

      {/* Add money / record spending buttons */}
      {canEdit && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
          <button onClick={()=>setSheet('credit')}
            style={{padding:'14px',borderRadius:12,fontFamily:'Rajdhani,sans-serif',fontWeight:800,fontSize:14,cursor:'pointer',
              border:'2px solid rgba(125,249,170,.3)',background:'rgba(125,249,170,.08)',color:'#7DF9AA',letterSpacing:'.05em',
              transition:'all .15s',boxShadow:'0 0 0 rgba(125,249,170,0)'}}>
            💰 Add Money
          </button>
          <button onClick={()=>setSheet('debit')}
            style={{padding:'14px',borderRadius:12,fontFamily:'Rajdhani,sans-serif',fontWeight:800,fontSize:14,cursor:'pointer',
              border:'2px solid rgba(255,107,107,.3)',background:'rgba(255,107,107,.08)',color:'#FF6B6B',letterSpacing:'.05em',
              transition:'all .15s'}}>
            💸 Record Spending
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{display:'flex',gap:4,background:'#0d0e1a',border:'1px solid rgba(125,249,170,.07)',borderRadius:13,padding:5,marginBottom:14}}>
        {[['all','All'],['credit','💰 Money In'],['debit','💸 Money Out']].map(([id,lb])=>(
          <button key={id} onClick={()=>setFilter(id)}
            style={{flex:1,padding:'9px 6px',borderRadius:8,fontSize:12,fontWeight:700,cursor:'pointer',border:'none',
              fontFamily:'Rajdhani,sans-serif',background:filter===id?'#FFD93D':'transparent',
              color:filter===id?'#070810':'#8890b0',transition:'all .15s',whiteSpace:'nowrap'}}>
            {lb}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      <SecHead title="Transaction History" badge={`${filtered.length} entries`}/>
      {filtered.length === 0 ? (
        <div style={{background:'#0d0e1a',border:'1px solid rgba(125,249,170,.07)',borderRadius:13,padding:'50px 20px',textAlign:'center'}}>
          <div style={{fontSize:44,marginBottom:10}}>🏦</div>
          <div style={{color:'#4a5070',fontSize:14}}>No transactions yet.<br/>
            {canEdit && <span>Tap <strong style={{color:'#7DF9AA'}}>Add Money</strong> or <strong style={{color:'#FF6B6B'}}>Record Spending</strong> to start.</span>}
          </div>
        </div>
      ) : filtered.map((t, i) => {
        const isCredit = t.type === 'credit'
        const addedBy  = t.added_by_member
        return (
          <div key={t.id} style={{background:'#0d0e1a',border:`1px solid ${isCredit?'rgba(125,249,170,.12)':'rgba(255,107,107,.12)'}`,borderRadius:13,padding:'13px 14px',marginBottom:9,display:'flex',alignItems:'center',gap:12}}>

            {/* Icon */}
            <div style={{width:44,height:44,borderRadius:12,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,
              background:isCredit?'rgba(125,249,170,.08)':'rgba(255,107,107,.08)',
              border:`1px solid ${isCredit?'rgba(125,249,170,.15)':'rgba(255,107,107,.15)'}`}}>
              {isCredit?'💰':'💸'}
            </div>

            {/* Info */}
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.reason}</div>
              <div style={{fontSize:11,color:'#8890b0',marginTop:3,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                {addedBy && (
                  <span style={{display:'flex',alignItems:'center',gap:4}}>
                    <span>{addedBy.avatar}</span>
                    <span>{addedBy.name}</span>
                  </span>
                )}
                <span>·</span>
                <span>{new Date(t.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>
              </div>
            </div>

            {/* Amount */}
            <div style={{textAlign:'right',flexShrink:0}}>
              <div style={{fontFamily:'Orbitron,monospace',fontSize:16,fontWeight:900,color:isCredit?'#7DF9AA':'#FF6B6B'}}>
                {isCredit?'+':'-'}{fmt(t.amount)}
              </div>
              <div style={{fontSize:10,fontWeight:700,color:isCredit?'#7DF9AA':'#FF6B6B',marginTop:2,opacity:.7}}>
                {isCredit?'CREDIT':'DEBIT'}
              </div>
            </div>

            {/* Edit / Delete — admin or treasurer only */}
            {canEdit && (
              <div style={{display:'flex',flexDirection:'column',gap:5,flexShrink:0}}>
                <button onClick={()=>setEditTxn(t)}
                  style={{width:30,height:30,borderRadius:7,border:'1px solid rgba(77,150,255,.2)',background:'rgba(77,150,255,.07)',color:'#4D96FF',cursor:'pointer',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center'}}>✏️</button>
                <button onClick={async()=>{
                  if(!confirm(`Delete "${t.reason}"?`)) return
                  try { await deleteFundTransaction(t.id); toast('Deleted','warn'); load() }
                  catch(e) { toast('Failed: '+e.message,'error') }
                }} style={{width:30,height:30,borderRadius:7,border:'1px solid rgba(255,107,107,.2)',background:'rgba(255,107,107,.07)',color:'#FF6B6B',cursor:'pointer',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center'}}>🗑️</button>
              </div>
            )}
          </div>
        )
      })}

      {/* Sheets */}
      {sheet && <AddSheet type={sheet} onClose={()=>setSheet(null)} onDone={load}/>}
      {editTxn && <EditSheet txn={editTxn} onClose={()=>setEditTxn(null)} onDone={load}/>}
    </div>
  )
}

export default function CommonFund() { return <ToastProvider><CommonFundContent/></ToastProvider> }
