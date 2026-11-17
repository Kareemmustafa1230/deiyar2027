import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Ban, Check, CheckCircle2, ExternalLink, Megaphone, Pencil, Plus, Search, ShieldCheck, Sparkles, Trash2, X } from 'lucide-react'
import { DashHeader, Table } from '../../components/DashLayout'
import { RevenueChart } from '../host/HostPages'
import { Confirm, Icon, Img, Modal, PageLoader, StatCard, StatusBadge, Tabs, Spinner } from '../../components/ui'
import { api, qs } from '../../lib/api'
import { useFetch, useMeta, useToast } from '../../lib/store'
import { useLang } from '../../lib/i18n'

const PIE = ['#4190b5', '#ffb547', '#19c39c', '#ff6b57', '#27526a', '#86bad6', '#0f1f2a', '#b5d6e7', '#2d6580']
const roleText = { Guest: ['باحث عن عقار', 'Guest'], Host: ['مضيف', 'Host'], Provider: ['مقدم خدمة', 'Provider'], Admin: ['مدير', 'Admin'] }

export function AdminHome() {
  const { data: d, loading } = useFetch('/api/admin/stats')
  const { t, money, num, date } = useLang()
  if (loading || !d) return <PageLoader />
  const count = (arr, k, v) => arr.find((x) => x[k] === v)?.count || 0
  return (
    <div>
      <DashHeader title={t('لوحة تحكم الإدارة', 'Admin dashboard')} subtitle={t('نظرة شاملة على أداء المنصة', 'Platform overview')} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="trending-up" label={t('إجمالي قيمة الحجوزات', 'GMV')} value={money(d.gmv)} hint={t(`عمولات: ${money(d.fees)}`, `Fees: ${money(d.fees)}`)} />
        <StatCard icon="calendar-check" tone="mint" label={t('الحجوزات', 'Bookings')} value={num(d.bookings)} />
        <StatCard icon="building-2" tone="gold" label={t('عقارات بانتظار المراجعة', 'Pending listings')} value={num(count(d.properties, 'status', 'Pending'))} hint={t(`${count(d.properties, 'status', 'Approved')} منشور`, `${count(d.properties, 'status', 'Approved')} live`)} />
        <StatCard icon="life-buoy" tone="coral" label={t('تذاكر مفتوحة', 'Open tickets')} value={num(d.openTickets)} hint={t(`${d.pendingServices} طلب خدمة معلق`, `${d.pendingServices} pending service jobs`)} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="card p-6 xl:col-span-2">
          <h2 className="mb-4 font-semibold">{t('قيمة الحجوزات الشهرية', 'Monthly GMV')}</h2>
          <RevenueChart data={d.monthly} dataKey="gmv" />
        </div>
        <div className="card p-6">
          <h2 className="mb-2 font-semibold">{t('الحجوزات حسب المدينة', 'Bookings by city')}</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart><Pie data={d.byCity} dataKey="count" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>{d.byCity.map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}</Pie><Tooltip /></PieChart>
          </ResponsiveContainer>
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
            {d.byCity.map((c, i) => <span key={c.name} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: PIE[i % PIE.length] }} />{t(c.name, c.nameEn)} · {num(c.count)}</span>)}
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        {['Guest', 'Host', 'Provider', 'Admin'].map((r) => (
          <Link key={r} to={`/admin/users?role=${r}`} className="card p-4 transition hover:shadow-float"><div className="text-sm text-ink/50">{t(...roleText[r])}</div><div className="text-2xl font-bold">{num(count(d.users, 'role', r))}</div></Link>
        ))}
      </div>
      <h2 className="mb-3 mt-6 font-semibold">{t('أحدث الحجوزات', 'Latest bookings')}</h2>
      <Table cols={[t('الرمز', 'Code'), t('الضيف', 'Guest'), t('العقار', 'Property'), t('الوصول', 'Check-in'), t('الإجمالي', 'Total'), t('الحالة', 'Status')]} empty="—"
        rows={d.latest.map((b) => [b.code, b.guest?.fullName, b.property.title, date(b.checkIn), money(b.total), <StatusBadge status={b.status} />])} />
    </div>
  )
}

export function AdminUsers() {
  const params = new URLSearchParams(window.location.search)
  const [role, setRole] = useState(params.get('role') || 'Guest')
  const [q, setQ] = useState('')
  const { data, reload } = useFetch('/api/admin/users' + qs({ role, q }), [role, q])
  const { t, date } = useLang()
  const toast = useToast()
  const [create, setCreate] = useState(null)
  return (
    <div>
      <DashHeader title={t('حسابات المستخدمين', 'User accounts')} action={<button className="btn-primary" onClick={() => setCreate({ fullName: '', phone: '', email: '', role })}><Plus className="size-4" />{t('حساب جديد', 'New account')}</button>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={role} onChange={setRole} tabs={['Guest', 'Host', 'Provider', 'Admin'].map((r) => [r, t(...roleText[r])])} />
        <div className="relative ms-auto w-full sm:w-72"><Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink/40" /><input className="input ps-10" placeholder={t('الاسم، الجوال، البريد', 'Name, phone, email')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      <Table cols={[t('المستخدم', 'User'), t('الجوال', 'Phone'), t('البريد', 'Email'), t('النشاط', 'Activity'), t('تاريخ التسجيل', 'Joined'), t('الحالة', 'Status'), '']} empty={t('لا يوجد مستخدمون', 'No users')}
        rows={(data || []).map((u) => [
          <span className="flex items-center gap-2"><Img src={u.avatarUrl} className="size-8 rounded-full" /><b>{u.fullName}</b></span>,
          <span dir="ltr">{u.phone}</span>, u.email || '—',
          role === 'Guest' ? t(`${u.bookings} حجز`, `${u.bookings} bookings`) : role === 'Host' ? t(`${u.properties} عقار`, `${u.properties} listings`) : role === 'Provider' ? t(`${u.services} خدمة`, `${u.services} services`) : '—',
          date(u.createdAt),
          u.isActive ? <span className="text-mint">{t('نشط', 'Active')}</span> : <span className="text-coral">{t('موقوف', 'Disabled')}</span>,
          <div className="flex gap-1">
            <button className={u.isActive ? 'btn-danger btn-sm' : 'btn-soft btn-sm'} onClick={async () => { await api.post(`/api/admin/users/${u.id}/toggle`); toast(t('تم التحديث', 'Updated')); reload() }}>
              {u.isActive ? <><Ban className="size-4" />{t('إيقاف', 'Disable')}</> : <><Check className="size-4" />{t('تفعيل', 'Enable')}</>}
            </button>
            <select className="rounded-xl border border-black/10 bg-white px-2 text-xs" value={u.role} onChange={async (e) => { await api.post(`/api/admin/users/${u.id}/role/${e.target.value}`); reload() }}>
              {Object.keys(roleText).map((r) => <option key={r} value={r}>{t(...roleText[r])}</option>)}
            </select>
          </div>,
        ])} />
      <Modal open={!!create} onClose={() => setCreate(null)} title={t('إنشاء حساب', 'Create account')}>
        {create && (
          <div className="space-y-3">
            <input className="input" placeholder={t('الاسم الكامل', 'Full name')} value={create.fullName} onChange={(e) => setCreate({ ...create, fullName: e.target.value })} />
            <input className="input" dir="ltr" placeholder="05XXXXXXXX" value={create.phone} onChange={(e) => setCreate({ ...create, phone: e.target.value })} />
            <input className="input" dir="ltr" placeholder="email@example.com" value={create.email} onChange={(e) => setCreate({ ...create, email: e.target.value })} />
            <select className="input" value={create.role} onChange={(e) => setCreate({ ...create, role: e.target.value })}>{Object.keys(roleText).map((r) => <option key={r} value={r}>{t(...roleText[r])}</option>)}</select>
            <button className="btn-primary w-full" onClick={async () => {
              try { await api.post('/api/admin/users', create); toast(t('تم إنشاء الحساب', 'Account created')); setCreate(null); reload() }
              catch { toast(t('الرقم مسجل مسبقاً', 'Phone already registered'), 'error') }
            }}>{t('إنشاء', 'Create')}</button>
          </div>
        )}
      </Modal>
    </div>
  )
}

export function AdminProperties() {
  const [status, setStatus] = useState('Pending')
  const [q, setQ] = useState('')
  const { data, reload } = useFetch('/api/admin/properties' + qs({ status, q }), [status, q])
  const { t, money } = useLang()
  const toast = useToast()
  const [reject, setReject] = useState(null)
  const [reason, setReason] = useState('')
  const [del, setDel] = useState(null)
  const setSt = async (id, s, r) => { await api.post(`/api/admin/properties/${id}/status`, { status: s, reason: r }); toast(t('تم التحديث', 'Updated')); reload() }
  const flag = async (id, f) => { await api.post(`/api/admin/properties/${id}/${f}`); reload() }
  return (
    <div>
      <DashHeader title={t('إدارة العقارات', 'Listings')} subtitle={t('مراجعة ونشر وتمييز العقارات', 'Review, publish and feature listings')} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs value={status} onChange={setStatus} tabs={[['Pending', t('بانتظار المراجعة', 'Pending')], ['Approved', t('منشورة', 'Live')], ['Hidden', t('مخفية', 'Hidden')], ['Rejected', t('مرفوضة', 'Rejected')], ['', t('الكل', 'All')]]} />
        <div className="relative ms-auto w-full sm:w-72"><Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink/40" /><input className="input ps-10" placeholder={t('الاسم أو الرمز', 'Name or code')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      <Table cols={[t('العقار', 'Listing'), t('المضيف', 'Host'), t('المدينة', 'City'), t('السعر', 'Price'), t('الحالة', 'Status'), t('الإجراءات', 'Actions')]} empty={t('لا توجد عقارات', 'No listings')}
        rows={(data || []).map(({ card: p, host, city, type }) => [
          <span className="flex items-center gap-3"><Img src={p.image} className="size-12 rounded-xl" /><span><b className="line-clamp-1 max-w-52 whitespace-normal">{p.title}</b><span className="text-xs text-ink/50">{p.code} · {type}</span></span></span>,
          <span>{host.fullName}<div className="text-xs text-ink/50" dir="ltr">{host.phone}</div></span>, city, money(p.pricePerNight), <StatusBadge status={p.status} />,
          <div className="flex gap-1">
            <Link to={`/property/${p.id}`} target="_blank" className="btn-ghost btn-sm"><ExternalLink className="size-4" /></Link>
            {p.status !== 'Approved' && <button className="btn-soft btn-sm" onClick={() => setSt(p.id, 'Approved')}><CheckCircle2 className="size-4" />{t('موافقة', 'Approve')}</button>}
            {p.status === 'Pending' && <button className="btn-danger btn-sm" onClick={() => setReject(p)}><X className="size-4" /></button>}
            <button title={t('مميز', 'Featured')} className={`btn-sm btn ${p.isFeatured ? 'bg-gold text-ink' : 'bg-black/5'}`} onClick={() => flag(p.id, 'featured')}><Sparkles className="size-4" /></button>
            <button title={t('ضمان الموقع', 'Location guarantee')} className={`btn-sm btn ${p.locationGuaranteed ? 'bg-mint text-white' : 'bg-black/5'}`} onClick={() => flag(p.id, 'guarantee')}><ShieldCheck className="size-4" /></button>
            <button className="btn-danger btn-sm" onClick={() => setDel(p)}><Trash2 className="size-4" /></button>
          </div>,
        ])} />
      <Modal open={!!reject} onClose={() => setReject(null)} title={t('سبب الرفض', 'Rejection reason')}>
        <textarea className="input min-h-24" value={reason} onChange={(e) => setReason(e.target.value)} />
        <button className="btn mt-4 w-full bg-coral text-white" onClick={async () => { await setSt(reject.id, 'Rejected', reason); setReject(null); setReason('') }}>{t('رفض وإشعار المضيف', 'Reject & notify host')}</button>
      </Modal>
      <Confirm open={!!del} onClose={() => setDel(null)} danger title={t('حذف العقار نهائياً؟', 'Delete permanently?')} text={del?.title} onConfirm={async () => { await api.del(`/api/admin/properties/${del.id}`); reload() }} />
    </div>
  )
}

export function AdminBookings() {
  const [status, setStatus] = useState('')
  const { data } = useFetch('/api/admin/bookings' + qs({ status }), [status])
  const { t, money, date } = useLang()
  return (
    <div>
      <DashHeader title={t('الحجوزات', 'Bookings')} />
      <div className="mb-4"><Tabs value={status} onChange={setStatus} tabs={[['', t('الكل', 'All')], ['Confirmed', t('مؤكدة', 'Confirmed')], ['CheckedIn', t('جارية', 'Checked in')], ['Completed', t('مكتملة', 'Completed')], ['Cancelled', t('ملغاة', 'Cancelled')]]} /></div>
      <Table cols={[t('الرمز', 'Code'), t('الضيف', 'Guest'), t('العقار', 'Property'), t('المضيف', 'Host'), t('الإقامة', 'Stay'), t('الدفع', 'Payment'), t('الإجمالي', 'Total'), t('الحالة', 'Status')]} empty="—"
        rows={(data || []).map((b) => [b.code, b.guest?.fullName, <span className="line-clamp-1 max-w-48 whitespace-normal">{b.property.title}</span>, b.property.host?.fullName,
          `${date(b.checkIn, { day: 'numeric', month: 'short' })} → ${date(b.checkOut, { day: 'numeric', month: 'short' })}`, b.paymentMethod, money(b.total), <StatusBadge status={b.status} />])} />
    </div>
  )
}

export function AdminServices() {
  const [tab, setTab] = useState('services')
  const { data: services, reload } = useFetch('/api/admin/services')
  const { data: jobs } = useFetch('/api/admin/service-bookings')
  const { t, money, date } = useLang()
  return (
    <div>
      <DashHeader title={t('إدارة الخدمات', 'Services')} subtitle={t('الخدمات المعروضة وطلبات المضيفين', 'Listed services and host requests')} />
      <Tabs value={tab} onChange={setTab} tabs={[['services', t('الخدمات', 'Services')], ['jobs', t('طلبات الخدمات', 'Service requests')]]} />
      <div className="mt-5">
        {tab === 'services' ? (
          <Table cols={[t('الخدمة', 'Service'), t('التصنيف', 'Category'), t('المقدم', 'Provider'), t('السعر', 'Price'), t('التقييم', 'Rating'), t('الطلبات', 'Orders'), '']} empty="—"
            rows={(services || []).map((s) => [<span className="flex items-center gap-2"><Img src={s.imageUrl} className="size-10 rounded-xl" /><b>{s.title}</b></span>, s.category, s.provider, money(s.price), `⭐ ${s.rating}`, s.bookings,
              <button className={s.isActive ? 'btn-danger btn-sm' : 'btn-soft btn-sm'} onClick={async () => { await api.post(`/api/admin/services/${s.id}/toggle`); reload() }}>{s.isActive ? t('إيقاف', 'Disable') : t('تفعيل', 'Enable')}</button>])} />
        ) : (
          <Table cols={[t('الخدمة', 'Service'), t('المقدم', 'Provider'), t('المضيف', 'Host'), t('العقار', 'Property'), t('الموعد', 'When'), t('السعر', 'Price'), t('ملاحظة المقدم', 'Provider note'), t('الحالة', 'Status')]} empty="—"
            rows={(jobs || []).map((s) => [s.service, s.provider, s.host, s.property, date(s.scheduledAt), money(s.price), s.providerNote || '—', <StatusBadge status={s.status} />])} />
        )}
      </div>
    </div>
  )
}

const kinds = [
  ['Category', 'الفئات', 'Categories'], ['Classification', 'اختياراتنا (التصنيفات)', 'Classifications'], ['Amenity', 'المزايا والمرفقات', 'Amenities'],
  ['Kitchen', 'مرافق المطبخ', 'Kitchen'], ['PoolType', 'أنواع المسابح', 'Pool types'], ['BathType', 'أنواع الحمامات', 'Bath types'],
  ['Policy', 'سمات الحجز والإلغاء', 'Booking policies'], ['Capacity', 'تصنيفات السعة', 'Capacity buckets'], ['ServiceCategory', 'تصنيفات الخدمات', 'Service categories'],
]

export function AdminCatalog() {
  const { meta, reload } = useMeta()
  const { t } = useLang()
  const toast = useToast()
  const [tab, setTab] = useState('cities')
  const [edit, setEdit] = useState(null)
  const [city, setCity] = useState(null)
  if (!meta) return <PageLoader />

  const save = async () => {
    const { _path, id, ...body } = edit
    try {
      if (id) await api.put(`/api/admin/${_path}/${id}`, body); else await api.post(`/api/admin/${_path}`, body)
      toast(t('تم الحفظ', 'Saved')); setEdit(null); reload()
    } catch { toast(t('تعذر الحفظ', 'Save failed'), 'error') }
  }
  const remove = async (path, id) => {
    try { await api.del(`/api/admin/${path}/${id}`); reload() }
    catch { toast(t('العنصر مستخدم ولا يمكن حذفه', 'Item is in use'), 'error') }
  }
  const list = (items, path, kind) => (
    <div className="card divide-y divide-black/5">
      {items.map((x) => (
        <div key={x.id} className="flex items-center gap-3 px-4 py-3">
          {x.icon && <Icon name={x.icon} className="size-5 text-brand-600" />}
          {x.imageUrl && <Img src={x.imageUrl} className="size-9 rounded-lg" />}
          <span className="flex-1 font-medium">{x.nameAr} <span className="text-sm text-ink/45">· {x.nameEn}</span>{x.min != null && <span className="text-xs text-ink/45"> ({x.min}–{x.max})</span>}</span>
          {path === 'cities' && <button className="btn-ghost btn-sm" onClick={() => setCity(x)}>{t(`الأحياء (${x.districts.length})`, `Districts (${x.districts.length})`)}</button>}
          {path !== 'districts' && <button className="btn-soft btn-sm" onClick={() => setEdit({ ...x, _path: path, kind })}><Pencil className="size-4" /></button>}
          <button className="btn-danger btn-sm" onClick={() => remove(path === 'districts' ? 'districts' : path, x.id)}><Trash2 className="size-4" /></button>
        </div>
      ))}
    </div>
  )
  const current = kinds.find((k) => k[0] === tab)

  return (
    <div>
      <DashHeader title={t('الإعدادات والقوائم', 'Catalog & lists')} subtitle={t('تحكم بكل الخيارات التي تظهر في البحث وإضافة العقار', 'Control every option used by search and the listing wizard')}
        action={<button className="btn-primary" onClick={() => setEdit({ nameAr: '', nameEn: '', icon: '', imageUrl: '', _path: tab === 'cities' ? 'cities' : tab === 'types' ? 'types' : 'lookups', kind: current?.[0] })}><Plus className="size-4" />{t('إضافة', 'Add')}</button>} />
      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
        {[['cities', 'المدن', 'Cities'], ['types', 'أنواع العقارات', 'Property types'], ...kinds].map(([k, a, e]) => <button key={k} className={`chip shrink-0 ${tab === k ? 'chip-on' : ''}`} onClick={() => setTab(k)}>{t(a, e)}</button>)}
      </div>
      {tab === 'cities' ? list(meta.cities, 'cities') : tab === 'types' ? list(meta.types, 'types') : list(meta.lookups[tab] || [], 'lookups', tab)}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? t('تعديل', 'Edit') : t('إضافة', 'Add')}>
        {edit && (
          <div className="space-y-3">
            <input className="input" placeholder="الاسم بالعربي" value={edit.nameAr} onChange={(e) => setEdit({ ...edit, nameAr: e.target.value })} />
            <input className="input" dir="ltr" placeholder="English name" value={edit.nameEn} onChange={(e) => setEdit({ ...edit, nameEn: e.target.value })} />
            {edit._path !== 'cities' && (
              <div className="flex items-center gap-2">
                <input className="input" dir="ltr" placeholder="lucide icon (e.g. wifi)" value={edit.icon || ''} onChange={(e) => setEdit({ ...edit, icon: e.target.value })} />
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Icon name={edit.icon} className="size-5" /></span>
              </div>
            )}
            {edit._path === 'cities' && <input className="input" dir="ltr" placeholder="Image URL" value={edit.imageUrl || ''} onChange={(e) => setEdit({ ...edit, imageUrl: e.target.value })} />}
            {edit.kind === 'Capacity' && <div className="grid grid-cols-2 gap-2"><input type="number" className="input" placeholder="Min" value={edit.min ?? ''} onChange={(e) => setEdit({ ...edit, min: +e.target.value })} /><input type="number" className="input" placeholder="Max" value={edit.max ?? ''} onChange={(e) => setEdit({ ...edit, max: +e.target.value })} /></div>}
            <button className="btn-primary w-full" disabled={!edit.nameAr} onClick={save}>{t('حفظ', 'Save')}</button>
          </div>
        )}
      </Modal>
      <Modal open={!!city} onClose={() => setCity(null)} title={city && t(`أحياء ${city.nameAr}`, `${city.nameEn} districts`)}>
        {city && <DistrictEditor city={meta.cities.find((c) => c.id === city.id) || city} onChange={reload} />}
      </Modal>
    </div>
  )
}

function DistrictEditor({ city, onChange }) {
  const { t } = useLang()
  const [f, setF] = useState({ nameAr: '', nameEn: '' })
  return (
    <div>
      <div className="max-h-72 space-y-2 overflow-y-auto">
        {city.districts.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-xl bg-sand px-3 py-2 text-sm">
            {d.nameAr} · {d.nameEn}
            <button className="text-coral" onClick={async () => { await api.del(`/api/admin/districts/${d.id}`).catch(() => {}); onChange() }}><Trash2 className="size-4" /></button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <input className="input" placeholder="الحي" value={f.nameAr} onChange={(e) => setF({ ...f, nameAr: e.target.value })} />
        <input className="input" dir="ltr" placeholder="District" value={f.nameEn} onChange={(e) => setF({ ...f, nameEn: e.target.value })} />
        <button className="btn-primary" disabled={!f.nameAr} onClick={async () => { await api.post('/api/admin/districts', { ...f, cityId: city.id }); setF({ nameAr: '', nameEn: '' }); onChange() }}><Plus className="size-4" /></button>
      </div>
      <p className="mt-2 text-xs text-ink/40">{t('لا يمكن حذف حي مرتبط بعقارات', 'Districts used by listings cannot be deleted')}</p>
    </div>
  )
}

export function AdminOffers() {
  const { data, reload } = useFetch('/api/admin/offers')
  const { t } = useLang()
  const [edit, setEdit] = useState(null)
  const save = async () => {
    const { id, ...body } = edit
    if (id) await api.put(`/api/admin/offers/${id}`, body); else await api.post('/api/admin/offers', body)
    setEdit(null); reload()
  }
  return (
    <div>
      <DashHeader title={t('العروض والواجهة الرئيسية', 'Offers & home hero')} subtitle={t('تحكم بشرائح الواجهة الرئيسية والعروض المميزة', 'Manage hero slides and featured offers')}
        action={<button className="btn-primary" onClick={() => setEdit({ kind: 'offer', title: '', subtitle: '', imageUrl: '', badge: '', link: '/search', isActive: true, order: 1 })}><Plus className="size-4" />{t('إضافة', 'Add')}</button>} />
      {['hero', 'offer'].map((k) => (
        <div key={k} className="mb-8">
          <h2 className="mb-3 font-semibold">{k === 'hero' ? t('شرائح الواجهة (Hero)', 'Hero slides') : t('العروض المميزة', 'Featured offers')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data?.filter((o) => o.kind === k).map((o) => (
              <div key={o.id} className={`card overflow-hidden ${!o.isActive ? 'opacity-50' : ''}`}>
                <div className="relative h-36"><Img src={o.imageUrl} className="h-full w-full" /><span className="absolute start-3 top-3 rounded-full bg-gold px-2 py-0.5 text-xs font-bold">{o.badge}</span></div>
                <div className="p-4">
                  <b>{o.title}</b><p className="line-clamp-1 text-sm text-ink/60">{o.subtitle}</p>
                  <div className="mt-3 flex gap-2">
                    <button className="btn-soft btn-sm" onClick={() => setEdit(o)}><Pencil className="size-4" /></button>
                    <button className="btn-danger btn-sm" onClick={async () => { await api.del(`/api/admin/offers/${o.id}`); reload() }}><Trash2 className="size-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={t('العرض', 'Offer')}>
        {edit && (
          <div className="space-y-3">
            <select className="input" value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value })}><option value="hero">Hero</option><option value="offer">{t('عرض مميز', 'Offer')}</option></select>
            <input className="input" placeholder={t('العنوان', 'Title')} value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
            <input className="input" placeholder={t('الوصف', 'Subtitle')} value={edit.subtitle} onChange={(e) => setEdit({ ...edit, subtitle: e.target.value })} />
            <input className="input" placeholder={t('الشارة / الموقع', 'Badge / location')} value={edit.badge || ''} onChange={(e) => setEdit({ ...edit, badge: e.target.value })} />
            <div className="flex gap-2">
              <input className="input" dir="ltr" placeholder="Image URL" value={edit.imageUrl} onChange={(e) => setEdit({ ...edit, imageUrl: e.target.value })} />
              <label className="btn-ghost shrink-0 cursor-pointer">{t('رفع', 'Upload')}<input type="file" accept="image/*" className="hidden" onChange={async (e) => { const [u] = await api.upload(e.target.files); setEdit({ ...edit, imageUrl: u }) }} /></label>
            </div>
            <input className="input" dir="ltr" placeholder="/search?offers=true" value={edit.link || ''} onChange={(e) => setEdit({ ...edit, link: e.target.value })} />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand-600" checked={edit.isActive} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} />{t('مفعل', 'Active')}</label>
              <input type="number" className="input !w-24" value={edit.order} onChange={(e) => setEdit({ ...edit, order: +e.target.value })} />
            </div>
            <button className="btn-primary w-full" onClick={save}>{t('حفظ', 'Save')}</button>
          </div>
        )}
      </Modal>
    </div>
  )
}

export function AdminNotifications() {
  const { t } = useLang()
  const toast = useToast()
  const [f, setF] = useState({ title: '', body: '', role: '' })
  const [busy, setBusy] = useState(false)
  return (
    <div className="max-w-2xl">
      <DashHeader title={t('إدارة الإشعارات', 'Notifications')} subtitle={t('أرسل إشعارات فورية للمستخدمين (تصل لحظياً عبر SignalR)', 'Push real-time notifications to users (via SignalR)')} />
      <div className="card space-y-4 p-6">
        <div>
          <label className="label">{t('الفئة المستهدفة', 'Audience')}</label>
          <div className="flex flex-wrap gap-2">
            {[['', t('الجميع', 'Everyone')], ...Object.entries(roleText).map(([k, v]) => [k, t(...v)])].map(([k, l]) => <button key={k} className={`chip ${f.role === k ? 'chip-on' : ''}`} onClick={() => setF({ ...f, role: k })}>{l}</button>)}
          </div>
        </div>
        <input className="input" placeholder={t('عنوان الإشعار', 'Title')} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <textarea className="input min-h-28" placeholder={t('نص الإشعار', 'Message')} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
        <button className="btn-primary" disabled={!f.title || !f.body || busy} onClick={async () => {
          setBusy(true)
          try { const r = await api.post('/api/admin/notifications', { ...f, role: f.role || null }); toast(t(`تم الإرسال إلى ${r.sent} مستخدم`, `Sent to ${r.sent} users`)); setF({ ...f, title: '', body: '' }) } finally { setBusy(false) }
        }}>{busy ? <Spinner /> : <Megaphone className="size-4" />}{t('إرسال الإشعار', 'Send')}</button>
      </div>
    </div>
  )
}

export function AdminTickets() {
  const { data, reload } = useFetch('/api/admin/tickets')
  const { t, date } = useLang()
  const [reply, setReply] = useState({})
  return (
    <div>
      <DashHeader title={t('الدعم الفني والمساعدة', 'Support tickets')} />
      <div className="grid gap-4 lg:grid-cols-2">
        {data?.map((x) => (
          <div key={x.id} className="card p-5">
            <div className="flex items-center justify-between"><b>{x.subject}</b><StatusBadge status={x.status} /></div>
            <div className="text-xs text-ink/50">{x.user.fullName} · {t(...roleText[x.user.role])} · <span dir="ltr">{x.user.phone}</span> · {date(x.createdAt)}</div>
            <p className="mt-3 text-sm text-ink/75">{x.message}</p>
            {x.reply && <div className="mt-3 rounded-2xl bg-brand-50 p-3 text-sm"><b>{t('الرد:', 'Reply:')}</b> {x.reply}</div>}
            {x.status !== 'Closed' && (
              <div className="mt-3 flex gap-2">
                <input className="input !py-2 text-sm" placeholder={t('اكتب الرد…', 'Write a reply…')} value={reply[x.id] || ''} onChange={(e) => setReply({ ...reply, [x.id]: e.target.value })} />
                <button className="btn-primary btn-sm" disabled={!reply[x.id]} onClick={async () => { await api.post(`/api/admin/tickets/${x.id}/reply`, { reply: reply[x.id] }); reload() }}>{t('رد', 'Reply')}</button>
                <button className="btn-ghost btn-sm" onClick={async () => { await api.post(`/api/admin/tickets/${x.id}/close`); reload() }}>{t('إغلاق', 'Close')}</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const settingLabels = {
  serviceFeePercent: ['رسوم الخدمة على الضيف %', 'Guest service fee %'], vatPercent: ['ضريبة القيمة المضافة %', 'VAT %'],
  minPrice: ['أدنى سعر في فلتر البحث', 'Search min price'], maxPrice: ['أعلى سعر في فلتر البحث', 'Search max price'],
  minArea: ['أدنى مساحة في الفلتر', 'Search min area'], maxArea: ['أعلى مساحة في الفلتر', 'Search max area'],
  changeFee: ['رسوم تغيير موعد الحجز', 'Date change fee'], providerCommissionPercent: ['عمولة مقدمي الخدمات %', 'Provider commission %'],
  estimateOccupancy: ['نسبة الإشغال المفترضة لحاسبة الدخل', 'Calculator occupancy rate'],
  'site.phone': ['هاتف خدمة العملاء', 'Support phone'], 'site.email': ['البريد الإلكتروني', 'Support email'], 'site.estimateNote': ['نص توضيح حاسبة الدخل', 'Calculator explanation'],
}

export function AdminSettings() {
  const { data } = useFetch('/api/admin/settings')
  const { reload } = useMeta()
  const { t } = useLang()
  const toast = useToast()
  const [vals, setVals] = useState(null)
  const v = vals || Object.fromEntries((data || []).map((s) => [s.key, s.value]))
  if (!data) return <PageLoader />
  return (
    <div className="max-w-3xl">
      <DashHeader title={t('إعدادات المنصة', 'Platform settings')} />
      <div className="card grid gap-4 p-6 md:grid-cols-2">
        {Object.keys(v).map((k) => (
          <div key={k} className={k.includes('Note') ? 'md:col-span-2' : ''}>
            <label className="label">{t(...(settingLabels[k] || [k, k]))}</label>
            {k.includes('Note') ? <textarea className="input min-h-24" value={v[k]} onChange={(e) => setVals({ ...v, [k]: e.target.value })} /> : <input className="input" value={v[k]} onChange={(e) => setVals({ ...v, [k]: e.target.value })} />}
          </div>
        ))}
        <div className="md:col-span-2"><button className="btn-primary" onClick={async () => { await api.put('/api/admin/settings', v); toast(t('تم حفظ الإعدادات', 'Settings saved')); reload() }}>{t('حفظ', 'Save')}</button></div>
      </div>
    </div>
  )
}
