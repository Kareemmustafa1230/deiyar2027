import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, BadgeCheck, Camera, CreditCard, Headphones, MapPin, Search as SearchIcon, ShieldCheck, Star, Apple, Play,
} from 'lucide-react'
import SearchBar from '../components/SearchBar'
import PropertyCard, { CardSkeleton } from '../components/PropertyCard'
import { Icon, Img } from '../components/ui'
import { useFetch } from '../lib/store'
import { useLang } from '../lib/i18n'

function Hero({ slides }) {
  const { t, ar } = useLang()
  const [i, setI] = useState(0)
  const ref = useRef()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '25%'])

  useEffect(() => {
    if (!slides?.length) return
    const id = setInterval(() => setI((x) => (x + 1) % slides.length), 7000)
    return () => clearInterval(id)
  }, [slides?.length])

  const s = slides?.[i]
  return (
    <section ref={ref} className="relative min-h-[92vh] overflow-hidden bg-ink">
      <motion.div style={{ y }} className="absolute inset-0">
        <AnimatePresence mode="sync">
          {s && (
            <motion.div key={s.id} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.2 }}>
              <Img src={s.imageUrl} className="h-full w-full animate-kenburns" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/30 to-ink/80" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(116,68,255,.35),transparent_60%)]" />

      <div className="relative mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-center px-4 pb-16 pt-28 md:px-6">
        <AnimatePresence mode="wait">
          {s && (
            <motion.div key={s.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.6 }} className="max-w-3xl text-white">
              <span className="glass inline-flex items-center gap-1.5 rounded-full !bg-white/15 px-3 py-1.5 text-sm text-white">
                <MapPin className="size-4 text-gold" /> {s.badge}
              </span>
              <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight md:text-6xl md:leading-[1.15]">
                {s.title}
              </h1>
              <p className="mt-4 max-w-xl text-lg text-white/80 md:text-xl">{s.subtitle}</p>
              <Link to={s.link || '/search'} className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-2.5 text-sm font-medium backdrop-blur transition hover:bg-white/25">
                {t('استكشف الآن', 'Explore now')} {ar ? <ArrowLeft className="size-4" /> : <ArrowRight className="size-4" />}
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7 }} className="mt-10 max-w-5xl">
          <SearchBar />
        </motion.div>

        <div className="mt-8 flex items-center gap-2">
          {slides?.map((x, k) => (
            <button key={x.id} onClick={() => setI(k)} className="h-1.5 overflow-hidden rounded-full bg-white/25 transition-all" style={{ width: k === i ? 48 : 16 }}>
              {k === i && <motion.span key={i} className="block h-full bg-white" initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 7, ease: 'linear' }} />}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

function Section({ title, subtitle, link, children, className = '' }) {
  const { t, ar } = useLang()
  return (
    <section className={`mx-auto max-w-7xl px-4 md:px-6 ${className}`}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="mt-1 text-ink/55">{subtitle}</p>}
        </div>
        {link && (
          <Link to={link} className="group flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-700">
            {t('عرض الكل', 'View all')}
            {ar ? <ArrowLeft className="size-4 transition group-hover:-translate-x-1" /> : <ArrowRight className="size-4 transition group-hover:translate-x-1" />}
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

function Grid({ items, loading }) {
  return (
    <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
      {loading ? Array.from({ length: 4 }, (_, i) => <CardSkeleton key={i} />) : items?.map((p, i) => <PropertyCard key={p.id} p={p} index={i} />)}
    </div>
  )
}

export default function Home() {
  const { data, loading } = useFetch('/api/home')
  const { t, n, num } = useLang()

  const trust = [
    [BadgeCheck, t('حجز فوري مضمون 100%', '100% guaranteed instant booking'), t('تأكيد لحظي لحجزك دون انتظار موافقة', 'Instant confirmation, no waiting for approval')],
    [CreditCard, t('دفع آمن وعلى دفعات', 'Secure, split payments'), t('بطاقات، تحويل بنكي، تمارا وتابي', 'Cards, bank transfer, Tamara & Tabby')],
    [Headphones, t('دعم على مدار الساعة 24/7', '24/7 customer support'), t('فريقنا معك في كل خطوة', 'Our team is with you at every step')],
    [Star, t('تقييمات حقيقية', 'Genuine reviews'), t('من ضيوف أقاموا فعلاً في العقار', 'Only from guests who actually stayed')],
    [SearchIcon, t('بحث متطور بعدة طرق', 'Powerful search'), t('فلاتر دقيقة وبحث على الخريطة', 'Precise filters and map search')],
    [Camera, t('جولة واقعية', 'Realistic tours'), t('صور وفيديوهات عالية الجودة', 'High-quality photos & videos')],
  ]

  return (
    <div>
      <Hero slides={data?.hero} />

      {/* Property types */}
      <section className="relative z-10 mx-auto -mt-10 max-w-7xl px-4 md:px-6">
        <div className="no-scrollbar flex gap-3 overflow-x-auto rounded-3xl bg-white p-3 shadow-soft">
          {(data?.types || Array.from({ length: 8 }, (_, i) => ({ id: i }))).map((x, i) => (
            <motion.div key={x.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Link to={`/search?typeIds=${x.id}`} className="group flex min-w-28 flex-col items-center gap-2 rounded-2xl px-4 py-3 transition hover:bg-brand-50">
                <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 transition group-hover:scale-110 group-hover:from-brand-500 group-hover:to-brand-700 group-hover:text-white">
                  <Icon name={x.icon} className="size-6" />
                </span>
                <span className="whitespace-nowrap text-sm font-medium">{n(x) || '…'}</span>
                {x.count != null && <span className="-mt-1.5 text-xs text-ink/40">{num(x.count)}</span>}
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured offers */}
      <Section title={t('عروض مميزة', 'Special offers')} subtitle={t('خصومات حصرية لفترة محدودة', 'Exclusive, limited-time deals')} className="mt-20">
        <div className="grid gap-5 md:grid-cols-3">
          {data?.offers?.map((o, i) => (
            <motion.div key={o.id} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <Link to={o.link || '/search'} className="group relative block h-64 overflow-hidden rounded-3xl">
                <Img src={o.imageUrl} className="absolute inset-0 h-full w-full transition duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent" />
                <span className="absolute start-4 top-4 rounded-full bg-gold px-3 py-1 text-xs font-bold text-ink">{o.badge}</span>
                <div className="absolute inset-x-5 bottom-5 text-white">
                  <h3 className="text-2xl font-bold">{o.title}</h3>
                  <p className="mt-1 text-sm text-white/75">{o.subtitle}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section title={t('خصومات الآن', 'Deals right now')} link="/search?offers=true" className="mt-16">
        <Grid items={data?.featured} loading={loading} />
      </Section>

      {/* Cities */}
      <Section title={t('استكشف حسب المدينة', 'Explore by city')} subtitle={t('وجهات يحبها ضيوفنا', 'Destinations our guests love')} className="mt-20">
        <div className="grid auto-rows-[180px] grid-cols-2 gap-4 md:grid-cols-4">
          {data?.cities?.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className={i === 0 ? 'col-span-2 row-span-2' : i === 3 ? 'md:row-span-2' : ''}>
              <Link to={`/search?cityId=${c.id}`} className="group relative block h-full overflow-hidden rounded-3xl">
                <Img src={c.imageUrl} className="absolute inset-0 h-full w-full transition duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/75 to-transparent" />
                <div className="absolute bottom-4 start-4 text-white">
                  <div className={`font-bold ${i === 0 ? 'text-3xl' : 'text-xl'}`}>{n(c)}</div>
                  <div className="text-sm text-white/75">{t(`${num(c.count)} عقار`, `${num(c.count)} stays`)}</div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section title={t('مقترحة لك', 'Recommended for you')} subtitle={t('بناءً على اهتماماتك وتصفحك', 'Based on your interests and browsing')} link="/search" className="mt-20">
        <Grid items={data?.recommended} loading={loading} />
      </Section>

      <Section title={t('الأعلى تقييماً', 'Top rated')} link="/search?sort=rating" className="mt-16">
        <Grid items={data?.topRated} loading={loading} />
      </Section>

      {/* About / trust */}
      <section className="mx-auto mt-24 max-w-7xl px-4 md:px-6">
        <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 p-8 text-white md:p-14">
          <div className="pointer-events-none absolute -end-20 -top-20 size-80 rounded-full bg-gold/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 start-10 size-96 rounded-full bg-brand-400/40 blur-3xl" />
          <div className="relative grid gap-10 lg:grid-cols-3">
            <div>
              <span className="text-sm font-semibold text-gold">{t('لماذا ديار؟', 'Why Diyar?')}</span>
              <h2 className="mt-2 text-3xl font-bold leading-snug md:text-4xl">{t('إقامتك المثالية، بثقة وراحة بال', 'Your perfect stay, with total peace of mind')}</h2>
              <div className="mt-8 grid grid-cols-2 gap-4">
                {[[data?.stats?.properties, t('عقار مسجل', 'Listings')], [data?.stats?.cities, t('مدينة', 'Cities')], [data?.stats?.bookings, t('حجز ناجح', 'Bookings')], [data?.stats?.guests, t('ضيف', 'Guests')]].map(([v, l], i) => (
                  <div key={i} className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                    <div className="text-3xl font-bold">{num(v)}+</div>
                    <div className="text-sm text-white/70">{l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
              {trust.map(([I, title, text], i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                  className="rounded-3xl border border-white/15 bg-white/5 p-5 backdrop-blur transition hover:bg-white/10">
                  <span className="grid size-11 place-items-center rounded-2xl bg-white text-brand-700"><I className="size-5" /></span>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-white/70">{text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* App download */}
      <section className="mx-auto mt-24 max-w-7xl px-4 md:px-6">
        <div className="grid items-center gap-10 overflow-hidden rounded-[40px] bg-white p-8 shadow-soft md:grid-cols-2 md:p-14">
          <div>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">{t('تطبيق ديار', 'Diyar app')}</span>
            <h2 className="mt-4 text-3xl font-bold leading-snug md:text-4xl">{t('احجز إقامتك القادمة من جوالك في ثوانٍ', 'Book your next stay from your phone in seconds')}</h2>
            <ul className="mt-6 space-y-3 text-ink/70">
              {[t('إشعارات فورية بالعروض والحجوزات', 'Instant alerts for deals & bookings'), t('مفاتيح رقمية ودخول ذاتي', 'Digital keys & self check-in'), t('تواصل مباشر مع المضيف', 'Chat directly with your host')].map((x) => (
                <li key={x} className="flex items-center gap-2"><ShieldCheck className="size-5 text-mint" />{x}</li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#" className="flex items-center gap-3 rounded-2xl bg-ink px-5 py-3 text-white transition hover:-translate-y-0.5"><Apple className="size-7" /><span className="text-start text-xs leading-tight">Download on the<br /><b className="text-base">App Store</b></span></a>
              <a href="#" className="flex items-center gap-3 rounded-2xl bg-ink px-5 py-3 text-white transition hover:-translate-y-0.5"><Play className="size-7" /><span className="text-start text-xs leading-tight">Get it on<br /><b className="text-base">Google Play</b></span></a>
            </div>
          </div>
          <div className="relative flex justify-center">
            <div className="absolute inset-0 m-auto size-72 rounded-full bg-gradient-to-br from-brand-200 to-gold/40 blur-2xl" />
            <div className="relative w-64 animate-float rounded-[44px] border-[10px] border-ink bg-ink shadow-float">
              <div className="overflow-hidden rounded-[34px] bg-sand">
                <div className="bg-gradient-to-br from-brand-500 to-brand-700 px-4 pb-6 pt-8 text-white">
                  <div className="text-xs opacity-75">{t('مرحباً 👋', 'Hello 👋')}</div>
                  <div className="font-semibold">{t('وين وجهتك القادمة؟', 'Where to next?')}</div>
                  <div className="mt-3 rounded-xl bg-white/20 px-3 py-2 text-xs">{t('ابحث عن شاليه، فيلا…', 'Search chalets, villas…')}</div>
                </div>
                <div className="space-y-3 p-3">
                  {data?.featured?.slice(0, 2).map((p) => (
                    <div key={p.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                      <Img src={p.images?.[0]} className="h-24 w-full" />
                      <div className="p-2 text-xs font-semibold">{p.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
