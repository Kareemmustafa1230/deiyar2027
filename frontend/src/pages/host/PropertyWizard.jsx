import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, ImagePlus, Link2, Trash2, Star } from 'lucide-react'
import { PickMap } from '../../components/MapView'
import { Counter, Icon, Img, PageLoader, Spinner } from '../../components/ui'
import { api } from '../../lib/api'
import { useMeta, useToast } from '../../lib/store'
import { useLang, directions, directionKeys } from '../../lib/i18n'

const blank = {
  title: '', description: '', cityId: '', districtId: '', address: '', lat: null, lng: null, typeId: '', direction: 'North',
  area: 100, rooms: 1, masterRooms: 0, singleBeds: 0, doubleBeds: 1, bathrooms: 1, pools: 0, capacity: 4,
  pricePerNight: 500, discountPercent: 0, deposit: null, freeCancellation: true,
  cancellationPolicy: 'إلغاء مجاني حتى 48 ساعة قبل موعد الوصول، بعد ذلك يُسترد مبلغ التأمين فقط.',
  checkInTime: '16:00', checkOutTime: '12:00', videoUrl: '', images: [], lookupIds: [],
}

export default function PropertyWizard() {
  const { id } = useParams()
  const { meta } = useMeta()
  const { t, n, ar } = useLang()
  const toast = useToast()
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const [f, setF] = useState(blank)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(!!id)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [urlInput, setUrlInput] = useState('')

  useEffect(() => {
    if (!id) return
    api.get(`/api/host/properties/${id}`).then((p) => { setF({ ...blank, ...p, videoUrl: p.videoUrl || '' }); setCode(p.code); setLoading(false) })
  }, [id])

  if (loading || !meta) return <PageLoader />
  const set = (patch) => setF((x) => ({ ...x, ...patch }))
  const city = meta.cities.find((c) => c.id == f.cityId)
  const lk = meta.lookups
  const toggleLookup = (lid) => set({ lookupIds: f.lookupIds.includes(lid) ? f.lookupIds.filter((x) => x !== lid) : [...f.lookupIds, lid] })

  const steps = [
    t('تعريف العقار', 'Basics'), t('المواصفات', 'Specs'), t('الفئة والمساحة', 'Category & size'), t('الغرف والحمامات', 'Rooms & baths'),
    t('التكلفة والتأمين', 'Price & deposit'), t('الوسائط والوصف', 'Media & description'), t('المزايا والتجهيزات', 'Amenities'),
  ]
  const valid = [
    f.title.trim() && f.cityId && f.districtId && f.address.trim(),
    f.typeId,
    f.area > 0 && f.capacity > 0,
    true,
    f.pricePerNight > 0,
    f.images.length > 0 && f.description.trim() && f.lat,
    true,
  ]

  const upload = async (files) => {
    setUploading(true)
    try { const urls = await api.upload(files); set({ images: [...f.images, ...urls] }) } finally { setUploading(false) }
  }

  const submit = async () => {
    setBusy(true)
    const body = { ...f, cityId: +f.cityId, districtId: +f.districtId, typeId: +f.typeId, deposit: f.deposit ? +f.deposit : null, videoUrl: f.videoUrl || null }
    try {
      if (id) await api.put(`/api/host/properties/${id}`, body)
      else await api.post('/api/host/properties', body)
      toast(id ? t('تم حفظ التعديلات', 'Changes saved') : t('تم إرسال العقار للمراجعة ✨', 'Submitted for review ✨'))
      nav('/host/properties')
    } catch {
      toast(t('تعذر الحفظ، تحقق من البيانات', 'Could not save, check the form'), 'error')
    } finally { setBusy(false) }
  }

  const chip = (l) => (
    <button key={l.id} type="button" onClick={() => toggleLookup(l.id)} className={`chip ${f.lookupIds.includes(l.id) ? 'chip-on' : ''}`}>
      <Icon name={l.icon} className="size-4" />{n(l)}{f.lookupIds.includes(l.id) && <Check className="size-3.5" />}
    </button>
  )
  const num = (k, label, max = 50) => (
    <div key={k} className="flex items-center justify-between rounded-2xl border border-black/5 bg-white p-4">
      <span className="font-medium">{label}</span>
      <Counter value={+f[k] || 0} max={max} onChange={(v) => set({ [k]: v })} />
    </div>
  )

  const body = [
    <div className="grid gap-4 md:grid-cols-2" key="0">
      <div className="md:col-span-2">
        <label className="label">{t('الرمز الفريد للعقار', 'Unique code')}</label>
        <input className="input bg-black/5" disabled value={code || t('يُنشأ تلقائياً عند الحفظ', 'Generated on save')} />
      </div>
      <div className="md:col-span-2"><label className="label">{t('اسم العقار', 'Property name')}</label><input className="input" value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder={t('مثال: شاليه اللؤلؤة', 'e.g. Pearl Chalet')} /></div>
      <div>
        <label className="label">{t('المدينة', 'City')}</label>
        <select className="input" value={f.cityId} onChange={(e) => set({ cityId: e.target.value, districtId: '' })}>
          <option value="">{t('اختر المدينة', 'Select city')}</option>{meta.cities.map((c) => <option key={c.id} value={c.id}>{n(c)}</option>)}
        </select>
      </div>
      <div>
        <label className="label">{t('الحي', 'District')}</label>
        <select className="input" value={f.districtId} disabled={!city} onChange={(e) => set({ districtId: e.target.value })}>
          <option value="">{t('اختر الحي', 'Select district')}</option>{city?.districts.map((d) => <option key={d.id} value={d.id}>{n(d)}</option>)}
        </select>
      </div>
      <div className="md:col-span-2"><label className="label">{t('العنوان التفصيلي', 'Full address')}</label><input className="input" value={f.address} onChange={(e) => set({ address: e.target.value })} /></div>
    </div>,

    <div key="1" className="space-y-6">
      <div>
        <label className="label">{t('نوع العقار', 'Property type')}</label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {meta.types.map((x) => (
            <button key={x.id} type="button" onClick={() => set({ typeId: x.id })}
              className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition ${f.typeId == x.id ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-black/5 bg-white hover:border-black/15'}`}>
              <Icon name={x.icon} className="size-7" /><span className="text-sm font-medium">{n(x)}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">{t('اتجاه العقار', 'Facing')}</label>
        <div className="flex flex-wrap gap-2">
          {directionKeys.map((k, i) => <button key={k} type="button" className={`chip ${f.direction === k ? 'chip-on' : ''}`} onClick={() => set({ direction: k })}>{t(...directions[i])}</button>)}
        </div>
      </div>
    </div>,

    <div key="2" className="space-y-6">
      <div><label className="label">{t('فئة العقار (يمكن اختيار أكثر من فئة)', 'Suitable for (multi-select)')}</label><div className="flex flex-wrap gap-2">{lk.Category?.map((l) => chip(l))}</div></div>
      <div><label className="label">{t('تصنيف العقار', 'Style')}</label><div className="flex flex-wrap gap-2">{lk.Classification?.map((l) => chip(l))}</div></div>
      <div className="grid gap-4 md:grid-cols-2">
        <div><label className="label">{t('المساحة (م²)', 'Area (m²)')}</label><input type="number" className="input" value={f.area} onChange={(e) => set({ area: +e.target.value })} /></div>
        <div><label className="label">{t('السعة (عدد الأشخاص)', 'Capacity (guests)')}</label><input type="number" className="input" value={f.capacity} onChange={(e) => set({ capacity: +e.target.value })} /></div>
      </div>
      {num('rooms', t('عدد الغرف', 'Rooms'))}
    </div>,

    <div key="3" className="grid gap-3 md:grid-cols-2">
      {num('masterRooms', t('غرف ماستر', 'Master rooms'))}
      {num('singleBeds', t('أسرّة مفردة', 'Single beds'))}
      {num('doubleBeds', t('أسرّة مزدوجة', 'Double beds'))}
      {num('bathrooms', t('دورات المياه', 'Bathrooms'))}
    </div>,

    <div key="4" className="grid gap-4 md:grid-cols-2">
      <div><label className="label">{t('سعر الليلة (ر.س)', 'Price per night (SAR)')}</label><input type="number" className="input text-lg font-semibold" value={f.pricePerNight} onChange={(e) => set({ pricePerNight: +e.target.value })} /></div>
      <div><label className="label">{t('نسبة الخصم %', 'Discount %')}</label><input type="number" min={0} max={90} className="input" value={f.discountPercent} onChange={(e) => set({ discountPercent: +e.target.value })} /></div>
      <div className="md:col-span-2 rounded-2xl border border-black/5 bg-white p-4">
        <label className="flex items-center justify-between gap-3 font-medium">
          {t('يتطلب مبلغ تأمين', 'Requires a security deposit')}
          <input type="checkbox" className="size-5 accent-brand-600" checked={f.deposit != null} onChange={(e) => set({ deposit: e.target.checked ? 500 : null })} />
        </label>
        {f.deposit != null && <input type="number" className="input mt-3" value={f.deposit} onChange={(e) => set({ deposit: e.target.value })} placeholder={t('قيمة التأمين', 'Deposit amount')} />}
      </div>
      <div className="md:col-span-2">
        <label className="label">{t('سياسة الحجز والإلغاء', 'Booking & cancellation')}</label>
        <div className="mb-3 flex flex-wrap gap-2">
          <button type="button" className={`chip ${f.freeCancellation ? 'chip-on' : ''}`} onClick={() => set({ freeCancellation: !f.freeCancellation })}>{t('إلغاء الحجز مجاني', 'Free cancellation')}</button>
          {lk.Policy?.filter((l) => l.nameEn !== 'Free cancellation').map((l) => chip(l))}
        </div>
        <textarea className="input min-h-20" value={f.cancellationPolicy} onChange={(e) => set({ cancellationPolicy: e.target.value })} />
      </div>
      <div><label className="label">{t('وقت الدخول', 'Check-in time')}</label><input type="time" className="input" value={f.checkInTime} onChange={(e) => set({ checkInTime: e.target.value })} /></div>
      <div><label className="label">{t('وقت الخروج', 'Check-out time')}</label><input type="time" className="input" value={f.checkOutTime} onChange={(e) => set({ checkOutTime: e.target.value })} /></div>
    </div>,

    <div key="5" className="space-y-6">
      <div>
        <label className="label">{t('صور العقار (الأولى هي صورة الغلاف)', 'Photos (first one is the cover)')}</label>
        <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
          {f.images.map((src, i) => (
            <div key={src + i} className="group relative aspect-square overflow-hidden rounded-2xl">
              <Img src={src} className="h-full w-full" />
              {i === 0 && <span className="absolute start-2 top-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold">{t('الغلاف', 'Cover')}</span>}
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition group-hover:opacity-100">
                {i > 0 && <button type="button" className="rounded-full bg-white p-1.5" onClick={() => set({ images: [src, ...f.images.filter((_, k) => k !== i)] })}><Star className="size-4" /></button>}
                <button type="button" className="rounded-full bg-white p-1.5 text-coral" onClick={() => set({ images: f.images.filter((_, k) => k !== i) })}><Trash2 className="size-4" /></button>
              </div>
            </div>
          ))}
          <label className="grid aspect-square cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 text-brand-600 transition hover:bg-brand-50">
            {uploading ? <Spinner /> : <div className="text-center text-xs"><ImagePlus className="mx-auto mb-1 size-6" />{t('رفع صور/فيديو', 'Upload')}</div>}
            <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => upload(e.target.files)} />
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <input className="input" dir="ltr" placeholder="https://…jpg" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} />
          <button type="button" className="btn-ghost" disabled={!urlInput} onClick={() => { set({ images: [...f.images, urlInput] }); setUrlInput('') }}><Link2 className="size-4" />{t('إضافة رابط', 'Add URL')}</button>
        </div>
      </div>
      <div><label className="label">{t('رابط فيديو خارجي (يوتيوب)', 'External video (YouTube)')}</label><input className="input" dir="ltr" value={f.videoUrl} onChange={(e) => set({ videoUrl: e.target.value })} /></div>
      <div><label className="label">{t('وصف العقار', 'Description')}</label><textarea className="input min-h-36" value={f.description} onChange={(e) => set({ description: e.target.value })} /></div>
      <div>
        <label className="label">{t('حدد موقع العقار على الخريطة (اضغط على الخريطة)', 'Pin the location (click on the map)')}</label>
        <div className="h-80 overflow-hidden rounded-3xl"><PickMap value={f.lat ? { lat: f.lat, lng: f.lng } : null} onChange={(v) => set(v)} className="h-full w-full" /></div>
        {f.lat && <p className="mt-2 text-xs text-ink/50" dir="ltr">{f.lat}, {f.lng}</p>}
      </div>
    </div>,

    <div key="6" className="space-y-6">
      {num('pools', t('عدد المسابح', 'Pools'), 10)}
      <div><label className="label">{t('نوع المسبح', 'Pool type')}</label><div className="flex flex-wrap gap-2">{lk.PoolType?.map((l) => chip(l))}</div></div>
      <div><label className="label">{t('أنواع الحمامات', 'Bathroom features')}</label><div className="flex flex-wrap gap-2">{lk.BathType?.map((l) => chip(l))}</div></div>
      <div><label className="label">{t('المزايا والمرفقات', 'Amenities')}</label><div className="flex flex-wrap gap-2">{lk.Amenity?.map((l) => chip(l))}</div></div>
      <div><label className="label">{t('مرافق المطبخ', 'Kitchen')}</label><div className="flex flex-wrap gap-2">{lk.Kitchen?.map((l) => chip(l))}</div></div>
    </div>,
  ]

  const last = step === steps.length - 1
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold md:text-3xl">{id ? t('تعديل العقار', 'Edit property') : t('إضافة عقار جديد', 'Add a new property')}</h1>
      <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <button key={i} onClick={() => (i < step || valid.slice(0, i).every(Boolean)) && setStep(i)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm transition ${i === step ? 'bg-ink text-white' : i < step ? 'bg-brand-50 text-brand-700' : 'bg-white text-ink/50'}`}>
            <span className={`grid size-6 place-items-center rounded-full text-xs ${i === step ? 'bg-white text-ink' : i < step ? 'bg-brand-600 text-white' : 'bg-black/5'}`}>{i < step ? <Check className="size-3.5" /> : i + 1}</span>
            {s}
          </button>
        ))}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/5">
        <motion.div className="h-full rounded-full bg-gradient-to-l from-brand-500 to-brand-700" animate={{ width: `${((step + 1) / steps.length) * 100}%` }} />
      </div>

      <div className="card mt-6 p-6 md:p-8">
        <h2 className="mb-6 text-xl font-semibold">{t('المرحلة', 'Step')} {step + 1}: {steps[step]}</h2>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: ar ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: ar ? 20 : -20 }} transition={{ duration: 0.2 }}>
            {body[step]}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-6 flex justify-between">
        <button className="btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>{ar ? <ArrowRight className="size-4" /> : <ArrowLeft className="size-4" />}{t('السابق', 'Back')}</button>
        {last ? (
          <button className="btn-primary px-8" disabled={busy || !valid.every(Boolean)} onClick={submit}>{busy && <Spinner />}{id ? t('حفظ التعديلات', 'Save changes') : t('نشر العقار', 'Submit listing')}</button>
        ) : (
          <button className="btn-primary px-8" disabled={!valid[step]} onClick={() => setStep(step + 1)}>{t('التالي', 'Next')}{ar ? <ArrowLeft className="size-4" /> : <ArrowRight className="size-4" />}</button>
        )}
      </div>
    </div>
  )
}
