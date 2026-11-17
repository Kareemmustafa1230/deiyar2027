import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bell, CalendarClock, CalendarPlus, Camera, Headphones, Mail, MapPin, MessageSquare, Phone, Receipt, Star, XCircle } from 'lucide-react'
import PropertyCard from '../components/PropertyCard'
import DateRange from '../components/DateRange'
import { Confirm, Counter, Empty, Img, Modal, PageLoader, Spinner, StatusBadge, Tabs } from '../components/ui'
import { api } from '../lib/api'
import { useAuth, useFetch, useToast } from '../lib/store'
import { useLang } from '../lib/i18n'

const Page = ({ title, subtitle, children, action }) => (
  <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-ink/55">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </div>
)

function ReviewForm({ booking, onDone }) {
  const { t } = useLang()
  const toast = useToast()
  const [r, setR] = useState({ overall: 5, accuracy: 5, cleanliness: 5, facilities: 5, hostScore: 5, comment: '' })
  const keys = [['overall', t('التقييم العام', 'Overall')], ['accuracy', t('مصداقية المعلومات', 'Accuracy')], ['cleanliness', t('النظافة', 'Cleanliness')], ['facilities', t('المرافق', 'Facilities')], ['hostScore', t('المضيف', 'Host')]]
  return (
    <div className="space-y-4">
      {keys.map(([k, l]) => (
        <div key={k} className="flex items-center justify-between">
          <span>{l}</span>
          <div className="flex gap-1" dir="ltr">
            {Array.from({ length: 5 }, (_, i) => (
              <button key={i} onClick={() => setR({ ...r, [k]: i + 1 })}><Star className={`size-6 ${i < r[k] ? 'fill-gold text-gold' : 'text-black/15'}`} /></button>
            ))}
          </div>
        </div>
      ))}
      <textarea className="input min-h-24" placeholder={t('شاركنا تجربتك…', 'Share your experience…')} value={r.comment} onChange={(e) => setR({ ...r, comment: e.target.value })} />
      <button className="btn-primary w-full" onClick={async () => {
        // UI uses 5 stars; the platform stores scores out of 10.
        const x = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'number' ? v * 2 : v]))
        try { await api.post(`/api/bookings/${booking.id}/review`, x); toast(t('شكراً لتقييمك 🌟', 'Thanks for your review 🌟')); onDone() }
        catch (e) { toast(e.code === 'already_reviewed' ? t('قيّمت هذا الحجز مسبقاً', 'Already reviewed') : t('تعذر الإرسال', 'Failed'), 'error') }
      }}>{t('إرسال التقييم', 'Submit review')}</button>
    </div>
  )
}

export function Bookings() {
  const { data, loading, reload } = useFetch('/api/bookings')
  const { t, n, money, date } = useLang()
  const toast = useToast()
  const [tab, setTab] = useState('active')
  const [sel, setSel] = useState(null)
  const [action, setAction] = useState(null)
  const [range, setRange] = useState({})
  const [extend, setExtend] = useState(1)
  const [busy, setBusy] = useState(false)

  const list = useMemo(() => (data || []).filter((b) =>
    tab === 'active' ? ['Confirmed', 'CheckedIn', 'PendingPayment'].includes(b.status) : tab === 'past' ? b.status === 'Completed' : b.status === 'Cancelled'), [data, tab])

  const run = async (fn, okMsg) => {
    setBusy(true)
    try { await fn(); toast(okMsg); setAction(null); setSel(null); reload() }
    catch (e) { toast(e.code === 'not_available' ? t('التواريخ غير متاحة', 'Dates unavailable') : t('تعذر تنفيذ العملية', 'Action failed'), 'error') }
    finally { setBusy(false) }
  }

  if (loading) return <PageLoader />
  return (
    <Page title={t('حجوزاتي', 'My bookings')} subtitle={t('إدارة حجوزاتك الحالية والسابقة', 'Manage your current and past stays')}>
      <Tabs value={tab} onChange={setTab} tabs={[['active', t('الحالية والقادمة', 'Upcoming')], ['past', t('السابقة', 'Past')], ['cancelled', t('الملغاة', 'Cancelled')]]} />
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {list.length === 0 && <div className="md:col-span-2"><Empty icon="calendar-x" title={t('لا توجد حجوزات هنا', 'Nothing here yet')} action={<Link to="/search" className="btn-primary">{t('ابدأ الاستكشاف', 'Start exploring')}</Link>} /></div>}
        {list.map((b, i) => (
          <motion.button key={b.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            onClick={() => setSel(b)} className="card flex gap-4 overflow-hidden p-3 text-start transition hover:shadow-float">
            <Img src={b.property.image} className="h-32 w-32 shrink-0 rounded-2xl" />
            <div className="min-w-0 flex-1 py-1">
              <div className="flex items-start justify-between gap-2">
                <div className="line-clamp-1 font-semibold">{b.property.title}</div>
                <StatusBadge status={b.status} />
              </div>
              <div className="mt-1 text-sm text-ink/55">{n(b.property.city)} · #{b.code}</div>
              <div className="mt-2 text-sm">{date(b.checkIn)} → {date(b.checkOut)} <span className="text-ink/50">({b.nights} {t('ليالٍ', 'nights')})</span></div>
              <div className="mt-1 font-semibold">{money(b.total)}</div>
            </div>
          </motion.button>
        ))}
      </div>

      <Modal open={!!sel} onClose={() => setSel(null)} title={sel && `${t('حجز', 'Booking')} #${sel.code}`}>
        {sel && (
          <div>
            <div className="flex gap-4">
              <Img src={sel.property.image} className="size-20 rounded-2xl" />
              <div>
                <Link to={`/property/${sel.property.id}`} className="font-semibold hover:text-brand-700">{sel.property.title}</Link>
                <div className="text-sm text-ink/60">{sel.property.address}</div>
                <div className="mt-1"><StatusBadge status={sel.status} /></div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-sand p-3"><div className="text-ink/50">{t('الوصول', 'Check-in')}</div><b>{date(sel.checkIn)}</b> · {sel.property.checkInTime}</div>
              <div className="rounded-2xl bg-sand p-3"><div className="text-ink/50">{t('المغادرة', 'Check-out')}</div><b>{date(sel.checkOut)}</b> · {sel.property.checkOutTime}</div>
            </div>
            <div className="mt-5 space-y-2 rounded-2xl border border-black/5 p-4 text-sm">
              <div className="mb-1 flex items-center gap-2 font-semibold"><Receipt className="size-4" />{t('تفاصيل الدفع', 'Payment details')}</div>
              <div className="flex justify-between"><span>{money(sel.nightPrice)} × {sel.nights}</span><span>{money(sel.subtotal)}</span></div>
              <div className="flex justify-between"><span>{t('رسوم الخدمة', 'Service fee')}</span><span>{money(sel.serviceFee)}</span></div>
              <div className="flex justify-between"><span>{t('الضريبة', 'VAT')}</span><span>{money(sel.vat)}</span></div>
              {sel.deposit > 0 && <div className="flex justify-between"><span>{t('التأمين', 'Deposit')}</span><span>{money(sel.deposit)}</span></div>}
              {sel.extraFees > 0 && <div className="flex justify-between"><span>{t('رسوم تعديل', 'Change fees')}</span><span>{money(sel.extraFees)}</span></div>}
              <div className="flex justify-between border-t border-black/5 pt-2 font-bold"><span>{t('الإجمالي', 'Total')}</span><span>{money(sel.total)}</span></div>
              {sel.refund > 0 && <div className="flex justify-between text-mint"><span>{t('المسترد', 'Refunded')}</span><span>{money(sel.refund)}</span></div>}
              <div className="text-xs text-ink/50">{t('طريقة الدفع:', 'Paid with:')} {sel.paymentMethod}</div>
            </div>
            {sel.property.host && (
              <div className="mt-4 flex items-center justify-between rounded-2xl bg-brand-50 p-3 text-sm">
                <span>{t('المضيف:', 'Host:')} <b>{sel.property.host.fullName}</b></span>
                <a href={`tel:${sel.property.host.phone}`} className="btn-soft btn-sm"><Phone className="size-4" />{t('اتصال', 'Call')}</a>
              </div>
            )}
            <div className="mt-5 grid grid-cols-2 gap-2">
              {sel.status === 'Confirmed' && <button className="btn-ghost btn-sm" onClick={() => { setRange({ from: sel.checkIn, to: sel.checkOut }); setAction('change') }}><CalendarClock className="size-4" />{t('تغيير الموعد', 'Change dates')}</button>}
              {['Confirmed', 'CheckedIn'].includes(sel.status) && <button className="btn-ghost btn-sm" onClick={() => setAction('extend')}><CalendarPlus className="size-4" />{t('تمديد الإقامة', 'Extend stay')}</button>}
              {sel.status === 'Confirmed' && <button className="btn-danger btn-sm" onClick={() => setAction('cancel')}><XCircle className="size-4" />{t('إلغاء الحجز', 'Cancel')}</button>}
              {['Completed', 'CheckedIn'].includes(sel.status) && <button className="btn-soft btn-sm" onClick={() => setAction('review')}><Star className="size-4" />{t('قيّم إقامتك', 'Leave a review')}</button>}
              <Link to="/support" className="btn-ghost btn-sm"><Headphones className="size-4" />{t('طلب دعم', 'Get help')}</Link>
            </div>
          </div>
        )}
      </Modal>

      <Confirm open={action === 'cancel'} onClose={() => setAction(null)} danger title={t('إلغاء الحجز؟', 'Cancel booking?')}
        text={sel?.property.freeCancellation ? t('هذا العقار يدعم الإلغاء المجاني حتى 48 ساعة قبل الوصول.', 'Free cancellation up to 48h before check-in.') : t('قد لا يكون المبلغ قابلاً للاسترداد حسب سياسة العقار، ويسترد مبلغ التأمين فقط.', 'Per the policy only the deposit may be refunded.')}
        confirmText={t('نعم، ألغِ الحجز', 'Yes, cancel')}
        onConfirm={() => run(() => api.post(`/api/bookings/${sel.id}/cancel`), t('تم إلغاء الحجز', 'Booking cancelled'))} />

      <Modal open={action === 'change'} onClose={() => setAction(null)} wide title={t('تغيير موعد الحجز', 'Change dates')}>
        <p className="mb-4 rounded-xl bg-gold/15 p-3 text-sm text-amber-800">{t('قد يترتب على تغيير الموعد رسوم إضافية تحددها الإدارة.', 'Changing dates may incur an additional fee.')}</p>
        <DateRange value={range} onChange={setRange} />
        <button className="btn-primary mt-4 w-full" disabled={!range.to || busy}
          onClick={() => run(() => api.post(`/api/bookings/${sel.id}/change-dates`, { checkIn: range.from, checkOut: range.to }), t('تم تعديل الموعد', 'Dates updated'))}>
          {busy && <Spinner />}{t('تأكيد الموعد الجديد', 'Confirm new dates')}
        </button>
      </Modal>

      <Modal open={action === 'extend'} onClose={() => setAction(null)} title={t('تمديد الإقامة', 'Extend your stay')}>
        <div className="flex items-center justify-between"><span>{t('عدد الليالي الإضافية', 'Extra nights')}</span><Counter value={extend} min={1} max={30} onChange={setExtend} /></div>
        <p className="mt-3 text-sm text-ink/60">{t('يُدفع مبلغ التمديد بنفس طريقة الدفع الأصلية دون مبلغ تأمين جديد.', 'Charged to the original payment method, without a new deposit.')}</p>
        <button className="btn-primary mt-5 w-full" disabled={busy} onClick={() => run(() => api.post(`/api/bookings/${sel.id}/extend`, { nights: extend }), t('تم تمديد الحجز', 'Stay extended'))}>{busy && <Spinner />}{t('تمديد', 'Extend')}</button>
      </Modal>

      <Modal open={action === 'review'} onClose={() => setAction(null)} title={t('قيّم إقامتك', 'Rate your stay')}>
        {sel && <ReviewForm booking={sel} onDone={() => { setAction(null); setSel(null) }} />}
      </Modal>
    </Page>
  )
}

export function Favorites() {
  const { data, loading } = useFetch('/api/favorites')
  const { t } = useLang()
  if (loading) return <PageLoader />
  return (
    <Page title={t('المفضلة', 'Favorites')} subtitle={t('العقارات التي حفظتها لتعود إليها بسهولة', 'Stays you saved for later')}>
      {data?.length ? (
        <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">{data.map((p, i) => <PropertyCard key={p.id} p={p} fav index={i} />)}</div>
      ) : <Empty icon="heart" title={t('لا توجد عقارات مفضلة بعد', 'No favorites yet')} text={t('اضغط على ♥ في أي عقار لحفظه هنا', 'Tap ♥ on any stay to save it')} action={<Link to="/search" className="btn-primary">{t('استكشف', 'Explore')}</Link>} />}
    </Page>
  )
}

export function Profile() {
  const { user, refresh } = useAuth()
  const { t } = useLang()
  const toast = useToast()
  const [f, setF] = useState(() => ({ fullName: user?.fullName || '', email: user?.email || '', address: user?.address || '', birthDate: user?.birthDate || '', avatarUrl: user?.avatarUrl || '', bio: user?.bio || '' }))
  const [busy, setBusy] = useState(false)
  if (!user) return null
  const save = async () => {
    setBusy(true)
    try { await api.put('/api/me', { ...f, birthDate: f.birthDate || null }); await refresh(); toast(t('تم حفظ التغييرات', 'Saved')) } finally { setBusy(false) }
  }
  return (
    <Page title={t('الملف الشخصي', 'Profile')}>
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="card flex flex-col items-center p-6 text-center">
          <label className="group relative cursor-pointer">
            <Img src={f.avatarUrl} className="size-28 rounded-full ring-4 ring-brand-100" />
            <span className="absolute inset-0 grid place-items-center rounded-full bg-black/40 text-white opacity-0 transition group-hover:opacity-100"><Camera /></span>
            <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const [url] = await api.upload(e.target.files); setF({ ...f, avatarUrl: url }) }} />
          </label>
          <div className="mt-4 text-lg font-semibold">{user.fullName}</div>
          <div className="text-sm text-ink/50" dir="ltr">{user.phone}</div>
          <div className="mt-6 grid w-full gap-2">
            <Link to="/bookings" className="btn-ghost btn-sm">{t('حجوزاتي', 'My bookings')}</Link>
            <Link to="/favorites" className="btn-ghost btn-sm">{t('المفضلة', 'Favorites')}</Link>
            <Link to="/support" className="btn-ghost btn-sm">{t('الدعم الفني', 'Support')}</Link>
          </div>
        </div>
        <div className="card p-6">
          <h2 className="text-lg font-semibold">{t('المعلومات الشخصية', 'Personal info')}</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div><label className="label">{t('الاسم الكامل', 'Full name')}</label><input className="input" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></div>
            <div><label className="label">{t('البريد الإلكتروني', 'Email')}</label><input className="input" dir="ltr" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div><label className="label">{t('رقم الجوال', 'Phone')}</label><input className="input bg-black/5" dir="ltr" value={user.phone} disabled /></div>
            <div><label className="label">{t('تاريخ الميلاد', 'Birth date')}</label><input className="input" type="date" value={f.birthDate || ''} onChange={(e) => setF({ ...f, birthDate: e.target.value })} /></div>
            <div className="md:col-span-2"><label className="label">{t('العنوان', 'Address')}</label><input className="input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
            {user.role !== 'Guest' && <div className="md:col-span-2"><label className="label">{t('نبذة', 'Bio')}</label><textarea className="input min-h-24" value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} /></div>}
          </div>
          <h2 className="mt-8 text-lg font-semibold">{t('طرق الدفع المحفوظة', 'Saved payment methods')}</h2>
          <p className="mt-2 rounded-2xl bg-sand p-4 text-sm text-ink/60">{t('تُحفظ البطاقات بشكل آمن لدى بوابة الدفع عند أول عملية دفع، ويمكنك إدارتها من هنا.', 'Cards are tokenized by the payment gateway on your first payment and can be managed here.')}</p>
          <button className="btn-primary mt-6" disabled={busy} onClick={save}>{busy && <Spinner />}{t('حفظ التغييرات', 'Save changes')}</button>
        </div>
      </div>
    </Page>
  )
}

export function Notifications() {
  const { data, loading } = useFetch('/api/me/notifications')
  const { setUnread } = useAuth()
  const { t, date, time } = useLang()
  useEffect(() => { if (data) api.post('/api/me/notifications/read').then(() => setUnread(0)) }, [data]) // eslint-disable-line react-hooks/exhaustive-deps
  if (loading) return <PageLoader />
  return (
    <Page title={t('الإشعارات', 'Notifications')}>
      {!data?.length ? <Empty icon="bell" title={t('لا توجد إشعارات', 'No notifications')} /> : (
        <div className="card divide-y divide-black/5">
          {data.map((x) => (
            <Link key={x.id} to={x.link || '#'} className={`flex gap-4 p-5 transition hover:bg-brand-50/40 ${!x.isRead ? 'bg-brand-50/60' : ''}`}>
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-700"><Bell className="size-5" /></span>
              <div className="flex-1">
                <div className="font-semibold">{x.title}</div>
                <div className="text-sm text-ink/65">{x.body}</div>
              </div>
              <div className="shrink-0 text-xs text-ink/40">{date(x.createdAt, { day: 'numeric', month: 'short' })} · {time(x.createdAt)}</div>
            </Link>
          ))}
        </div>
      )}
    </Page>
  )
}

export function Support() {
  const { data, reload } = useFetch('/api/tickets')
  const { t, date } = useLang()
  const toast = useToast()
  const [f, setF] = useState({ subject: '', message: '' })
  return (
    <Page title={t('الدعم والمساعدة', 'Help & support')} subtitle={t('فريقنا متاح على مدار الساعة', 'Our team is available 24/7')}>
      <div className="grid gap-4 md:grid-cols-3">
        {[[MessageSquare, t('تذكرة دعم', 'Support ticket'), t('رد خلال ساعات', 'Reply within hours'), '#ticket'], [Mail, t('البريد الإلكتروني', 'Email'), 'Info@deiyar.com', 'mailto:Info@deiyar.com'], [Phone, t('اتصال هاتفي', 'Phone'), '+966 55 660 0279', 'tel:+966556600279']].map(([I, a, b, href]) => (
          <a key={a} href={href} className="card flex items-center gap-4 p-5 transition hover:-translate-y-1 hover:shadow-float">
            <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white"><I className="size-5" /></span>
            <div><div className="font-semibold">{a}</div><div className="text-sm text-ink/55" dir="auto">{b}</div></div>
          </a>
        ))}
      </div>
      <div id="ticket" className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-lg font-semibold">{t('فتح تذكرة جديدة', 'Open a ticket')}</h2>
          <input className="input mt-4" placeholder={t('الموضوع', 'Subject')} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />
          <textarea className="input mt-3 min-h-36" placeholder={t('اشرح المشكلة بالتفصيل…', 'Describe the issue…')} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
          <button className="btn-primary mt-4" disabled={!f.subject || !f.message} onClick={async () => { await api.post('/api/tickets', f); setF({ subject: '', message: '' }); toast(t('تم إرسال التذكرة', 'Ticket sent')); reload() }}>{t('إرسال', 'Send')}</button>
        </div>
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">{t('تذاكري', 'My tickets')}</h2>
          {!data?.length && <p className="text-sm text-ink/50">{t('لا توجد تذاكر', 'No tickets yet')}</p>}
          {data?.map((x) => (
            <div key={x.id} className="card p-5">
              <div className="flex items-center justify-between"><b>{x.subject}</b><StatusBadge status={x.status} /></div>
              <p className="mt-2 text-sm text-ink/70">{x.message}</p>
              {x.reply && <div className="mt-3 rounded-2xl bg-brand-50 p-3 text-sm"><b>{t('رد الدعم:', 'Support:')}</b> {x.reply}</div>}
              <div className="mt-2 text-xs text-ink/40">{date(x.createdAt)}</div>
            </div>
          ))}
        </div>
      </div>
    </Page>
  )
}

export function StaticPage({ kind }) {
  const { t } = useLang()
  const pages = {
    about: [t('من نحن', 'About us'), t('ديار منصة سعودية تجمع بين الباحثين عن الإقامات اليومية وأصحاب العقارات بطريقة سهلة وآمنة. نؤمن بأن كل إقامة يجب أن تكون تجربة لا تُنسى، لذلك نختار العقارات بعناية ونوفر حجزاً فورياً ودفعاً آمناً ودعماً متواصلاً.', 'Diyar is a Saudi platform connecting guests looking for nightly stays with property owners — simply and safely.')],
    terms: [t('الشروط والأحكام', 'Terms of use'), t('باستخدامك منصة ديار فإنك توافق على الالتزام بسياسات الحجز والإلغاء الخاصة بكل عقار، وعلى تقديم معلومات صحيحة، واحترام قواعد المنزل التي يحددها المضيف.', 'By using Diyar you agree to each property’s booking & cancellation policies and house rules.')],
    privacy: [t('سياسة الخصوصية', 'Privacy policy'), t('نحترم خصوصيتك. نستخدم بياناتك فقط لإتمام الحجوزات وتحسين تجربتك، ولا نشاركها مع أطراف ثالثة إلا بما يلزم لإتمام الخدمة.', 'We only use your data to complete bookings and improve your experience.')],
    faq: [t('الأسئلة الشائعة', 'FAQ'), t('كيف أحجز؟ اختر العقار والتواريخ ثم ادفع بالطريقة المناسبة. متى يُسترد التأمين؟ خلال 3–5 أيام عمل بعد المغادرة. هل يمكن الدفع بالتقسيط؟ نعم عبر تمارا وتابي.', 'How do I book? Pick a stay and dates, then pay. When is the deposit refunded? Within 3–5 business days.')],
  }
  const [title, body] = pages[kind]
  return <Page title={title}><div className="card p-8 leading-8 text-ink/75"><MapPin className="mb-3 size-6 text-brand-600" />{body}</div></Page>
}
