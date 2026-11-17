import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, BadgeCheck, Building, CalendarDays, CheckCircle2, CreditCard, Lock, Smartphone, Users } from 'lucide-react'
import { Img, PageLoader, RatingPill, Spinner } from '../components/ui'
import { api, qs } from '../lib/api'
import { useAuth, useFetch, useToast } from '../lib/store'
import { useLang } from '../lib/i18n'

export default function Checkout() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const checkIn = params.get('checkIn'), checkOut = params.get('checkOut'), guests = +params.get('guests') || 1
  const { data: p } = useFetch(`/api/properties/${id}`, [id])
  const { user, requireAuth } = useAuth()
  const { t, n, money, date, ar } = useLang()
  const toast = useToast()
  const nav = useNavigate()
  const [quote, setQuote] = useState(null)
  const [method, setMethod] = useState('Card')
  const [notes, setNotes] = useState('')
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)

  useEffect(() => {
    if (!user) requireAuth()
    api.get(`/api/properties/${id}/quote` + qs({ checkIn, checkOut })).then(setQuote).catch(() => {})
  }, [id, checkIn, checkOut]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!p || !quote) return <PageLoader />
  const q = quote.quote

  const methods = [
    ['Card', CreditCard, t('بطاقة ائتمانية / مدى', 'Credit card / mada'), 'VISA · MC · mada'],
    ['ApplePay', Smartphone, 'Apple Pay', ''],
    ['Tamara', CalendarDays, t('تمارا — قسّمها على 4', 'Tamara — pay in 4'), t(`${money(q.total / 4)} شهرياً`, `${money(q.total / 4)} / month`)],
    ['Tabby', CalendarDays, t('تابي — ادفع لاحقاً', 'Tabby — pay later'), t('بدون فوائد', 'Interest-free')],
    ['BankTransfer', Building, t('تحويل بنكي', 'Bank transfer'), ''],
  ]

  const pay = async () => {
    if (!(await requireAuth())) return
    setBusy(true)
    try {
      const r = await api.post('/api/bookings', { propertyId: id, checkIn, checkOut, guests, paymentMethod: method, notes })
      setDone(r)
    } catch (e) {
      toast(e.code === 'not_available' ? t('التواريخ لم تعد متاحة', 'Those dates are no longer available') : t('تعذر إتمام الحجز', 'Could not complete booking'), 'error')
    } finally {
      setBusy(false)
    }
  }

  if (done)
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
          className="mx-auto grid size-24 place-items-center rounded-full bg-gradient-to-br from-mint to-emerald-600 text-white shadow-float">
          <CheckCircle2 className="size-12" />
        </motion.div>
        {Array.from({ length: 18 }, (_, i) => (
          <motion.span key={i} className="pointer-events-none fixed top-1/3 size-2.5 rounded-full"
            style={{ left: '50%', background: ['#4190b5', '#ffb547', '#19c39c', '#ff6b57'][i % 4] }}
            initial={{ x: 0, y: 0, opacity: 1 }} animate={{ x: Math.cos(i) * 300, y: Math.sin(i) * 240 + 200, opacity: 0, rotate: 360 }} transition={{ duration: 1.6, ease: 'easeOut' }} />
        ))}
        <h1 className="mt-6 text-3xl font-bold">{t('تم تأكيد حجزك! 🎉', 'Your booking is confirmed! 🎉')}</h1>
        <p className="mt-2 text-ink/60">{t(`رقم الحجز ${done.code} — أرسلنا التفاصيل إلى جوالك`, `Booking ${done.code} — details were sent to your phone`)}</p>
        <div className="card mt-8 flex items-center gap-4 p-4 text-start">
          <Img src={p.images[0]} className="size-20 rounded-2xl" />
          <div>
            <div className="font-semibold">{p.title}</div>
            <div className="text-sm text-ink/60">{date(checkIn)} → {date(checkOut)}</div>
            <div className="text-sm font-semibold">{money(q.total)}</div>
          </div>
        </div>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/bookings" className="btn-primary">{t('عرض حجوزاتي', 'View my bookings')}</Link>
          <Link to="/" className="btn-ghost">{t('الرئيسية', 'Home')}</Link>
        </div>
      </div>
    )

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <button onClick={() => nav(-1)} className="mb-6 flex items-center gap-2 text-sm text-ink/60 hover:text-ink">
        <ArrowRight className={`size-4 ${ar ? '' : 'rotate-180'}`} /> {t('رجوع', 'Back')}
      </button>
      <h1 className="text-3xl font-bold">{t('تأكيد الحجز والدفع', 'Confirm and pay')}</h1>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_400px]">
        <div className="space-y-8">
          <section className="card p-6">
            <h2 className="text-lg font-semibold">{t('رحلتك', 'Your trip')}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div><div className="text-sm text-ink/50">{t('الوصول', 'Check-in')}</div><div className="font-medium">{date(checkIn)}</div><div className="text-xs text-ink/50">{p.checkInTime}</div></div>
              <div><div className="text-sm text-ink/50">{t('المغادرة', 'Check-out')}</div><div className="font-medium">{date(checkOut)}</div><div className="text-xs text-ink/50">{p.checkOutTime}</div></div>
              <div><div className="text-sm text-ink/50">{t('الضيوف', 'Guests')}</div><div className="flex items-center gap-1 font-medium"><Users className="size-4" />{guests}</div></div>
            </div>
            {!quote.available && <p className="mt-4 rounded-xl bg-coral/10 p-3 text-sm text-coral">{t('للأسف هذه التواريخ محجوزة، اختر تواريخ أخرى', 'Sorry, these dates are booked')}</p>}
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-semibold">{t('طريقة الدفع', 'Payment method')}</h2>
            <div className="mt-4 space-y-3">
              {methods.map(([k, I, label, hint]) => (
                <label key={k} className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 transition ${method === k ? 'border-brand-500 bg-brand-50/50' : 'border-black/5 hover:border-black/15'}`}>
                  <input type="radio" name="m" className="accent-brand-600" checked={method === k} onChange={() => setMethod(k)} />
                  <I className="size-5 text-brand-600" />
                  <span className="flex-1 font-medium">{label}</span>
                  <span className="text-xs text-ink/50">{hint}</span>
                </label>
              ))}
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-ink/50"><Lock className="size-3.5" />{t('سيتم تحويلك إلى بوابة الدفع الآمنة لإتمام العملية', 'You will be redirected to a secure payment gateway')}</p>
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-semibold">{t('ملاحظات للمضيف (اختياري)', 'Notes for the host (optional)')}</h2>
            <textarea className="input mt-3 min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('موعد وصولك المتوقع، طلبات خاصة…', 'Expected arrival time, special requests…')} />
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-semibold">{t('سياسة الإلغاء', 'Cancellation policy')}</h2>
            <p className="mt-2 text-sm text-ink/70">{p.freeCancellation && <b className="text-mint">{t('إلغاء مجاني. ', 'Free cancellation. ')}</b>}{p.cancellationPolicy}</p>
            <label className="mt-4 flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1 accent-brand-600" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              {t('أوافق على شروط الحجز وسياسة الإلغاء وقواعد المنزل', 'I agree to the booking terms, cancellation policy and house rules')}
            </label>
          </section>
        </div>

        <aside>
          <div className="card sticky top-24 p-6">
            <div className="flex gap-4">
              <Img src={p.images[0]} className="size-24 shrink-0 rounded-2xl" />
              <div>
                <div className="text-xs text-ink/50">{n(p.type)} · {n(p.city)}</div>
                <div className="font-semibold leading-snug">{p.title}</div>
                <div className="mt-1"><RatingPill value={p.rating} count={p.reviewsCount} dark /></div>
              </div>
            </div>
            <div className="mt-6 space-y-2.5 border-t border-black/5 pt-5 text-sm">
              <div className="flex justify-between"><span className="text-ink/70">{money(q.nightPrice)} × {q.nights} {t('ليالٍ', 'nights')}</span><span>{money(q.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-ink/70">{t('رسوم الخدمة', 'Service fee')}</span><span>{money(q.serviceFee)}</span></div>
              <div className="flex justify-between"><span className="text-ink/70">{t('ضريبة القيمة المضافة', 'VAT')}</span><span>{money(q.vat)}</span></div>
              {q.deposit > 0 && <div className="flex justify-between"><span className="text-ink/70">{t('مبلغ التأمين (مسترد)', 'Refundable deposit')}</span><span>{money(q.deposit)}</span></div>}
              <div className="flex justify-between border-t border-black/10 pt-3 text-lg font-bold"><span>{t('الإجمالي', 'Total')}</span><span>{money(q.total)}</span></div>
            </div>
            <button className="btn-primary mt-6 w-full py-4 text-base" disabled={!agree || busy || !quote.available} onClick={pay}>
              {busy ? <Spinner /> : <Lock className="size-4" />} {t(`ادفع ${money(q.total)}`, `Pay ${money(q.total)}`)}
            </button>
            <p className="mt-3 flex items-center justify-center gap-1 text-xs text-ink/50"><BadgeCheck className="size-4 text-mint" />{t('حجز فوري مضمون', 'Instant guaranteed booking')}</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
