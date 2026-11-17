import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BarChart3, Bell, CalendarCheck, ClipboardCheck, Eye, Headphones, Lock, MessageSquareLock, PlayCircle, Rocket, ShieldCheck,
  Sparkles, Star, Tag, Wallet, Smile, Home as HomeIcon,
} from 'lucide-react'
import { Img } from '../components/ui'
import { api, qs } from '../lib/api'
import { useAuth, useFetch, useMeta, useToast } from '../lib/store'
import { useLang } from '../lib/i18n'

function Calculator() {
  const { meta } = useMeta()
  const { t, n, money } = useLang()
  const { data: settings } = useFetch('/api/settings/public')
  const [typeId, setTypeId] = useState('')
  const [cityId, setCityId] = useState('')
  const [est, setEst] = useState(null)

  useEffect(() => {
    if (!meta) return
    setTypeId((v) => v || meta.types[0]?.id)
    setCityId((v) => v || meta.cities[0]?.id)
  }, [meta])
  useEffect(() => {
    if (typeId && cityId) api.get('/api/estimate' + qs({ typeId, cityId })).then(setEst)
  }, [typeId, cityId])

  return (
    <section className="relative mx-auto mt-24 max-w-7xl px-4 md:px-6">
      <div className="relative overflow-hidden rounded-[40px]">
        <Img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1800&q=80" className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-l from-ink/90 via-ink/70 to-ink/30" />
        <div className="relative grid gap-10 p-8 md:grid-cols-2 md:p-14">
          <div className="text-white">
            <span className="text-sm font-semibold text-gold">{t('حاسبة الدخل المتوقع', 'Earnings calculator')}</span>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">{t('كم يمكن أن تكسب من عقارك؟', 'How much could your property earn?')}</h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-white/70">{settings?.['site.estimateNote']}</p>
          </div>
          <div className="glass rounded-3xl p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">{t('نوع العقار', 'Property type')}</label>
                <select className="input" value={typeId} onChange={(e) => setTypeId(e.target.value)}>{meta?.types.map((x) => <option key={x.id} value={x.id}>{n(x)}</option>)}</select>
              </div>
              <div>
                <label className="label">{t('المدينة', 'City')}</label>
                <select className="input" value={cityId} onChange={(e) => setCityId(e.target.value)}>{meta?.cities.map((x) => <option key={x.id} value={x.id}>{n(x)}</option>)}</select>
              </div>
            </div>
            <div className="mt-6 rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-center text-white">
              <div className="text-sm text-white/70">{t('الإيرادات الشهرية المتوقعة', 'Estimated monthly revenue')}</div>
              <motion.div key={est?.monthly} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-2 text-4xl font-bold md:text-5xl">
                {est ? money(est.monthly) : '—'}
              </motion.div>
              {est && <div className="mt-2 text-xs text-white/60">{t(`النطاق ${money(est.low)} – ${money(est.high)} · متوسط الليلة ${money(est.avgNight)}`, `Range ${money(est.low)} – ${money(est.high)} · avg night ${money(est.avgNight)}`)}</div>}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function HostLanding() {
  const { t, num } = useLang()
  const { user, requireAuth, setSession } = useAuth()
  const { data: stats } = useFetch('/api/stats')
  const nav = useNavigate()
  const toast = useToast()

  const start = async () => {
    const u = user || (await requireAuth({ mode: 'register', role: 'Host' }))
    if (!u) return
    if (u.role === 'Guest') {
      setSession(await api.post('/api/me/become-host'))
      toast(t('أهلاً بك في عائلة مضيفي ديار 🎉', 'Welcome to the Diyar host family 🎉'))
    }
    nav('/host/properties/new')
  }

  const stories = [
    ['https://i.pravatar.cc/240?img=12', t('عبدالله — صاحب شاليه في الرياض', 'Abdullah — chalet owner, Riyadh'), t('"ارتفعت نسبة إشغال شاليهي إلى 80% خلال 3 أشهر فقط"', '"My chalet hit 80% occupancy in just 3 months"')],
    ['https://i.pravatar.cc/240?img=47', t('نورة — صاحبة شاليهات في جدة', 'Noura — chalets in Jeddah'), t('"إدارة الحجوزات صارت أسهل بكثير والتحويلات تصل بانتظام"', '"Managing bookings is so much easier and payouts are on time"')],
    ['https://i.pravatar.cc/240?img=15', t('فيصل — صاحب مزرعة في الطائف', 'Faisal — farm owner, Taif'), t('"حوّلت مزرعتي إلى مصدر دخل ثابت طوال العام"', '"My farm is now a steady source of income all year"')],
  ]
  const offers = [
    [CalendarCheck, t('إدارة الحجز بسهولة', 'Effortless booking management'), t('تقويم موحد وإشعارات فورية لكل حجز', 'Unified calendar & instant alerts')],
    [MessageSquareLock, t('تواصل آمن', 'Secure messaging'), t('نظام مراسلة داخلي يحمي خصوصيتك', 'In-app chat that protects your privacy')],
    [Star, t('تقييمات موثوقة', 'Trusted reviews'), t('فقط من ضيوف أقاموا فعلاً', 'Only from verified guests')],
    [Headphones, t('دعم 24/7', '24/7 support'), t('فريق متخصص لخدمة المضيفين', 'A dedicated host support team')],
    [BarChart3, t('تقارير وتحليلات', 'Reports & analytics'), t('إيرادات ونسب إشغال لكل عقار', 'Revenue & occupancy per listing')],
    [Sparkles, t('خدمات التنظيف والصيانة', 'Cleaning & maintenance'), t('اطلب مقدمي خدمات معتمدين بضغطة', 'Book vetted providers in a tap')],
  ]
  const steps = [
    [HomeIcon, t('أضف بيانات وحدتك', 'Add your unit'), t('نوع الوحدة، الموقع، الغرف، المرافق والصور', 'Type, location, rooms, amenities and photos')],
    [Tag, t('حدد السعر والشروط', 'Set price & rules'), t('السعر اليومي، التأمين وسياسة الإلغاء', 'Nightly price, deposit and cancellation')],
    [Eye, t('وحدتك أمام +2,000 زائر يومياً', 'Seen by 2,000+ daily visitors'), t('نشر فوري مع تحسين لمحركات البحث', 'Published with SEO optimization')],
    [ClipboardCheck, t('جهّز وحدتك للاستقبال', 'Get guest-ready'), t('قوائم تحقق للنظافة والتجهيزات', 'Cleaning & setup checklists')],
    [Bell, t('رسالة مع كل حجز', 'An alert for every booking'), t('SMS وبريد وإشعارات فورية', 'SMS, email & push')],
    [Wallet, t('نحوّل مستحقاتك', 'We pay you out'), t('تحويل تلقائي وآمن بعد كل إقامة', 'Automatic, secure transfers')],
    [Smile, t('استمتع بدخلك!', 'Enjoy your income!'), t('تقارير مالية توضح أداءك', 'Financial reports on your performance')],
  ]

  return (
    <div>
      <section className="relative overflow-hidden bg-ink pb-24 pt-32 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(116,68,255,.55),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(255,181,71,.25),transparent_50%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 md:px-6 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <span className="glass inline-flex items-center gap-2 rounded-full !bg-white/10 px-3 py-1.5 text-sm text-white"><Rocket className="size-4 text-gold" />{t('انضم لعائلة ديار', 'Join the Diyar family')}</span>
            <h1 className="mt-5 text-4xl font-bold leading-tight md:text-6xl">{t('حوّل عقارك إلى', 'Turn your property into')}<br /><span className="bg-gradient-to-l from-gold to-coral bg-clip-text text-transparent">{t('مصدر دخل ثابت', 'steady income')}</span></h1>
            <p className="mt-5 max-w-lg text-lg text-white/70">{t('أضف شاليهك أو فيلتك أو شقتك مجاناً، ودع آلاف الضيوف يكتشفونها كل يوم.', 'List your chalet, villa or apartment for free and let thousands of guests discover it every day.')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button className="btn-primary px-8 py-4 text-base" onClick={start}>{t('سجّل عقارك الآن', 'List your property')}</button>
              <a href="#how" className="btn bg-white/10 text-white hover:bg-white/20"><PlayCircle className="size-5" />{t('كيف تستضيف؟', 'How hosting works')}</a>
            </div>
          </motion.div>
          <div className="grid gap-4">
            {stories.map(([img, who, quote], i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.12 }}
                className={`glass flex items-center gap-4 rounded-3xl !bg-white/10 p-4 text-white ${i === 1 ? 'lg:ms-12' : ''}`}>
                <Img src={img} className="size-14 rounded-2xl" />
                <div><p className="font-medium">{quote}</p><p className="mt-1 text-sm text-white/60">{who}</p></div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-12 max-w-6xl px-4 md:px-6">
        <div className="grid grid-cols-2 gap-4 rounded-3xl bg-white p-6 shadow-float md:grid-cols-4">
          {[[stats?.properties, t('عقار مسجل', 'Listed properties')], [stats?.cities, t('مدينة ومحافظة', 'Cities covered')], [stats?.bookings, t('حجز ناجح', 'Successful bookings')], [stats?.activeBookings, t('حجز حالي', 'Current bookings')]].map(([v, l], i) => (
            <div key={i} className="text-center">
              <div className="bg-gradient-to-l from-brand-500 to-brand-800 bg-clip-text text-3xl font-bold text-transparent md:text-4xl">{num(v)}+</div>
              <div className="mt-1 text-sm text-ink/55">{l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-7xl px-4 md:px-6">
        <h2 className="section-title text-center">{t('ما الذي تقدمه ديار لك؟', 'What Diyar offers you')}</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map(([I, a, b], i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="card group p-6 transition hover:-translate-y-1 hover:shadow-float">
              <span className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 transition group-hover:bg-gradient-to-br group-hover:from-brand-500 group-hover:to-brand-700 group-hover:text-white"><I className="size-6" /></span>
              <h3 className="mt-5 text-lg font-semibold">{a}</h3>
              <p className="mt-1 text-sm text-ink/60">{b}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <Calculator />

      <section id="how" className="mx-auto mt-24 max-w-5xl scroll-mt-24 px-4 md:px-6">
        <h2 className="section-title text-center">{t('كيف تستضيف في 7 خطوات', 'Host in 7 steps')}</h2>
        <div className="relative mt-12">
          <div className="absolute inset-y-0 start-7 w-0.5 bg-gradient-to-b from-brand-500 via-brand-300 to-gold md:start-1/2" />
          {steps.map(([I, a, b], i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
              className={`relative mb-8 flex items-center gap-6 md:w-1/2 ${i % 2 ? 'md:ms-auto md:ps-12' : 'md:flex-row-reverse md:pe-12 md:text-end'}`}>
              <span className={`relative z-10 grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-float md:absolute ${i % 2 ? 'md:-start-7' : 'md:-end-7'}`}>
                <I className="size-6" />
              </span>
              <div className="card flex-1 p-5">
                <div className="text-xs font-bold text-brand-600">{t('الخطوة', 'Step')} {i + 1}</div>
                <h3 className="mt-1 font-semibold">{a}</h3>
                <p className="mt-1 text-sm text-ink/60">{b}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-7xl px-4 md:px-6">
        <div className="grid items-center gap-8 rounded-[40px] bg-gradient-to-br from-mint/15 via-white to-brand-50 p-8 md:grid-cols-[auto_1fr_auto] md:p-12">
          <span className="grid size-20 place-items-center rounded-3xl bg-mint text-white shadow-float"><ShieldCheck className="size-10" /></span>
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">{t('برنامج حماية ديار', 'Diyar Protect')}</h2>
            <p className="mt-2 max-w-2xl text-ink/65">{t('نحميك في الحالات النادرة التي يتسبب فيها الضيف بتلفيات لممتلكاتك أثناء الإقامة، مثل الضرر أو السرقة، وتكاليف النظافة غير الاعتيادية.', 'We cover you in the rare case a guest damages your property — including theft and unusual cleaning costs.')}</p>
          </div>
          <button className="btn-ghost" onClick={() => toast(t('تفاصيل البرنامج متاحة من فريق الدعم', 'Contact support for program details'), 'info')}><Lock className="size-4" />{t('اعرف المزيد', 'Learn more')}</button>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-4xl px-4 text-center md:px-6">
        <h2 className="text-3xl font-bold md:text-4xl">{t('جاهز تبدأ رحلتك كمضيف؟', 'Ready to start hosting?')}</h2>
        <p className="mt-3 text-ink/60">{t('التسجيل مجاني ويستغرق دقائق فقط', 'Signing up is free and takes minutes')}</p>
        <button className="btn-primary mt-8 px-10 py-4 text-base" onClick={start}>{t('سجّل عقارك الآن', 'List your property now')}</button>
      </section>
    </div>
  )
}
