import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { List, Map as MapIcon, SlidersHorizontal, X, RotateCcw } from 'lucide-react'
import SearchBar from '../components/SearchBar'
import PropertyCard, { CardSkeleton } from '../components/PropertyCard'
import MapView from '../components/MapView'
import { Counter, Empty, Icon } from '../components/ui'
import { api, qs } from '../lib/api'
import { useMeta } from '../lib/store'
import { useLang, directions } from '../lib/i18n'

const csv = (s) => (s ? String(s).split(',').filter(Boolean) : [])

function Group({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-black/5 py-5">
      <button className="flex w-full items-center justify-between font-semibold" onClick={() => setOpen(!open)}>
        {title} <span className="text-ink/30">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  )
}

function Chips({ options, value, onChange, multi = true }) {
  const { n } = useLang()
  const sel = csv(value)
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const id = String(o.id)
        const on = sel.includes(id)
        return (
          <button key={id} className={`chip ${on ? 'chip-on' : ''}`}
            onClick={() => onChange(multi ? (on ? sel.filter((x) => x !== id) : [...sel, id]).join(',') : on ? '' : id)}>
            {o.icon && <Icon name={o.icon} className="size-4" />} {o.label ?? n(o)}
          </button>
        )
      })}
    </div>
  )
}

function Filters({ f, set, meta, onClose }) {
  const { t } = useLang()
  const lk = meta?.lookups || {}
  const city = meta?.cities?.find((c) => c.id == f.cityId)
  // Lookup ids from several admin lists share one `lookupIds` param (all must match).
  const lookupGroup = (kind) => {
    const ids = new Set((lk[kind] || []).map((l) => String(l.id)))
    const all = csv(f.lookupIds)
    return [all.filter((x) => ids.has(x)).join(','), (v) => set({ lookupIds: [...all.filter((x) => !ids.has(x)), ...csv(v)].join(',') })]
  }
  const [cls, setCls] = lookupGroup('Classification')
  const [cat, setCat] = lookupGroup('Category')
  const [pool, setPool] = lookupGroup('PoolType')
  const [amen, setAmen] = lookupGroup('Amenity')
  const [bath, setBath] = lookupGroup('BathType')
  const [kit, setKit] = lookupGroup('Kitchen')

  return (
    <div>
      <div className="flex items-center justify-between pb-2">
        <h3 className="text-lg font-semibold">{t('تصفية النتائج', 'Filters')}</h3>
        <div className="flex gap-1">
          <button className="btn-ghost btn-sm" onClick={() => set(null)}><RotateCcw className="size-4" />{t('مسح', 'Reset')}</button>
          {onClose && <button className="btn-ghost btn-sm" onClick={onClose}><X className="size-4" /></button>}
        </div>
      </div>

      <Group title={t('تصفية سريعة', 'Quick filters')}>
        <div className="flex flex-wrap gap-2">
          {[['offers', t('العروض والخصومات', 'Deals'), 'percent'], ['freeCancel', t('إلغاء مجاني', 'Free cancellation'), 'badge-check'], ['noDeposit', t('بدون تأمين', 'No deposit'), 'wallet']].map(([k, l, i]) => (
            <button key={k} className={`chip ${f[k] ? 'chip-on' : ''}`} onClick={() => set({ [k]: f[k] ? '' : 'true' })}><Icon name={i} className="size-4" />{l}</button>
          ))}
        </div>
      </Group>

      <Group title={t('السعر لليلة', 'Price per night')}>
        <div className="grid grid-cols-2 gap-2">
          <input className="input" type="number" placeholder={`${t('من', 'Min')} ${meta?.priceRange?.min ?? ''}`} value={f.minPrice || ''} onChange={(e) => set({ minPrice: e.target.value })} />
          <input className="input" type="number" placeholder={`${t('إلى', 'Max')} ${meta?.priceRange?.max ?? ''}`} value={f.maxPrice || ''} onChange={(e) => set({ maxPrice: e.target.value })} />
        </div>
        <input type="range" className="mt-3 w-full accent-brand-600" min={meta?.priceRange?.min || 0} max={meta?.priceRange?.max || 5000} step={50}
          value={f.maxPrice || meta?.priceRange?.max || 5000} onChange={(e) => set({ maxPrice: e.target.value })} />
      </Group>

      <Group title={t('التقييم', 'Rating')}>
        <Chips multi={false} value={f.minRating} onChange={(v) => set({ minRating: v })}
          options={[[9, t('ممتاز 9+', 'Excellent 9+')], [8, t('جيد جداً 8+', 'Very good 8+')], [7, t('جيد 7+', 'Good 7+')], [6, t('مرضي 6+', 'Fair 6+')]].map(([id, label]) => ({ id, label }))} />
      </Group>

      <Group title={t('نوع العقار', 'Property type')}>
        <Chips options={meta?.types || []} value={f.typeIds} onChange={(v) => set({ typeIds: v })} />
      </Group>

      {city && (
        <Group title={t(`أحياء ${city.nameAr}`, `${city.nameEn} districts`)}>
          <Chips options={city.districts} value={f.districtIds} onChange={(v) => set({ districtIds: v })} />
        </Group>
      )}

      <Group title={t('السعة', 'Capacity')}>
        <Chips multi={false} options={lk.Capacity || []} value={f.capacityId} onChange={(v) => set({ capacityId: v })} />
      </Group>

      <Group title={t('غرف النوم والأسرّة', 'Bedrooms & beds')}>
        {[['rooms', t('غرف النوم', 'Bedrooms')], ['masterRooms', t('غرف ماستر', 'Master rooms')], ['beds', t('عدد الأسرّة', 'Beds')], ['bathrooms', t('دورات المياه', 'Bathrooms')]].map(([k, l]) => (
          <div key={k} className="flex items-center justify-between py-1.5">
            <span className="text-sm">{l}</span>
            <Counter value={+f[k] || 0} onChange={(v) => set({ [k]: v || '' })} max={20} />
          </div>
        ))}
      </Group>

      <Group title={t('المساحة (م²)', 'Area (m²)')} defaultOpen={false}>
        <div className="grid grid-cols-2 gap-2">
          <input className="input" type="number" placeholder={t('من', 'Min')} value={f.minArea || ''} onChange={(e) => set({ minArea: e.target.value })} />
          <input className="input" type="number" placeholder={t('إلى', 'Max')} value={f.maxArea || ''} onChange={(e) => set({ maxArea: e.target.value })} />
        </div>
      </Group>

      <Group title={t('اختياراتنا', 'Our picks')} defaultOpen={false}><Chips options={lk.Classification || []} value={cls} onChange={setCls} /></Group>
      <Group title={t('الفئة', 'Suitable for')} defaultOpen={false}><Chips options={lk.Category || []} value={cat} onChange={setCat} /></Group>
      <Group title={t('نوع المسبح', 'Pool type')} defaultOpen={false}><Chips options={lk.PoolType || []} value={pool} onChange={setPool} /></Group>
      <Group title={t('المزايا والمرفقات', 'Amenities')} defaultOpen={false}><Chips options={lk.Amenity || []} value={amen} onChange={setAmen} /></Group>
      <Group title={t('الحمامات', 'Bathrooms')} defaultOpen={false}><Chips options={lk.BathType || []} value={bath} onChange={setBath} /></Group>
      <Group title={t('مرافق المطبخ', 'Kitchen')} defaultOpen={false}><Chips options={lk.Kitchen || []} value={kit} onChange={setKit} /></Group>

      <Group title={t('بحث متقدم', 'Advanced')} defaultOpen={false}>
        <label className="label">{t('اسم العقار أو الرمز', 'Name or code')}</label>
        <input className="input" placeholder="DY10231" value={f.q || ''} onChange={(e) => set({ q: e.target.value })} />
        <label className="label mt-3">{t('اتجاه العقار', 'Facing')}</label>
        <Chips options={directions.map(([a, e], i) => ({ id: i, label: t(a, e) }))} value={f.directions} onChange={(v) => set({ directions: v })} />
      </Group>
    </div>
  )
}

export default function Search() {
  const [params, setParams] = useSearchParams()
  const f = useMemo(() => Object.fromEntries(params.entries()), [params])
  const { meta } = useMeta()
  const { t, num } = useLang()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('split')
  const [drawer, setDrawer] = useState(false)
  const [active, setActive] = useState(null)
  const [pendingBbox, setPendingBbox] = useState(null)

  const set = (patch) => {
    if (patch === null) return setParams({})
    const next = { ...f, ...patch }
    for (const k of Object.keys(next)) if (next[k] === '' || next[k] == null) delete next[k]
    delete next.page
    setParams(next, { replace: true })
  }

  useEffect(() => {
    let cancel = false
    setLoading(true)
    const id = setTimeout(() => {
      api.get('/api/properties' + qs({ ...f, pageSize: 60 })).then((d) => !cancel && (setData(d), setLoading(false))).catch(() => setLoading(false))
    }, 250)
    return () => { cancel = true; clearTimeout(id) }
  }, [params]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeCount = Object.keys(f).filter((k) => !['sort', 'checkIn', 'checkOut', 'guests', 'cityId', 'q', 'bbox'].includes(k)).length
  const cityName = meta?.cities?.find((c) => c.id == f.cityId)

  return (
    <div className="mx-auto max-w-[1600px] px-4 md:px-6">
      <div className="z-30 -mx-4 bg-sand/90 md:sticky md:top-18 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <SearchBar compact initial={{ ...f, guests: +f.guests || 1 }} key={params.toString()} />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button className="chip lg:hidden" onClick={() => setDrawer(true)}>
            <SlidersHorizontal className="size-4" /> {t('الفلاتر', 'Filters')}
            {activeCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-brand-600 text-xs text-white">{activeCount}</span>}
          </button>
          {[['offers', t('عروض', 'Deals')], ['freeCancel', t('إلغاء مجاني', 'Free cancel')], ['noDeposit', t('بدون تأمين', 'No deposit')]].map(([k, l]) => (
            <button key={k} className={`chip ${f[k] ? 'chip-on' : ''}`} onClick={() => set({ [k]: f[k] ? '' : 'true' })}>{l}</button>
          ))}
          <div className="ms-auto flex items-center gap-2">
            <select className="input !w-auto !rounded-full !py-2 text-sm" value={f.sort || 'recommended'} onChange={(e) => set({ sort: e.target.value })}>
              <option value="recommended">{t('الأكثر ملاءمة', 'Recommended')}</option>
              <option value="rating">{t('الأعلى تقييماً', 'Top rated')}</option>
              <option value="priceAsc">{t('السعر: من الأقل', 'Price: low to high')}</option>
              <option value="priceDesc">{t('السعر: من الأعلى', 'Price: high to low')}</option>
              <option value="newest">{t('الأحدث', 'Newest')}</option>
            </select>
            <div className="hidden rounded-full bg-white p-1 shadow-sm md:flex">
              {[['list', List], ['split', MapIcon]].map(([k, I]) => (
                <button key={k} onClick={() => setView(k)} className={`rounded-full p-2 ${view === k ? 'bg-ink text-white' : 'text-ink/50'}`}><I className="size-4" /></button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-6 pt-2">
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-48 max-h-[calc(100vh-13rem)] overflow-y-auto rounded-3xl bg-white p-5 shadow-soft">
            <Filters f={f} set={set} meta={meta} />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold">
              {loading ? t('جاري البحث…', 'Searching…') : t(`${num(data?.total)} عقار متاح`, `${num(data?.total)} stays available`)}
              {cityName && <span className="text-ink/50"> · {t(cityName.nameAr, cityName.nameEn)}</span>}
            </h1>
            {f.bbox && <button className="chip" onClick={() => set({ bbox: '' })}><X className="size-4" />{t('إلغاء تحديد الخريطة', 'Clear map area')}</button>}
          </div>
          {!loading && data?.items?.length === 0 ? (
            <Empty title={t('لا توجد نتائج مطابقة', 'No matching stays')} text={t('جرّب تعديل الفلاتر أو تغيير التواريخ', 'Try adjusting filters or dates')}
              action={<button className="btn-primary" onClick={() => set(null)}>{t('مسح الفلاتر', 'Clear filters')}</button>} />
          ) : (
            <div className={`grid gap-x-5 gap-y-8 sm:grid-cols-2 ${view === 'split' ? 'xl:grid-cols-2 2xl:grid-cols-3' : 'xl:grid-cols-3 2xl:grid-cols-4'}`}>
              {loading && !data ? Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />) : data?.items?.map((p, i) => <PropertyCard key={p.id} p={p} index={i} onHover={setActive} />)}
            </div>
          )}
        </div>

        {view === 'split' && (
          <div className="sticky top-48 hidden h-[calc(100vh-13rem)] w-[38%] shrink-0 overflow-hidden rounded-3xl shadow-soft md:block">
            <MapView items={data?.items || []} active={active} onBounds={setPendingBbox} />
            <AnimatePresence>
              {pendingBbox && pendingBbox !== f.bbox && (
                <motion.button initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="btn absolute start-1/2 top-4 z-[500] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-float rtl:translate-x-1/2"
                  onClick={() => { set({ bbox: pendingBbox }); setPendingBbox(null) }}>
                  {t('ابحث في هذه المنطقة', 'Search this area')}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {drawer && (
          <motion.div className="fixed inset-0 z-[1200] bg-ink/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)}>
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30 }}
              className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-white p-5">
              <Filters f={f} set={set} meta={meta} onClose={() => setDrawer(false)} />
              <button className="btn-primary sticky bottom-0 mt-4 w-full" onClick={() => setDrawer(false)}>{t(`عرض ${num(data?.total)} نتيجة`, `Show ${num(data?.total)} results`)}</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
