import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, Globe, Home, LogOut, Menu, X } from 'lucide-react'
import { Icon, Img, Logo, PageLoader } from './ui'
import { useAuth } from '../lib/store'
import { useLang } from '../lib/i18n'

/** Sidebar shell shared by the host, provider and admin dashboards. `links` = [path, icon, ar, en][] */
export default function DashLayout({ roles, links, title }) {
  const { user, logout, unread, requireAuth } = useAuth()
  const { t, toggle, ar } = useLang()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => { setOpen(false); window.scrollTo(0, 0) }, [pathname])
  useEffect(() => { if (!user) requireAuth({ mode: 'login' }) }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) return <PageLoader />
  if (!roles.includes(user.role)) return <Navigate to="/" replace />

  const nav = (
    <nav className="flex h-full flex-col gap-1 p-4">
      <Link to="/" className="mb-6 px-2"><Logo light /></Link>
      <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-white/40">{title}</div>
      {links.map(([to, icon, ar, en], i) => (
        <NavLink key={to} to={to} end={i === 0}
          className={({ isActive }) => `relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'text-ink' : 'text-white/65 hover:bg-white/5 hover:text-white'}`}>
          {({ isActive }) => (
            <>
              {isActive && <motion.span layoutId="dash-active" className="absolute inset-0 rounded-2xl bg-white" transition={{ type: 'spring', damping: 30, stiffness: 400 }} />}
              <Icon name={icon} className="relative size-5" />
              <span className="relative">{t(ar, en)}</span>
            </>
          )}
        </NavLink>
      ))}
      <div className="mt-auto space-y-1 border-t border-white/10 pt-4">
        <Link to="/" className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-white/65 hover:bg-white/5 hover:text-white"><Home className="size-5" />{t('الموقع الرئيسي', 'Main site')}</Link>
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-coral hover:bg-white/5"><LogOut className="size-5" />{t('تسجيل الخروج', 'Log out')}</button>
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen bg-sand">
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-64 bg-ink lg:block">{nav}</aside>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 bg-ink/50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
            <motion.aside onClick={(e) => e.stopPropagation()} initial={{ x: ar ? '100%' : '-100%' }} animate={{ x: 0 }} exit={{ x: ar ? '100%' : '-100%' }} className="absolute inset-y-0 start-0 w-72 bg-ink">
              {nav}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="lg:ps-64">
        <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 px-4 md:px-8">
          <button className="rounded-xl p-2 hover:bg-black/5 lg:hidden" onClick={() => setOpen(true)}>{open ? <X /> : <Menu />}</button>
          <div className="ms-auto flex items-center gap-2">
            <button onClick={toggle} className="flex items-center gap-1 rounded-full px-3 py-2 text-sm hover:bg-black/5"><Globe className="size-4" />{t('EN', 'ع')}</button>
            <Link to="/notifications" className="relative rounded-full p-2 hover:bg-black/5">
              <Bell className="size-5" />
              {unread > 0 && <span className="absolute end-1 top-1 size-2 rounded-full bg-coral" />}
            </Link>
            <Link to="/profile" className="flex items-center gap-2 rounded-full bg-white py-1 pe-3 ps-1 shadow-sm">
              <Img src={user.avatarUrl} className="size-8 rounded-full" />
              <span className="hidden text-sm font-medium sm:block">{user.fullName}</span>
            </Link>
          </div>
        </header>
        <main className="p-4 md:p-8">
          <motion.div key={pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  )
}

export const DashHeader = ({ title, subtitle, action }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 text-ink/55">{subtitle}</p>}
    </div>
    {action}
  </div>
)

/** Compact responsive table used across dashboards. */
export function Table({ cols, rows, empty }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-sand text-start text-xs uppercase text-ink/50">
            <tr>{cols.map((c, i) => <th key={i} className="whitespace-nowrap px-4 py-3 text-start font-semibold">{c}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rows.length === 0 ? (
              <tr><td colSpan={cols.length} className="px-4 py-12 text-center text-ink/40">{empty}</td></tr>
            ) : rows.map((r, i) => (
              <tr key={i} className="transition hover:bg-brand-50/30">{r.map((c, k) => <td key={k} className="whitespace-nowrap px-4 py-3">{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
