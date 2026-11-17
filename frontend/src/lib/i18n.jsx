import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const LangCtx = createContext(null)

// Strings are written inline as t('عربي', 'English') so both languages live next to the UI that uses them.
export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'ar')

  useEffect(() => {
    localStorage.setItem('lang', lang)
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  const value = useMemo(() => {
    const ar = lang === 'ar'
    const locale = ar ? 'ar-SA-u-nu-latn' : 'en-US'
    return {
      lang,
      ar,
      dir: ar ? 'rtl' : 'ltr',
      toggle: () => setLang(ar ? 'en' : 'ar'),
      t: (a, e) => (ar ? a : e ?? a),
      // Accepts {ar,en} or {nameAr,nameEn} objects coming from the API.
      n: (o) => (!o ? '' : ar ? o.ar ?? o.nameAr ?? '' : o.en ?? o.nameEn ?? o.ar ?? o.nameAr ?? ''),
      money: (v) => `${Math.round(Number(v) || 0).toLocaleString(locale)} ${ar ? 'ر.س' : 'SAR'}`,
      num: (v) => (Number(v) || 0).toLocaleString(locale),
      date: (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
        d ? new Date(typeof d === 'string' && d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString(locale, opts) : '',
      time: (d) => new Date(d).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }),
    }
  }, [lang])

  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>
}

export const useLang = () => useContext(LangCtx)

export const statusText = {
  PendingPayment: ['بانتظار الدفع', 'Awaiting payment'],
  Confirmed: ['مؤكد', 'Confirmed'],
  CheckedIn: ['تم التسليم', 'Checked in'],
  Completed: ['مكتمل', 'Completed'],
  Cancelled: ['ملغي', 'Cancelled'],
  Pending: ['قيد المراجعة', 'Pending'],
  Approved: ['منشور', 'Live'],
  Rejected: ['مرفوض', 'Rejected'],
  Hidden: ['مخفي', 'Hidden'],
  Accepted: ['مقبول', 'Accepted'],
  Arrived: ['وصل', 'Arrived'],
  Done: ['منجز', 'Done'],
  Open: ['مفتوحة', 'Open'],
  Answered: ['تم الرد', 'Answered'],
  Closed: ['مغلقة', 'Closed'],
}

export const directions = [
  ['الشمال', 'North'], ['الجنوب', 'South'], ['الشرق', 'East'], ['الغرب', 'West'],
  ['شمال شرق', 'North-east'], ['شمال غرب', 'North-west'], ['جنوب شرق', 'South-east'], ['جنوب غرب', 'South-west'],
]
export const directionKeys = ['North', 'South', 'East', 'West', 'NorthEast', 'NorthWest', 'SouthEast', 'SouthWest']
