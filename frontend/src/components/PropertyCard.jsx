import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BadgeCheck, BedDouble, ChevronLeft, ChevronRight, Heart, MapPin, Maximize2, Users } from 'lucide-react'
import { Img, RatingPill } from './ui'
import { useLang } from '../lib/i18n'
import { api } from '../lib/api'
import { useAuth } from '../lib/store'

export function FavButton({ id, initial = false, className = '' }) {
  const { requireAuth } = useAuth()
  const [on, setOn] = useState(initial)
  const [pop, setPop] = useState(0)
  return (
    <button
      aria-label="favorite"
      className={`grid size-9 place-items-center rounded-full bg-white/90 shadow-md backdrop-blur transition hover:scale-110 ${className}`}
      onClick={async (e) => {
        e.preventDefault(); e.stopPropagation()
        if (!(await requireAuth())) return
        setOn(!on); setPop((p) => p + 1)
        const r = await api.post(`/api/favorites/${id}`)
        setOn(r.isFavorite)
      }}
    >
      <motion.span key={pop} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500 }}>
        <Heart className={`size-[18px] ${on ? 'fill-coral text-coral' : 'text-ink'}`} />
      </motion.span>
    </button>
  )
}

export default function PropertyCard({ p, fav = false, onHover, compact = false, index = 0 }) {
  const { n, t, money, ar } = useLang()
  const [i, setI] = useState(0)
  const imgs = p.images?.length ? p.images : [null]
  const go = (d) => (e) => { e.preventDefault(); e.stopPropagation(); setI((i + d + imgs.length) % imgs.length) }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay: (index % 4) * 0.06 }}
      onMouseEnter={() => onHover?.(p.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <Link to={`/property/${p.id}`} className="group block">
        <div className={`relative overflow-hidden rounded-3xl bg-brand-50 ${compact ? 'aspect-[4/3]' : 'aspect-[4/3.4]'}`}>
          <div className="flex h-full transition-transform duration-500 ease-out" style={{ transform: `translateX(${(ar ? 1 : -1) * i * 100}%)` }}>
            {imgs.map((src, k) => (
              <Img key={k} src={src} alt={p.title} className="h-full w-full shrink-0 transition duration-700 group-hover:scale-105" />
            ))}
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />

          <div className="absolute inset-x-3 top-3 flex items-start justify-between">
            <div className="flex flex-col items-start gap-1.5">
              {p.discount > 0 && <span className="rounded-full bg-coral px-2.5 py-1 text-xs font-semibold text-white shadow">{t(`خصم ${p.discount}%`, `${p.discount}% off`)}</span>}
              {p.isFeatured && <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-brand-700 shadow">✦ {t('مميز', 'Featured')}</span>}
            </div>
            <FavButton id={p.id} initial={fav} />
          </div>

          {imgs.length > 1 && (
            <>
              <button onClick={go(ar ? 1 : -1)} className="absolute start-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 opacity-0 shadow transition group-hover:opacity-100">
                {ar ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
              </button>
              <button onClick={go(ar ? -1 : 1)} className="absolute end-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 opacity-0 shadow transition group-hover:opacity-100">
                {ar ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
              </button>
              <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1">
                {imgs.map((_, k) => <span key={k} className={`h-1.5 rounded-full bg-white transition-all ${k === i ? 'w-4' : 'w-1.5 opacity-60'}`} />)}
              </div>
            </>
          )}
          <div className="absolute bottom-3 start-3"><RatingPill value={p.rating} count={p.reviews} /></div>
        </div>

        <div className="px-1 pt-3">
          <div className="flex items-center gap-1 text-xs text-ink/50">
            <MapPin className="size-3.5" /> {n(p.city)} · {n(p.district)}
            <span className="ms-auto rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">{n(p.type)}</span>
          </div>
          <h3 className="mt-1 line-clamp-1 font-semibold group-hover:text-brand-700">{p.title}</h3>
          {!compact && (
            <div className="mt-1.5 flex items-center gap-3 text-xs text-ink/55">
              <span className="flex items-center gap-1"><Users className="size-3.5" />{p.capacity}</span>
              <span className="flex items-center gap-1"><BedDouble className="size-3.5" />{p.rooms}</span>
              <span className="flex items-center gap-1"><Maximize2 className="size-3.5" />{p.area}م²</span>
              {p.freeCancellation && <span className="flex items-center gap-1 text-mint"><BadgeCheck className="size-3.5" />{t('إلغاء مجاني', 'Free cancel')}</span>}
            </div>
          )}
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-bold">{money(p.price)}</span>
            {p.discount > 0 && <span className="text-sm text-ink/40 line-through">{money(p.oldPrice)}</span>}
            <span className="text-sm text-ink/50">/ {t('ليلة', 'night')}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export function CardSkeleton() {
  return (
    <div>
      <div className="skeleton aspect-[4/3.4] rounded-3xl" />
      <div className="skeleton mt-3 h-4 w-2/3 rounded-full" />
      <div className="skeleton mt-2 h-4 w-1/3 rounded-full" />
    </div>
  )
}
