import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BadgeCheck, BedDouble, Bath, CalendarDays, ChevronLeft, ChevronRight, Clock, Compass, Grid3x3, Hash, Info, MapPin,
  Maximize2, PlayCircle, Share2, ShieldCheck, Star, Users, Waves, X, MessageCircle,
} from 'lucide-react'
import DateRange, { nightsBetween } from '../components/DateRange'
import { FavButton } from '../components/PropertyCard'
import PropertyCard from '../components/PropertyCard'
import { PlaceMap } from '../components/MapView'
import { Counter, Icon, Img, Modal, PageLoader, ratingLabel, Empty } from '../components/ui'
import { api, qs } from '../lib/api'
import { useAuth, useFetch, useMeta, useToast } from '../lib/store'
import { useLang, directions, directionKeys } from '../lib/i18n'

function Lightbox({ images, start, onClose }) {
  const [i, setI] = useState(start)
  const { ar } = useLang()
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'ArrowLeft') setI((x) => (x + (ar ? 1 : -1) + images.length) % images.length)
      if (e.key === 'ArrowRight') setI((x) => (x + (ar ? -1 : 1) + images.length) % images.length)
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [images.length, ar, onClose])
  return (
    <motion.div className="fixed inset-0 z-[2000] flex flex-col bg-black/95" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="flex items-center justify-between p-4 text-white">
        <span className="text-sm">{i + 1} / {images.length}</span>
        <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10"><X /></button>
      </div>
      <div className="relative flex flex-1 items-center justify-center px-4">
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="max-h-[78vh] max-w-6xl">
            <Img src={images[i]} className="max-h-[78vh] w-auto rounded-2xl" />
          </motion.div>
        </AnimatePresence>
        <button className="absolute start-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" onClick={() => setI((i - 1 + images.length) % images.length)}>{ar ? <ChevronRight /> : <ChevronLeft />}</button>
        <button className="absolute end-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" onClick={() => setI((i + 1) % images.length)}>{ar ? <ChevronLeft /> : <ChevronRight />}</button>
      </div>
      <div className="no-scrollbar flex justify-center gap-2 overflow-x-auto p-4">
        {images.map((src, k) => (
          <button key={k} onClick={() => setI(k)} className={`shrink-0 overflow-hidden rounded-xl transition ${k === i ? 'ring-2 ring-white' : 'opacity-50'}`}>
            <Img src={src} className="h-14 w-20" />
          </button>
        ))}
      </div>
    </motion.div>
  )
}

function ScoreBar({ label, value }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm"><span className="text-ink/70">{label}</span><b>{value.toFixed(1)}</b></div>
      <div className="h-2 overflow-hidden rounded-full bg-black/5">
        <motion.div className="h-full rounded-full bg-gradient-to-l from-brand-500 to-brand-700" initial={{ width: 0 }} whileInView={{ width: `${value * 10}%` }} viewport={{ once: true }} transition={{ duration: 0.8 }} />
      </div>
    </div>
  )
}

export function BookingCard({ p, onBook }) {
  const { t, money, date } = useLang()
  const { meta } = useMeta()
  const [range, setRange] = useState({ from: null, to: null })
  const [guests, setGuests] = useState(1)
  const [open, setOpen] = useState(false)
  const nights = nightsBetween(range.from, range.to)
  const fee = meta?.serviceFeePercent ?? 5
  const vat = meta?.vatPercent ?? 15
  const subtotal = p.price * nights
  const service = subtotal * fee / 100
  const tax = (subtotal + service) * vat / 100
  const total = subtotal + service + tax + (p.deposit || 0)

  return (
    <div className="card sticky top-24 p-6">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold">{money(p.price)}</span>
        {p.discountPercent > 0 && <span className="text-ink/40 line-through">{money(p.pricePerNight)}</span>}
        <span className="text-ink/50">/ {t('ليلة', 'night')}</span>
        {p.discountPercent > 0 && <span className="ms-auto rounded-full bg-coral/10 px-2 py-0.5 text-xs font-semibold text-coral">-{p.discountPercent}%</span>}
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-black/10">
        <button className="grid w-full grid-cols-2 text-start" onClick={() => setOpen(true)}>
          <div className="border-e border-black/10 p-3">
            <div className="text-[11px] font-semibold uppercase text-ink/50">{t('الوصول', 'Check-in')}</div>
            <div className="text-sm">{range.from ? date(range.from) : t('أضف تاريخ', 'Add date')}</div>
          </div>
          <div className="p-3">
            <div className="text-[11px] font-semibold uppercase text-ink/50">{t('المغادرة', 'Check-out')}</div>
            <div className="text-sm">{range.to ? date(range.to) : t('أضف تاريخ', 'Add date')}</div>
          </div>
        </button>
        <div className="flex items-center justify-between border-t border-black/10 p-3">
          <div>
            <div className="text-[11px] font-semibold uppercase text-ink/50">{t('الضيوف', 'Guests')}</div>
            <div className="text-xs text-ink/50">{t(`الحد الأقصى ${p.capacity}`, `Max ${p.capacity}`)}</div>
          </div>
          <Counter value={guests} min={1} max={p.capacity} onChange={setGuests} />
        </div>
      </div>
      <div className="mt-2 flex justify-between text-xs text-ink/50">
        <span><Clock className="inline size-3.5" /> {t('الدخول', 'In')} {p.checkInTime}</span>
        <span>{t('الخروج', 'Out')} {p.checkOutTime}</span>
      </div>

      <button className="btn-primary mt-5 w-full py-4 text-base" onClick={() => (nights > 0 ? onBook({ ...range, guests }) : setOpen(true))}>
        {nights > 0 ? t('احجز وادفع الآن', 'Reserve & pay') : t('اختر التواريخ', 'Check availability')}
      </button>

      <AnimatePresence>
        {nights > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
            <div className="mt-5 space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-ink/70 underline decoration-dotted">{money(p.price)} × {nights} {t('ليالٍ', 'nights')}</span><span>{money(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-ink/70">{t('رسوم الخدمة', 'Service fee')}</span><span>{money(service)}</span></div>
              <div className="flex justify-between"><span className="text-ink/70">{t(`ضريبة القيمة المضافة ${vat}%`, `VAT ${vat}%`)}</span><span>{money(tax)}</span></div>
              {p.deposit > 0 && <div className="flex justify-between"><span className="text-ink/70">{t('مبلغ التأمين (مسترد)', 'Refundable deposit')}</span><span>{money(p.deposit)}</span></div>}
              <div className="flex justify-between border-t border-black/10 pt-3 text-base font-bold"><span>{t('الإجمالي', 'Total')}</span><span>{money(total)}</span></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-gradient-to-l from-mint/10 to-brand-50 p-3 text-xs text-ink/70">
        <span className="rounded-md bg-ink px-1.5 py-0.5 font-bold text-white">tabby</span>
        <span className="rounded-md bg-[#ffd9c9] px-1.5 py-0.5 font-bold text-ink">tamara</span>
        {t(`قسّمها على 4 دفعات بقيمة ${money((total || p.price) / 4)} بدون فوائد`, `Split into 4 interest-free payments of ${money((total || p.price) / 4)}`)}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} wide title={t('اختر تواريخ إقامتك', 'Select your dates')}>
        <DateRange value={range} onChange={(v) => { setRange(v); if (v.to) setOpen(false) }} booked={p.booked} />
        <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-4">
          <span className="text-sm text-ink/60">{nights > 0 ? t(`${nights} ليالٍ`, `${nights} nights`) : t('التواريخ المشطوبة محجوزة', 'Crossed-out dates are booked')}</span>
          <button className="btn-ghost btn-sm" onClick={() => setRange({ from: null, to: null })}>{t('مسح', 'Clear')}</button>
        </div>
      </Modal>
    </div>
  )
}

export default function Property() {
  const { id } = useParams()
  const { data: p, loading, error } = useFetch(`/api/properties/${id}`, [id])
  const { data: reviews } = useFetch(`/api/properties/${id}/reviews`, [id])
  const { t, n, num, date } = useLang()
  const { requireAuth, user } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const [lightbox, setLightbox] = useState(null)
  const [video, setVideo] = useState(false)
  const [msg, setMsg] = useState(null)

  const groups = useMemo(() => {
    const g = {}
    for (const l of p?.lookups || []) (g[l.kind] ||= []).push(l)
    return g
  }, [p])

  if (loading) return <PageLoader />
  if (error || !p) return <div className="mx-auto max-w-3xl p-10"><Empty title={t('العقار غير موجود', 'Property not found')} /></div>

  const book = async (q) => {
    if (!(await requireAuth({ mode: 'login' }))) return
    nav(`/checkout/${p.id}` + qs({ checkIn: q.from, checkOut: q.to, guests: q.guests }))
  }
  const share = async () => {
    const url = window.location.href
    if (navigator.share) navigator.share({ title: p.title, url }).catch(() => {})
    else { await navigator.clipboard.writeText(url); toast(t('تم نسخ الرابط', 'Link copied')) }
  }
  const sendMessage = async () => {
    if (!(await requireAuth())) return
    await api.post('/api/messages', { to: p.host.id, propertyId: p.id, body: msg })
    setMsg(null)
    toast(t('تم إرسال رسالتك للمضيف', 'Message sent to the host'))
  }

  const facts = [
    [Users, t(`${p.capacity} ضيف`, `${p.capacity} guests`)],
    [BedDouble, t(`${p.rooms} غرف نوم`, `${p.rooms} bedrooms`)],
    [BedDouble, t(`${p.singleBeds + p.doubleBeds} أسرّة`, `${p.singleBeds + p.doubleBeds} beds`)],
    [Bath, t(`${p.bathrooms} دورات مياه`, `${p.bathrooms} baths`)],
    [Maximize2, `${num(p.area)} م²`],
    p.pools > 0 && [Waves, t(`${p.pools} مسبح`, `${p.pools} pools`)],
    [Compass, t(...directions[directionKeys.indexOf(p.direction)] || ['', ''])],
  ].filter(Boolean)

  const kindTitles = {
    Amenity: t('المزايا والمرفقات', 'Amenities'), Kitchen: t('مرافق المطبخ', 'Kitchen'), PoolType: t('المسابح', 'Pools'),
    BathType: t('الحمامات', 'Bathrooms'), Classification: t('التصنيف', 'Style'), Category: t('مناسب لـ', 'Suitable for'), Policy: t('السياسات', 'Policies'),
  }
  const imgs = p.images.length ? p.images : [null]

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 md:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-brand-50 px-2.5 py-1 font-medium text-brand-700">{n(p.type)}</span>
            {groups.Category?.slice(0, 2).map((c) => <span key={c.id} className="rounded-full bg-black/5 px-2.5 py-1">{n(c)}</span>)}
            <span className="flex items-center gap-1 text-ink/50"><Hash className="size-3.5" />{p.code}</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold md:text-4xl">{p.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink/60">
            {p.rating > 0 && (
              <span className="flex items-center gap-1 font-semibold text-ink"><Star className="size-4 fill-gold text-gold" />{p.rating.toFixed(1)} · {ratingLabel(p.rating, t)}
                <a href="#reviews" className="font-normal text-ink/60 underline">({num(p.reviewsCount)} {t('تقييم', 'reviews')})</a></span>
            )}
            <span className="flex items-center gap-1"><MapPin className="size-4" />{n(p.city)}، {n(p.district)}</span>
            <span className="flex items-center gap-1"><Maximize2 className="size-4" />{num(p.area)} م²</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost btn-sm" onClick={share}><Share2 className="size-4" />{t('مشاركة', 'Share')}</button>
          <FavButton id={p.id} initial={p.isFavorite} className="!size-10 border border-black/10 !shadow-none" />
        </div>
      </div>

      {/* Gallery */}
      <div className="relative mt-6 grid h-[300px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-3xl md:h-[480px]">
        {imgs.slice(0, 5).map((src, k) => (
          <button key={k} onClick={() => setLightbox(k)} className={`group relative overflow-hidden ${k === 0 ? 'col-span-4 row-span-2 md:col-span-2' : 'hidden md:block'}`}>
            <Img src={src} className="h-full w-full transition duration-700 group-hover:scale-105" />
            <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
          </button>
        ))}
        <div className="absolute bottom-4 end-4 flex gap-2">
          {p.videoUrl && <button onClick={() => setVideo(true)} className="btn-ghost btn-sm shadow-md"><PlayCircle className="size-4" />{t('فيديو', 'Video')}</button>}
          <button onClick={() => setLightbox(0)} className="btn-ghost btn-sm shadow-md"><Grid3x3 className="size-4" />{t(`عرض كل الصور (${imgs.length})`, `Show all photos (${imgs.length})`)}</button>
        </div>
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-3">
            {facts.map(([I, l], k) => (
              <span key={k} className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm shadow-sm"><I className="size-5 text-brand-600" />{l}</span>
            ))}
          </div>

          {p.locationGuaranteed && (
            <div className="mt-6 flex items-start gap-4 rounded-3xl border border-mint/30 bg-mint/5 p-5">
              <ShieldCheck className="size-8 shrink-0 text-mint" />
              <div>
                <div className="font-semibold">{t('موثّق من ديار', 'Verified by Diyar')}</div>
                <p className="text-sm text-ink/60">{t('تحققنا من صحة معلومات الموقع والصور لهذا العقار.', 'We verified the location and photos of this listing.')}</p>
              </div>
            </div>
          )}

          <section className="mt-8 border-t border-black/5 pt-8">
            <h2 className="text-xl font-semibold">{t('عن هذا المكان', 'About this place')}</h2>
            <p className="mt-3 whitespace-pre-line leading-8 text-ink/75">{p.description}</p>
            <p className="mt-3 flex items-center gap-2 text-sm text-ink/55"><MapPin className="size-4" />{p.address}</p>
          </section>

          {/* Host */}
          <section className="mt-8 flex flex-wrap items-center gap-4 rounded-3xl bg-white p-6 shadow-soft">
            <Img src={p.host.avatarUrl} className="size-16 rounded-2xl" />
            <div className="flex-1">
              <div className="text-sm text-ink/50">{t('المضيف', 'Hosted by')}</div>
              <div className="text-lg font-semibold">{p.host.fullName}</div>
              <div className="mt-0.5 flex flex-wrap gap-3 text-sm text-ink/60">
                {p.host.rating > 0 && <span className="flex items-center gap-1"><Star className="size-4 fill-gold text-gold" />{p.host.rating.toFixed(1)}</span>}
                <span>{t(`${p.host.properties} عقار`, `${p.host.properties} listings`)}</span>
                <span>{t('مضيف منذ', 'Host since')} {date(p.host.since, { year: 'numeric', month: 'long' })}</span>
              </div>
              {p.host.bio && <p className="mt-2 text-sm text-ink/70">{p.host.bio}</p>}
            </div>
            {user?.id !== p.host.id && <button className="btn-ghost" onClick={() => setMsg('')}><MessageCircle className="size-4" />{t('راسل المضيف', 'Message host')}</button>}
          </section>

          {/* Specs & features */}
          <section className="mt-10 border-t border-black/5 pt-8">
            <h2 className="text-xl font-semibold">{t('المواصفات والمزايا', 'Specs & features')}</h2>
            <div className="mt-5 space-y-6">
              {Object.entries(kindTitles).filter(([k]) => groups[k]).map(([k, title]) => (
                <div key={k}>
                  <div className="mb-3 text-sm font-semibold text-ink/50">{title}</div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {groups[k].map((l) => (
                      <div key={l.id} className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white p-3 text-sm">
                        <Icon name={l.icon} className="size-5 text-brand-600" />{n(l)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Terms */}
          <section className="mt-10 grid gap-4 border-t border-black/5 pt-8 md:grid-cols-2">
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h3 className="flex items-center gap-2 font-semibold"><CalendarDays className="size-5 text-brand-600" />{t('شروط الحجز', 'Booking terms')}</h3>
              <ul className="mt-3 space-y-2 text-sm text-ink/70">
                <li>• {t(`الدخول من ${p.checkInTime} — الخروج حتى ${p.checkOutTime}`, `Check-in from ${p.checkInTime} — check-out by ${p.checkOutTime}`)}</li>
                <li>• {p.deposit > 0 ? t(`مبلغ تأمين مسترد: ${p.deposit} ر.س`, `Refundable deposit: SAR ${p.deposit}`) : t('بدون مبلغ تأمين', 'No security deposit')}</li>
                <li>• {t(`الحد الأقصى للضيوف: ${p.capacity}`, `Maximum guests: ${p.capacity}`)}</li>
              </ul>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h3 className="flex items-center gap-2 font-semibold"><Info className="size-5 text-brand-600" />{t('سياسة الإلغاء والاسترجاع', 'Cancellation & refunds')}</h3>
              <p className="mt-3 text-sm text-ink/70">
                {p.freeCancellation && <span className="mb-2 flex items-center gap-1 font-semibold text-mint"><BadgeCheck className="size-4" />{t('إلغاء مجاني', 'Free cancellation')}</span>}
                {p.cancellationPolicy || t('غير قابل للاسترداد', 'Non-refundable')}
              </p>
            </div>
          </section>

          {/* Reviews */}
          <section id="reviews" className="mt-10 scroll-mt-24 border-t border-black/5 pt-8">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Star className="size-6 fill-gold text-gold" />
              {reviews?.summary.count ? `${reviews.summary.overall.toFixed(1)} · ${t(`${num(reviews.summary.count)} تقييم`, `${num(reviews.summary.count)} reviews`)}` : t('لا توجد تقييمات بعد', 'No reviews yet')}
            </h2>
            {reviews?.summary.count > 0 && (
              <>
                <div className="mt-5 grid gap-x-10 gap-y-4 md:grid-cols-2">
                  <ScoreBar label={t('التقييم العام', 'Overall')} value={reviews.summary.overall} />
                  <ScoreBar label={t('مصداقية المعلومات', 'Accuracy')} value={reviews.summary.accuracy} />
                  <ScoreBar label={t('النظافة', 'Cleanliness')} value={reviews.summary.cleanliness} />
                  <ScoreBar label={t('المرافق', 'Facilities')} value={reviews.summary.facilities} />
                  <ScoreBar label={t('المضيف', 'Host')} value={reviews.summary.host} />
                </div>
                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  {reviews.items.slice(0, 8).map((r) => (
                    <div key={r.id} className="rounded-3xl bg-white p-5 shadow-sm">
                      <div className="flex items-center gap-3">
                        <Img src={r.avatar} className="size-10 rounded-full" />
                        <div className="flex-1">
                          <div className="font-semibold">{r.guest}</div>
                          <div className="text-xs text-ink/50">{date(r.createdAt, { month: 'long', year: 'numeric' })}</div>
                        </div>
                        <span className="rounded-xl bg-brand-50 px-2 py-1 text-sm font-bold text-brand-700">{r.overall}/10</span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-ink/75">{r.comment}</p>
                      {r.hostReply && <div className="mt-3 rounded-2xl bg-sand p-3 text-sm"><b className="text-ink/60">{t('رد المضيف:', 'Host reply:')}</b> {r.hostReply}</div>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* Map */}
          <section className="mt-10 border-t border-black/5 pt-8">
            <h2 className="text-xl font-semibold">{t('الموقع', 'Location')}</h2>
            <p className="mt-1 text-sm text-ink/55">
              {p.exact ? p.address : t('يظهر الموقع الدقيق بعد تأكيد الحجز', 'The exact location is shared after your booking is confirmed')}
            </p>
            <div className="mt-4 h-96 overflow-hidden rounded-3xl"><PlaceMap lat={p.lat} lng={p.lng} exact={p.exact} className="h-full w-full" /></div>
          </section>
        </div>

        <div><BookingCard p={p} onBook={book} /></div>
      </div>

      {p.similar?.length > 0 && (
        <section className="mt-16">
          <h2 className="section-title mb-6">{t('عقارات مشابهة', 'Similar stays')}</h2>
          <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {p.similar.map((s, i) => <PropertyCard key={s.id} p={s} index={i} />)}
          </div>
        </section>
      )}

      <AnimatePresence>{lightbox != null && <Lightbox images={imgs} start={lightbox} onClose={() => setLightbox(null)} />}</AnimatePresence>
      <Modal open={video} onClose={() => setVideo(false)} wide>
        {p.videoUrl && <div className="aspect-video overflow-hidden rounded-2xl"><iframe src={p.videoUrl.replace('watch?v=', 'embed/')} className="h-full w-full" allowFullScreen title="video" /></div>}
      </Modal>
      <Modal open={msg != null} onClose={() => setMsg(null)} title={t(`راسل ${p.host.fullName}`, `Message ${p.host.fullName}`)}>
        <textarea className="input min-h-32" value={msg || ''} onChange={(e) => setMsg(e.target.value)} placeholder={t('اكتب استفسارك…', 'Write your question…')} />
        <button className="btn-primary mt-4 w-full" disabled={!msg?.trim()} onClick={sendMessage}>{t('إرسال', 'Send')}</button>
      </Modal>
    </div>
  )
}
