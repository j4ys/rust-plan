import { useState, useCallback } from 'react'

const STORAGE_KEY = 'rust-plan-visited'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function save(set) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
  } catch {}
}

export function useProgress() {
  const [visited, setVisited] = useState(load)

  const markVisited = useCallback((pageId) => {
    setVisited(prev => {
      if (prev.has(pageId)) return prev
      const next = new Set(prev)
      next.add(pageId)
      save(next)
      return next
    })
  }, [])

  const resetProgress = useCallback(() => {
    setVisited(new Set())
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }, [])

  return { visited, markVisited, resetProgress }
}
