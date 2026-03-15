import React, { useRef, useEffect } from 'react'
import './Sidebar.css'

export default function Sidebar({
  tiers, allPages, currentIndex, onNavigate,
  visited, isOpen, onClose,
}) {
  const activeRef = useRef(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [currentIndex])

  return (
    <aside className={`sidebar ${isOpen ? 'is-open' : 'is-closed'}`}>
      <div className="sidebar-header">
        <span className="sidebar-logo">🦀 Rust Plan</span>
        <button className="sidebar-close" onClick={onClose} aria-label="Close sidebar">✕</button>
      </div>

      <nav className="sidebar-nav">
        {tiers.map(tier => (
          <div key={tier.key} className="sidebar-group">
            <div className="sidebar-group-label" style={{ color: tier.color }}>
              {tier.label}
            </div>
            <ul>
              {tier.pages.map(page => {
                const idx = allPages.indexOf(page)
                const isActive  = idx === currentIndex
                const isVisited = visited.has(page.id)

                return (
                  <li key={page.id}>
                    <button
                      ref={isActive ? activeRef : null}
                      className={`sidebar-item ${isActive ? 'active' : ''} ${isVisited ? 'visited' : ''}`}
                      style={isActive ? { '--tc': tier.color } : undefined}
                      onClick={() => onNavigate(idx)}
                      title={page.title}
                    >
                      <span
                        className="sidebar-dot"
                        style={{
                          background: isVisited ? tier.color : 'transparent',
                          borderColor: tier.color,
                        }}
                      />
                      <span className="sidebar-item-title">{page.title}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
