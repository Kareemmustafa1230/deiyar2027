import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell, CalendarCheck, Heart, Globe, LayoutDashboard, LifeBuoy, LogOut, Menu, Plus, Tag, User, X,
  Mail, Phone, Apple, Play,
} from 'lucide-react'
import { Icon, Logo, Img } from './ui'
import { useAuth, useMeta } from '../lib/store'
import { useLang } from '../lib/i18n'

// Brand marks (lucide v1 dropped brand icons).
const brand = (d) => (props) => <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d={d} /></svg>
const Instagram = brand('M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 4.9a4.9 4.9 0 1 0 0 9.8 4.9 4.9 0 0 0 0-9.8Zm0 8.1a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4Zm5.1-9.4a1.1 1.1 0 1 0 0 2.3 1.1 1.1 0 0 0 0-2.3Z')
const XLogo = brand('M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L1.8 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.3 4.7H5.5l11.2 14.5Z')
const Youtube = brand('M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1c.4-1.6.5-3.2.5-4.8s-.1-3.2-.5-4.8ZM9.7 15V9l5.8 3-5.8 3Z')

function UserMenu() {
  const { user, logout, unread } = useAuth()
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const ref = useRef()
  const nav = useNavigate()
  useEffect(() => {
    const h = (e) => !ref.current?.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const dash = { Host: '/host', Provider: '/provider', Admin: '/admin' }[user.role]
  const items = [
    dash && [dash, LayoutDashboard, t('لوحة التحكم', 'Dashboard')],
    ['/bookings', CalendarCheck, t('حجوزاتي', 'My bookings')],
    ['/favorites', Heart, t('المفضلة', 'Favorites')],
    ['/notifications', Bell, t('الإشعارات', 'Notifications'), unread],
    ['/profile', User, t('الملف الشخصي', 'Profile')],
    ['/support', LifeBuoy, t('الدعم والمساعدة', 'Help & support')],
  ].filter(Boolean)
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 rounded-full border border-black/10 bg-white p-1 pe-3 text-ink shadow-sm transition hover:shadow-md">
        <Menu className="ms-2 size-4" />
        <span className="relative">
          <Img src={user.avatarUrl} className="size-8 rounded-full" />
          {unread > 0 && <span className="absolute -end-1 -top-1 grid size-4 place-items-center rounded-full bg-coral text-[10px] text-white">{unread}</span>}
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="absolute end-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl bg-white p-2 text-ink shadow-float"
          >
            <div className="px-3 py-2">
              <div className="font-semibold">{user.fullName}</div>
              <div className="text-xs text-ink/50" dir="ltr">{user.phone}</div>
            </div>
            <div className="my-1 h-px bg-black/5" />
            {items.map(([to, I, label, badge]) => (
              <Link key={to} to={to} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-brand-50">
                <I className="size-4 text-ink/50" /> {label}
                {badge > 0 && <span className="ms-auto rounded-full bg-coral px-1.5 text-xs text-white">{badge}</span>}
              </Link>
            ))}
            <div className="my-1 h-px bg-black/5" />
            <button onClick={() => { logout(); setOpen(false); nav('/') }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-coral hover:bg-coral/5">
              <LogOut className="size-4" /> {t('تسجيل الخروج', 'Log out')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Navbar() {
  const { pathname } = useLocation()
  const transparentTop = pathname === '/' || pathname === '/host-with-us'
  const [scrolled, setScrolled] = useState(false)
  const [mobile, setMobile] = useState(false)
  const { user, requireAuth } = useAuth()
  const { meta } = useMeta()
  const { t, n, toggle } = useLang()

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40)
    h()
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])
  useEffect(() => { setMobile(false) }, [pathname])

  const solid = !transparentTop || scrolled || mobile
  const linkCls = `whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition ${solid ? 'text-ink/70 hover:bg-black/5 hover:text-ink' : 'text-white/85 hover:bg-white/10 hover:text-white'}`

  return (
    <header className={`fixed inset-x-0 top-0 z-[1000] transition-all duration-300 ${solid ? 'glass shadow-[0_1px_0_rgba(0,0,0,.04)]' : 'bg-transparent'}`}>
      <div className="mx-auto flex h-18 max-w-7xl items-center gap-4 px-4 py-3 md:px-6">
        <Link to="/"><Logo light={!solid} /></Link>
        <nav className="ms-4 hidden items-center gap-1 xl:flex">
          {meta?.types?.slice(0, 5).map((x) => (
            <NavLink key={x.id} to={`/search?typeIds=${x.id}`} className={linkCls}>{n(x)}</NavLink>
          ))}
          <NavLink to="/search?offers=true" className={`${linkCls} flex items-center gap-1`}>
            <Tag className="size-4 text-coral" /> {t('عروض خاصة', 'Deals')}
          </NavLink>
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <Link to="/host-with-us" className={`hidden lg:inline-flex ${linkCls} items-center gap-1`}>
            <Plus className="size-4" /> {t('أضف عقارك', 'List your property')}
          </Link>
          <button onClick={toggle} className={`${linkCls} flex items-center gap-1`} aria-label="language">
            <Globe className="size-4" /> {t('EN', 'ع')}
          </button>
          {user ? (
            <UserMenu />
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <button className={linkCls} onClick={() => requireAuth({ mode: 'login' })}>{t('تسجيل الدخول', 'Log in')}</button>
              <button className="btn-primary btn-sm" onClick={() => requireAuth({ mode: 'register' })}>{t('إنشاء حساب', 'Sign up')}</button>
            </div>
          )}
          <button className={`xl:hidden ${linkCls}`} onClick={() => setMobile(!mobile)}>{mobile ? <X className="size-5" /> : <Menu className="size-5" />}</button>
        </div>
      </div>
      <AnimatePresence>
        {mobile && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-black/5 xl:hidden">
            <div className="grid grid-cols-2 gap-2 p-4">
              {meta?.types?.map((x) => (
                <Link key={x.id} to={`/search?typeIds=${x.id}`} className="flex items-center gap-2 rounded-2xl bg-white p-3 text-sm">
                  <Icon name={x.icon} className="size-4 text-brand-600" /> {n(x)}
                </Link>
              ))}
              <Link to="/host-with-us" className="btn-soft col-span-2">{t('أضف عقارك', 'List your property')}</Link>
              {!user && <button className="btn-primary col-span-2" onClick={() => requireAuth({ mode: 'login' })}>{t('تسجيل الدخول', 'Log in')}</button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

export function Footer() {
  const { t, n } = useLang()
  const { meta } = useMeta()
  return (
    <footer className="relative mt-24 overflow-hidden bg-ink text-white">
      <div className="pointer-events-none absolute -top-40 start-1/3 size-[500px] rounded-full bg-brand-600/30 blur-[120px]" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo light />
          <p className="mt-4 max-w-sm text-sm leading-7 text-white/60">
            {t('ديار منصة سعودية لحجز الشاليهات والفلل والشقق والمزارع للإيجار اليومي، بحجز فوري مضمون ودفع آمن ودعم على مدار الساعة.',
              'Diyar is a Saudi platform for booking chalets, villas, apartments and farms by the night — instant confirmation, secure payments and 24/7 support.')}
          </p>
          <div className="mt-6 flex gap-2">
            {[Instagram, XLogo, Youtube].map((I, i) => (
              <a key={i} href="#" className="grid size-10 place-items-center rounded-full bg-white/10 transition hover:bg-brand-600"><I className="size-4" /></a>
            ))}
          </div>
        </div>
        <div>
          <h4 className="mb-4 font-semibold">{t('اكتشف', 'Discover')}</h4>
          <ul className="space-y-2.5 text-sm text-white/60">
            <li><Link to="/search?offers=true" className="hover:text-white">{t('العروض', 'Offers')}</Link></li>
            {meta?.types?.slice(0, 5).map((x) => <li key={x.id}><Link to={`/search?typeIds=${x.id}`} className="hover:text-white">{n(x)}</Link></li>)}
          </ul>
        </div>
        <div>
          <h4 className="mb-4 font-semibold">{t('ديار', 'Diyar')}</h4>
          <ul className="space-y-2.5 text-sm text-white/60">
            <li><Link to="/about" className="hover:text-white">{t('من نحن', 'About us')}</Link></li>
            <li><Link to="/host-with-us" className="hover:text-white">{t('أضف عقارك', 'Become a host')}</Link></li>
            <li><Link to="/faq" className="hover:text-white">{t('الأسئلة الشائعة', 'FAQ')}</Link></li>
            <li><Link to="/terms" className="hover:text-white">{t('الشروط والأحكام', 'Terms of use')}</Link></li>
            <li><Link to="/privacy" className="hover:text-white">{t('سياسة الخصوصية', 'Privacy policy')}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-4 font-semibold">{t('تواصل معنا', 'Contact')}</h4>
          <ul className="space-y-3 text-sm text-white/60">
            <li className="flex items-center gap-2"><Phone className="size-4" /><span dir="ltr">+966 55 660 0279</span></li>
            <li className="flex items-center gap-2"><Mail className="size-4" />Info@deiyar.com</li>
          </ul>
          <div className="mt-5 flex flex-col gap-2">
            <a href="#" className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs hover:bg-white/20"><Apple className="size-5" /> App Store</a>
            <a href="#" className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs hover:bg-white/20"><Play className="size-5" /> Google Play</a>
          </div>
        </div>
      </div>
      <div className="relative border-t border-white/10 py-6 text-center text-xs text-white/40">
        © {new Date().getFullYear()} {t('ديار. جميع الحقوق محفوظة', 'Diyar. All rights reserved')}
      </div>
    </footer>
  )
}

export default function SiteLayout() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  const bare = pathname === '/' || pathname === '/host-with-us'
  return (
    <>
      <Navbar />
      <main className={bare ? '' : 'pt-20'}>
        <Outlet />
      </main>
      <Footer />
    </>
  )
}
