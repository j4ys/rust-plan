import React, { useState, useEffect, useCallback } from 'react'
import { ALL_PAGES, TIERS } from './pages.js'
import { useProgress } from './useProgress.js'
import Sidebar from './components/Sidebar.jsx'
import TopBar from './components/TopBar.jsx'
import Reader from './components/Reader.jsx'
import BottomNav from './components/BottomNav.jsx'
import './App.css'

export default function App() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { visited, markVisited, resetProgress } = useProgress()

  const handleReset = useCallback(() => {
    if (window.confirm('Reset all progress and return to the beginning?')) {
      resetProgress()
      setCurrentIndex(0)
    }
  }, [resetProgress])

  const page = ALL_PAGES[currentIndex]

  useEffect(() => {
    markVisited(page.id)
  }, [page.id, markVisited])

  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowLeft'  && currentIndex > 0)
        setCurrentIndex(i => i - 1)
      if (e.key === 'ArrowRight' && currentIndex < ALL_PAGES.length - 1)
        setCurrentIndex(i => i + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [currentIndex])

  const goTo = useCallback((idx) => setCurrentIndex(idx), [])

  return (
    <div className={`app-shell ${sidebarOpen ? '' : 'sidebar-hidden'}`}>
      <Sidebar
        tiers={TIERS}
        allPages={ALL_PAGES}
        currentIndex={currentIndex}
        onNavigate={goTo}
        visited={visited}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="app-main">
        <TopBar
          page={page}
          currentIndex={currentIndex}
          totalPages={ALL_PAGES.length}
          visited={visited}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(o => !o)}
          onReset={handleReset}
        />
        <Reader page={page} />
        <BottomNav
          allPages={ALL_PAGES}
          currentIndex={currentIndex}
          onNavigate={goTo}
        />
      </div>
    </div>
  )
}
