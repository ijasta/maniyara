import { useState, useEffect } from 'react'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Rajdhani:wght@400;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0 }

  @keyframes spin-slow  { to { transform: rotate(360deg) } }
  @keyframes spin-rev   { to { transform: rotate(-360deg) } }
  @keyframes fadeUp     { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:none } }
  @keyframes pulse-dot  { 0%,100% { opacity:1; transform:scale(1) } 50% { opacity:.4; transform:scale(.7) } }
  @keyframes float-gear { 0%,100% { transform:translateY(0px) rotate(0deg) } 50% { transform:translateY(-8px) rotate(6deg) } }
  @keyframes glow-pulse { 0%,100% { box-shadow: 0 0 20px rgba(251,191,36,.15) } 50% { box-shadow: 0 0 40px rgba(251,191,36,.35) } }
  @keyframes scanline   { 0% { transform:translateY(-100%) } 100% { transform:translateY(100vh) } }

  .maint-root {
    min-height: 100vh;
    background: #070809;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: 'Rajdhani', sans-serif;
    padding: 32px 20px;
    position: relative;
    overflow: hidden;
  }

  .scanline {
    position: absolute;
    left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(251,191,36,.08), transparent);
    animation: scanline 8s linear infinite;
    pointer-events: none;
  }

  .grid-bg {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(251,191,36,.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(251,191,36,.03) 1px, transparent 1px);
    background-size: 48px 48px;
    pointer-events: none;
  }

  .radial-glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 70% 50% at 50% 50%, rgba(251,191,36,.05) 0%, transparent 70%);
    pointer-events: none;
  }

  .gear-wrap {
    position: relative;
    width: 90px;
    height: 90px;
    margin-bottom: 32px;
    animation: fadeUp .5s .05s ease both;
  }

  .gear-big {
    position: absolute;
    bottom: 0; left: 0;
    width: 64px; height: 64px;
    animation: spin-slow 8s linear infinite;
    filter: drop-shadow(0 0 12px rgba(251,191,36,.4));
  }

  .gear-small {
    position: absolute;
    top: 0; right: 0;
    width: 38px; height: 38px;
    animation: spin-rev 5s linear infinite;
    filter: drop-shadow(0 0 8px rgba(251,191,36,.3));
  }

  .title {
    font-family: 'Orbitron', monospace;
    font-size: clamp(22px, 6vw, 30px);
    font-weight: 900;
    color: #fbbf24;
    letter-spacing: 3px;
    text-align: center;
    text-shadow: 0 0 32px rgba(251,191,36,.4);
    margin-bottom: 14px;
    animation: fadeUp .5s .15s ease both;
  }

  .dots {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
    animation: fadeUp .5s .25s ease both;
  }
  .dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #fbbf24;
  }
  .dot:nth-child(1) { animation: pulse-dot 1.4s .0s ease-in-out infinite; }
  .dot:nth-child(2) { animation: pulse-dot 1.4s .2s ease-in-out infinite; }
  .dot:nth-child(3) { animation: pulse-dot 1.4s .4s ease-in-out infinite; }

  .message {
    font-size: 15px;
    color: rgba(255,255,255,.45);
    text-align: center;
    line-height: 1.7;
    max-width: 320px;
    margin-bottom: 32px;
    font-weight: 400;
    animation: fadeUp .5s .35s ease both;
  }

  .managed-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 14px 32px;
    border-radius: 14px;
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.1);
    margin-bottom: 24px;
    animation: fadeUp .5s .45s ease both, glow-pulse 3s ease-in-out infinite;
  }
  .managed-label {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: rgba(255,255,255,.25);
  }
  .managed-name {
    font-family: 'Orbitron', monospace;
    font-size: 17px;
    font-weight: 700;
    color: #fbbf24;
    letter-spacing: 1px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .btn-retry {
    padding: 12px 28px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 700;
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 1px;
    cursor: pointer;
    background: transparent;
    border: 1px solid rgba(251,191,36,.35);
    color: rgba(251,191,36,.7);
    transition: all .2s;
    animation: fadeUp .5s .55s ease both;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .btn-retry:hover {
    background: rgba(251,191,36,.08);
    border-color: rgba(251,191,36,.6);
    color: #fbbf24;
    box-shadow: 0 0 20px rgba(251,191,36,.15);
  }

  .btn-override {
    padding: 12px 28px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 700;
    font-family: 'Rajdhani', sans-serif;
    letter-spacing: 1px;
    cursor: pointer;
    background: rgba(52,211,153,.08);
    border: 1px solid rgba(52,211,153,.3);
    color: #34d399;
    transition: all .2s;
    animation: fadeUp .5s .65s ease both;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .btn-override:hover {
    background: rgba(52,211,153,.16);
    border-color: rgba(52,211,153,.6);
    box-shadow: 0 0 24px rgba(52,211,153,.2);
  }
  .btn-override:active { transform: scale(.97); }

  .footer {
    position: absolute;
    bottom: 20px;
    font-size: 10px;
    color: rgba(255,255,255,.1);
    letter-spacing: 3px;
    font-family: 'Orbitron', monospace;
  }
`

/* SVG gear shape */
function Gear({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <path d="M32 20a12 12 0 1 1 0 24 12 12 0 0 1 0-24z" fill="rgba(251,191,36,.9)"/>
      <path d="M27 4h10l1.5 6.5a18 18 0 0 1 4.3 1.8L49 9l7 7-3.3 6.2a18 18 0 0 1 1.8 4.3L61 28v8l-6.5 1.5a18 18 0 0 1-1.8 4.3L56 49l-7 7-6.2-3.3a18 18 0 0 1-4.3 1.8L37 61H27l-1.5-6.5a18 18 0 0 1-4.3-1.8L15 56l-7-7 3.3-6.2a18 18 0 0 1-1.8-4.3L3 37v-8l6.5-1.5a18 18 0 0 1 1.8-4.3L8 16l7-7 6.2 3.3a18 18 0 0 1 4.3-1.8L27 4z"
        fill="rgba(251,191,36,.7)" stroke="rgba(251,191,36,.3)" strokeWidth="1"/>
    </svg>
  )
}

export default function MaintenancePage({ message, houseName = 'Maniyara', isAdmin = false, onOverride }) {
  const [clicking, setClicking] = useState(false)

  const handleOverride = () => {
    if (!onOverride) return
    setClicking(true)
    // Small delay so the button state renders before switching
    setTimeout(() => onOverride(), 80)
  }

  const handleRetry = () => window.location.reload()

  return (
    <>
      <style>{CSS}</style>
      <div className="maint-root">
        <div className="grid-bg"/>
        <div className="radial-glow"/>
        <div className="scanline"/>

        {/* Gear icons */}
        <div className="gear-wrap">
          <div className="gear-big"><Gear size={64}/></div>
          <div className="gear-small"><Gear size={38}/></div>
        </div>

        {/* Title */}
        <div className="title">MAINTENANCE MODE</div>

        {/* Animated dots */}
        <div className="dots">
          <div className="dot"/>
          <div className="dot"/>
          <div className="dot"/>
        </div>

        {/* Message */}
        <p className="message">
          {message || 'We are currently working on it. Will be back soon.'}
        </p>

        {/* Managed by card */}
        <div className="managed-card">
          <div className="managed-label">Managed by</div>
          <div className="managed-name">
            <span>🏠</span>
            <span>{houseName}</span>
          </div>
        </div>

        {/* Retry button — everyone sees this */}
        <button className="btn-retry" onClick={handleRetry}>
          ↺ Retry Connection
        </button>

        {/* Admin override — only shown to admins */}
        {isAdmin && (
          <button className="btn-override" onClick={handleOverride} disabled={clicking}>
            {clicking
              ? <><span style={{display:'inline-block',animation:'spin-slow .6s linear infinite'}}>↺</span> Entering...</>
              : <>⚡ Admin Override — Enter Site</>
            }
          </button>
        )}

        <div className="footer">MANIYARA · {new Date().getFullYear()}</div>
      </div>
    </>
  )
}
