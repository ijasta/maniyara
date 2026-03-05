import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { getCookingParties, createCookingParty, updatePartyMembers, addCookingItem, updateCookingItem, deleteCookingItem, deleteCookingParty, getMembers, getSettings } from '../lib/supabase'
import { Avatar, ToastProvider, useToast, inp } from '../components/UI'

const fmt  = n => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits:2, maximumFractionDigits:2 })
const lbl  = { display:'block', fontSize:10, fontWeight:700, color:'#8892b0', textTransform:'uppercase', letterSpacing:'.09em', marginBottom:6 }
const UNITS = ['kg','g','L','ml','pcs','packet','bunch','dozen']

const glassCard = {
  background:'linear-gradient(145deg,rgba(255,255,255,.04),rgba(255,255,255,.01))',
  backdropFilter:'blur(12px)',
  border:'1px solid rgba(255,255,255,.08)',
  borderRadius:18,
}

const sheetWrap = {
  position:'fixed',inset:0,zIndex:700,display:'flex',alignItems:'flex-end',justifyContent:'center',
  backdropFilter:'blur(16px)',background:'rgba(4,6,20,.85)'
}
const sheetInner = {
  background:'linear-gradient(180deg,#0d1025 0%,#080a18 100%)',
  borderRadius:'26px 26px 0 0',width:'100%',maxWidth:520,maxHeight:'92dvh',overflowY:'auto',
  border:'1px solid rgba(255,255,255,.07)',borderBottom:'none',
  boxShadow:'0 -32px 80px rgba(0,0,0,.6)',
  animation:'shUp .28s cubic-bezier(.34,1.15,.64,1)'
}

// ── Pill tag ──────────────────────────────────────────────
const Pill = ({children, color='#FF9A3C'}) => (
  <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 10px',borderRadius:99,fontSize:9,fontWeight:800,textTransform:'uppercase',letterSpacing:'.1em',
    background:`${color}18`,border:`1px solid ${color}35`,color}}>{children}</span>
)

// ── Sheet Handle ──────────────────────────────────────────
const Handle = () => (
  <div style={{width:38,height:4,borderRadius:99,background:'rgba(255,255,255,.1)',margin:'10px auto 16px'}}/>
)

// ── Sheet Header ──────────────────────────────────────────
function SheetHeader({ emoji, title, subtitle, accent='#FF9A3C', onClose }) {
  return (
    <div style={{position:'sticky',top:0,background:'linear-gradient(180deg,#0d1025,#0d1025)',zIndex:1,
      padding:'0 20px 14px',borderBottom:`1px solid ${accent}18`}}>
      <Handle/>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <div style={{width:46,height:46,borderRadius:14,background:`${accent}15`,border:`1px solid ${accent}25`,
          display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>{emoji}</div>
        <div style={{flex:1}}>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:14,fontWeight:800,color:accent}}>{title}</div>
          <div style={{fontSize:11,color:'#556080',marginTop:2}}>{subtitle}</div>
        </div>
        <button onClick={onClose} style={{width:32,height:32,borderRadius:10,border:'1px solid rgba(255,255,255,.07)',
          background:'rgba(255,255,255,.03)',color:'#556080',fontSize:15,cursor:'pointer',
          display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s',flexShrink:0}}>✕</button>
      </div>
    </div>
  )
}

// ── Input field ───────────────────────────────────────────
const Field = ({label, children}) => (
  <div style={{marginBottom:14}}>
    <label style={lbl}>{label}</label>
    {children}
  </div>
)

const styledInp = {
  ...inp, fontSize:15, background:'rgba(255,255,255,.03)',
  border:'1px solid rgba(255,255,255,.08)', borderRadius:12,
  color:'#E8F0FF', transition:'border-color .15s',
  outline:'none', padding:'12px 14px'
}

// ── Primary CTA Button ────────────────────────────────────
const PrimaryBtn = ({onClick, disabled, gradient, children}) => (
  <button onClick={onClick} disabled={disabled}
    style={{width:'100%',padding:15,borderRadius:14,fontSize:14,fontWeight:800,cursor:'pointer',border:'none',
      fontFamily:'Rajdhani,sans-serif',letterSpacing:'.08em',
      background: gradient || 'linear-gradient(135deg,#FF9A3C,#FFD93D)',
      color:'#070810',opacity:disabled?.55:1,
      boxShadow:`0 8px 28px ${(gradient||'#FF9A3C').includes('7DF9')? 'rgba(125,249,170,.2)':'rgba(255,154,60,.2)'}`,
      transition:'opacity .15s,transform .1s',transform:disabled?'none':'translateY(0)'}}>
    {children}
  </button>
)

// ── CREATE / EDIT PARTY SHEET ─────────────────────────────
function PartyFormSheet({ members, editParty, onClose, onDone }) {
  const toast = useToast()
  const isEdit = !!editParty
  const [name,     setName]    = useState(editParty?.name || '')
  const [date,     setDate]    = useState(editParty?.date || new Date().toISOString().split('T')[0])
  const [selected, setSelected]= useState(editParty?.cooking_party_members?.map(x=>x.member_id) || [])
  const [loading,  setL]       = useState(false)

  const toggle = id => setSelected(s => s.includes(id) ? s.filter(x=>x!==id) : [...s,id])

  const submit = async () => {
    if (!name.trim())        { toast('Enter a party name','warn'); return }
    if (selected.length < 2) { toast('Select at least 2 members','warn'); return }
    setL(true)
    try {
      if (isEdit) {
        // update name/date via updatePartyMembers equivalent — update members + you may need a separate supabase call for name/date
        await updatePartyMembers(editParty.id, selected, { name: name.trim(), date })
        toast('✅ Party updated!')
      } else {
        await createCookingParty(name.trim(), date, selected)
        toast('🎉 Party created!')
      }
      onDone(); onClose()
    } catch(e) { toast('Failed: '+e.message,'error') }
    finally { setL(false) }
  }

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={sheetWrap}>
      <div style={sheetInner}>
        <SheetHeader
          emoji={isEdit ? '✏️' : '🍳'}
          title={isEdit ? 'Edit Party' : 'New Cooking Party'}
          subtitle={isEdit ? 'Update name, date or members' : 'Set up a new cooking session'}
          accent='#FF9A3C'
          onClose={onClose}
        />
        <div style={{padding:'18px 20px 40px'}}>
          <Field label="Party / Dish Name">
            <input value={name} onChange={e=>setName(e.target.value)}
              placeholder="e.g. Sunday Biriyani, Onam Sadya..."
              style={{...styledInp, width:'100%', boxSizing:'border-box'}}/>
          </Field>
          <Field label="Date">
            <input type="date" value={date} onChange={e=>setDate(e.target.value)}
              style={{...styledInp, width:'100%', boxSizing:'border-box', colorScheme:'dark'}}/>
          </Field>
          <Field label={`Who's in the split? (${selected.length} selected)`}>
            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              {members.map(m=>{
                const sel = selected.includes(m.id)
                return (
                  <div key={m.id} onClick={()=>toggle(m.id)}
                    style={{display:'flex',alignItems:'center',gap:11,padding:'10px 13px',borderRadius:13,cursor:'pointer',
                      transition:'all .12s',
                      border:`1px solid ${sel?'rgba(255,154,60,.4)':'rgba(255,255,255,.06)'}`,
                      background:sel?'rgba(255,154,60,.07)':'rgba(255,255,255,.02)'}}>
                    <Avatar emoji={m.avatar} color={m.color} size={34}/>
                    <div style={{flex:1,fontSize:13,fontWeight:700,color:'#E8F0FF'}}>{m.name}</div>
                    <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${sel?'#FF9A3C':'rgba(255,255,255,.14)'}`,
                      background:sel?'#FF9A3C':'transparent',display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:11,color:'#070810',fontWeight:900,flexShrink:0,transition:'all .12s'}}>
                      {sel?'✓':''}
                    </div>
                  </div>
                )
              })}
            </div>
          </Field>
          <PrimaryBtn onClick={submit} disabled={loading}>
            {loading ? (isEdit?'Saving...':'Creating...') : (isEdit?'💾 Save Changes':'🍳 Create Party')}
          </PrimaryBtn>
        </div>
      </div>
      <style>{`@keyframes shUp{from{transform:translateY(100%)}to{transform:none}}`}</style>
    </div>
  )
}

// ── ADD / EDIT ITEM SHEET ─────────────────────────────────
function ItemFormSheet({ partyId, editItem, onClose, onDone }) {
  const toast = useToast()
  const isEdit = !!editItem
  const [name,    setName]  = useState(editItem?.name || '')
  const [rate,    setRate]  = useState(editItem?.rate != null ? String(editItem.rate) : '')
  const [qty,     setQty]   = useState(editItem?.quantity != null ? String(editItem.quantity) : '1')
  const [unit,    setUnit]  = useState(editItem?.unit || 'pcs')
  const [loading, setL]     = useState(false)

  const submit = async () => {
    if (!name.trim())        { toast('Enter item name','warn'); return }
    if (!qty || +qty <= 0)   { toast('Enter quantity','warn'); return }
    setL(true)
    try {
      if (isEdit) {
        await updateCookingItem(editItem.id, { name: name.trim(), rate: rate ? +rate : 0, quantity: +qty, unit })
        toast('✅ Item updated!')
      } else {
        await addCookingItem(partyId, name.trim(), rate ? +rate : 0, +qty, unit)
        toast('✅ Item added!')
      }
      onDone(); onClose()
    } catch(e) { toast('Failed: '+e.message,'error') }
    finally { setL(false) }
  }

  const total = rate && qty && +rate > 0 && +qty > 0 ? +rate * +qty : 0

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={sheetWrap}>
      <div style={{...sheetInner, border:'1px solid rgba(125,249,170,.1)', borderBottom:'none'}}>
        <SheetHeader
          emoji={isEdit ? '✏️' : '➕'}
          title={isEdit ? 'Edit Item' : 'Add Item'}
          subtitle={isEdit ? 'Update price, quantity or name' : 'Add a purchased item to the list'}
          accent='#7DF9AA'
          onClose={onClose}
        />
        <div style={{padding:'16px 20px 40px'}}>
          <Field label="Item Name">
            <input value={name} onChange={e=>setName(e.target.value)} autoFocus={!isEdit}
              placeholder="e.g. Chicken, Rice, Masala..."
              style={{...styledInp, width:'100%', boxSizing:'border-box'}}/>
          </Field>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
            <Field label="Rate (₹)">
              <input type="number" inputMode="decimal" value={rate} onChange={e=>setRate(e.target.value)}
                placeholder="0.00"
                style={{...styledInp, width:'100%', boxSizing:'border-box',
                  fontFamily:'Orbitron,monospace',fontWeight:700,color:'#7DF9AA',
                  border:'1px solid rgba(125,249,170,.18)'}}/>
            </Field>
            <Field label="Qty">
              <input type="number" inputMode="decimal" value={qty} onChange={e=>setQty(e.target.value)}
                placeholder="1"
                style={{...styledInp, width:'100%', boxSizing:'border-box', fontSize:18}}/>
            </Field>
          </div>
          <Field label="Unit">
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {UNITS.map(u=>(
                <button key={u} onClick={()=>setUnit(u)}
                  style={{padding:'7px 14px',borderRadius:99,fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'Rajdhani,sans-serif',
                    border:`1px solid ${unit===u?'rgba(125,249,170,.45)':'rgba(255,255,255,.07)'}`,
                    background:unit===u?'rgba(125,249,170,.1)':'rgba(255,255,255,.03)',
                    color:unit===u?'#7DF9AA':'#556080',transition:'all .12s'}}>
                  {u}
                </button>
              ))}
            </div>
          </Field>

          {total > 0 && (
            <div style={{background:'rgba(125,249,170,.05)',border:'1px solid rgba(125,249,170,.15)',borderRadius:12,
              padding:'11px 16px',marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:11,color:'#556080',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em'}}>Total</span>
              <span style={{fontFamily:'Orbitron,monospace',fontSize:17,fontWeight:900,color:'#7DF9AA'}}>{fmt(total)}</span>
            </div>
          )}

          {isEdit && rate === '' || (isEdit && +rate === 0) ? (
            <div style={{background:'rgba(255,211,60,.05)',border:'1px solid rgba(255,211,60,.15)',borderRadius:10,
              padding:'9px 14px',marginBottom:14,fontSize:11,color:'#FFD93D',display:'flex',gap:8,alignItems:'center'}}>
              <span>💡</span>
              <span>Leave rate as 0 if price not known yet — edit it later after buying.</span>
            </div>
          ) : null}

          <PrimaryBtn onClick={submit} disabled={loading} gradient='linear-gradient(135deg,#7DF9AA,#00D4AA)'>
            {loading ? (isEdit?'Saving...':'Adding...') : (isEdit?'💾 Save Changes':'✅ Add Item')}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )
}

// ── PARTY DETAIL VIEW ─────────────────────────────────────
function PartyDetail({ party, allMembers, isAdmin, onBack, onRefresh }) {
  const toast   = useToast()
  const { user } = useAuth()
  const [addSheet,     setAddSheet]    = useState(false)
  const [editItemData, setEditItem]    = useState(null)
  const [editMembers,  setEditMembers] = useState(false)
  const [selMembers,   setSelMembers]  = useState(party.cooking_party_members?.map(x=>x.member_id)||[])
  const [savingMem,    setSavingMem]   = useState(false)

  const items      = party.cooking_items || []
  const partyMems  = party.cooking_party_members?.map(x=>x.members).filter(Boolean) || []
  const totalCost  = items.reduce((s,i)=>s+Number(i.rate)*Number(i.quantity),0)
  const splitAmt   = partyMems.length > 0 ? totalCost / partyMems.length : 0
  const boughtCost = items.filter(i=>i.bought).reduce((s,i)=>s+Number(i.rate)*Number(i.quantity),0)
  const pendingCount = items.filter(i=>!i.bought).length
  const pct = items.length > 0 ? Math.round((items.filter(i=>i.bought).length / items.length)*100) : 0

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
      {/* Back */}
      <button onClick={onBack}
        style={{display:'flex',alignItems:'center',gap:7,marginBottom:18,background:'none',border:'none',
          color:'#556080',cursor:'pointer',fontFamily:'Rajdhani,sans-serif',fontWeight:700,fontSize:13,
          padding:'6px 0',transition:'color .15s'}}>
        <span style={{fontSize:16}}>←</span> Back to all parties
      </button>

      {/* Party header card */}
      <div style={{...glassCard, padding:'18px 20px',marginBottom:14,position:'relative',overflow:'hidden',
        boxShadow:'0 12px 40px rgba(0,0,0,.4)',borderColor:'rgba(255,154,60,.15)'}}>
        {/* decorative glow */}
        <div style={{position:'absolute',top:-40,right:-20,width:160,height:160,borderRadius:'50%',
          background:'#FF9A3C',opacity:.05,filter:'blur(40px)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',top:0,left:'5%',right:'5%',height:1,
          background:'linear-gradient(90deg,transparent,rgba(255,154,60,.5),transparent)'}}/>

        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14}}>
          <div>
            <div style={{fontSize:10,color:'#556080',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em',marginBottom:5}}>
              {new Date(party.date).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
            </div>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:20,fontWeight:900,color:'#E8F0FF',lineHeight:1.2}}>{party.name}</div>
          </div>
          {pct === 100 && <Pill color='#7DF9AA'>✓ Complete</Pill>}
          {pct > 0 && pct < 100 && <Pill color='#FFD93D'>In Progress</Pill>}
          {pct === 0 && items.length > 0 && <Pill color='#FF9A3C'>Pending</Pill>}
        </div>

        {/* Stats grid */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
          {[
            {label:'Total Cost',  value:fmt(totalCost), color:'#FF9A3C', bg:'rgba(255,154,60,.07)'},
            {label:'Per Person',  value:fmt(splitAmt),  color:'#7DF9AA', bg:'rgba(125,249,170,.07)'},
            {label:'Members',     value:partyMems.length, color:'#4D96FF', bg:'rgba(77,150,255,.07)'},
          ].map((s,i)=>(
            <div key={i} style={{padding:'12px 10px',borderRadius:12,background:s.bg,
              border:`1px solid ${s.color}20`,textAlign:'center'}}>
              <div style={{fontFamily:'Orbitron,monospace',fontSize:15,fontWeight:900,color:s.color}}>{s.value}</div>
              <div style={{fontSize:8,color:'#4a5070',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',marginTop:4}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      {items.length > 0 && (
        <div style={{...glassCard, padding:'12px 16px',marginBottom:14}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <span style={{fontSize:10,color:'#556080',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em'}}>
              Shopping Progress
            </span>
            <span style={{fontSize:11,color:pct===100?'#7DF9AA':'#E8F0FF',fontWeight:700,fontFamily:'Orbitron,monospace'}}>
              {pct}%
            </span>
          </div>
          <div style={{height:8,background:'rgba(255,255,255,.05)',borderRadius:99,overflow:'hidden',marginBottom:6}}>
            <div style={{height:'100%',borderRadius:99,transition:'width .6s cubic-bezier(.34,1.2,.64,1)',width:`${pct}%`,
              background:pct===100?'linear-gradient(90deg,#7DF9AA,#00D4AA)':'linear-gradient(90deg,#FF9A3C,#FFD93D)'}}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between'}}>
            <span style={{fontSize:10,color:'#4a5070'}}>Spent: {fmt(boughtCost)}</span>
            <span style={{fontSize:10,color:'#4a5070'}}>{items.filter(i=>i.bought).length}/{items.length} items · {pendingCount} pending</span>
          </div>
        </div>
      )}

      {/* Members in split */}
      <div style={{...glassCard, padding:'13px 15px',marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <div style={{fontSize:10,fontWeight:700,color:'#556080',textTransform:'uppercase',letterSpacing:'.1em'}}>Split Among</div>
          {isAdmin && (
            <button onClick={()=>setEditMembers(s=>!s)}
              style={{fontSize:10,fontWeight:700,color:'#FF9A3C',background:'rgba(255,154,60,.08)',
                border:'1px solid rgba(255,154,60,.2)',borderRadius:99,padding:'4px 12px',cursor:'pointer',
                fontFamily:'inherit',transition:'all .15s',display:'flex',alignItems:'center',gap:4}}>
              {editMembers ? '✕ Cancel' : '✏️ Edit Members'}
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
                    style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:11,cursor:'pointer',
                      border:`1px solid ${sel?'rgba(255,154,60,.35)':'rgba(255,255,255,.05)'}`,
                      background:sel?'rgba(255,154,60,.07)':'transparent',transition:'all .12s'}}>
                    <Avatar emoji={m.avatar} color={m.color} size={30}/>
                    <div style={{flex:1,fontSize:13,fontWeight:700,color:'#E8F0FF'}}>{m.name}</div>
                    <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${sel?'#FF9A3C':'rgba(255,255,255,.14)'}`,
                      background:sel?'#FF9A3C':'transparent',display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:10,color:'#070810',fontWeight:900,transition:'all .12s'}}>{sel?'✓':''}</div>
                  </div>
                )
              })}
            </div>
            <PrimaryBtn onClick={saveMemberChanges} disabled={savingMem}>
              {savingMem?'Saving...':'💾 Save Members'}
            </PrimaryBtn>
          </div>
        ) : (
          <div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}>
              {partyMems.map(m=>(
                <div key={m.id} style={{display:'flex',alignItems:'center',gap:6,
                  background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',
                  borderRadius:99,padding:'4px 10px 4px 5px'}}>
                  <Avatar emoji={m.avatar} color={m.color} size={22}/>
                  <span style={{fontSize:11,fontWeight:700,color:'#E8F0FF'}}>{m.name}</span>
                </div>
              ))}
            </div>
            {splitAmt > 0 && (
              <div style={{background:'rgba(125,249,170,.05)',border:'1px solid rgba(125,249,170,.15)',borderRadius:11,
                padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:11,color:'#556080',fontWeight:700}}>Each person pays</span>
                <span style={{fontFamily:'Orbitron,monospace',fontSize:18,fontWeight:900,color:'#7DF9AA'}}>{fmt(splitAmt)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Items header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:'#556080',textTransform:'uppercase',letterSpacing:'.1em'}}>Items List</div>
          <div style={{fontSize:11,color:'#3a4060',marginTop:2}}>{items.length} items · {pendingCount} pending</div>
        </div>
        <button onClick={()=>setAddSheet(true)}
          style={{padding:'9px 14px',borderRadius:11,border:'1px solid rgba(125,249,170,.25)',
            background:'rgba(125,249,170,.07)',color:'#7DF9AA',fontFamily:'Rajdhani,sans-serif',
            fontWeight:800,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',gap:5,transition:'all .15s'}}>
          ➕ Add Item
        </button>
      </div>

      {/* Item cards */}
      {items.length === 0 ? (
        <div style={{...glassCard, padding:'44px 20px',textAlign:'center'}}>
          <div style={{fontSize:44,marginBottom:10}}>🛒</div>
          <div style={{fontSize:13,color:'#4a5070',fontWeight:600}}>No items yet</div>
          <div style={{fontSize:11,color:'#3a4060',marginTop:4}}>Tap Add Item to start the shopping list</div>
        </div>
      ) : items.map(item => {
        const total = Number(item.rate) * Number(item.quantity)
        const noPriceYet = !item.rate || +item.rate === 0
        return (
          <div key={item.id} style={{
            background: item.bought
              ? 'linear-gradient(145deg,rgba(125,249,170,.04),rgba(125,249,170,.01))'
              : 'linear-gradient(145deg,rgba(255,255,255,.03),rgba(255,255,255,.01))',
            border:`1px solid ${item.bought?'rgba(125,249,170,.18)':'rgba(255,255,255,.07)'}`,
            borderRadius:14,padding:'12px 14px',marginBottom:8,
            position:'relative',overflow:'hidden',transition:'all .15s'}}>

            {/* Left accent bar */}
            <div style={{position:'absolute',left:0,top:'12%',bottom:'12%',width:3,borderRadius:'0 3px 3px 0',
              background:item.bought?'linear-gradient(180deg,#7DF9AA,rgba(125,249,170,.2))':'linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,.03))'}}/>

            <div style={{display:'flex',alignItems:'center',gap:10,paddingLeft:8}}>
              {/* Bought checkbox */}
              <button onClick={async()=>{
                try { await updateCookingItem(item.id,{bought:!item.bought}); onRefresh() }
                catch(e){ toast('Failed','error') }
              }} style={{width:26,height:26,borderRadius:8,flexShrink:0,cursor:'pointer',
                border:`2px solid ${item.bought?'#7DF9AA':'rgba(255,255,255,.14)'}`,
                background:item.bought?'#7DF9AA':'transparent',display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:12,color:'#070810',fontWeight:900,transition:'all .15s'}}>
                {item.bought?'✓':''}
              </button>

              {/* Name + meta */}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:700,color:item.bought?'#4a6050':'#E8F0FF',
                  textDecoration:item.bought?'line-through':'none',
                  overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.name}</div>
                <div style={{fontSize:11,color:'#4a5070',marginTop:2,display:'flex',alignItems:'center',gap:6}}>
                  <span>{item.quantity} {item.unit}</span>
                  <span style={{opacity:.4}}>×</span>
                  {noPriceYet
                    ? <span style={{color:'#FFD93D',fontWeight:700,fontSize:10}}>price pending</span>
                    : <span>{fmt(item.rate)}</span>
                  }
                </div>
              </div>

              {/* Total */}
              <div style={{textAlign:'right',flexShrink:0,marginRight:4}}>
                {noPriceYet
                  ? <div style={{fontSize:10,color:'#FFD93D',fontWeight:700,fontFamily:'Orbitron,monospace'}}>₹—</div>
                  : <div style={{fontFamily:'Orbitron,monospace',fontSize:14,fontWeight:900,color:item.bought?'#7DF9AA':'#E8F0FF'}}>{fmt(total)}</div>
                }
              </div>

              {/* Edit */}
              <button onClick={()=>setEditItem(item)}
                style={{width:28,height:28,borderRadius:8,
                  border:'1px solid rgba(77,150,255,.25)',background:'rgba(77,150,255,.08)',
                  color:'#4D96FF',cursor:'pointer',fontSize:12,display:'flex',
                  alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .15s'}}>
                ✏️
              </button>

              {/* Delete */}
              <button onClick={async()=>{
                if(!confirm(`Remove "${item.name}"?`)) return
                try { await deleteCookingItem(item.id); toast('Removed','warn'); onRefresh() }
                catch(e){ toast('Failed','error') }
              }} style={{width:28,height:28,borderRadius:8,
                border:'1px solid rgba(255,107,107,.2)',background:'rgba(255,107,107,.07)',
                color:'#FF6B6B',cursor:'pointer',fontSize:12,display:'flex',
                alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .15s'}}>
                🗑️
              </button>
            </div>
          </div>
        )
      })}

      {addSheet     && <ItemFormSheet partyId={party.id} onClose={()=>setAddSheet(false)} onDone={onRefresh}/>}
      {editItemData && <ItemFormSheet partyId={party.id} editItem={editItemData} onClose={()=>setEditItem(null)} onDone={onRefresh}/>}
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────
function CookingPartyContent() {
  const { profile, user } = useAuth()
  const toast = useToast()
  const [parties,      setParties]   = useState([])
  const [members,      setMembers]   = useState([])
  const [siteSettings, setSiteSettings] = useState(null)
  const [loading,      setL]         = useState(true)
  const [createSheet,  setCreate]    = useState(false)
  const [editParty,    setEditParty] = useState(null)
  const [selected,     setSelected]  = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [p, m, s] = await Promise.all([getCookingParties(), getMembers(), getSettings()])
      setParties(p)
      setMembers(m.filter(m=>m.status==='approved'))
      setSiteSettings(s)
      if (selected) {
        const fresh = p.find(x=>x.id===selected.id)
        if (fresh) setSelected(fresh)
      }
    } catch(e) { toast('Failed to load','error') }
    finally { setL(false) }
  }

  const isAdmin = profile?.is_admin
  const isKitchenManager = isAdmin || (siteSettings?.kitchen_assigner_id === user?.id)

  if (loading) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:80,gap:14}}>
      <div style={{width:44,height:44,borderRadius:'50%',border:'3px solid rgba(255,154,60,.15)',borderTopColor:'#FF9A3C',animation:'spin 1s linear infinite'}}/>
      <div style={{fontSize:11,color:'#4a5070',fontWeight:700,letterSpacing:'.12em'}}>LOADING...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

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

  const totalSpend = parties.reduce((s,p)=>s+(p.cooking_items?.reduce((a,i)=>a+Number(i.rate)*Number(i.quantity),0)||0),0)

  return (
    <div className="page-anim" style={{paddingBottom:8}}>

      {/* HEADER */}
      <div style={{marginBottom:20,position:'relative'}}>
        <div style={{fontSize:11,color:'#556080',fontWeight:700,letterSpacing:'.12em',textTransform:'uppercase',marginBottom:4}}>
          House Kitchen 🍳
        </div>
        <div style={{fontFamily:'Orbitron,monospace',fontWeight:900,fontSize:'clamp(20px,5.5vw,26px)',letterSpacing:1,lineHeight:1.1,marginBottom:4}}>
          COOKING{' '}
          <span style={{background:'linear-gradient(135deg,#FF9A3C,#FFD93D)',
            WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
            filter:'drop-shadow(0 0 16px rgba(255,154,60,.5))'}}>PARTIES</span>
        </div>
        <div style={{fontSize:11,color:'#556080',marginTop:4}}>Track items, rates and splits for each cooking session</div>
      </div>

      {/* STATS ROW */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:14}}>
        {[
          {emoji:'🍳', value:parties.length,      label:'Parties',    color:'#FF9A3C', bg:'rgba(255,154,60,.07)'},
          {emoji:'🛒', value:parties.reduce((s,p)=>s+(p.cooking_items?.length||0),0), label:'Items', color:'#7DF9AA', bg:'rgba(125,249,170,.07)'},
          {emoji:'💰', value:fmt(totalSpend).replace('₹',''), label:'Total ₹', color:'#4D96FF', bg:'rgba(77,150,255,.07)'},
        ].map((s,i)=>(
          <div key={i} style={{...glassCard, padding:'12px 10px',background:s.bg,
            border:`1px solid ${s.color}20`,textAlign:'center'}}>
            <div style={{fontSize:18,marginBottom:4}}>{s.emoji}</div>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:i===2?11:18,fontWeight:900,color:s.color,lineHeight:1}}>{s.value}</div>
            <div style={{fontSize:8,color:'#4a5070',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',marginTop:4}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* CREATE BUTTON */}
      {isKitchenManager && (
        <button onClick={()=>setCreate(true)}
          style={{width:'100%',padding:'14px',borderRadius:14,marginBottom:16,fontFamily:'Rajdhani,sans-serif',fontWeight:800,fontSize:14,cursor:'pointer',
            border:'1px solid rgba(255,154,60,.3)',
            background:'linear-gradient(135deg,rgba(255,154,60,.1),rgba(255,211,60,.06))',
            color:'#FF9A3C',letterSpacing:'.06em',display:'flex',alignItems:'center',justifyContent:'center',gap:10,
            boxShadow:'0 4px 20px rgba(255,154,60,.08)',transition:'all .15s'}}>
          <span style={{fontSize:18}}>🍳</span> New Cooking Party
        </button>
      )}

      {/* LIST LABEL */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
        <div style={{fontSize:10,fontWeight:700,color:'#3a4560',textTransform:'uppercase',letterSpacing:'.1em'}}>
          All Parties
        </div>
        {parties.length > 0 && (
          <div style={{fontSize:10,color:'#3a4560',fontWeight:600}}>{parties.length} sessions</div>
        )}
      </div>

      {/* EMPTY STATE */}
      {parties.length === 0 ? (
        <div style={{...glassCard, padding:'56px 20px',textAlign:'center'}}>
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
        const pendingPrice = party.cooking_items?.some(i=>!i.rate||+i.rate===0)

        return (
          <div key={party.id} onClick={()=>setSelected(party)}
            style={{background:'linear-gradient(145deg,rgba(255,255,255,.03),rgba(255,255,255,.01))',
              border:'1px solid rgba(255,154,60,.12)',
              borderRadius:18,padding:'15px 16px',marginBottom:9,cursor:'pointer',
              position:'relative',overflow:'hidden',
              boxShadow:'0 4px 24px rgba(0,0,0,.3)',transition:'all .18s'}}>

            {/* Top line */}
            <div style={{position:'absolute',top:0,left:'6%',right:'6%',height:1,
              background:'linear-gradient(90deg,transparent,rgba(255,154,60,.45),transparent)'}}/>
            {/* Left accent */}
            <div style={{position:'absolute',left:0,top:'12%',bottom:'12%',width:3,borderRadius:'0 3px 3px 0',
              background:'linear-gradient(180deg,#FF9A3C,rgba(255,154,60,.15))'}}/>

            <div style={{paddingLeft:8}}>
              {/* Name + cost row */}
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8}}>
                <div style={{flex:1,minWidth:0,paddingRight:8}}>
                  <div style={{fontSize:15,fontWeight:800,color:'#E8F0FF',
                    overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:3}}>{party.name}</div>
                  <div style={{fontSize:11,color:'#556080'}}>
                    {new Date(party.date).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}
                  </div>
                </div>
                <div style={{textAlign:'right',flexShrink:0,paddingRight:isAdmin?70:0}}>
                  <div style={{fontFamily:'Orbitron,monospace',fontSize:16,fontWeight:900,color:'#FF9A3C'}}>{fmt(totalCost)}</div>
                  <div style={{fontSize:10,color:'#556080',marginTop:2}}>{partyMems} members · {fmt(splitAmt)} each</div>
                </div>
              </div>

              {/* Status badges */}
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8,alignItems:'center'}}>
                {pct === 100 && <Pill color='#7DF9AA'>✓ All bought</Pill>}
                {pct > 0 && pct < 100 && <Pill color='#FFD93D'>🛒 In progress</Pill>}
                {itemCount === 0 && <Pill color='#556080'>Empty list</Pill>}
                {pendingPrice && <Pill color='#FF9A3C'>💡 Prices pending</Pill>}
              </div>

              {/* Member avatars */}
              <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:itemCount>0?8:0}}>
                {party.cooking_party_members?.slice(0,6).map(x=>x.members).filter(Boolean).map(m=>(
                  <div key={m.id} style={{width:26,height:26,borderRadius:8,background:m.color||'#333',
                    border:'1px solid rgba(255,255,255,.1)',display:'flex',alignItems:'center',
                    justifyContent:'center',fontSize:14}}>{m.avatar}</div>
                ))}
                {(party.cooking_party_members?.length||0)>6 && (
                  <div style={{width:26,height:26,borderRadius:8,background:'rgba(255,255,255,.06)',
                    border:'1px solid rgba(255,255,255,.09)',display:'flex',alignItems:'center',
                    justifyContent:'center',fontSize:10,color:'#556080',fontWeight:700}}>
                    +{(party.cooking_party_members?.length||0)-6}
                  </div>
                )}
              </div>

              {/* Progress */}
              {itemCount > 0 && (
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <span style={{fontSize:9,color:'#3a4060',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em'}}>Bought</span>
                    <span style={{fontSize:9,color:'#3a4060',fontWeight:700}}>{boughtCount}/{itemCount}</span>
                  </div>
                  <div style={{height:5,background:'rgba(255,255,255,.05)',borderRadius:99,overflow:'hidden'}}>
                    <div style={{height:'100%',borderRadius:99,transition:'width .4s',width:`${pct}%`,
                      background:pct===100?'linear-gradient(90deg,#7DF9AA,#00D4AA)':'linear-gradient(90deg,#FF9A3C,#FFD93D)'}}/>
                  </div>
                </div>
              )}
            </div>

            {/* Admin actions: edit + delete */}
            {isAdmin && (
              <div style={{position:'absolute',top:12,right:12,display:'flex',gap:6}} onClick={e=>e.stopPropagation()}>
                <button onClick={e=>{ e.stopPropagation(); setEditParty(party) }}
                  style={{width:28,height:28,borderRadius:8,
                    border:'1px solid rgba(77,150,255,.25)',background:'rgba(77,150,255,.08)',
                    color:'#4D96FF',cursor:'pointer',fontSize:12,
                    display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s'}}>
                  ✏️
                </button>
                <button onClick={async e=>{
                  e.stopPropagation()
                  if(!confirm(`Delete "${party.name}" and all its items?`)) return
                  try { await deleteCookingParty(party.id); toast('Deleted','warn'); load() }
                  catch(e){ toast('Failed','error') }
                }} style={{width:28,height:28,borderRadius:8,
                  border:'1px solid rgba(255,107,107,.2)',background:'rgba(255,107,107,.07)',
                  color:'#FF6B6B',cursor:'pointer',fontSize:12,
                  display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s'}}>
                  🗑️
                </button>
              </div>
            )}
          </div>
        )
      })}

      {createSheet && <PartyFormSheet members={members} onClose={()=>setCreate(false)} onDone={load}/>}
      {editParty   && <PartyFormSheet members={members} editParty={editParty} onClose={()=>setEditParty(null)} onDone={load}/>}
    </div>
  )
}

export default function CookingParty() { return <ToastProvider><CookingPartyContent/></ToastProvider> }
