import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Check, CheckCheck, MapPin, Navigation, Pencil, Phone, Plus, Star, Trash2, X } from 'lucide-react'
import { DashHeader, Table } from '../../components/DashLayout'
import { ChartTip, RevenueChart } from '../host/HostPages'
import { Confirm, Empty, Img, Modal, PageLoader, StatCard, StatusBadge, Stars, Tabs, Spinner } from '../../components/ui'
import { api, qs } from '../../lib/api'
import { useFetch, useMeta, useToast } from '../../lib/store'
import { useLang } from '../../lib/i18n'

export function ProviderHome() {
  const { data: d, loading } = useFetch('/api/provider/dashboard')
  const { t, money, num, date, time, lang } = useLang()
  const [place, setPlace] = useState(null)

  // Spec: ask for the provider's location on open to tailor nearby requests.
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((p) => setPlace(`${p.coords.latitude.toFixed(3)}, ${p.coords.longitude.toFixed(3)}`), () => {})
  }, [])

  if (loading || !d) return <PageLoader />
  return (
    <div>
      <div className="mb-6 flex items-center gap-4 rounded-3xl bg-gradient-to-l from-brand-600 to-brand-800 p-6 text-white">
        <Img src={d.user.avatarUrl} className="size-16 rounded-2xl ring-4 ring-white/20" />
        <div>
          <div className="text-sm text-white/70">{t('مرحباً', 'Welcome')}</div>
          <div className="text-2xl font-bold">{d.user.fullName}</div>
          {place && <div className="mt-1 flex items-center gap-1 text-xs text-white/60"><Navigation className="size-3" />{place}</div>}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="wallet" label={t('أرباح الشهر (صافي)', 'Net earnings this month')} value={money(d.monthEarnings)} hint={t(`عمولة المنصة ${d.commission}%`, `Platform fee ${d.commission}%`)} />
        <StatCard icon="check-circle-2" tone="mint" label={t('خدمات منجزة', 'Completed jobs')} value={num(d.monthServices)} />
        <StatCard icon="inbox" tone="gold" label={t('طلبات معلقة', 'Pending requests')} value={num(d.pending)} />
        <StatCard icon="calendar-clock" tone="coral" label={t('حجوزات قادمة', 'Upcoming')} value={num(d.upcomingCount)} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="card p-6 xl:col-span-2">
          <h2 className="mb-4 font-semibold">{t('أرباح الشهر الحالي يومياً', 'Daily earnings this month')}</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={d.daily}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#0000000d" />
              <XAxis dataKey="day" reversed={lang === 'ar'} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis orientation={lang === 'ar' ? 'right' : 'left'} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
              <Tooltip content={<ChartTip money={money} />} cursor={{ fill: '#4190b510' }} />
              <Bar dataKey="earnings" fill="#4190b5" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-semibold">{t('أقرب حجز قادم', 'Next booking')}</h2>
            {d.next ? (
              <div className="mt-3 space-y-1 text-sm">
                <div className="text-lg font-semibold">{d.next.service.title}</div>
                <div>{d.next.host.fullName}</div>
                <div className="text-ink/60">{date(d.next.scheduledAt)} · {time(d.next.scheduledAt)}</div>
                <div className="flex items-center gap-1 text-ink/60"><MapPin className="size-4" />{d.next.property.address}</div>
                {d.upcomingCount > 1 && <div className="mt-2 rounded-xl bg-brand-50 px-3 py-1.5 text-brand-700">{t(`+${d.upcomingCount - 1} حجوزات قادمة`, `+${d.upcomingCount - 1} more upcoming`)}</div>}
              </div>
            ) : <p className="mt-3 text-sm text-ink/40">{t('لا يوجد', 'None')}</p>}
          </div>
          <div className="card p-6">
            <h2 className="font-semibold">{t('أحدث تقييم', 'Latest review')}</h2>
            {d.lastReview ? (
              <div className="mt-3 text-sm">
                <Stars value={d.lastReview.rating} size="size-4" />
                <p className="mt-2 text-ink/70">"{d.lastReview.comment}"</p>
                <div className="mt-1 text-xs text-ink/50">{d.lastReview.host} · {d.lastReview.service}</div>
              </div>
            ) : <p className="mt-3 text-sm text-ink/40">{t('لا يوجد', 'None')}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ProviderBookings() {
  const [tab, setTab] = useState('pending')
  const { data, loading, reload } = useFetch('/api/provider/bookings' + qs({ status: tab }), [tab])
  const { t, money, date, time } = useLang()
  const toast = useToast()
  const [note, setNote] = useState(null) // { item, action }
  const [text, setText] = useState('')

  const act = async (item, action, body) => {
    await api.post(`/api/provider/bookings/${item.id}/${action}`, body || {})
    toast(t('تم التحديث', 'Updated'))
    setNote(null); setText(''); reload()
  }

  return (
    <div>
      <DashHeader title={t('الحجوزات', 'Bookings')} subtitle={t('نظّم طلباتك ومواعيدك بكفاءة', 'Manage requests and appointments')} />
      <Tabs value={tab} onChange={setTab} tabs={[['pending', t('المعلقة', 'Pending')], ['upcoming', t('القادمة', 'Upcoming')], ['past', t('السابقة', 'Past')]]} />
      <div className="mt-5 space-y-3">
        {loading && !data ? <PageLoader /> : data?.length === 0 ? <Empty icon="inbox" title={t('لا توجد حجوزات', 'No bookings')} /> : data?.map((s) => (
          <div key={s.id} className="card flex flex-wrap items-center gap-4 p-5">
            <Img src={s.host.avatarUrl} className="size-12 rounded-2xl" />
            <div className="min-w-56 flex-1">
              <div className="font-semibold">{s.service.title} <span className="font-normal text-ink/50">· {s.host.fullName}</span></div>
              <div className="text-sm text-ink/60">{date(s.scheduledAt)} · {time(s.scheduledAt)} · {s.property.title}</div>
              <div className="flex items-center gap-1 text-xs text-ink/50"><MapPin className="size-3.5" />{s.property.address}</div>
              {s.notes && <div className="mt-1 text-xs text-ink/50">📝 {s.notes}</div>}
              {s.providerNote && <div className="mt-1 text-xs text-brand-700">🔒 {s.providerNote}</div>}
            </div>
            <div className="text-end"><b>{money(s.price)}</b><div><StatusBadge status={s.status} /></div></div>
            <div className="flex flex-wrap gap-2">
              <a href={`tel:${s.host.phone}`} className="btn-ghost btn-sm"><Phone className="size-4" /></a>
              <a href={`https://maps.google.com/?q=${s.property.lat},${s.property.lng}`} target="_blank" rel="noreferrer" className="btn-ghost btn-sm"><Navigation className="size-4" /></a>
              {s.status === 'Pending' && <>
                <button className="btn-primary btn-sm" onClick={() => setNote({ item: s, action: 'accept' })}><Check className="size-4" />{t('قبول', 'Accept')}</button>
                <button className="btn-danger btn-sm" onClick={() => setNote({ item: s, action: 'reject' })}><X className="size-4" />{t('رفض', 'Reject')}</button>
              </>}
              {s.status === 'Accepted' && <>
                <button className="btn-primary btn-sm" onClick={() => act(s, 'arrive')}><MapPin className="size-4" />{t('تأكيد الوصول', 'Arrived')}</button>
                <button className="btn-danger btn-sm" onClick={() => act(s, 'cancel')}>{t('إلغاء', 'Cancel')}</button>
              </>}
              {s.status === 'Arrived' && <button className="btn-primary btn-sm" onClick={() => act(s, 'done')}><CheckCheck className="size-4" />{t('تأكيد إنجاز الخدمة', 'Mark done')}</button>}
              {s.rating && <Stars value={s.rating} size="size-4" />}
            </div>
          </div>
        ))}
      </div>
      <Modal open={!!note} onClose={() => setNote(null)} title={note?.action === 'accept' ? t('قبول الطلب', 'Accept request') : t('رفض الطلب', 'Reject request')}>
        <label className="label">{note?.action === 'accept' ? t('ملاحظة خاصة (تظهر لك فقط)', 'Private note (only you see it)') : t('سبب الرفض (تراجعه الإدارة)', 'Reason (reviewed by admins)')}</label>
        <textarea className="input min-h-24" value={text} onChange={(e) => setText(e.target.value)} />
        <button className={`mt-4 w-full ${note?.action === 'accept' ? 'btn-primary' : 'btn bg-coral text-white'}`} onClick={() => act(note.item, note.action, { note: text })}>{t('تأكيد', 'Confirm')}</button>
      </Modal>
    </div>
  )
}

const blankService = { categoryId: '', title: '', description: '', price: 200, durationMinutes: 60, imageUrl: '', isActive: true }

export function ProviderServices() {
  const { data, loading, reload } = useFetch('/api/provider/services')
  const { meta } = useMeta()
  const { t, n, money } = useLang()
  const toast = useToast()
  const [edit, setEdit] = useState(null)
  const [del, setDel] = useState(null)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    const body = { ...edit, categoryId: +edit.categoryId, price: +edit.price, durationMinutes: +edit.durationMinutes }
    try {
      if (edit.id) await api.put(`/api/provider/services/${edit.id}`, body); else await api.post('/api/provider/services', body)
      toast(t('تم الحفظ', 'Saved')); setEdit(null); reload()
    } finally { setBusy(false) }
  }

  if (loading) return <PageLoader />
  return (
    <div>
      <DashHeader title={t('إدارة الخدمات', 'My services')} action={<button className="btn-primary" onClick={() => setEdit({ ...blankService, categoryId: meta?.lookups.ServiceCategory?.[0]?.id })}><Plus className="size-4" />{t('خدمة جديدة', 'New service')}</button>} />
      {!data?.length ? <Empty icon="wrench" title={t('لم تضف خدمات بعد', 'No services yet')} /> : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((s) => (
            <div key={s.id} className={`card overflow-hidden ${!s.isActive ? 'opacity-60' : ''}`}>
              <Img src={s.imageUrl} className="h-36 w-full" />
              <div className="p-4">
                <div className="flex justify-between text-xs"><span className="rounded-full bg-brand-50 px-2 py-0.5 text-brand-700">{n(s.category)}</span><span className="flex items-center gap-1"><Star className="size-3.5 fill-gold text-gold" />{s.rating}</span></div>
                <h3 className="mt-2 font-semibold">{s.title}</h3>
                <p className="line-clamp-2 text-sm text-ink/60">{s.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <b>{money(s.price)} <span className="text-xs font-normal text-ink/50">· {s.durationMinutes} {t('د', 'min')}</span></b>
                  <div className="flex gap-1">
                    <button className="btn-soft btn-sm" onClick={() => setEdit({ ...s, imageUrl: s.imageUrl || '' })}><Pencil className="size-4" /></button>
                    <button className="btn-danger btn-sm" onClick={() => setDel(s)}><Trash2 className="size-4" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? t('تعديل الخدمة', 'Edit service') : t('خدمة جديدة', 'New service')}>
        {edit && (
          <div className="space-y-3">
            <select className="input" value={edit.categoryId} onChange={(e) => setEdit({ ...edit, categoryId: e.target.value })}>{meta?.lookups.ServiceCategory?.map((c) => <option key={c.id} value={c.id}>{n(c)}</option>)}</select>
            <input className="input" placeholder={t('اسم الخدمة', 'Title')} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
            <textarea className="input min-h-24" placeholder={t('الوصف', 'Description')} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">{t('السعر', 'Price')}</label><input type="number" className="input" value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} /></div>
              <div><label className="label">{t('المدة (دقيقة)', 'Duration (min)')}</label><input type="number" className="input" value={edit.durationMinutes} onChange={(e) => setEdit({ ...edit, durationMinutes: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-3">
              {edit.imageUrl && <Img src={edit.imageUrl} className="size-14 rounded-xl" />}
              <label className="btn-ghost btn-sm cursor-pointer">{t('رفع صورة', 'Upload image')}<input type="file" accept="image/*" className="hidden" onChange={async (e) => { const [u] = await api.upload(e.target.files); setEdit({ ...edit, imageUrl: u }) }} /></label>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand-600" checked={edit.isActive} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} />{t('الخدمة مفعلة', 'Active')}</label>
            <button className="btn-primary w-full" disabled={!edit.title || busy} onClick={save}>{busy && <Spinner />}{t('حفظ', 'Save')}</button>
          </div>
        )}
      </Modal>
      <Confirm open={!!del} onClose={() => setDel(null)} danger title={t('حذف الخدمة؟', 'Delete service?')} text={del?.title}
        onConfirm={async () => { await api.del(`/api/provider/services/${del.id}`); reload() }} />
    </div>
  )
}

export function ProviderEarnings() {
  const { data: d, loading } = useFetch('/api/provider/earnings')
  const { t, money, date } = useLang()
  if (loading || !d) return <PageLoader />
  return (
    <div>
      <DashHeader title={t('النسب والأرباح', 'Earnings')} subtitle={t(`عمولة المنصة ${d.commission}% من كل خدمة`, `Platform commission: ${d.commission}% per job`)} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon="banknote" label={t('إجمالي المبيعات', 'Gross')} value={money(d.gross)} />
        <StatCard icon="percent" tone="coral" label={t('عمولة المنصة', 'Platform fee')} value={money(d.platform)} />
        <StatCard icon="wallet" tone="mint" label={t('صافي أرباحك', 'Your net')} value={money(d.net)} />
      </div>
      <div className="card mt-6 p-6">
        <h2 className="mb-4 font-semibold">{t('صافي الأرباح الشهرية', 'Monthly net earnings')}</h2>
        <RevenueChart data={d.monthly} dataKey="net" />
      </div>
      <h2 className="mb-3 mt-6 font-semibold">{t('سجل العمليات', 'Transactions')}</h2>
      <Table cols={[t('الخدمة', 'Service'), t('المضيف', 'Host'), t('التاريخ', 'Date'), t('المبلغ', 'Amount'), t('الصافي', 'Net')]} empty="—"
        rows={d.rows.map((r) => [r.service, r.host, date(r.scheduledAt), money(r.price), <b className="text-mint">{money(r.price * (100 - d.commission) / 100)}</b>])} />
    </div>
  )
}
