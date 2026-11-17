import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Building2, CalendarDays, MapPin, Search, Users } from 'lucide-react'
import DateRange, { nightsBetween } from './DateRange'
import { Counter } from './ui'
import { useMeta } from '../lib/store'
import { useLang } from '../lib/i18n'
import { qs } from '../lib/api'

function Pop({ open, onClose, children, className = '' }) {
  const ref = useRef()
  useEffect(() => {
    if (!open) return
    const h = (e) => !ref.current?.contains(e.target) && onClose()
    setTimeout(() => document.addEventListener('mousedown', h))
    return () => document.removeEventListener('mousedown', h)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8 }}
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-full z-50 mt-3 rounded-3xl bg-white p-5 text-ink shadow-float ${className}`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function SearchBar({ initial = {}, compact = false }) {
  const { meta } = useMeta()
  const { t, n, date } = useLang()
  const nav = useNavigate()
  const [q, setQ] = useState({ q: '', cityId: '', typeIds: '', checkIn: null, checkOut: null, guests: 1, ...initial })
  const [open, setOpen] = useState(null)

  const submit = (e) => {
    e?.preventDefault()
    setOpen(null)
    nav('/search' + qs({ ...q, guests: q.guests > 1 ? q.guests : '' }))
  }

  const cell = 'relative flex-1 min-w-0 rounded-2xl px-4 py-2.5 text-start transition hover:bg-black/[.04] cursor-pointer'
  const nights = nightsBetween(q.checkIn, q.checkOut)

  return (
    <form onSubmit={submit} className={`relative flex flex-col gap-1 rounded-[28px] bg-white p-2 text-ink shadow-float md:flex-row md:items-center ${compact ? 'md:rounded-full' : ''}`}>
      <div className={cell} onClick={() => setOpen('city')}>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-ink/50"><MapPin className="size-3.5" />{t('الوجهة', 'Where')}</div>
        <input
          className="w-full truncate bg-transparent text-sm font-medium outline-none placeholder:text-ink/40"
          placeholder={t('ابحث بالمدينة أو الحي أو اسم العقار', 'City, district, or property')}
          value={q.q || (q.cityId && n(meta?.cities?.find((c) => c.id == q.cityId))) || ''}
          onChange={(e) => setQ({ ...q, q: e.target.value, cityId: '' })}
        />
        <Pop open={open === 'city'} onClose={() => setOpen(null)} className="w-full min-w-72 md:w-96">
          <div className="mb-3 text-sm font-semibold text-ink/60">{t('مدن مقترحة', 'Popular cities')}</div>
          <div className="grid grid-cols-2 gap-2">
            {meta?.cities?.map((c) => (
              <button
                type="button" key={c.id}
                className={`flex items-center gap-2 rounded-2xl p-2 text-start text-sm hover:bg-brand-50 ${q.cityId == c.id ? 'bg-brand-50 text-brand-700' : ''}`}
                onClick={(e) => { e.stopPropagation(); setQ({ ...q, cityId: c.id, q: '' }); setOpen('type') }}
              >
                <img src={c.imageUrl} alt="" className="size-10 rounded-xl object-cover" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
                {n(c)}
              </button>
            ))}
          </div>
        </Pop>
      </div>

      <div className="hidden h-8 w-px bg-black/10 md:block" />
      <div className={cell} onClick={() => setOpen('type')}>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-ink/50"><Building2 className="size-3.5" />{t('نوع العقار', 'Type')}</div>
        <div className="truncate text-sm font-medium">{q.typeIds ? n(meta?.types?.find((x) => x.id == q.typeIds)) : <span className="text-ink/40">{t('كل الأنواع', 'All types')}</span>}</div>
        <Pop open={open === 'type'} onClose={() => setOpen(null)} className="w-72">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={`chip justify-center ${!q.typeIds ? 'chip-on' : ''}`} onClick={(e) => { e.stopPropagation(); setQ({ ...q, typeIds: '' }); setOpen('dates') }}>{t('الكل', 'All')}</button>
            {meta?.types?.map((x) => (
              <button type="button" key={x.id} className={`chip justify-center ${q.typeIds == x.id ? 'chip-on' : ''}`} onClick={(e) => { e.stopPropagation(); setQ({ ...q, typeIds: x.id }); setOpen('dates') }}>{n(x)}</button>
            ))}
          </div>
        </Pop>
      </div>

      <div className="hidden h-8 w-px bg-black/10 md:block" />
      <div className={cell} onClick={() => setOpen('dates')}>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-ink/50"><CalendarDays className="size-3.5" />{t('التواريخ', 'Dates')}</div>
        <div className="truncate text-sm font-medium">
          {q.checkIn ? `${date(q.checkIn, { day: 'numeric', month: 'short' })} → ${q.checkOut ? date(q.checkOut, { day: 'numeric', month: 'short' }) : '…'}` : <span className="text-ink/40">{t('الوصول - المغادرة', 'Check-in – out')}</span>}
        </div>
        <Pop open={open === 'dates'} onClose={() => setOpen(null)} className="w-[min(92vw,720px)] md:-start-40">
          <DateRange value={{ from: q.checkIn, to: q.checkOut }} onChange={(v) => { setQ({ ...q, checkIn: v.from, checkOut: v.to }); if (v.to) setOpen('guests') }} />
          {nights > 0 && <div className="mt-3 text-center text-sm text-brand-700">{t(`${nights} ليالٍ`, `${nights} nights`)}</div>}
        </Pop>
      </div>

      <div className="hidden h-8 w-px bg-black/10 md:block" />
      <div className={cell} onClick={() => setOpen('guests')}>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-ink/50"><Users className="size-3.5" />{t('الضيوف', 'Guests')}</div>
        <div className="text-sm font-medium">{t(`${q.guests} ضيف`, `${q.guests} guest${q.guests > 1 ? 's' : ''}`)}</div>
        <Pop open={open === 'guests'} onClose={() => setOpen(null)} className="end-0 w-72">
          <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
            <span className="font-medium">{t('عدد الضيوف', 'Guests')}</span>
            <Counter value={q.guests} min={1} max={60} onChange={(v) => setQ({ ...q, guests: v })} />
          </div>
        </Pop>
      </div>

      <button className="btn-primary h-14 shrink-0 rounded-[22px] px-7 md:h-14">
        <Search className="size-5" /> <span className={compact ? 'md:hidden' : ''}>{t('ابحث', 'Search')}</span>
      </button>
    </form>
  )
}
