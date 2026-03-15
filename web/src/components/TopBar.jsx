import React from 'react'
import './TopBar.css'

const TIER_META = {
  plan:         { label: 'Overview',     color: 'var(--text-muted)' },
  beginner:     { label: 'Tier 1',       color: 'var(--tier-beginner)' },
  intermediate: { label: 'Tier 2',       color: 'var(--tier-intermediate)' },
  advanced:     { label: 'Tier 3',       color: 'var(--tier-advanced)' },
}

export default function TopBar({
  page, currentIndex, totalPages, visited, sidebarOpen, onToggleSidebar,
}) {
  const { label, color } = TIER_META[page.tier] ?? TIER_META.plan
  const pct = Math.round((visited.size / totalPages) * 100)

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="topbar-menu"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          title="Toggle sidebar  (← → to navigate)"
        >
          {sidebarOpen ? '⟨' : '☰'}
        </button>
        <nav className="breadcrumb">
          <span className="bc-tier" style={{ color }}>{label}</span>
          <span className="bc-sep">›</span>
          <span className="bc-page">{page.title}</span>
        </nav>
      </div>
      <div className="topbar-right">
        <span className="topbar-count">{currentIndex + 1} / {totalPages}</span>
        <div className="progress-track" title={`${pct}% read`}>
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="progress-pct">{pct}%</span>
      </div>
    </header>
  )
}
