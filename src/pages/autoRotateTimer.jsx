import { useState, useEffect, useRef } from 'react'

function getNextFridayMidnight() {
  const now = new Date()
  const day = now.getDay()
  const daysUntilFriday = (5 - day + 7) % 7 || 7
  const next = new Date(now)
  next.setDate(now.getDate() + daysUntilFriday)
  next.setHours(0, 0, 0, 0)
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
      const diff = target.getTime() - Date.now()
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
    if (ms <= 0) return 'AUTO-ROTATING'
    const totalSec = Math.floor(ms / 1000)
    const d = Math.floor(totalSec / 86400)
    const h = Math.floor((totalSec % 86400) / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    const pad = n => String(n).padStart(2, '0')
    if (d > 0) return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`
    return `${pad(h)}:${pad(m)}:${pad(s)}`
  }

  const isImminent = timeLeft !== null && timeLeft < 3600000
  const label = formatCountdown(timeLeft)

  return { timeLeft, label, isImminent, nextFriday }
}
