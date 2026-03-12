import { useState, useEffect, useRef } from 'react'

// ==========================================
// AUTO-ROTATE TIMER HOOK
// Fires onRotate() automatically every Friday at 12:00 AM
// ==========================================
function getNextFridayMidnight() {
  const now = new Date()
  const day = now.getDay() // 0=Sun,1=Mon,...,5=Fri,6=Sat
  const daysUntilFriday = (5 - day + 7) % 7 || 7
  const next = new Date(now)
  next.setDate(now.getDate() + daysUntilFriday)
  next.setHours(0, 0, 0, 0) // midnight = 12:00 AM
  return next
}

export function useAutoRotateTimer(onRotate) {
  const [timeLeft, setTimeLeft] = useState(null)
  const [nextFriday, setNextFriday] = useState(null)
  const firedRef = useRef(false)

  useEffect(() => {
    const target = getNextFridayMidnight()
    setNextFriday(target)
    firedRef.current = false

    const tick = () => {
      const now = Date.now()
      const diff = target.getTime() - now

      if (diff <= 0) {
        setTimeLeft(0)
        if (!firedRef.current) {
          firedRef.current = true
          onRotate && onRotate()
        }
        return
      }
      setTimeLeft(diff)
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const formatCountdown = (ms) => {
    if (ms === null) return '...'
    if (ms <= 0) return '🔄 ROTATING...'
    const totalSec = Math.floor(ms / 1000)
    const d = Math.floor(totalSec / 86400)
    const h = Math.floor((totalSec % 86400) / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    const pad = n => String(n).padStart(2, '0')
    if (d > 0) return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`
    return `${pad(h)}:${pad(m)}:${pad(s)}`
  }

  const isImminent = timeLeft !== null && timeLeft < 3600000 // < 1 hour
  const label = formatCountdown(timeLeft)

  return { timeLeft, label, isImminent, nextFriday }
}

// ==========================================
// AUTO-ROTATE TIMER WIDGET
// Drop this into any page to show the countdown
// ==========================================
export function AutoRotateTimerWidget({ onRotate }) {
  const { label, isImminent, timeLeft, nextFriday } = useAutoRotateTimer(onRotate)

  const color      = timeLeft === 0 ? '#7DF9AA' : isImminent ? '#FF6B6B' : '#FFD93D'
  const glowColor  = timeLeft === 0 ? 'rgba(125,249,170,.4)' : isImminent ? 'rgba(255,107,107,.4)' : 'rgba(255,217,61,.35)'
  const bg         = timeLeft === 0 ? 'rgba(125,249,170,.08)' : isImminent ? 'rgba(255,107,107,.08)' : 'rgba(255,217,61,.06)'
  const border     = timeLeft === 0 ? 'rgba(125,249,170,.3)' : isImminent ? 'rgba(255,107,107,.3)' : 'rgba(255,217,61,.25)'

  return (
    <div style={{
      background: bg,
      border: `2px solid ${border}`,
      borderRadius: 13, padding: '14px 16px', marginBottom: 16,
      boxShadow: isImminent ? `0 0 20px ${glowColor}` : 'none',
      transition: 'all .3s'
    }}>
      <style>{`@keyframes timerPulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 11, flexShrink: 0,
          background: `${color}15`, border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
        }}>⏰</div>

        {/* Label + Countdown */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase',
            letterSpacing: '.1em', marginBottom: 2
          }}>
            {timeLeft === 0
              ? '🔄 AUTO-ROTATING NOW'
              : isImminent
              ? '⚡ ROTATION IMMINENT'
              : '🔄 NEXT AUTO-ROTATION'}
          </div>
          <div style={{
            fontFamily: 'Orbitron, monospace', fontSize: 20, fontWeight: 900,
            color, letterSpacing: 2,
            animation: isImminent ? 'timerPulse 1s ease-in-out infinite' : 'none',
            textShadow: `0 0 20px ${glowColor}`
          }}>
            {label}
          </div>
        </div>

        {/* Right info */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 9, color: '#4a5070', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em' }}>Every Friday</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#8890b0', marginTop: 2 }}>12:00 AM</div>
          {nextFriday && (
            <div style={{ fontSize: 10, color: '#4a5070', marginTop: 2 }}>
              {nextFriday.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
          )}
        </div>
      </div>

      {/* Warning banner when imminent */}
      {isImminent && timeLeft > 0 && (
        <div style={{ marginTop: 10, padding: '7px 10px', borderRadius: 8, background: 'rgba(255,107,107,.08)', border: '1px solid rgba(255,107,107,.15)' }}>
          <div style={{ fontSize: 11, color: '#FF6B6B', fontWeight: 700 }}>⚠️ Auto-rotation fires in less than 1 hour! Tasks will be rotated automatically.</div>
        </div>
      )}

      {/* Success banner when fired */}
      {timeLeft === 0 && (
        <div style={{ marginTop: 10, padding: '7px 10px', borderRadius: 8, background: 'rgba(125,249,170,.08)', border: '1px solid rgba(125,249,170,.2)' }}>
          <div style={{ fontSize: 11, color: '#7DF9AA', fontWeight: 700 }}>✅ Auto-rotation triggered! Tasks rotated to next week.</div>
        </div>
      )}
    </div>
  )
}
