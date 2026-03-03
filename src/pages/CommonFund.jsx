import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { getFundData, addFundTransaction, updateFundTransaction, deleteFundTransaction, updateFundSettings, getMembers } from '../lib/supabase'
import { Avatar, ToastProvider, useToast, inp } from '../components/UI'

const fmt = n => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 })
const lbl = { display:'block', fontSize:10, fontWeight:700, color:'#6a7090', textTransform:'uppercase', letterSpacing:'.09em', marginBottom:6 }

// 2-hour edit window check
const canEditTxn = (created_at) => Date.now() - new Date(created_at).getTime() < 2 * 60 * 60 * 1000
const timeLeft   = (created_at) => {
  const ms = 2*60*60*1000 - (Date.now() - new Date(created_at).getTime())
  if (ms <= 0) return null
  const m = Math.floor(ms / 60000)
  return m >= 60 ? `${Math.floor(m/60)}h ${m%60}m left` : `${m}m left`
}

// ── ADD SHEET ─────────────────────────────────────────────
function AddSheet({ type, onClose, onDone }) {
  const toast = useToast()
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setL]     = useState(false)
  const isCredit = type === 'credit'
  const ac = isCredit ? '#7DF9AA' : '#FF6B6B'
  const presets = isCredit
    ? ['Monthly collection','Extra contribution','Returned change','Rent collection']
    : ['Groceries','Electricity bill','Water bill','Cleaning supplies','Internet bill','Maintenance','Other']

  const submit = async () => {
    if (!amount || isNaN(+amount) || +amount <= 0) { toast('Enter a valid amount','warn'); return }
    if (!reason.trim()) { toast('Enter a reason','warn'); return }
    setL(true)
    try {
      await addFundTransaction(type, +amount, reason.trim())
      toast(isCredit ? '💰 Money added ✅' : '💸 Expense recorded ✅')
      onDone(); onClose()
    } catch(e) { toast('Failed: '+e.message,'error') }
    finally { setL(false) }
  }

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{position:'fixed',inset:0,background:'rgba(0,0,0,.85)',zIndex:600,display:'flex',alignItems:'flex-end',justifyContent:'center',backdropFilter:'blur(10px)'}}>
      <div style={{background:'#0b0d1e',borderRadius:'24px 24px 0 0',width:'100%',maxWidth:520,maxHeight:'92dvh',overflowY:'auto',
        border:`1px solid ${ac}33`,animation:'shUp .25s cubic-bezier(.34,1.2,.64,1)',
        boxShadow:`0 -20px 60px ${ac}15`}}>

        {/* Drag handle + header */}
        <div style={{position:'sticky',top:0,background:'#0b0d1e',zIndex:1,padding:'12px 20px 14px',
          borderBottom:`1px solid ${ac}18`}}>
          <div style={{width:40,height:4,borderRadius:99,background:'rgba(255,255,255,.08)',margin:'0 auto 14px'}}/>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <div style={{width:46,height:46,borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,
              background:`linear-gradient(135deg,${ac}22,${ac}08)`,border:`1px solid ${ac}33`}}>
              {isCredit?'💰':'💸'}
            </div>
            <div style={{flex:1}}>
              <div style={{fontFamily:'Orbitron,monospace',fontSize:15,fontWeight:800,color:ac}}>
                {isCredit ? 'Add Money to Fund' : 'Record Spending'}
              </div>
              <div style={{fontSize:11,color:'#6a7090',marginTop:2}}>
                {isCredit ? 'Deposit collected amount into common fund' : 'Log an expense from the fund'}
              </div>
            </div>
            <button onClick={onClose} style={{width:32,height:32,borderRadius:10,border:'1px solid rgba(255,255,255,.08)',
              background:'rgba(255,255,255,.04)',color:'#6a7090',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          </div>
        </div>

        <div style={{padding:'18px 20px 36px'}}>
          {/* Amount input */}
          <div style={{background:`linear-gradient(135deg,${ac}0a,${ac}04)`,border:`1px solid ${ac}22`,
            borderRadius:16,padding:'20px',marginBottom:16,textAlign:'center',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',top:-20,right:-20,width:80,height:80,borderRadius:'50%',background:ac,opacity:.06,filter:'blur(20px)'}}/>
            <div style={{fontSize:10,fontWeight:700,color:'#6a7090',textTransform:'uppercase',letterSpacing:'.12em',marginBottom:10}}>Amount</div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:2}}>
              <span style={{fontFamily:'Orbitron,monospace',fontSize:28,fontWeight:900,color:ac,opacity:.7}}>₹</span>
              <input type="number" inputMode="decimal" placeholder="0.00"
                value={amount} onChange={e=>setAmount(e.target.value)} autoFocus
                style={{background:'transparent',border:'none',outline:'none',fontFamily:'Orbitron,monospace',
                  fontSize:42,fontWeight:900,color:ac,width:200,textAlign:'center'}}/>
            </div>
            {amount && !isNaN(+amount) && +amount > 0 && (
              <div style={{fontSize:12,color:`${ac}99`,marginTop:6,fontWeight:600}}>{fmt(+amount)}</div>
            )}
          </div>

          {/* Reason presets */}
          <div style={{marginBottom:14}}>
            <label style={lbl}>Quick Reason</label>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
              {presets.map(p=>(
                <button key={p} onClick={()=>setReason(p)}
                  style={{padding:'7px 13px',borderRadius:99,fontSize:11,fontWeight:700,cursor:'pointer',
                    fontFamily:'Rajdhani,sans-serif',transition:'all .12s',
                    border:`1px solid ${reason===p?ac:'rgba(255,255,255,.07)'}`,
                    background:reason===p?`${ac}18`:'rgba(255,255,255,.03)',
                    color:reason===p?ac:'#6a7090'}}>
                  {p}
                </button>
              ))}
            </div>
            <label style={lbl}>Custom reason</label>
            <input style={{...inp,fontSize:'16px',background:'#131628',border:'1px solid rgba(255,255,255,.08)'}}
              placeholder="e.g. Bought new broom..."
              value={reason} onChange={e=>setReason(e.target.value)}/>
          </div>

          <button onClick={submit} disabled={loading}
            style={{width:'100%',padding:16,borderRadius:14,fontSize:15,fontWeight:800,cursor:'pointer',border:'none',
              fontFamily:'Rajdhani,sans-serif',letterSpacing:'.08em',transition:'all .15s',
              background:isCredit?'linear-gradient(135deg,#7DF9AA,#00D4AA)':'linear-gradient(135deg,#FF6B6B,#FF9A3C)',
              color:'#070810',opacity:loading?.6:1,
              boxShadow:isCredit?'0 8px 24px rgba(125,249,170,.25)':'0 8px 24px rgba(255,107,107,.25)'}}>
            {loading ? '⏳ Saving...' : isCredit ? '💰 Add to Fund' : '💸 Record Spending'}
          </button>
        </div>
      </div>
      <style>{`@keyframes shUp{from{transform:translateY(100%)}to{transform:none}}`}</style>
    </div>
  )
}

// ── EDIT SHEET ────────────────────────────────────────────
function EditSheet({ txn, onClose, onDone }) {
  const toast = useToast()
  const [amount, setAmount] = useState(String(txn.amount))
  const [reason, setReason] = useState(txn.reason)
  const [loading, setL]     = useState(false)
  const ac = txn.type==='credit' ? '#7DF9AA' : '#FF6B6B'

  const save = async () => {
    if (!amount || +amount <= 0) { toast('Valid amount required','warn'); return }
    if (!reason.trim())          { toast('Reason required','warn'); return }
    setL(true)
    try {
      await updateFundTransaction(txn.id, { amount:+amount, reason:reason.trim() })
      toast('Updated ✅'); onDone(); onClose()
    } catch(e) { toast('Failed: '+e.message,'error') }
    finally { setL(false) }
  }

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{position:'fixed',inset:0,background:'rgba(0,0,0,.88)',zIndex:600,display:'flex',alignItems:'center',justifyContent:'center',padding:16,backdropFilter:'blur(10px)'}}>
      <div style={{background:'#0b0d1e',border:`1px solid ${ac}33`,borderRadius:20,padding:22,width:'100%',maxWidth:400,
        boxShadow:`0 24px 60px rgba(0,0,0,.6),0 0 40px ${ac}10`}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18}}>
          <div style={{width:40,height:40,borderRadius:12,background:`${ac}18`,border:`1px solid ${ac}33`,
            display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>✏️</div>
          <div>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:13,fontWeight:800,color:ac}}>Edit Transaction</div>
            <div style={{fontSize:11,color:'#6a7090',marginTop:1}}>{txn.type==='credit'?'💰 Money In':'💸 Money Out'}</div>
          </div>
        </div>
        <div style={{marginBottom:12}}>
          <label style={lbl}>Amount (₹)</label>
          <input type="number" value={amount} onChange={e=>setAmount(e.target.value)}
            style={{...inp,fontFamily:'Orbitron,monospace',fontSize:22,fontWeight:700,color:ac,
              background:'#131628',border:`1px solid ${ac}22`}}/>
        </div>
        <div style={{marginBottom:18}}>
          <label style={lbl}>Reason</label>
          <input value={reason} onChange={e=>setReason(e.target.value)}
            style={{...inp,fontSize:'15px',background:'#131628',border:'1px solid rgba(255,255,255,.08)'}}/>
        </div>
        <div style={{display:'flex',gap:9}}>
          <button onClick={onClose}
            style={{flex:1,padding:12,borderRadius:10,border:'1px solid rgba(255,255,255,.08)',background:'transparent',
              color:'#6a7090',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,cursor:'pointer'}}>
            Cancel
          </button>
          <button onClick={save} disabled={loading}
            style={{flex:2,padding:12,borderRadius:10,border:'none',fontFamily:'Rajdhani,sans-serif',fontWeight:800,
              fontSize:13,cursor:'pointer',opacity:loading?.6:1,
              background:`linear-gradient(135deg,${ac},${txn.type==='credit'?'#00D4AA':'#FF9A3C'})`,color:'#070810'}}>
            {loading?'Saving...':'💾 Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── MAIN ─────────────────────────────────────────────────
function CommonFundContent() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const [data,        setData]       = useState({ txns:[], settings:{}, balance:0 })
  const [loading,     setL]          = useState(true)
  const [sheet,       setSheet]      = useState(null)
  const [editTxn,     setEditTxn]    = useState(null)
  const [filter,      setFilter]     = useState('all')
  const [showSettings,setShowSt]     = useState(false)
  const [stForm,      setStForm]     = useState({})
  const [stSaving,    setStSaving]   = useState(false)

  useEffect(()=>{ load() },[])

  async function load() {
    try {
      const d = await getFundData()
      setData(d)
      setStForm({ monthly_target:d.settings?.monthly_target||1000, low_balance_alert:d.settings?.low_balance_alert||200 })
    } catch(e) { toast('Failed to load','error') }
    finally { setL(false) }
  }

  const canEdit   = profile?.is_admin || user?.id === data.settings?.treasurer_id
  const isAdmin   = profile?.is_admin
  const filtered  = data.txns.filter(t => filter==='all' || t.type===filter)
  const totalIn   = data.txns.filter(t=>t.type==='credit').reduce((s,t)=>s+Number(t.amount),0)
  const totalOut  = data.txns.filter(t=>t.type==='debit').reduce((s,t)=>s+Number(t.amount),0)
  const isLow     = data.balance <= (data.settings?.low_balance_alert||200) && data.balance >= 0
  const isNeg     = data.balance < 0
  const treasurer = data.settings?.treasurer
  const pct       = data.settings?.monthly_target > 0
    ? Math.min(100, (totalIn / data.settings.monthly_target) * 100) : 0

  const balColor  = isNeg ? '#FF6B6B' : isLow ? '#FFD93D' : '#FFD93D'

  if (loading) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:80,gap:16}}>
      <div style={{width:48,height:48,borderRadius:'50%',border:'3px solid rgba(255,217,61,.2)',borderTopColor:'#FFD93D',animation:'spin 1s linear infinite'}}/>
      <div style={{fontSize:12,color:'#6a7090',fontWeight:700}}>Loading fund data...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div className="page-anim" style={{paddingBottom:8}}>

      {/* ── PAGE HEADER ── */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div>
          <div style={{fontFamily:'Orbitron,monospace',fontWeight:900,fontSize:'clamp(18px,5vw,24px)',letterSpacing:1,lineHeight:1.1}}>
            🏦 <span style={{background:'linear-gradient(135deg,#FFD93D,#FF9A3C)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>COMMON FUND</span>
          </div>
          <div style={{fontSize:11,color:'#6a7090',marginTop:4,letterSpacing:.3}}>Shared house treasury · Week overview</div>
        </div>
        {isAdmin && (
          <button onClick={()=>setShowSt(s=>!s)}
            style={{padding:'8px 14px',borderRadius:10,fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:12,
              border:`1px solid ${showSettings?'rgba(255,217,61,.4)':'rgba(255,217,61,.15)'}`,
              background:showSettings?'rgba(255,217,61,.12)':'rgba(255,217,61,.05)',
              color:'#FFD93D',cursor:'pointer',display:'flex',alignItems:'center',gap:6,transition:'all .15s'}}>
            ⚙️ Settings
          </button>
        )}
      </div>

      {/* ── SETTINGS PANEL ── */}
      {showSettings && isAdmin && (
        <div style={{background:'linear-gradient(135deg,rgba(255,217,61,.06),rgba(255,154,60,.04))',
          border:'1px solid rgba(255,217,61,.2)',borderRadius:16,padding:18,marginBottom:18,
          boxShadow:'0 4px 24px rgba(255,217,61,.06)'}}>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:11,fontWeight:700,color:'#FFD93D',
            letterSpacing:2,marginBottom:14,display:'flex',alignItems:'center',gap:8}}>
            ⚙️ FUND SETTINGS
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
            <div>
              <label style={lbl}>Monthly Target (₹)</label>
              <input type="number" value={stForm.monthly_target||''} onChange={e=>setStForm(f=>({...f,monthly_target:e.target.value}))}
                style={{...inp,fontSize:'15px',background:'#0d0e1a'}}/>
            </div>
            <div>
              <label style={lbl}>Low Balance Alert (₹)</label>
              <input type="number" value={stForm.low_balance_alert||''} onChange={e=>setStForm(f=>({...f,low_balance_alert:e.target.value}))}
                style={{...inp,fontSize:'15px',background:'#0d0e1a'}}/>
            </div>
          </div>
          <div style={{fontSize:11,color:'#8890b0',padding:'8px 12px',background:'rgba(255,217,61,.04)',
            borderRadius:8,border:'1px solid rgba(255,217,61,.1)',marginBottom:12}}>
            💡 To assign a Treasurer → <strong style={{color:'#FFD93D'}}>Admin → Members → Assign Roles</strong>
          </div>
          <button onClick={async()=>{
            setStSaving(true)
            try { await updateFundSettings({monthly_target:+stForm.monthly_target,low_balance_alert:+stForm.low_balance_alert}); toast('Settings saved ✅'); load(); setShowSt(false) }
            catch(e) { toast('Failed: '+e.message,'error') }
            finally { setStSaving(false) }
          }} disabled={stSaving} style={{width:'100%',padding:12,borderRadius:10,fontFamily:'Rajdhani,sans-serif',
            fontWeight:800,fontSize:13,cursor:'pointer',border:'none',
            background:'linear-gradient(135deg,#FFD93D,#FF9A3C)',color:'#070810',opacity:stSaving?.6:1}}>
            {stSaving?'Saving...':'💾 Save Settings'}
          </button>
        </div>
      )}

      {/* ── ALERTS ── */}
      {isNeg && (
        <div style={{background:'linear-gradient(135deg,rgba(255,107,107,.12),rgba(255,107,107,.06))',
          border:'1px solid rgba(255,107,107,.35)',borderRadius:14,padding:'14px 16px',marginBottom:14,
          display:'flex',gap:12,alignItems:'center',boxShadow:'0 4px 20px rgba(255,107,107,.1)'}}>
          <div style={{fontSize:30,lineHeight:1}}>🚨</div>
          <div>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:12,fontWeight:700,color:'#FF6B6B',letterSpacing:.5}}>FUND IN DEFICIT</div>
            <div style={{fontSize:12,color:'#FF6B6B',marginTop:3,opacity:.85}}>Overspent by {fmt(Math.abs(data.balance))} — collect funds urgently</div>
          </div>
        </div>
      )}
      {isLow && !isNeg && (
        <div style={{background:'linear-gradient(135deg,rgba(255,217,61,.1),rgba(255,217,61,.04))',
          border:'1px solid rgba(255,217,61,.3)',borderRadius:14,padding:'14px 16px',marginBottom:14,
          display:'flex',gap:12,alignItems:'center',boxShadow:'0 4px 20px rgba(255,217,61,.08)'}}>
          <div style={{fontSize:30,lineHeight:1}}>⚠️</div>
          <div>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:12,fontWeight:700,color:'#FFD93D',letterSpacing:.5}}>LOW BALANCE</div>
            <div style={{fontSize:12,color:'#FFD93D',marginTop:3,opacity:.85}}>Only {fmt(data.balance)} remaining — consider collecting more</div>
          </div>
        </div>
      )}

      {/* ── MAIN BALANCE CARD ── */}
      <div style={{background:'linear-gradient(145deg,#0e1020,#0a0c1a)',
        border:`1px solid ${balColor}44`,borderRadius:20,padding:'24px 20px',marginBottom:14,
        position:'relative',overflow:'hidden',
        boxShadow:`0 8px 40px rgba(0,0,0,.5), 0 0 0 1px ${balColor}22, inset 0 1px 0 rgba(255,255,255,.04)`}}>

        {/* Background glow */}
        <div style={{position:'absolute',top:-40,right:-40,width:160,height:160,borderRadius:'50%',
          background:balColor,opacity:.07,filter:'blur(40px)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:-60,left:-20,width:120,height:120,borderRadius:'50%',
          background:'#4D96FF',opacity:.04,filter:'blur(30px)',pointerEvents:'none'}}/>

        {/* Top shimmer */}
        <div style={{position:'absolute',top:0,left:'10%',right:'10%',height:1,
          background:`linear-gradient(90deg,transparent,${balColor}66,transparent)`}}/>

        <div style={{fontSize:10,fontWeight:700,color:'#6a7090',textTransform:'uppercase',letterSpacing:'.14em',marginBottom:8}}>
          Current Balance
        </div>
        <div style={{fontFamily:'Orbitron,monospace',fontSize:'clamp(34px,10vw,52px)',fontWeight:900,
          color:balColor,lineHeight:1,marginBottom:16,
          textShadow:`0 0 30px ${balColor}44`}}>
          {fmt(data.balance)}
        </div>

        {/* Stats row */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1px 1fr 1px 1fr',gap:0,
          background:'rgba(255,255,255,.03)',borderRadius:12,overflow:'hidden',
          border:'1px solid rgba(255,255,255,.05)'}}>
          {[
            {label:'Total In',    value:'+'+fmt(totalIn),  color:'#7DF9AA'},
            null,
            {label:'Total Out',   value:'-'+fmt(totalOut), color:'#FF6B6B'},
            null,
            {label:'Entries',     value:data.txns.length,  color:'#E8F0FF'},
          ].map((s,i) => s ? (
            <div key={i} style={{padding:'12px 8px',textAlign:'center'}}>
              <div style={{fontSize:9,color:'#4a5070',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:4}}>{s.label}</div>
              <div style={{fontFamily:'Orbitron,monospace',fontSize:13,fontWeight:700,color:s.color}}>{s.value}</div>
            </div>
          ) : (
            <div key={i} style={{background:'rgba(255,255,255,.04)'}}/>
          ))}
        </div>
      </div>

      {/* ── MONTHLY TARGET ── */}
      {data.settings?.monthly_target > 0 && (
        <div style={{background:'#0d0f1e',border:'1px solid rgba(255,255,255,.06)',borderRadius:16,
          padding:'14px 16px',marginBottom:14,position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,left:0,right:0,height:2,borderRadius:99,
            background:`linear-gradient(90deg,transparent,#FFD93D,transparent)`,opacity:.4}}/>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:'#8890b0',textTransform:'uppercase',letterSpacing:'.08em'}}>Monthly Target</div>
              <div style={{fontSize:12,color:'#6a7090',marginTop:2}}>{Math.round(pct)}% collected</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontFamily:'Orbitron,monospace',fontSize:16,fontWeight:700,color:'#FFD93D'}}>
                {fmt(Math.min(totalIn,data.settings.monthly_target))}
              </div>
              <div style={{fontSize:10,color:'#4a5070',marginTop:1}}>of {fmt(data.settings.monthly_target)}</div>
            </div>
          </div>
          <div style={{height:10,background:'rgba(255,255,255,.05)',borderRadius:99,overflow:'hidden',position:'relative'}}>
            <div style={{height:'100%',borderRadius:99,transition:'width .6s cubic-bezier(.4,0,.2,1)',
              width:`${pct}%`,
              background:pct>=100
                ? 'linear-gradient(90deg,#7DF9AA,#00D4AA)'
                : pct>=70
                  ? 'linear-gradient(90deg,#FFD93D,#FF9A3C)'
                  : 'linear-gradient(90deg,#FF6B6B,#FF9A3C)',
              boxShadow:pct>=100?'0 0 10px rgba(125,249,170,.4)':pct>=70?'0 0 10px rgba(255,217,61,.4)':'none'
            }}/>
          </div>
          {pct >= 100 && (
            <div style={{fontSize:11,color:'#7DF9AA',fontWeight:700,marginTop:6,display:'flex',alignItems:'center',gap:5}}>
              🎉 Target reached!
            </div>
          )}
        </div>
      )}

      {/* ── TREASURER BADGE ── */}
      {treasurer && (
        <div style={{background:'rgba(255,217,61,.05)',border:'1px solid rgba(255,217,61,.12)',
          borderRadius:14,padding:'11px 14px',marginBottom:14,
          display:'flex',alignItems:'center',gap:12}}>
          <div style={{position:'relative'}}>
            <Avatar emoji={treasurer.avatar} color={treasurer.color} size={36}/>
            <div style={{position:'absolute',bottom:-2,right:-2,fontSize:12,lineHeight:1}}>👑</div>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:10,color:'#FFD93D',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em'}}>Treasurer</div>
            <div style={{fontSize:13,fontWeight:700,color:'#E8F0FF',marginTop:2}}>{treasurer.name}</div>
          </div>
          <div style={{fontSize:10,color:'#6a7090',textAlign:'right',lineHeight:1.5}}>
            Manages<br/>this fund
          </div>
        </div>
      )}

      {/* ── ACTION BUTTONS ── */}
      {canEdit && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:18}}>
          <button onClick={()=>setSheet('credit')}
            style={{padding:'16px 12px',borderRadius:14,fontFamily:'Rajdhani,sans-serif',fontWeight:800,
              fontSize:14,cursor:'pointer',border:'1px solid rgba(125,249,170,.25)',
              background:'linear-gradient(135deg,rgba(125,249,170,.1),rgba(125,249,170,.04))',
              color:'#7DF9AA',letterSpacing:'.04em',transition:'all .15s',
              boxShadow:'0 4px 16px rgba(125,249,170,.08)',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            <span style={{fontSize:20}}>💰</span>
            <span>Add Money</span>
          </button>
          <button onClick={()=>setSheet('debit')}
            style={{padding:'16px 12px',borderRadius:14,fontFamily:'Rajdhani,sans-serif',fontWeight:800,
              fontSize:14,cursor:'pointer',border:'1px solid rgba(255,107,107,.25)',
              background:'linear-gradient(135deg,rgba(255,107,107,.1),rgba(255,107,107,.04))',
              color:'#FF6B6B',letterSpacing:'.04em',transition:'all .15s',
              boxShadow:'0 4px 16px rgba(255,107,107,.08)',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            <span style={{fontSize:20}}>💸</span>
            <span>Record Spend</span>
          </button>
        </div>
      )}

      {/* ── FILTER TABS ── */}
      <div style={{display:'flex',gap:0,background:'#0d0f1e',border:'1px solid rgba(255,255,255,.06)',
        borderRadius:14,padding:4,marginBottom:16,overflow:'hidden'}}>
        {[
          {id:'all',    label:'All',       count:data.txns.length},
          {id:'credit', label:'💰 In',     count:data.txns.filter(t=>t.type==='credit').length},
          {id:'debit',  label:'💸 Out',    count:data.txns.filter(t=>t.type==='debit').length},
        ].map(f=>(
          <button key={f.id} onClick={()=>setFilter(f.id)}
            style={{flex:1,padding:'9px 6px',borderRadius:10,fontSize:12,fontWeight:700,cursor:'pointer',border:'none',
              fontFamily:'Rajdhani,sans-serif',transition:'all .18s',
              background:filter===f.id?'#FFD93D':'transparent',
              color:filter===f.id?'#070810':'#6a7090',
              boxShadow:filter===f.id?'0 2px 10px rgba(255,217,61,.25)':'none'}}>
            {f.label}
            <span style={{marginLeft:5,fontSize:10,fontWeight:900,
              opacity:filter===f.id?1:.6,
              background:filter===f.id?'rgba(0,0,0,.15)':'rgba(255,255,255,.06)',
              padding:'1px 6px',borderRadius:99}}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── TRANSACTION LIST ── */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
        <div style={{fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.1em'}}>
          Transaction History
        </div>
        <div style={{fontSize:10,color:'#4a5070',fontWeight:600}}>{filtered.length} entries</div>
      </div>

      {filtered.length === 0 ? (
        <div style={{background:'#0d0f1e',border:'1px solid rgba(255,255,255,.05)',borderRadius:16,
          padding:'52px 20px',textAlign:'center'}}>
          <div style={{fontSize:48,marginBottom:12,opacity:.6}}>🏦</div>
          <div style={{color:'#4a5070',fontSize:14,fontWeight:600,marginBottom:6}}>No transactions yet</div>
          {canEdit && <div style={{fontSize:12,color:'#4a5070'}}>Tap <strong style={{color:'#7DF9AA'}}>Add Money</strong> or <strong style={{color:'#FF6B6B'}}>Record Spend</strong> to get started</div>}
        </div>
      ) : filtered.map((t, i) => {
        const isCredit  = t.type === 'credit'
        const ac        = isCredit ? '#7DF9AA' : '#FF6B6B'
        const addedBy   = t.added_by_member
        const editable  = canEditTxn(t.created_at)
        const tLeft     = timeLeft(t.created_at)
        const showEdit  = canEdit && editable        // edit: admin/treasurer + within 2h
        const showDel   = isAdmin                    // delete: admin only, no time limit

        return (
          <div key={t.id} style={{background:'#0d0f1e',
            border:`1px solid ${ac}18`,borderRadius:16,padding:'14px 15px',marginBottom:8,
            position:'relative',overflow:'hidden',transition:'all .15s',
            boxShadow:'0 2px 12px rgba(0,0,0,.2)'}}>

            {/* Left accent bar */}
            <div style={{position:'absolute',left:0,top:'20%',bottom:'20%',width:3,borderRadius:'0 3px 3px 0',
              background:`linear-gradient(180deg,${ac},${ac}44)`}}/>

            <div style={{display:'flex',alignItems:'center',gap:12,paddingLeft:6}}>
              {/* Icon */}
              <div style={{width:44,height:44,borderRadius:13,flexShrink:0,display:'flex',alignItems:'center',
                justifyContent:'center',fontSize:22,
                background:`linear-gradient(135deg,${ac}18,${ac}08)`,
                border:`1px solid ${ac}22`}}>
                {isCredit?'💰':'💸'}
              </div>

              {/* Info */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:14,color:'#E8F0FF',overflow:'hidden',
                  textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:4}}>
                  {t.reason}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                  {addedBy && (
                    <span style={{display:'flex',alignItems:'center',gap:4,
                      background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.06)',
                      borderRadius:99,padding:'2px 8px 2px 4px',fontSize:10,fontWeight:600,color:'#8890b0'}}>
                      <span>{addedBy.avatar}</span>
                      <span>{addedBy.name}</span>
                    </span>
                  )}
                  <span style={{fontSize:10,color:'#4a5070'}}>
                    {new Date(t.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                  </span>
                  <span style={{fontSize:10,color:'#4a5070'}}>
                    {new Date(t.created_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                  </span>
                </div>
                {/* Edit time window indicator */}
                {canEdit && tLeft && (
                  <div style={{marginTop:4,fontSize:9,color:isCredit?'#7DF9AA99':'#FF6B6B99',
                    fontWeight:700,display:'flex',alignItems:'center',gap:3}}>
                    ⏱ Editable for {tLeft}
                  </div>
                )}
              </div>

              {/* Amount */}
              <div style={{textAlign:'right',flexShrink:0,marginRight:showEdit||showDel?8:0}}>
                <div style={{fontFamily:'Orbitron,monospace',fontSize:15,fontWeight:900,color:ac,
                  textShadow:`0 0 16px ${ac}44`}}>
                  {isCredit?'+':'-'}{fmt(t.amount)}
                </div>
                <div style={{fontSize:9,fontWeight:700,color:`${ac}88`,marginTop:2,
                  textTransform:'uppercase',letterSpacing:'.06em'}}>
                  {isCredit?'CREDIT':'DEBIT'}
                </div>
              </div>

              {/* Action buttons */}
              {(showEdit || showDel) && (
                <div style={{display:'flex',flexDirection:'column',gap:5,flexShrink:0}}>
                  {showEdit && (
                    <button onClick={()=>setEditTxn(t)}
                      style={{width:32,height:32,borderRadius:9,border:'1px solid rgba(77,150,255,.2)',
                        background:'rgba(77,150,255,.08)',color:'#4D96FF',cursor:'pointer',fontSize:13,
                        display:'flex',alignItems:'center',justifyContent:'center',transition:'all .12s'}}>
                      ✏️
                    </button>
                  )}
                  {showDel && (
                    <button onClick={async()=>{
                      if(!confirm(`Delete "${t.reason}"?`)) return
                      try { await deleteFundTransaction(t.id); toast('Deleted 🗑️','warn'); load() }
                      catch(e) { toast('Failed: '+e.message,'error') }
                    }} style={{width:32,height:32,borderRadius:9,border:'1px solid rgba(255,107,107,.2)',
                      background:'rgba(255,107,107,.08)',color:'#FF6B6B',cursor:'pointer',fontSize:13,
                      display:'flex',alignItems:'center',justifyContent:'center',transition:'all .12s'}}>
                      🗑️
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {sheet   && <AddSheet  type={sheet}  onClose={()=>setSheet(null)}   onDone={load}/>}
      {editTxn && <EditSheet txn={editTxn} onClose={()=>setEditTxn(null)} onDone={load}/>}
    </div>
  )
}

export default function CommonFund() { return <ToastProvider><CommonFundContent/></ToastProvider> }
