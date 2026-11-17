import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import * as Lucide from 'lucide-react'
import { Loader2, Minus, Plus, Star, X } from 'lucide-react'
import { useLang, statusText } from '../lib/i18n'
import { assetUrl } from '../lib/api'

const pascal = (s) => s.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase())

/** Renders a lucide icon from the kebab-case names stored in the database. */
export function Icon({ name, ...props }) {
  const I = (name && Lucide[pascal(name)]) || Lucide.Sparkle
  return <I {...props} />
}

export function Logo({ light = false, className = '' }) {
  const { t } = useLang()
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {/* Diyar mark: blue ribbon woven through the grey "D" */}
      <svg viewBox="170 20 748 712" className="h-10 w-auto">
        <g fill="#4190b5">
          <path d="M180 328v-16c60-12 82-92 80-174h21c-1 52 63 67 63 67l416-1c70 0 148 36 148 121v250H470V448h339v-63c-4-30-17-57-39-57Z" />
          <path d="M182 448h162v123h-57c-2 19 8 34 26 45-63 0-108 29-122 97h-9Z" />
        </g>
        <path
          fill={light ? '#e3e6e7' : '#a7aaab'}
          fillRule="evenodd"
          d="M344 28h218c118 0 153 112 158 167v380c0 115-90 148-140 148H344ZM470 136h58c32 0 65 19 65 69v370c0 35-28 45-42 48h-81Z"
        />
        <path fill="#4190b5" d="M344 205h126v123H344zM593 448h127v127H593z" />
      </svg>
      <span className={`text-2xl font-bold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>{t('ديار', 'Diyar')}</span>
    </span>
  )
}

export function Img({ src, alt = '', className = '', ...rest }) {
  const [err, setErr] = useState(false)
  if (!src || err)
    return <div className={`bg-gradient-to-br from-brand-200 via-brand-100 to-gold/30 ${className}`} aria-label={alt} />
  return <img src={assetUrl(src)} alt={alt} loading="lazy" onError={() => setErr(true)} className={`object-cover ${className}`} {...rest} />
}

export function Modal({ open, onClose, children, wide = false, title }) {
  useEffect(() => {
    if (!open) return
    const h = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', h)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1500] flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className={`relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-float sm:rounded-3xl ${wide ? 'sm:max-w-4xl' : 'sm:max-w-lg'}`}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              {title ? <h3 className="text-xl font-semibold">{title}</h3> : <span />}
              <button onClick={onClose} className="rounded-full p-2 hover:bg-black/5" aria-label="close">
                <X className="size-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function RatingPill({ value, count, dark = false }) {
  const { num } = useLang()
  if (!value) return null
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${dark ? 'bg-ink text-white' : 'bg-white/90 text-ink'}`}>
      <Star className="size-3.5 fill-gold text-gold" />
      {Number(value).toFixed(1)}
      {count != null && <span className="font-normal opacity-60">({num(count)})</span>}
    </span>
  )
}

export function ratingLabel(v, t) {
  if (v >= 9) return t('ممتاز', 'Excellent')
  if (v >= 8) return t('جيد جداً', 'Very good')
  if (v >= 7) return t('جيد', 'Good')
  if (v >= 6) return t('مرضي', 'Fair')
  return t('جديد', 'New')
}

export function StatusBadge({ status }) {
  const { t } = useLang()
  const color = {
    Confirmed: 'bg-brand-50 text-brand-700', Approved: 'bg-mint/10 text-mint', Completed: 'bg-mint/10 text-mint',
    Done: 'bg-mint/10 text-mint', Answered: 'bg-mint/10 text-mint', CheckedIn: 'bg-gold/15 text-amber-700',
    Arrived: 'bg-gold/15 text-amber-700', Accepted: 'bg-brand-50 text-brand-700', Pending: 'bg-gold/15 text-amber-700',
    Open: 'bg-gold/15 text-amber-700', Cancelled: 'bg-coral/10 text-coral', Rejected: 'bg-coral/10 text-coral',
    Hidden: 'bg-black/5 text-black/50', Closed: 'bg-black/5 text-black/50',
  }[status] || 'bg-black/5'
  const [a, e] = statusText[status] || [status, status]
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${color}`}>{t(a, e)}</span>
}

export function Empty({ icon = 'search-x', title, text, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-brand-200 bg-white/60 px-6 py-16 text-center">
      <div className="mb-4 grid size-16 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon name={icon} className="size-8" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-ink/60">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export const Spinner = ({ className = 'size-5' }) => <Loader2 className={`animate-spin ${className}`} />

export function PageLoader() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <Spinner className="size-8 text-brand-600" />
    </div>
  )
}

export function Counter({ value, onChange, min = 0, max = 99 }) {
  return (
    <div className="inline-flex items-center gap-3">
      <button type="button" className="grid size-9 place-items-center rounded-full border border-black/10 hover:border-brand-400 disabled:opacity-30" disabled={value <= min} onClick={() => onChange(value - 1)}>
        <Minus className="size-4" />
      </button>
      <span className="w-6 text-center font-semibold tabular-nums">{value}</span>
      <button type="button" className="grid size-9 place-items-center rounded-full border border-black/10 hover:border-brand-400 disabled:opacity-30" disabled={value >= max} onClick={() => onChange(value + 1)}>
        <Plus className="size-4" />
      </button>
    </div>
  )
}

export function StatCard({ icon, label, value, hint, tone = 'brand' }) {
  const tones = {
    brand: 'from-brand-500 to-brand-700 text-white',
    gold: 'from-gold/20 to-gold/5 text-amber-700',
    mint: 'from-mint/20 to-mint/5 text-emerald-700',
    coral: 'from-coral/20 to-coral/5 text-coral',
  }
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-ink/55">{label}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
          {hint && <div className="mt-1 text-xs text-ink/50">{hint}</div>}
        </div>
        <div className={`grid size-11 place-items-center rounded-2xl bg-gradient-to-br ${tones[tone]}`}>
          <Icon name={icon} className="size-5" />
        </div>
      </div>
    </motion.div>
  )
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-2xl bg-white p-1 shadow-soft">
      {tabs.map(([key, label]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`relative whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition ${value === key ? 'text-white' : 'text-ink/60 hover:text-ink'}`}
        >
          {value === key && <motion.span layoutId={`tab-${tabs.map((x) => x[0]).join()}`} className="absolute inset-0 rounded-xl bg-ink" />}
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  )
}

export function Confirm({ open, onClose, onConfirm, title, text, danger, confirmText }) {
  const { t } = useLang()
  const [busy, setBusy] = useState(false)
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-ink/70">{text}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>{t('تراجع', 'Back')}</button>
        <button
          className={danger ? 'btn bg-coral text-white' : 'btn-primary'}
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try { await onConfirm() } finally { setBusy(false) }
            onClose()
          }}
        >
          {busy && <Spinner />} {confirmText || t('تأكيد', 'Confirm')}
        </button>
      </div>
    </Modal>
  )
}

export function Stars({ value, onChange, max = 5, size = 'size-7' }) {
  return (
    <div className="flex gap-1" dir="ltr">
      {Array.from({ length: max }, (_, i) => (
        <button type="button" key={i} onClick={() => onChange?.(i + 1)}>
          <Star className={`${size} transition ${i < value ? 'fill-gold text-gold' : 'text-black/15'} ${onChange ? 'hover:scale-110' : ''}`} />
        </button>
      ))}
    </div>
  )
}
