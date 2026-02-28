export default function MaintenancePage({ message, isAdmin, onExit }) {
  return (
    <div style={{
      minHeight:'100dvh', background:'#070810',
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      padding:24, textAlign:'center',
      fontFamily:'Rajdhani, sans-serif'
    }}>
      {/* Animated gears */}
      <div style={{position:'relative', width:120, height:120, marginBottom:28}}>
        <span style={{fontSize:72, animation:'spin 6s linear infinite', display:'block',
          filter:'drop-shadow(0 0 18px rgba(255,217,61,.4))'}}>⚙️</span>
        <span style={{position:'absolute', top:4, right:-4, fontSize:32,
          animation:'spinR 4s linear infinite', display:'block', opacity:.6}}>⚙️</span>
      </div>

      <div style={{fontFamily:'Orbitron, monospace', fontWeight:900,
        fontSize:'clamp(20px,6vw,30px)', letterSpacing:2, marginBottom:10,
        background:'linear-gradient(135deg,#FFD93D,#FF9A3C)',
        WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent'}}>
        MAINTENANCE MODE
      </div>

      <div style={{display:'flex', gap:6, justifyContent:'center', marginBottom:22}}>
        {[0,1,2].map(i=>(
          <div key={i} style={{width:8, height:8, borderRadius:'50%', background:'#FFD93D',
            animation:`blink 1.4s ease-in-out ${i*0.22}s infinite`}}/>
        ))}
      </div>

      <div style={{fontSize:'clamp(14px,4vw,16px)', color:'#8890b0', lineHeight:1.8,
        maxWidth:340, marginBottom:32, whiteSpace:'pre-line'}}>
        {message || 'We are performing scheduled maintenance.\nWe\'ll be back shortly! 🔧'}
      </div>

      <div style={{background:'rgba(255,217,61,.07)', border:'1px solid rgba(255,217,61,.18)',
        borderRadius:12, padding:'12px 24px', marginBottom:28}}>
        <div style={{fontSize:10, color:'#4a5070', fontWeight:700,
          textTransform:'uppercase', letterSpacing:'.12em', marginBottom:4}}>Managed by</div>
        <div style={{fontFamily:'Orbitron, monospace', fontSize:16, fontWeight:700, color:'#FFD93D'}}>
          🏠 Maniyara
        </div>
      </div>

      {isAdmin && (
        <button onClick={onExit}
          style={{padding:'12px 28px', borderRadius:99, fontFamily:'Rajdhani, sans-serif',
            fontWeight:800, fontSize:13, cursor:'pointer',
            border:'2px solid rgba(125,249,170,.35)',
            background:'rgba(125,249,170,.08)', color:'#7DF9AA',
            letterSpacing:'.08em', boxShadow:'0 0 18px rgba(125,249,170,.1)'}}>
          ⚡ Admin Override — Enter Site
        </button>
      )}

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg) } }
        @keyframes spinR { to { transform: rotate(-360deg) } }
        @keyframes blink { 0%,100%{opacity:.2;transform:scale(.8)} 50%{opacity:1;transform:scale(1.2)} }
      `}</style>
    </div>
  )
}
