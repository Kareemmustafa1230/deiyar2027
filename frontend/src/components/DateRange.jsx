import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLang } from '../lib/i18n'

export const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const parse = (s) => (s ? new Date(s + 'T00:00:00') : null)
export const nightsBetween = (a, b) => (a && b ? Math.round((parse(b) - parse(a)) / 86400000) : 0)
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d) }

/**
 * Two-month range calendar. `booked` is a list of {from,to} stays; their nights are disabled
 * and a range can't span them (a new check-in may start on another stay's checkout day).
 */
export default function DateRange({ value, onChange, booked = [], months = 2 }) {
  const { lang, ar } = useLang()
  const today = iso(new Date())
  const [cursor, setCursor] = useState(() => { const d = parse(value?.from) || new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [hover, setHover] = useState(null)

  const blocked = useMemo(() => {
    const set = new Set()
    for (const b of booked) for (let d = b.from; d < b.to; d = addDays(d, 1)) set.add(d)
    return set
  }, [booked])

  const pick = (d) => {
    if (!value?.from || value.to || d <= value.from) return onChange({ from: d, to: null })
    for (let x = value.from; x < d; x = addDays(x, 1)) if (blocked.has(x)) return onChange({ from: d, to: null })
    onChange({ from: value.from, to: d })
  }

  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2023, 0, 1 + i).toLocaleDateString(lang === 'ar' ? 'ar' : 'en', { weekday: 'narrow' }))
  const end = value?.to || (value?.from && hover > value.from ? hover : null)

  return (
    <div className="select-none">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" className="rounded-full p-2 hover:bg-black/5" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
          {ar ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}
        </button>
        <button type="button" className="rounded-full p-2 hover:bg-black/5" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
          {ar ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
        </button>
      </div>
      <div className={`grid gap-6 ${months > 1 ? 'md:grid-cols-2' : ''}`}>
        {Array.from({ length: months }, (_, m) => {
          const first = new Date(cursor.getFullYear(), cursor.getMonth() + m, 1)
          const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
          return (
            <div key={m} className={m > 0 ? 'hidden md:block' : ''}>
              <div className="mb-3 text-center font-semibold">{first.toLocaleDateString(lang === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en', { month: 'long', year: 'numeric' })}</div>
              <div className="grid grid-cols-7 text-center text-xs text-ink/40">
                {weekdays.map((w, i) => <div key={i} className="py-1">{w}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {Array.from({ length: first.getDay() }, (_, i) => <div key={'e' + i} />)}
                {Array.from({ length: days }, (_, i) => {
                  const d = iso(new Date(first.getFullYear(), first.getMonth(), i + 1))
                  const disabled = d < today || blocked.has(d)
                  const isStart = d === value?.from
                  const isEnd = d === end
                  const inRange = value?.from && end && d > value.from && d < end
                  return (
                    <div key={d} className={`relative ${inRange ? 'bg-brand-50' : ''} ${isStart && end ? (ar ? 'rounded-r-full bg-brand-50' : 'rounded-l-full bg-brand-50') : ''} ${isEnd && value?.from ? (ar ? 'rounded-l-full bg-brand-50' : 'rounded-r-full bg-brand-50') : ''}`}>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => pick(d)}
                        onMouseEnter={() => setHover(d)}
                        className={`mx-auto grid size-10 place-items-center rounded-full text-sm transition
                          ${isStart || isEnd ? 'bg-ink font-semibold text-white' : 'hover:ring-2 hover:ring-ink'}
                          ${disabled ? 'cursor-not-allowed text-black/20 line-through hover:ring-0' : ''}`}
                      >
                        {i + 1}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
