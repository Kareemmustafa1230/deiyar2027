import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CalendarClock, Clock, Download, FileText, MessageSquare, Printer, Search, Send, Star, User, XCircle } from 'lucide-react'
import { DashHeader, Table } from '../../components/DashLayout'
import { ChartTip } from './HostPages'
import { Confirm, Empty, Img, Modal, PageLoader, StatCard, StatusBadge, Stars, Tabs, Spinner } from '../../components/ui'
import { api, qs } from '../../lib/api'
import { useFetch, useMeta, useToast } from '../../lib/store'
import { useLang } from '../../lib/i18n'

function BookService({ service, onClose, onDone }) {
  const { data: props } = useFetch('/api/host/properties')
  const { t, money } = useLang()
  const toast = useToast()
  const [f, setF] = useState({ propertyId: '', date: '', time: '10:00', notes: '' })
  const [busy, setBusy] = useState(false)
  const times = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00']
  return (
    <Modal open={!!service} onClose={onClose} title={t('حجز خدمة', 'Book a service')}>
      {service && (
        <div className="space-y-4">
          <div className="flex gap-3 rounded-2xl bg-sand p-3">
            <Img src={service.imageUrl} className="size-16 rounded-xl" />
            <div><b>{service.title}</b><div className="text-sm text-ink/60">{service.provider.fullName}</div><div className="text-sm font-semibold">{money(service.price)}</div></div>
          </div>
          <div>
            <label className="label">{t('العقار', 'Property')}</label>
            <select className="input" value={f.propertyId} onChange={(e) => setF({ ...f, propertyId: e.target.value })}>
              <option value="">{t('اختر العقار', 'Choose property')}</option>
              {props?.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div><label className="label">{t('التاريخ', 'Date')}</label><input type="date" className="input" min={new Date().toISOString().slice(0, 10)} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
          <div>
            <label className="label">{t('الوقت المتاح', 'Available time')}</label>
            <div className="grid grid-cols-3 gap-2">{times.map((x) => <button key={x} className={`chip justify-center ${f.time === x ? 'chip-on' : ''}`} onClick={() => setF({ ...f, time: x })}>{x}</button>)}</div>
          </div>
          <textarea className="input" placeholder={t('ملاحظات للمقدم', 'Notes for the provider')} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          <p className="rounded-xl bg-brand-50 p-3 text-xs text-brand-800">{t('تُخصم قيمة الخدمة من إيراد الإيجار أو رصيدك تلقائياً بعد إتمامها.', 'The cost is deducted from your rental income after completion.')}</p>
          <button className="btn-primary w-full" disabled={!f.propertyId || !f.date || busy} onClick={async () => {
            setBusy(true)
            try {
              await api.post('/api/host/service-bookings', { serviceId: service.id, propertyId: f.propertyId, scheduledAt: new Date(`${f.date}T${f.time}`).toISOString(), notes: f.notes })
              toast(t('تم إرسال طلب الخدمة', 'Service requested')); onDone()
            } finally { setBusy(false) }
          }}>{busy && <Spinner />}{t('تأكيد الحجز', 'Confirm booking')}</button>
        </div>
      )}
    </Modal>
  )
}

export function HostServices() {
  const { meta } = useMeta()
  const { t, n, money, date, time } = useLang()
  const toast = useToast()
  const [tab, setTab] = useState('catalog')
  const [cat, setCat] = useState('')
  const [q, setQ] = useState('')
  const { data: services } = useFetch('/api/services' + qs({ categoryId: cat, q }), [cat, q])
  const { data: providers } = useFetch('/api/providers')
  const { data: mine, reload } = useFetch('/api/host/service-bookings')
  const [booking, setBooking] = useState(null)
  const [provider, setProvider] = useState(null)
  const [rate, setRate] = useState(null)
  const [cancel, setCancel] = useState(null)
  const [sort, setSort] = useState('rating')

  const openProvider = async (id) => setProvider(await api.get(`/api/providers/${id}`))
  const current = mine?.filter((s) => ['Pending', 'Accepted', 'Arrived', 'Done'].includes(s.status)) || []
  const past = mine?.filter((s) => ['Confirmed', 'Rejected', 'Cancelled'].includes(s.status)) || []

  return (
    <div>
      <DashHeader title={t('طلب خدمات', 'Services')} subtitle={t('تنظيف، صيانة، مسابح، تصوير وأكثر لعقاراتك', 'Cleaning, maintenance, pools, photography and more')} />
      <Tabs value={tab} onChange={setTab} tabs={[['catalog', t('الخدمات', 'Services')], ['providers', t('مقدمو الخدمات', 'Providers')], ['current', t(`الحالية (${current.length})`, `Current (${current.length})`)], ['past', t('السابقة', 'Past')]]} />

      {tab === 'catalog' && (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button className={`chip ${!cat ? 'chip-on' : ''}`} onClick={() => setCat('')}>{t('الكل', 'All')}</button>
            {meta?.lookups.ServiceCategory?.map((c) => <button key={c.id} className={`chip ${cat == c.id ? 'chip-on' : ''}`} onClick={() => setCat(c.id)}>{n(c)}</button>)}
            <div className="relative ms-auto w-full sm:w-64"><Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink/40" /><input className="input ps-10" placeholder={t('ابحث عن خدمة', 'Search services')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {services?.map((s) => (
              <div key={s.id} className="card overflow-hidden">
                <Img src={s.imageUrl} className="h-40 w-full" />
                <div className="p-4">
                  <div className="flex items-center justify-between text-xs"><span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">{n(s.category)}</span><span className="flex items-center gap-1"><Star className="size-3.5 fill-gold text-gold" />{s.rating} ({s.reviewsCount})</span></div>
                  <h3 className="mt-2 font-semibold">{s.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-ink/60">{s.description}</p>
                  <button className="mt-3 flex items-center gap-2 text-sm text-ink/70 hover:text-brand-700" onClick={() => openProvider(s.provider.id)}><Img src={s.provider.avatarUrl} className="size-6 rounded-full" />{s.provider.fullName}</button>
                  <div className="mt-4 flex items-center justify-between">
                    <div><b>{money(s.price)}</b><div className="flex items-center gap-1 text-xs text-ink/50"><Clock className="size-3" />{s.durationMinutes} {t('دقيقة', 'min')}</div></div>
                    <button className="btn-primary btn-sm" onClick={() => setBooking(s)}>{t('احجز الخدمة', 'Book')}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'providers' && (
        <>
          <div className="mt-5 flex gap-2">
            <button className={`chip ${sort === 'rating' ? 'chip-on' : ''}`} onClick={() => setSort('rating')}>{t('الأعلى تقييماً', 'Top rated')}</button>
            <button className={`chip ${sort === 'reviews' ? 'chip-on' : ''}`} onClick={() => setSort('reviews')}>{t('الأكثر مراجعات', 'Most reviewed')}</button>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[...(providers || [])].sort((a, b) => b[sort] - a[sort]).map((p) => (
              <button key={p.id} onClick={() => openProvider(p.id)} className="card flex items-center gap-4 p-5 text-start transition hover:-translate-y-1 hover:shadow-float">
                <Img src={p.avatarUrl} className="size-16 rounded-2xl" />
                <div className="min-w-0">
                  <div className="font-semibold">{p.fullName}</div>
                  <div className="flex items-center gap-1 text-sm"><Star className="size-4 fill-gold text-gold" />{p.rating.toFixed(1)} <span className="text-ink/50">({p.reviews})</span></div>
                  <p className="mt-1 line-clamp-2 text-xs text-ink/55">{p.bio}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {(tab === 'current' || tab === 'past') && (
        <div className="mt-5 space-y-3">
          {(tab === 'current' ? current : past).length === 0 && <Empty icon="wrench" title={t('لا توجد طلبات', 'No requests')} />}
          {(tab === 'current' ? current : past).map((s) => (
            <div key={s.id} className="card flex flex-wrap items-center gap-4 p-4">
              <Img src={s.service.imageUrl} className="size-16 rounded-2xl" />
              <div className="min-w-48 flex-1">
                <div className="font-semibold">{s.service.title}</div>
                <div className="text-sm text-ink/60">{s.provider.fullName} · {s.property.title}</div>
                <div className="text-sm text-ink/60">{date(s.scheduledAt)} · {time(s.scheduledAt)}</div>
                {s.providerNote && <div className="mt-1 text-xs text-ink/50">{t('ملاحظة المقدم:', 'Provider note:')} {s.providerNote}</div>}
              </div>
              <div className="text-end"><div className="font-semibold">{money(s.price)}</div><StatusBadge status={s.status} /></div>
              <div className="flex gap-2">
                {s.status === 'Done' && <button className="btn-primary btn-sm" onClick={() => setRate(s)}><Star className="size-4" />{t('تأكيد وتقييم', 'Confirm & rate')}</button>}
                {['Pending', 'Accepted'].includes(s.status) && <button className="btn-danger btn-sm" onClick={() => setCancel(s)}><XCircle className="size-4" />{t('إلغاء', 'Cancel')}</button>}
                {s.status === 'Confirmed' && s.rating && <Stars value={s.rating} size="size-4" />}
                {tab === 'past' && <button className="btn-ghost btn-sm" onClick={() => setBooking(services?.find((x) => x.id === s.service.id))}><CalendarClock className="size-4" />{t('إعادة حجز', 'Rebook')}</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      <BookService service={booking} onClose={() => setBooking(null)} onDone={() => { setBooking(null); reload(); setTab('current') }} />
      <Modal open={!!provider} onClose={() => setProvider(null)} wide title={provider?.fullName}>
        {provider && (
          <div>
            <div className="flex items-center gap-4"><Img src={provider.avatarUrl} className="size-20 rounded-3xl" /><p className="text-ink/70">{provider.bio}</p></div>
            <h3 className="mt-6 font-semibold">{t('الخدمات', 'Services')}</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {provider.services.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-black/5 p-3">
                  <Img src={s.imageUrl} className="size-14 rounded-xl" />
                  <div className="flex-1"><b className="text-sm">{s.title}</b><div className="text-xs text-ink/50">{money(s.price)} · {s.durationMinutes} {t('د', 'min')}</div></div>
                  <button className="btn-soft btn-sm" onClick={() => { setProvider(null); setBooking(services?.find((x) => x.id === s.id)) }}>{t('احجز', 'Book')}</button>
                </div>
              ))}
            </div>
            <h3 className="mt-6 font-semibold">{t('المراجعات', 'Reviews')}</h3>
            <div className="mt-3 space-y-2">
              {provider.reviews.length === 0 && <p className="text-sm text-ink/40">{t('لا توجد مراجعات', 'No reviews')}</p>}
              {provider.reviews.map((r, i) => <div key={i} className="rounded-2xl bg-sand p-3 text-sm"><div className="flex justify-between"><b>{r.host}</b><Stars value={r.rating} size="size-3.5" /></div><p className="mt-1 text-ink/70">{r.comment}</p></div>)}
            </div>
          </div>
        )}
      </Modal>
      <RateModal item={rate} onClose={() => setRate(null)} onDone={() => { setRate(null); reload() }} />
      <Confirm open={!!cancel} onClose={() => setCancel(null)} danger title={t('إلغاء طلب الخدمة؟', 'Cancel this request?')} text={cancel?.service.title}
        onConfirm={async () => { await api.post(`/api/host/service-bookings/${cancel.id}/cancel`); toast(t('تم الإلغاء', 'Cancelled')); reload() }} />
    </div>
  )
}

function RateModal({ item, onClose, onDone }) {
  const { t } = useLang()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  return (
    <Modal open={!!item} onClose={onClose} title={t('تأكيد إتمام الخدمة', 'Confirm completion')}>
      <p className="text-sm text-ink/60">{t('قيّم جودة الخدمة والالتزام بالموعد', 'Rate the quality and punctuality')}</p>
      <div className="my-4 flex justify-center"><Stars value={rating} onChange={setRating} size="size-9" /></div>
      <textarea className="input" placeholder={t('تعليقك (اختياري)', 'Comment (optional)')} value={comment} onChange={(e) => setComment(e.target.value)} />
      <button className="btn-primary mt-4 w-full" onClick={async () => { await api.post(`/api/host/service-bookings/${item.id}/confirm`, { rating, comment }); onDone() }}>{t('تأكيد', 'Confirm')}</button>
    </Modal>
  )
}

/** Excel opens UTF-8 CSV with BOM correctly, which covers the "export to Excel" requirement without a heavy dependency. */
export function downloadCsv(name, rows) {
  const csv = '﻿' + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = name
  a.click()
}

export function HostReports() {
  const [range, setRange] = useState({ from: '', to: '', propertyId: '' })
  const { data: d, loading, error } = useFetch('/api/host/reports' + qs(range), [range.from, range.to, range.propertyId])
  const { data: props } = useFetch('/api/host/properties')
  const { t, money, num, date, lang } = useLang()
  const chart = useMemo(() => d?.monthly || [], [d])

  if (loading && !d) return <PageLoader />
  if (!d) return <Empty icon="file-warning" title={t('تعذر تحميل التقرير', 'Could not load the report')} text={error?.message} />
  return (
    <div className="print:p-0">
      <DashHeader title={t('التقارير والتحليلات', 'Reports & analytics')} subtitle={d && `${date(d.from)} → ${date(d.to)}`}
        action={
          <div className="flex gap-2 print:hidden">
            <button className="btn-ghost btn-sm" onClick={() => downloadCsv('diyar-report.csv', [
              [t('العقار', 'Property'), t('الرمز', 'Code'), t('الحجوزات', 'Bookings'), t('الليالي', 'Nights'), t('الإشغال %', 'Occupancy %'), t('الإيراد', 'Revenue'), t('خصومات الخدمات', 'Service deductions')],
              ...d.byProperty.map((p) => [p.title, p.code, p.bookings, p.nights, p.occupancy, p.revenue, p.deductions]),
            ])}><Download className="size-4" />Excel</button>
            <button className="btn-ghost btn-sm" onClick={() => window.print()}><Printer className="size-4" />PDF</button>
          </div>
        } />
      <div className="card mb-6 grid gap-3 p-4 sm:grid-cols-3 print:hidden">
        <input type="date" className="input" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
        <input type="date" className="input" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        <select className="input" value={range.propertyId} onChange={(e) => setRange({ ...range, propertyId: e.target.value })}>
          <option value="">{t('كل العقارات', 'All properties')}</option>{props?.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="trending-up" label={t('إجمالي الإيرادات', 'Gross revenue')} value={money(d.revenue)} />
        <StatCard icon="wrench" tone="coral" label={t('خصومات الخدمات', 'Service deductions')} value={money(d.serviceDeductions)} />
        <StatCard icon="wallet" tone="mint" label={t('صافي الدخل', 'Net income')} value={money(d.net)} />
        <StatCard icon="calendar-check" tone="gold" label={t('عدد الحجوزات', 'Bookings')} value={num(d.bookings)} />
      </div>
      <div className="card mt-6 p-6">
        <h2 className="mb-4 font-semibold">{t('الإيرادات والحجوزات الشهرية', 'Monthly revenue & bookings')}</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#0000000d" />
            <XAxis dataKey="month" reversed={lang === 'ar'} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis orientation={lang === 'ar' ? 'right' : 'left'} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
            <Tooltip content={<ChartTip money={money} />} cursor={{ fill: '#4190b510' }} />
            <Bar dataKey="revenue" fill="#4190b5" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <h2 className="mb-3 mt-6 font-semibold">{t('الأداء لكل عقار', 'Per-property performance')}</h2>
      <Table cols={[t('العقار', 'Property'), t('الحجوزات', 'Bookings'), t('الليالي', 'Nights'), t('نسبة الإشغال', 'Occupancy'), t('الإيراد', 'Revenue'), t('الخصومات', 'Deductions')]}
        empty="—"
        rows={d.byProperty.map((p) => [
          <span className="font-medium">{p.title} <span className="text-xs text-ink/40">{p.code}</span></span>, p.bookings, p.nights,
          <div className="flex items-center gap-2"><div className="h-2 w-24 overflow-hidden rounded-full bg-black/5"><div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, p.occupancy)}%` }} /></div>{p.occupancy}%</div>,
          money(p.revenue), p.deductions ? <span className="text-coral">-{money(p.deductions)}</span> : '—',
        ])} />
      {d.deductions.length > 0 && (
        <>
          <h2 className="mb-3 mt-6 flex items-center gap-2 font-semibold"><FileText className="size-5" />{t('تفاصيل خصومات الخدمات', 'Service deduction details')}</h2>
          <Table cols={[t('الخدمة', 'Service'), t('التاريخ', 'Date'), t('المبلغ', 'Amount')]} empty="—" rows={d.deductions.map((x) => [x.title, date(x.scheduledAt), money(x.price)])} />
        </>
      )}
    </div>
  )
}

export function HostInbox() {
  const { data: convs, reload } = useFetch('/api/messages')
  const { data: reviews, reload: reloadReviews } = useFetch('/api/host/reviews')
  const { t, date, time } = useLang()
  const toast = useToast()
  const [tab, setTab] = useState('messages')
  const [sel, setSel] = useState(null)
  const [text, setText] = useState('')
  const [filter, setFilter] = useState('all')
  const [reply, setReply] = useState({})
  const conv = convs?.find((c) => c.user.id === sel)

  const filteredReviews = (reviews || []).filter((r) => filter === 'all' || (filter === 'pos' ? r.overall >= 8 : filter === 'neg' ? r.overall <= 5 : r.overall > 5 && r.overall < 8))

  return (
    <div>
      <DashHeader title={t('التواصل مع الضيوف', 'Guest communication')} />
      <Tabs value={tab} onChange={setTab} tabs={[['messages', t('الرسائل', 'Messages')], ['reviews', t('المراجعات', 'Reviews')]]} />
      {tab === 'messages' ? (
        <div className="card mt-5 grid min-h-[480px] overflow-hidden md:grid-cols-[300px_1fr]">
          <div className="border-e border-black/5">
            {!convs?.length && <p className="p-6 text-center text-sm text-ink/40">{t('لا توجد رسائل', 'No messages')}</p>}
            {convs?.map((c) => (
              <button key={c.user.id} onClick={() => { setSel(c.user.id); api.post(`/api/messages/${c.user.id}/read`) }}
                className={`flex w-full items-center gap-3 border-b border-black/5 p-4 text-start ${sel === c.user.id ? 'bg-brand-50' : 'hover:bg-sand'}`}>
                <Img src={c.user.avatarUrl} className="size-10 rounded-full" />
                <div className="min-w-0 flex-1"><div className="flex justify-between"><b className="text-sm">{c.user.fullName}</b>{c.unread > 0 && <span className="rounded-full bg-coral px-1.5 text-xs text-white">{c.unread}</span>}</div><div className="truncate text-xs text-ink/50">{c.last}</div></div>
              </button>
            ))}
          </div>
          <div className="flex flex-col">
            {conv ? (
              <>
                <div className="flex-1 space-y-2 overflow-y-auto p-5">
                  {conv.messages.map((m) => (
                    <div key={m.id} className={`flex ${m.mine ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${m.mine ? 'bg-brand-600 text-white' : 'bg-sand'}`}>{m.body}<div className="mt-1 text-[10px] opacity-60">{time(m.createdAt)}</div></div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 border-t border-black/5 p-3">
                  <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('اكتب ردك…', 'Type a reply…')} />
                  <button className="btn-primary" disabled={!text.trim()} onClick={async () => { await api.post('/api/messages', { to: sel, body: text }); setText(''); reload() }}><Send className="size-4" /></button>
                </div>
              </>
            ) : <div className="grid flex-1 place-items-center text-ink/40"><MessageSquare className="size-10" /></div>}
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <div className="mb-4 flex gap-2">
            {[['all', t('الكل', 'All')], ['pos', t('إيجابية', 'Positive')], ['mid', t('محايدة', 'Neutral')], ['neg', t('سلبية', 'Negative')]].map(([k, l]) => <button key={k} className={`chip ${filter === k ? 'chip-on' : ''}`} onClick={() => setFilter(k)}>{l}</button>)}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {filteredReviews.map((r) => (
              <div key={r.id} className="card p-5">
                <div className="flex items-center justify-between"><span className="flex items-center gap-2 font-semibold"><User className="size-4" />{r.guest}</span><span className="rounded-xl bg-brand-50 px-2 py-0.5 text-sm font-bold text-brand-700">{r.overall}/10</span></div>
                <div className="text-xs text-ink/50">{r.property} · {date(r.createdAt)}</div>
                <p className="mt-2 text-sm text-ink/75">{r.comment}</p>
                {r.hostReply ? <div className="mt-3 rounded-2xl bg-sand p-3 text-sm"><b>{t('ردك:', 'Your reply:')}</b> {r.hostReply}</div> : (
                  <div className="mt-3 flex gap-2">
                    <input className="input !py-2 text-sm" placeholder={t('اكتب رداً…', 'Write a reply…')} value={reply[r.id] || ''} onChange={(e) => setReply({ ...reply, [r.id]: e.target.value })} />
                    <button className="btn-soft btn-sm" disabled={!reply[r.id]} onClick={async () => { await api.post(`/api/host/reviews/${r.id}/reply`, { reply: reply[r.id] }); toast(t('تم نشر الرد', 'Reply posted')); reloadReviews() }}>{t('رد', 'Reply')}</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
