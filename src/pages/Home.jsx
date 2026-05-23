import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import styles from './Home.module.css'


function IconVendas() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}

function IconRelatorio() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function IconChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function IconChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

const NAV_ITEMS = [
  { to: 'vendas',    label: 'Vendas',    Icon: IconVendas },
  { to: 'relatorio', label: 'Relatório', Icon: IconRelatorio },
]

export default function Home() {
  const [expanded, setExpanded] = useState(true)
  const navigate = useNavigate()

  return (
    <div className={styles.root}>
      <div className={styles.body}>
        <aside className={`${styles.sidebar} ${expanded ? '' : styles.sidebarCollapsed}`}>
          <button
            className={styles.toggleBtn}
            onClick={() => setExpanded(v => !v)}
            title={expanded ? 'Recolher' : 'Expandir'}
          >
            {expanded ? <IconChevronLeft /> : <IconChevronRight />}
          </button>

          <ul className={styles.navList}>
            {NAV_ITEMS.map(({ to, label, Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                  }
                  title={!expanded ? label : undefined}
                >
                  <Icon />
                  {expanded && <span className={styles.navLabel}>{label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className={styles.sidebarBottom}>
            <button
              className={styles.navItem}
              onClick={() => navigate('/login')}
              title={!expanded ? 'Sair' : undefined}
            >
              <IconLogout />
              {expanded && <span className={styles.navLabel}>Sair</span>}
            </button>
          </div>
        </aside>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
