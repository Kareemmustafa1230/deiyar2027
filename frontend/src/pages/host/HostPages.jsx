import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Eye, EyeOff, Pencil, Phone, Plus, Search, Trash2, ExternalLink, KeyRound, CheckCheck } from 'lucide-react'
import { DashHeader, Table } from '../../components/DashLayout'
import { Confirm, Empty, Img, Modal, PageLoader, RatingPill, StatCard, StatusBadge, Tabs } from '../../components/ui'
import { api, qs } from '../../lib/api'
import { useAuth, useFetch, useToast } from '../../lib/store'
import { useLang } from '../../lib/i18n'

export function ChartTip({ active, payload, label, money }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-2xl bg-ink px-3 py-2 text-xs text-white shadow-float">
      <div className="mb-1 text-white/60">{label}</div>
      {payload.map((p) => <div key={p.dataKey} className="font-semibold">{money ? money(p.value) : p.value}</div>)}
    </div>
  )
}

export function RevenueChart({ data, dataKey = 'revenue', height = 280 }) {
  const { money, lang } = useLang()
  const fmt = (m) => new Date(m + '-01').toLocaleDateString(lang === 'ar' ? 'ar' : 'en', { month: 'short' })
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ left: 0, right: 0, top: 10 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4190b5" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#4190b5" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#0000000d" />
        <XAxis dataKey="month" tickFormatter={fmt} tick={{ fontSize: 12, fill: '#0f1f2a80' }} axisLine={false} tickLine={false} reversed={lang === 'ar'} />
        <YAxis tick={{ fontSize: 11, fill: '#0f1f2a60' }} axisLine={false} tickLine={false} width={50} orientation={lang === 'ar' ? 'right' : 'left'} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
        <Tooltip content={<ChartTip money={money} />} />
        <Area type="monotone" dataKey={dataKey} stroke="#357a9c" strokeWidth={3} fill="url(#rev)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function HostHome() {
  const { data: d, loading } = useFetch('/api/host/dashboard')
  const { user } = useAuth()
  const { t, money, num, date } = useLang()
  if (loading || !d) return <PageLoader />
  return (
    <div>
      <DashHeader title={t(`أهلاً ${user.fullName.split(' ')[0]} 👋`, `Hi ${user.fullName.split(' ')[0]} 👋`)} subtitle={t('هذه نظرة سريعة على أداء عقاراتك', 'Here is how your listings are doing')}
        action={<Link to="/host/properties/new" className="btn-primary"><Plus className="size-4" />{t('أضف عقار', 'Add property')}</Link>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="wallet" label={t('إيرادات هذا الشهر', 'This month')} value={money(d.monthRevenue)} hint={t(`السنة: ${money(d.yearRevenue)}`, `Year: ${money(d.yearRevenue)}`)} />
        <StatCard icon="calendar-check" tone="mint" label={t('حجوزات حالية', 'Current stays')} value={num(d.current)} hint={t(`${d.upcoming} قادمة`, `${d.upcoming} upcoming`)} />
        <StatCard icon="building-2" tone="gold" label={t('عقاراتي', 'My listings')} value={num(d.properties)} hint={d.pending ? t(`${d.pending} قيد المراجعة`, `${d.pending} pending review`) : ''} />
        <StatCard icon="star" tone="coral" label={t('متوسط التقييم', 'Avg rating')} value={d.rating ? d.rating.toFixed(1) : '—'} hint={t(`${num(d.reviews)} تقييم`, `${num(d.reviews)} reviews`)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="card p-6 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">{t('الإيرادات الشهرية', 'Monthly revenue')}</h2>
            <Link to="/host/reports" className="text-sm text-brand-700">{t('التقارير', 'Reports')}</Link>
          </div>
          <RevenueChart data={d.monthly} />
        </div>
        <div className="card p-6">
          <h2 className="mb-4 font-semibold">{t('التنبيهات', 'Alerts')}</h2>
          <div className="space-y-3">
            {d.notifications.length === 0 && <p className="text-sm text-ink/40">{t('لا جديد', 'All caught up')}</p>}
            {d.notifications.map((n) => (
              <div key={n.id} className="rounded-2xl bg-sand p-3">
                <div className="text-sm font-semibold">{n.title}</div>
                <div className="text-xs text-ink/60">{n.body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 font-semibold">{t('الحجوزات القادمة', 'Upcoming bookings')}</h2>
        <Table
          cols={[t('الضيف', 'Guest'), t('العقار', 'Property'), t('الوصول', 'Check-in'), t('الليالي', 'Nights'), t('المبلغ', 'Amount'), t('الحالة', 'Status')]}
          empty={t('لا توجد حجوزات قادمة', 'No upcoming bookings')}
          rows={d.next.map((b) => [
            <span className="flex items-center gap-2"><Img src={b.guest?.avatarUrl} className="size-8 rounded-full" />{b.guest?.fullName}</span>,
            b.property.title, date(b.checkIn), b.nights, money(b.subtotal), <StatusBadge status={b.status} />,
          ])}
        />
      </div>
    </div>
  )
}

export function HostProperties() {
  const { data, loading, reload } = useFetch('/api/host/properties')
  const { t, n, money } = useLang()
  const toast = useToast()
  const [del, setDel] = useState(null)
  const [hide, setHide] = useState(null)
  if (loading) return <PageLoader />
  return (
    <div>
      <DashHeader title={t('إدارة العقارات', 'My properties')} subtitle={t('أضف وعدّل وأخفِ عقاراتك', 'Add, edit and hide your listings')}
        action={<Link to="/host/properties/new" className="btn-primary"><Plus className="size-4" />{t('أضف عقار', 'Add property')}</Link>} />
      {!data?.length ? (
        <Empty icon="home" title={t('لم تضف أي عقار بعد', 'No listings yet')} action={<Link to="/host/properties/new" className="btn-primary">{t('أضف عقارك الأول', 'Add your first property')}</Link>} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((p) => (
            <div key={p.id} className="card overflow-hidden">
              <div className="relative h-44">
                <Img src={p.images[0]} className="h-full w-full" />
                <div className="absolute start-3 top-3"><StatusBadge status={p.status} /></div>
                <div className="absolute bottom-3 start-3"><RatingPill value={p.rating} count={p.reviews} /></div>
              </div>
              <div className="p-4">
                <div className="text-xs text-ink/50">{p.code} · {n(p.type)} · {n(p.city)}</div>
                <div className="mt-1 line-clamp-1 font-semibold">{p.title}</div>
                <div className="mt-1 text-sm">{money(p.price)} <span className="text-ink/50">/ {t('ليلة', 'night')}</span></div>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  <Link to={`/host/properties/${p.id}`} className="btn-soft btn-sm" title={t('تعديل', 'Edit')}><Pencil className="size-4" /></Link>
                  <Link to={`/property/${p.id}`} className="btn-ghost btn-sm" title={t('عرض', 'View')}><ExternalLink className="size-4" /></Link>
                  <button className="btn-ghost btn-sm" disabled={!['Approved', 'Hidden'].includes(p.status)} onClick={() => setHide(p)} title={t('إخفاء/إظهار', 'Hide/show')}>
                    {p.status === 'Hidden' ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  </button>
                  <button className="btn-danger btn-sm" onClick={() => setDel(p)} title={t('حذف', 'Delete')}><Trash2 className="size-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Confirm open={!!del} onClose={() => setDel(null)} danger title={t('حذف العقار؟', 'Delete property?')} text={t(`سيتم حذف "${del?.title}" نهائياً.`, `"${del?.title}" will be permanently deleted.`)}
        confirmText={t('حذف', 'Delete')}
        onConfirm={async () => {
          try { await api.del(`/api/host/properties/${del.id}`); toast(t('تم الحذف', 'Deleted')); reload() }
          catch { toast(t('لا يمكن حذف عقار عليه حجوزات قائمة', 'Cannot delete a property with active bookings'), 'error') }
        }} />
      <Confirm open={!!hide} onClose={() => setHide(null)} title={hide?.status === 'Hidden' ? t('إظهار العقار؟', 'Show property?') : t('إخفاء العقار؟', 'Hide property?')}
        text={hide?.status === 'Hidden' ? t('سيظهر العقار للزوار مجدداً.', 'It will be visible to guests again.') : t('لن يظهر العقار في نتائج البحث حتى تعيد إظهاره.', 'It will be hidden from search until you show it again.')}
        onConfirm={async () => { await api.post(`/api/host/properties/${hide.id}/toggle-hidden`); reload() }} />
    </div>
  )
}

export function HostBookings() {
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const { data, loading, reload } = useFetch('/api/host/bookings' + qs({ status, q }), [status, q])
  const { t, money, date } = useLang()
  const toast = useToast()
  const [sel, setSel] = useState(null)

  const act = async (b, action) => {
    await api.post(`/api/host/bookings/${b.id}/${action}`)
    toast(action === 'checkin' ? t('تم تأكيد تسليم الوحدة', 'Handover confirmed') : t('تم إنهاء الإقامة', 'Stay completed'))
    setSel(null); reload()
  }

  return (
    <div>
      <DashHeader title={t('الحجوزات', 'Bookings')} subtitle={t('تابع جميع حجوزاتك الحالية والقادمة والسابقة', 'Track current, upcoming and past bookings')} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={status} onChange={setStatus} tabs={[['', t('الكل', 'All')], ['current', t('الحالية', 'Current')], ['upcoming', t('القادمة', 'Upcoming')], ['past', t('السابقة', 'Past')]]} />
        <div className="relative ms-auto w-full sm:w-72">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink/40" />
          <input className="input ps-10" placeholder={t('اسم الضيف أو رقم الحجز', 'Guest name or code')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      {loading && !data ? <PageLoader /> : (
        <Table
          cols={[t('رقم الحجز', 'Code'), t('الضيف', 'Guest'), t('العقار', 'Property'), t('الإقامة', 'Stay'), t('المبلغ', 'Amount'), t('الحالة', 'Status'), '']}
          empty={t('لا توجد حجوزات', 'No bookings')}
          rows={(data || []).map((b) => [
            <span className="font-mono text-xs">{b.code}</span>, b.guest?.fullName, <span className="line-clamp-1 max-w-48 whitespace-normal">{b.property.title}</span>,
            `${date(b.checkIn, { day: 'numeric', month: 'short' })} → ${date(b.checkOut, { day: 'numeric', month: 'short' })}`,
            money(b.subtotal), <StatusBadge status={b.status} />,
            <button className="btn-soft btn-sm" onClick={() => setSel(b)}>{t('التفاصيل', 'Details')}</button>,
          ])}
        />
      )}
      <Modal open={!!sel} onClose={() => setSel(null)} title={sel && `${t('حجز', 'Booking')} #${sel.code}`}>
        {sel && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3 rounded-2xl bg-sand p-3">
              <Img src={sel.guest?.avatarUrl} className="size-12 rounded-full" />
              <div className="flex-1"><div className="font-semibold">{sel.guest?.fullName}</div><div className="text-ink/50" dir="ltr">{sel.guest?.phone}</div></div>
              <a href={`tel:${sel.guest?.phone}`} className="btn-soft btn-sm"><Phone className="size-4" /></a>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-ink/50">{t('الوصول', 'Check-in')}</div><b>{date(sel.checkIn)}</b></div>
              <div><div className="text-ink/50">{t('المغادرة', 'Check-out')}</div><b>{date(sel.checkOut)}</b></div>
              <div><div className="text-ink/50">{t('الضيوف', 'Guests')}</div><b>{sel.guests}</b></div>
              <div><div className="text-ink/50">{t('الدفع', 'Payment')}</div><b>{sel.paymentMethod}</b></div>
            </div>
            <div className="space-y-1.5 rounded-2xl border border-black/5 p-3">
              <div className="flex justify-between"><span>{t('إيراد الإيجار', 'Rental income')}</span><b>{money(sel.subtotal)}</b></div>
              <div className="flex justify-between text-ink/60"><span>{t('التأمين المحصّل', 'Deposit held')}</span><span>{money(sel.deposit)}</span></div>
              <div className="flex justify-between text-ink/60"><span>{t('إجمالي ما دفعه الضيف', 'Guest paid')}</span><span>{money(sel.total)}</span></div>
            </div>
            {sel.notes && <div className="rounded-2xl bg-gold/10 p-3"><b>{t('ملاحظات الضيف:', 'Guest notes:')}</b> {sel.notes}</div>}
            <div className="flex gap-2">
              {sel.status === 'Confirmed' && <button className="btn-primary flex-1" onClick={() => act(sel, 'checkin')}><KeyRound className="size-4" />{t('تأكيد تسليم الوحدة', 'Confirm handover')}</button>}
              {sel.status === 'CheckedIn' && <button className="btn-primary flex-1" onClick={() => act(sel, 'complete')}><CheckCheck className="size-4" />{t('إنهاء الإقامة', 'Complete stay')}</button>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
