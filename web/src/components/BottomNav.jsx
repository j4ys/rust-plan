import React from 'react'
import './BottomNav.css'

const TIER_COLOR = {
  plan:         'var(--text-muted)',
  beginner:     'var(--tier-beginner)',
  intermediate: 'var(--tier-intermediate)',
  advanced:     'var(--tier-advanced)',
}

export default function BottomNav({ allPages, currentIndex, onNavigate }) {
  const prev = currentIndex > 0 ? allPages[currentIndex - 1] : null
  const next = currentIndex < allPages.length - 1 ? allPages[currentIndex + 1] : null

  return (
    <footer className="bottomnav">
      <div className="bottomnav-inner">
        {prev ? (
          <button
            className="nav-btn nav-prev"
            onClick={() => onNavigate(currentIndex - 1)}
          >
            <span className="nav-arrow">←</span>
            <span className="nav-labels">
              <span className="nav-direction">Previous</span>
              <span className="nav-title" style={{ color: TIER_COLOR[prev.tier] }}>
                {prev.title}
              </span>
            </span>
          </button>
        ) : <div />}

        {next ? (
          <button
            className="nav-btn nav-next"
            onClick={() => onNavigate(currentIndex + 1)}
          >
            <span className="nav-labels nav-labels-right">
              <span className="nav-direction">Next</span>
              <span className="nav-title" style={{ color: TIER_COLOR[next.tier] }}>
                {next.title}
              </span>
            </span>
            <span className="nav-arrow">→</span>
          </button>
        ) : <div />}
      </div>
    </footer>
  )
}
