import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { getCookingParties, createCookingParty, updatePartyMembers, addCookingItem, updateCookingItem, deleteCookingItem, deleteCookingParty, getMembers } from '../lib/supabase'
import { Avatar, ToastProvider, useToast, inp } from '../components/UI'

const fmt  = n => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 })
const lbl  = { display:'block', fontSize:10, fontWeight:700, color:'#6a7090', textTransform:'uppercase', letterSpacing:'.09em', marginBottom:6 }
const UNITS = ['kg','g','L','ml','pcs','packet','bunch','dozen']

// ── CREATE PARTY SHEET ────────────────────────────────────
function CreatePartySheet({ members, onClose, onDone }) {
  const toast = useToast()
  const [name,      setName]    = useState('')
  const [date,      setDate]    = useState(new Date().toISOString().split('T')[0])
  const [selected,  setSelected]= useState([])
  const [loading,   setL]       = useState(false)

  const toggle = id => setSelected(s => s.includes(id) ? s.filter(x=>x!==id) : [...s,id])

  const submit = async () => {
    if (!name.trim())        { toast('Enter a party name','warn'); return }
    if (selected.length < 2) { toast('Select at least 2 members','warn'); return }
    setL(true)
    try {
      await createCookingParty(name.trim(), date, selected)
      toast('🎉 Party created!'); onDone(); onClose()
    } catch(e) { toast('Failed: '+e.message,'error') }
    finally { setL(false) }
  }

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{position:'fixed',inset:0,background:'rgba(0,0,0,.88)',zIndex:600,display:'flex',alignItems:'flex-end',justifyContent:'center',backdropFilter:'blur(10px)'}}>
      <div style={{background:'#0b0d1e',borderRadius:'24px 24px 0 0',width:'100%',maxWidth:520,maxHeight:'92dvh',overflowY:'auto',
        border:'1px solid rgba(255,154,60,.2)',animation:'shUp .25s cubic-bezier(.34,1.2,.64,1)',
        boxShadow:'0 -20px 60px rgba(255,154,60,.08)'}}>
        <div style={{position:'sticky',top:0,background:'#0b0d1e',zIndex:1,padding:'12px 20px 14px',borderBottom:'1px solid rgba(255,154,60,.1)'}}>
          <div style={{width:40,height:4,borderRadius:99,background:'rgba(255,255,255,.08)',margin:'0 auto 14px'}}/>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:44,height:44,borderRadius:13,background:'rgba(255,154,60,.1)',border:'1px solid rgba(255,154,60,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>🍳</div>
            <div style={{flex:1}}>
              <div style={{fontFamily:'Orbitron,monospace',fontSize:14,fontWeight:800,color:'#FF9A3C'}}>New Cooking Party</div>
              <div style={{fontSize:11,color:'#6a7090',marginTop:2}}>Set up a new cooking session</div>
            </div>
            <button onClick={onClose} style={{width:32,height:32,borderRadius:10,border:'1px solid rgba(255,255,255,.08)',background:'rgba(255,255,255,.04)',color:'#6a7090',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
          </div>
        </div>
        <div style={{padding:'18px 20px 36px'}}>
          <div style={{marginBottom:12}}>
            <label style={lbl}>Party / Dish Name</label>
            <input value={name} onChange={e=>setName(e.target.value)}
              placeholder="e.g. Sunday Biriyani, Onam Sadya..."
              style={{...inp,fontSize:'16px',background:'#131628',border:'1px solid rgba(255,255,255,.08)'}}/>
          </div>
          <div style={{marginBottom:16}}>
            <label style={lbl}>Date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)}
              style={{...inp,fontSize:'15px',background:'#131628',border:'1px solid rgba(255,255,255,.08)',color:'#E8F0FF',colorScheme:'dark'}}/>
          </div>
          <div style={{marginBottom:18}}>
            <label style={lbl}>Who's in the split? ({selected.length} selected)</label>
            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              {members.map(m=>{
                const sel = selected.includes(m.id)
                return (
                  <div key={m.id} onClick={()=>toggle(m.id)}
                    style={{display:'flex',alignItems:'center',gap:11,padding:'10px 13px',borderRadius:12,cursor:'pointer',transition:'all .12s',
                      border:`1px solid ${sel?'rgba(255,154,60,.35)':'rgba(255,255,255,.06)'}`,
                      background:sel?'rgba(255,154,60,.08)':'rgba(255,255,255,.02)'}}>
                    <Avatar emoji={m.avatar} color={m.color} size={34}/>
                    <div style={{flex:1,fontSize:13,fontWeight:700,color:'#E8F0FF'}}>{m.name}</div>
                    <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${sel?'#FF9A3C':'rgba(255,255,255,.15)'}`,
                      background:sel?'#FF9A3C':'transparent',display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:11,color:'#070810',fontWeight:900,flexShrink:0}}>
                      {sel?'✓':''}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <button onClick={submit} disabled={loading}
            style={{width:'100%',padding:16,borderRadius:14,fontSize:15,fontWeight:800,cursor:'pointer',border:'none',
              fontFamily:'Rajdhani,sans-serif',letterSpacing:'.08em',
              background:'linear-gradient(135deg,#FF9A3C,#FFD93D)',
              color:'#070810',opacity:loading?.6:1,boxShadow:'0 8px 24px rgba(255,154,60,.25)'}}>
            {loading?'Creating...':'🍳 Create Party'}
          </button>
        </div>
      </div>
      <style>{`@keyframes shUp{from{transform:translateY(100%)}to{transform:none}}`}</style>
    </div>
  )
}

// ── ADD ITEM SHEET ────────────────────────────────────────
function AddItemSheet({ partyId, onClose, onDone }) {
  const toast = useToast()
  const [name,     setName]    = useState('')
  const [rate,     setRate]    = useState('')
  const [qty,      setQty]     = useState('1')
  const [unit,     setUnit]    = useState('pcs')
  const [loading,  setL]       = useState(false)

  const submit = async () => {
    if (!name.trim())         { toast('Enter item name','warn'); return }
    if (!rate || +rate <= 0)  { toast('Enter rate','warn'); return }
    if (!qty  || +qty  <= 0)  { toast('Enter quantity','warn'); return }
    setL(true)
    try {
      await addCookingItem(partyId, name.trim(), +rate, +qty, unit)
      toast('✅ Item added!'); onDone(); onClose()
    } catch(e) { toast('Failed: '+e.message,'error') }
    finally { setL(false) }
  }

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{position:'fixed',inset:0,background:'rgba(0,0,0,.88)',zIndex:700,display:'flex',alignItems:'flex-end',justifyContent:'center',backdropFilter:'blur(10px)'}}>
      <div style={{background:'#0b0d1e',borderRadius:'24px 24px 0 0',width:'100%',maxWidth:520,maxHeight:'80dvh',overflowY:'auto',
        border:'1px solid rgba(125,249,170,.2)',animation:'shUp .22s cubic-bezier(.34,1.2,.64,1)'}}>
        <div style={{padding:'12px 20px 14px',borderBottom:'1px solid rgba(125,249,170,.1)'}}>
          <div style={{width:40,height:4,borderRadius:99,background:'rgba(255,255,255,.08)',margin:'0 auto 14px'}}/>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:14,fontWeight:800,color:'#7DF9AA'}}>➕ Add Item</div>
          <div style={{fontSize:11,color:'#6a7090',marginTop:2}}>Add a purchased item to the list</div>
        </div>
        <div style={{padding:'16px 20px 32px'}}>
          <div style={{marginBottom:12}}>
            <label style={lbl}>Item Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} autoFocus
              placeholder="e.g. Chicken, Rice, Masala..."
              style={{...inp,fontSize:'16px',background:'#131628',border:'1px solid rgba(255,255,255,.08)'}}/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
            <div>
              <label style={lbl}>Rate (₹)</label>
              <input type="number" inputMode="decimal" value={rate} onChange={e=>setRate(e.target.value)}
                placeholder="0.00"
                style={{...inp,fontSize:'18px',fontFamily:'Orbitron,monospace',fontWeight:700,color:'#7DF9AA',background:'#131628',border:'1px solid rgba(125,249,170,.15)'}}/>
            </div>
            <div>
              <label style={lbl}>Qty</label>
              <input type="number" inputMode="decimal" value={qty} onChange={e=>setQty(e.target.value)}
                placeholder="1"
                style={{...inp,fontSize:'18px',background:'#131628',border:'1px solid rgba(255,255,255,.08)'}}/>
            </div>
          </div>
          <div style={{marginBottom:18}}>
            <label style={lbl}>Unit</label>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {UNITS.map(u=>(
                <button key={u} onClick={()=>setUnit(u)}
                  style={{padding:'6px 13px',borderRadius:99,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'Rajdhani,sans-serif',
                    border:`1px solid ${unit===u?'rgba(125,249,170,.4)':'rgba(255,255,255,.07)'}`,
                    background:unit===u?'rgba(125,249,170,.1)':'rgba(255,255,255,.03)',
                    color:unit===u?'#7DF9AA':'#6a7090',transition:'all .12s'}}>
                  {u}
                </button>
              ))}
            </div>
          </div>
          {rate && qty && +rate>0 && +qty>0 && (
            <div style={{background:'rgba(125,249,170,.06)',border:'1px solid rgba(125,249,170,.15)',borderRadius:10,padding:'10px 14px',marginBottom:14,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:11,color:'#6a7090',fontWeight:700}}>Total for this item</span>
              <span style={{fontFamily:'Orbitron,monospace',fontSize:16,fontWeight:900,color:'#7DF9AA'}}>{fmt(+rate * +qty)}</span>
            </div>
          )}
          <button onClick={submit} disabled={loading}
            style={{width:'100%',padding:15,borderRadius:13,fontSize:15,fontWeight:800,cursor:'pointer',border:'none',
              fontFamily:'Rajdhani,sans-serif',background:'linear-gradient(135deg,#7DF9AA,#00D4AA)',color:'#070810',opacity:loading?.6:1}}>
            {loading?'Adding...':'✅ Add Item'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PARTY DETAIL VIEW ─────────────────────────────────────
function PartyDetail({ party, allMembers, isAdmin, onBack, onRefresh }) {
  const toast   = useToast()
  const { user } = useAuth()
  const [addSheet,    setAddSheet]    = useState(false)
  const [editMembers, setEditMembers] = useState(false)
  const [selMembers,  setSelMembers]  = useState(party.cooking_party_members?.map(x=>x.member_id)||[])
  const [savingMem,   setSavingMem]   = useState(false)

  const items      = party.cooking_items || []
  const partyMems  = party.cooking_party_members?.map(x=>x.members).filter(Boolean) || []
  const totalCost  = items.reduce((s,i)=>s+Number(i.rate)*Number(i.quantity),0)
  const splitAmt   = partyMems.length > 0 ? totalCost / partyMems.length : 0
  const boughtCost = items.filter(i=>i.bought).reduce((s,i)=>s+Number(i.rate)*Number(i.quantity),0)
  const pendingCount = items.filter(i=>!i.bought).length

  const saveMemberChanges = async () => {
    if (selMembers.length < 2) { toast('Select at least 2 members','warn'); return }
    setSavingMem(true)
    try {
      await updatePartyMembers(party.id, selMembers)
      toast('Members updated ✅'); onRefresh(); setEditMembers(false)
    } catch(e) { toast('Failed','error') }
    finally { setSavingMem(false) }
  }

  return (
    <div>
      {/* Back button */}
      <button onClick={onBack}
        style={{display:'flex',alignItems:'center',gap:7,marginBottom:18,background:'none',border:'none',color:'#6a7090',cursor:'pointer',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,padding:0}}>
        ← Back to all parties
      </button>

      {/* Party header */}
      <div style={{background:'linear-gradient(145deg,#0e1220,#0a0c1a)',border:'1px solid rgba(255,154,60,.18)',borderRadius:20,padding:'18px 20px',marginBottom:14,position:'relative',overflow:'hidden',boxShadow:'0 8px 32px rgba(0,0,0,.4)'}}>
        <div style={{position:'absolute',top:-30,right:-20,width:120,height:120,borderRadius:'50%',background:'#FF9A3C',opacity:.06,filter:'blur(30px)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',top:0,left:'10%',right:'10%',height:1,background:'linear-gradient(90deg,transparent,rgba(255,154,60,.4),transparent)'}}/>
        <div style={{fontSize:11,color:'#6a7090',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:6}}>
          {new Date(party.date).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
        </div>
        <div style={{fontFamily:'Orbitron,monospace',fontSize:20,fontWeight:900,color:'#E8F0FF',marginBottom:14}}>{party.name}</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1px 1fr 1px 1fr',background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.05)',borderRadius:12,overflow:'hidden'}}>
          {[
            {label:'Total Cost',  value:fmt(totalCost),    color:'#FF9A3C'},
            null,
            {label:'Per Person',  value:fmt(splitAmt),     color:'#7DF9AA'},
            null,
            {label:'Members',     value:partyMems.length,  color:'#4D96FF'},
          ].map((s,i)=> s ? (
            <div key={i} style={{padding:'11px 8px',textAlign:'center'}}>
              <div style={{fontFamily:'Orbitron,monospace',fontSize:14,fontWeight:900,color:s.color}}>{s.value}</div>
              <div style={{fontSize:8,color:'#4a5070',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',marginTop:3}}>{s.label}</div>
            </div>
          ) : <div key={i} style={{background:'rgba(255,255,255,.04)'}}/>)}
        </div>
      </div>

      {/* Members in split */}
      <div style={{background:'#0c0e1c',border:'1px solid rgba(255,255,255,.06)',borderRadius:14,padding:'13px 15px',marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <div style={{fontSize:10,fontWeight:700,color:'#6a7090',textTransform:'uppercase',letterSpacing:'.1em'}}>Split Among</div>
          {isAdmin && (
            <button onClick={()=>setEditMembers(s=>!s)}
              style={{fontSize:10,fontWeight:700,color:'#FF9A3C',background:'rgba(255,154,60,.08)',border:'1px solid rgba(255,154,60,.2)',borderRadius:99,padding:'3px 10px',cursor:'pointer',fontFamily:'inherit'}}>
              {editMembers ? 'Cancel' : '✏️ Edit'}
            </button>
          )}
        </div>
        {editMembers ? (
          <div>
            <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:12}}>
              {allMembers.map(m=>{
                const sel = selMembers.includes(m.id)
                return (
                  <div key={m.id} onClick={()=>setSelMembers(s=>s.includes(m.id)?s.filter(x=>x!==m.id):[...s,m.id])}
                    style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:10,cursor:'pointer',
                      border:`1px solid ${sel?'rgba(255,154,60,.3)':'rgba(255,255,255,.05)'}`,
                      background:sel?'rgba(255,154,60,.07)':'transparent',transition:'all .12s'}}>
                    <Avatar emoji={m.avatar} color={m.color} size={30}/>
                    <div style={{flex:1,fontSize:13,fontWeight:700,color:'#E8F0FF'}}>{m.name}</div>
                    <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${sel?'#FF9A3C':'rgba(255,255,255,.15)'}`,background:sel?'#FF9A3C':'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#070810',fontWeight:900}}>{sel?'✓':''}</div>
                  </div>
                )
              })}
            </div>
            <button onClick={saveMemberChanges} disabled={savingMem}
              style={{width:'100%',padding:11,borderRadius:10,border:'none',fontFamily:'Rajdhani,sans-serif',fontWeight:800,fontSize:13,cursor:'pointer',background:'linear-gradient(135deg,#FF9A3C,#FFD93D)',color:'#070810',opacity:savingMem?.6:1}}>
              {savingMem?'Saving...':'💾 Save Members'}
            </button>
          </div>
        ) : (
          <div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}>
              {partyMems.map(m=>(
                <div key={m.id} style={{display:'flex',alignItems:'center',gap:6,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:99,padding:'4px 10px 4px 5px'}}>
                  <Avatar emoji={m.avatar} color={m.color} size={22}/>
                  <span style={{fontSize:11,fontWeight:700,color:'#E8F0FF'}}>{m.name}</span>
                </div>
              ))}
            </div>
            {splitAmt > 0 && (
              <div style={{background:'rgba(125,249,170,.06)',border:'1px solid rgba(125,249,170,.15)',borderRadius:10,padding:'9px 13px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:11,color:'#6a7090',fontWeight:700}}>Each person pays</span>
                <span style={{fontFamily:'Orbitron,monospace',fontSize:18,fontWeight:900,color:'#7DF9AA'}}>{fmt(splitAmt)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Items list header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:'#6a7090',textTransform:'uppercase',letterSpacing:'.1em'}}>Items List</div>
          <div style={{fontSize:11,color:'#4a5070',marginTop:2}}>{items.length} items · {pendingCount} pending</div>
        </div>
        <button onClick={()=>setAddSheet(true)}
          style={{padding:'8px 14px',borderRadius:10,border:'1px solid rgba(125,249,170,.25)',background:'rgba(125,249,170,.08)',color:'#7DF9AA',fontFamily:'Rajdhani,sans-serif',fontWeight:800,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}>
          ➕ Add Item
        </button>
      </div>

      {/* Progress bar */}
      {items.length > 0 && (
        <div style={{background:'#0c0e1c',border:'1px solid rgba(255,255,255,.05)',borderRadius:12,padding:'10px 14px',marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
            <span style={{fontSize:10,color:'#6a7090',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em'}}>Bought</span>
            <span style={{fontSize:11,color:'#E8F0FF',fontWeight:700}}>{items.filter(i=>i.bought).length}/{items.length}</span>
          </div>
          <div style={{height:7,background:'rgba(255,255,255,.05)',borderRadius:99,overflow:'hidden'}}>
            <div style={{height:'100%',borderRadius:99,background:'linear-gradient(90deg,#7DF9AA,#00D4AA)',transition:'width .5s',width:`${items.length>0?(items.filter(i=>i.bought).length/items.length)*100:0}%`}}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:5}}>
            <span style={{fontSize:10,color:'#4a5070'}}>Spent: {fmt(boughtCost)}</span>
            <span style={{fontSize:10,color:'#4a5070'}}>Remaining: {fmt(totalCost-boughtCost)}</span>
          </div>
        </div>
      )}

      {/* Items */}
      {items.length === 0 ? (
        <div style={{background:'#0c0e1c',border:'1px solid rgba(255,255,255,.05)',borderRadius:14,padding:'40px 20px',textAlign:'center'}}>
          <div style={{fontSize:40,marginBottom:10}}>🛒</div>
          <div style={{fontSize:13,color:'#4a5070',fontWeight:600}}>No items yet</div>
          <div style={{fontSize:11,color:'#3a4060',marginTop:4}}>Tap Add Item to start the shopping list</div>
        </div>
      ) : items.map(item => {
        const total = Number(item.rate) * Number(item.quantity)
        return (
          <div key={item.id} style={{background:'#0c0e1c',border:`1px solid ${item.bought?'rgba(125,249,170,.15)':'rgba(255,255,255,.06)'}`,borderRadius:14,padding:'12px 14px',marginBottom:8,position:'relative',overflow:'hidden',transition:'all .15s'}}>
            <div style={{position:'absolute',left:0,top:'18%',bottom:'18%',width:3,borderRadius:'0 3px 3px 0',background:item.bought?'linear-gradient(180deg,#7DF9AA,rgba(125,249,170,.2))':'linear-gradient(180deg,rgba(255,255,255,.15),rgba(255,255,255,.04))'}}/>
            <div style={{display:'flex',alignItems:'center',gap:10,paddingLeft:7}}>

              {/* Bought checkbox */}
              <button onClick={async()=>{
                try { await updateCookingItem(item.id,{bought:!item.bought}); onRefresh() }
                catch(e){ toast('Failed','error') }
              }} style={{width:26,height:26,borderRadius:8,flexShrink:0,cursor:'pointer',border:`2px solid ${item.bought?'#7DF9AA':'rgba(255,255,255,.15)'}`,background:item.bought?'#7DF9AA':'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#070810',fontWeight:900,transition:'all .15s'}}>
                {item.bought?'✓':''}
              </button>

              {/* Name + meta */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:700,color:item.bought?'#6a7090':'#E8F0FF',textDecoration:item.bought?'line-through':'none',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.name}</div>
                <div style={{fontSize:11,color:'#4a5070',marginTop:2}}>{item.quantity} {item.unit} × {fmt(item.rate)}</div>
              </div>

              {/* Total */}
              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={{fontFamily:'Orbitron,monospace',fontSize:14,fontWeight:900,color:item.bought?'#7DF9AA':'#E8F0FF'}}>{fmt(total)}</div>
              </div>

              {/* Delete */}
              <button onClick={async()=>{
                if(!confirm(`Remove "${item.name}"?`)) return
                try { await deleteCookingItem(item.id); toast('Removed','warn'); onRefresh() }
                catch(e){ toast('Failed','error') }
              }} style={{width:28,height:28,borderRadius:8,border:'1px solid rgba(255,107,107,.2)',background:'rgba(255,107,107,.07)',color:'#FF6B6B',cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>🗑️</button>
            </div>
          </div>
        )
      })}

      {addSheet && <AddItemSheet partyId={party.id} onClose={()=>setAddSheet(false)} onDone={onRefresh}/>}
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────
function CookingPartyContent() {
  const { profile } = useAuth()
  const toast = useToast()
  const [parties,    setParties]   = useState([])
  const [members,    setMembers]   = useState([])
  const [loading,    setL]         = useState(true)
  const [createSheet,setCreate]    = useState(false)
  const [selected,   setSelected]  = useState(null) // party id

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [p, m] = await Promise.all([getCookingParties(), getMembers()])
      setParties(p)
      setMembers(m.filter(m=>m.status==='approved'))
      // refresh selected party data too
      if (selected) {
        const fresh = p.find(x=>x.id===selected.id)
        if (fresh) setSelected(fresh)
      }
    } catch(e) { toast('Failed to load','error') }
    finally { setL(false) }
  }

  const isAdmin = profile?.is_admin

  if (loading) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:80,gap:14}}>
      <div style={{width:44,height:44,borderRadius:'50%',border:'3px solid rgba(255,154,60,.15)',borderTopColor:'#FF9A3C',animation:'spin 1s linear infinite'}}/>
      <div style={{fontSize:11,color:'#4a5070',fontWeight:700,letterSpacing:'.12em'}}>LOADING...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // Show detail view
  if (selected) {
    return (
      <div className="page-anim">
        <PartyDetail
          party={selected}
          allMembers={members}
          isAdmin={isAdmin}
          onBack={()=>setSelected(null)}
          onRefresh={async()=>{
            const p = await getCookingParties()
            setParties(p)
            const fresh = p.find(x=>x.id===selected.id)
            if (fresh) setSelected(fresh)
          }}
        />
      </div>
    )
  }

  return (
    <div className="page-anim" style={{paddingBottom:8}}>

      {/* HEADER */}
      <div style={{marginBottom:20}}>
        <div style={{fontSize:11,color:'#6a7090',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',marginBottom:4}}>House Kitchen 🍳</div>
        <div style={{fontFamily:'Orbitron,monospace',fontWeight:900,fontSize:'clamp(20px,5.5vw,26px)',letterSpacing:1,lineHeight:1.1}}>
          COOKING{' '}
          <span style={{background:'linear-gradient(135deg,#FF9A3C,#FFD93D)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',filter:'drop-shadow(0 0 14px rgba(255,154,60,.4))'}}>
            PARTIES
          </span>
        </div>
        <div style={{fontSize:11,color:'#6a7090',marginTop:4}}>Track items, rates and splits for each cooking session</div>
      </div>

      {/* STATS */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
        <div style={{background:'linear-gradient(135deg,rgba(255,154,60,.08),rgba(255,154,60,.03))',border:'1px solid rgba(255,154,60,.15)',borderRadius:14,padding:'14px 16px',display:'flex',alignItems:'center',gap:12}}>
          <div style={{fontSize:24}}>🍳</div>
          <div>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:22,fontWeight:900,color:'#FF9A3C',lineHeight:1}}>{parties.length}</div>
            <div style={{fontSize:9,color:'#FF9A3C',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',marginTop:3,opacity:.8}}>Total Parties</div>
          </div>
        </div>
        <div style={{background:'linear-gradient(135deg,rgba(125,249,170,.07),rgba(125,249,170,.02))',border:'1px solid rgba(125,249,170,.15)',borderRadius:14,padding:'14px 16px',display:'flex',alignItems:'center',gap:12}}>
          <div style={{fontSize:24}}>🛒</div>
          <div>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:22,fontWeight:900,color:'#7DF9AA',lineHeight:1}}>
              {parties.reduce((s,p)=>s+(p.cooking_items?.length||0),0)}
            </div>
            <div style={{fontSize:9,color:'#7DF9AA',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',marginTop:3,opacity:.8}}>Total Items</div>
          </div>
        </div>
      </div>

      {/* CREATE BUTTON — admin only */}
      {isAdmin && (
        <button onClick={()=>setCreate(true)}
          style={{width:'100%',padding:'15px',borderRadius:14,marginBottom:16,fontFamily:'Rajdhani,sans-serif',fontWeight:800,fontSize:15,cursor:'pointer',
            border:'1px solid rgba(255,154,60,.3)',background:'linear-gradient(135deg,rgba(255,154,60,.1),rgba(255,154,60,.04))',
            color:'#FF9A3C',letterSpacing:'.05em',display:'flex',alignItems:'center',justifyContent:'center',gap:10,
            boxShadow:'0 4px 16px rgba(255,154,60,.08)'}}>
          <span style={{fontSize:20}}>🍳</span> New Cooking Party
        </button>
      )}

      {/* PARTY LIST */}
      <div style={{fontSize:10,fontWeight:700,color:'#4a5070',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:10}}>
        All Parties
      </div>

      {parties.length === 0 ? (
        <div style={{background:'#0c0e1c',border:'1px solid rgba(255,255,255,.05)',borderRadius:18,padding:'56px 20px',textAlign:'center'}}>
          <div style={{fontSize:52,marginBottom:14}}>🍳</div>
          <div style={{fontWeight:800,fontSize:15,color:'#E8F0FF',marginBottom:6}}>No parties yet</div>
          <div style={{fontSize:12,color:'#4a5070'}}>{isAdmin?'Tap "New Cooking Party" to get started':'Admin will create the first party'}</div>
        </div>
      ) : parties.map(party => {
        const totalCost   = party.cooking_items?.reduce((s,i)=>s+Number(i.rate)*Number(i.quantity),0)||0
        const partyMems   = party.cooking_party_members?.length||0
        const splitAmt    = partyMems > 0 ? totalCost/partyMems : 0
        const boughtCount = party.cooking_items?.filter(i=>i.bought).length||0
        const itemCount   = party.cooking_items?.length||0
        const pct         = itemCount>0 ? Math.round((boughtCount/itemCount)*100) : 0

        return (
          <div key={party.id} onClick={()=>setSelected(party)}
            style={{background:'#0c0e1c',border:'1px solid rgba(255,154,60,.12)',borderRadius:17,padding:'15px 16px',marginBottom:9,cursor:'pointer',position:'relative',overflow:'hidden',boxShadow:'0 4px 20px rgba(0,0,0,.25)',transition:'all .15s'}}>
            <div style={{position:'absolute',top:0,left:'8%',right:'8%',height:1.5,borderRadius:99,background:'linear-gradient(90deg,transparent,rgba(255,154,60,.5),transparent)'}}/>
            <div style={{position:'absolute',left:0,top:'15%',bottom:'15%',width:3,borderRadius:'0 3px 3px 0',background:'linear-gradient(180deg,#FF9A3C,rgba(255,154,60,.2))'}}/>

            <div style={{paddingLeft:7}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:15,fontWeight:800,color:'#E8F0FF',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:3}}>{party.name}</div>
                  <div style={{fontSize:11,color:'#6a7090'}}>{new Date(party.date).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0,marginLeft:10}}>
                  <div style={{fontFamily:'Orbitron,monospace',fontSize:16,fontWeight:900,color:'#FF9A3C'}}>{fmt(totalCost)}</div>
                  <div style={{fontSize:10,color:'#6a7090',marginTop:2}}>{partyMems} members · {fmt(splitAmt)} each</div>
                </div>
              </div>

              {/* Member avatars */}
              <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:8}}>
                {party.cooking_party_members?.slice(0,6).map(x=>x.members).filter(Boolean).map(m=>(
                  <div key={m.id} style={{width:26,height:26,borderRadius:8,background:m.color||'#333',border:'1px solid rgba(255,255,255,.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>{m.avatar}</div>
                ))}
                {(party.cooking_party_members?.length||0)>6 && (
                  <div style={{width:26,height:26,borderRadius:8,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'#6a7090',fontWeight:700}}>+{(party.cooking_party_members?.length||0)-6}</div>
                )}
              </div>

              {/* Progress */}
              {itemCount > 0 && (
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{fontSize:9,color:'#4a5070',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em'}}>Items bought</span>
                    <span style={{fontSize:9,color:'#4a5070',fontWeight:700}}>{boughtCount}/{itemCount}</span>
                  </div>
                  <div style={{height:5,background:'rgba(255,255,255,.05)',borderRadius:99,overflow:'hidden'}}>
                    <div style={{height:'100%',borderRadius:99,background:pct===100?'linear-gradient(90deg,#7DF9AA,#00D4AA)':'linear-gradient(90deg,#FF9A3C,#FFD93D)',width:`${pct}%`,transition:'width .4s'}}/>
                  </div>
                </div>
              )}
            </div>

            {/* Delete — admin only */}
            {isAdmin && (
              <button onClick={async(e)=>{
                e.stopPropagation()
                if(!confirm(`Delete "${party.name}" and all its items?`)) return
                try { await deleteCookingParty(party.id); toast('Deleted','warn'); load() }
                catch(e){ toast('Failed','error') }
              }} style={{position:'absolute',top:12,right:12,width:28,height:28,borderRadius:8,border:'1px solid rgba(255,107,107,.2)',background:'rgba(255,107,107,.07)',color:'#FF6B6B',cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center'}}>🗑️</button>
            )}
          </div>
        )
      })}

      {createSheet && <CreatePartySheet members={members} onClose={()=>setCreate(false)} onDone={load}/>}
    </div>
  )
}

export default function CookingParty() { return <ToastProvider><CookingPartyContent/></ToastProvider> }
