import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Phone, ShieldCheck } from 'lucide-react'
import { Modal, Spinner } from './ui'
import { api } from '../lib/api'
import { useAuth, useToast } from '../lib/store'
import { useLang } from '../lib/i18n'

const errors = {
  invalid_phone: ['رقم الهاتف غير صحيح', 'Invalid phone number'],
  not_registered: ['هذا الرقم غير مسجل، يرجى إنشاء حساب أولاً', 'This number is not registered. Please sign up first.'],
  already_registered: ['هذا الرقم مسجل مسبقاً، سجّل الدخول', 'This number is already registered. Please log in.'],
  invalid_code: ['رمز التحقق غير صحيح', 'Incorrect verification code'],
  code_expired: ['انتهت صلاحية الرمز، اطلب رمزاً جديداً', 'Code expired, request a new one'],
  account_disabled: ['تم إيقاف هذا الحساب', 'This account is disabled'],
  terms_required: ['يجب الموافقة على الشروط والأحكام', 'You must accept the terms'],
}

export default function AuthModal() {
  const { modal, setModal, setSession } = useAuth()
  const { t, ar } = useLang()
  const toast = useToast()
  const [mode, setMode] = useState('login')
  const [step, setStep] = useState('phone')
  const [form, setForm] = useState({ phone: '', fullName: '', email: '', terms: false })
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [devCode, setDevCode] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [timer, setTimer] = useState(0)
  const inputs = useRef([])

  useEffect(() => {
    if (modal) {
      setMode(modal.mode); setStep('phone'); setErr(''); setCode(['', '', '', '', '', '']); setDevCode(null)
    }
  }, [modal])

  useEffect(() => {
    if (timer <= 0) return
    const id = setTimeout(() => setTimer(timer - 1), 1000)
    return () => clearTimeout(id)
  }, [timer])

  const close = (u = null) => {
    modal?.resolve?.(u)
    setModal(null)
  }
  const errText = (e) => t(...(errors[e.code] || ['حدث خطأ، حاول مجدداً', 'Something went wrong']))

  const send = async (e) => {
    e?.preventDefault()
    if (mode === 'register' && (!form.fullName.trim() || !form.terms)) {
      setErr(t(...(!form.terms ? errors.terms_required : ['الاسم مطلوب', 'Name is required'])))
      return
    }
    setBusy(true); setErr('')
    try {
      const r = await api.post('/api/auth/send-otp', { phone: form.phone, mode })
      setDevCode(r.devCode)
      setStep('code'); setTimer(60)
      setTimeout(() => inputs.current[0]?.focus(), 100)
    } catch (e) {
      setErr(errText(e))
    } finally {
      setBusy(false)
    }
  }

  const verify = async (digits) => {
    setBusy(true); setErr('')
    try {
      const r = await api.post('/api/auth/verify', {
        phone: form.phone, code: digits, fullName: form.fullName, email: form.email || null,
        role: modal?.role || null, acceptTerms: form.terms,
      })
      setSession(r)
      toast(t(`أهلاً ${r.user.fullName} 👋`, `Welcome ${r.user.fullName} 👋`))
      close(r.user)
    } catch (e) {
      setErr(errText(e))
      setCode(['', '', '', '', '', ''])
      inputs.current[0]?.focus()
    } finally {
      setBusy(false)
    }
  }

  const onDigit = (i, v) => {
    const chars = v.replace(/\D/g, '')
    if (!chars && v !== '') return
    const next = [...code]
    if (chars.length > 1) {
      chars.slice(0, 6).split('').forEach((c, k) => { if (i + k < 6) next[i + k] = c })
    } else next[i] = chars
    setCode(next)
    const filled = next.findIndex((c) => !c)
    if (filled === -1) verify(next.join(''))
    else if (chars) inputs.current[Math.min(i + chars.length, 5)]?.focus()
  }

  return (
    <Modal open={!!modal} onClose={() => close()}>
      <div className="-mt-4">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-float">
            {step === 'phone' ? <Phone className="size-7" /> : <ShieldCheck className="size-7" />}
          </div>
          <h2 className="text-2xl font-semibold">
            {step === 'code' ? t('أدخل رمز التحقق', 'Enter verification code') : mode === 'login' ? t('تسجيل الدخول', 'Log in') : t('إنشاء حساب جديد', 'Create an account')}
          </h2>
          <p className="mt-1 text-sm text-ink/60">
            {step === 'code'
              ? t(`أرسلنا رمزاً مكوناً من 6 أرقام إلى ${form.phone}`, `We sent a 6-digit code to ${form.phone}`)
              : t('التسجيل يتم عبر رقم الجوال ورمز تحقق SMS', 'Sign in with your phone number and an SMS code')}
          </p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={send} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="label">{t('الاسم الكامل', 'Full name')}</label>
                  <input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} autoFocus />
                </div>
                <div>
                  <label className="label">{t('البريد الإلكتروني', 'Email')}</label>
                  <input className="input" type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </>
            )}
            <div>
              <label className="label">{t('رقم الجوال', 'Mobile number')}</label>
              <div className="flex gap-2" dir="ltr">
                <span className="input w-24 shrink-0 text-center text-ink/60">🇸🇦 +966</span>
                <input
                  className="input text-lg tracking-wider"
                  inputMode="numeric"
                  placeholder="05XXXXXXXX"
                  value={form.phone}
                  autoFocus={mode === 'login'}
                  onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^\d]/g, '').slice(0, 10) })}
                />
              </div>
            </div>
            {mode === 'register' && (
              <label className="flex items-start gap-2 text-sm text-ink/70">
                <input type="checkbox" className="mt-1 accent-brand-600" checked={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.checked })} />
                <span>
                  {t('أوافق على ', 'I agree to the ')}
                  <Link to="/terms" target="_blank" className="text-brand-600 underline">{t('الشروط والأحكام', 'Terms')}</Link>
                  {t(' و', ' and ')}
                  <Link to="/privacy" target="_blank" className="text-brand-600 underline">{t('سياسة الخصوصية', 'Privacy policy')}</Link>
                </span>
              </label>
            )}
            {err && <p className="rounded-xl bg-coral/10 px-3 py-2 text-sm text-coral">{err}</p>}
            <button className="btn-primary w-full py-3.5 text-base" disabled={busy || form.phone.length < 9}>
              {busy && <Spinner />} {t('إرسال رمز التحقق', 'Send code')}
            </button>
            <p className="text-center text-sm text-ink/60">
              {mode === 'login' ? t('ليس لديك حساب؟ ', "Don't have an account? ") : t('لديك حساب؟ ', 'Have an account? ')}
              <button type="button" className="font-semibold text-brand-600" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr('') }}>
                {mode === 'login' ? t('أنشئ حساباً', 'Sign up') : t('سجّل الدخول', 'Log in')}
              </button>
            </p>
          </form>
        ) : (
          <div className="space-y-5">
            <div className="flex justify-center gap-2" dir="ltr">
              {code.map((c, i) => (
                <motion.input
                  key={i}
                  ref={(el) => (inputs.current[i] = el)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}
                  className="size-12 rounded-2xl border-2 border-black/10 bg-white text-center text-xl font-semibold outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 sm:size-14"
                  inputMode="numeric"
                  value={c}
                  onChange={(e) => onDigit(i, e.target.value)}
                  onKeyDown={(e) => e.key === 'Backspace' && !c && i > 0 && inputs.current[i - 1]?.focus()}
                />
              ))}
            </div>
            {devCode && (
              <p className="rounded-xl bg-gold/15 px-3 py-2 text-center text-sm text-amber-800">
                {t('وضع التطوير — الرمز:', 'Dev mode — code:')} <b className="tracking-widest">{devCode}</b>
              </p>
            )}
            {err && <p className="rounded-xl bg-coral/10 px-3 py-2 text-center text-sm text-coral">{err}</p>}
            {busy && <div className="flex justify-center"><Spinner className="size-6 text-brand-600" /></div>}
            <div className="flex items-center justify-between text-sm">
              <button className="inline-flex items-center gap-1 text-ink/60 hover:text-ink" onClick={() => setStep('phone')}>
                <ArrowRight className={`size-4 ${ar ? '' : 'rotate-180'}`} /> {t('تغيير الرقم', 'Change number')}
              </button>
              <button className="font-semibold text-brand-600 disabled:text-ink/30" disabled={timer > 0 || busy} onClick={send}>
                {timer > 0 ? t(`إعادة الإرسال بعد ${timer}ث`, `Resend in ${timer}s`) : t('إعادة إرسال الرمز', 'Resend code')}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
