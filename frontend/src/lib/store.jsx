import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { Bell, CheckCircle2, XCircle } from 'lucide-react'
import { api, getToken } from './api'

/* ---------------- Toasts ---------------- */
const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const push = useCallback((msg, kind = 'success', title) => {
    const id = Math.random()
    setItems((s) => [...s, { id, msg, kind, title }])
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 4500)
  }, [])
  const Icon = { success: CheckCircle2, error: XCircle, info: Bell }
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[2000] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {items.map((x) => {
            const I = Icon[x.kind]
            return (
              <motion.div
                key={x.id}
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-float"
              >
                <I className={`mt-0.5 size-5 shrink-0 ${x.kind === 'error' ? 'text-coral' : x.kind === 'info' ? 'text-gold' : 'text-mint'}`} />
                <div>
                  {x.title && <div className="font-semibold">{x.title}</div>}
                  <div className="text-sm text-white/80">{x.msg}</div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}

/* ---------------- Auth ---------------- */
const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'))
  const [modal, setModal] = useState(null) // { mode, role, resolve }
  const [unread, setUnread] = useState(0)
  const toast = useToast()
  const hubRef = useRef(null)

  const setSession = useCallback(({ token, user }) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setUser(user)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  const refresh = useCallback(async () => {
    if (!getToken()) return
    try {
      const u = await api.get('/api/me')
      localStorage.setItem('user', JSON.stringify(u))
      setUser(u)
    } catch (e) {
      if (e.status === 401) logout()
    }
  }, [logout])

  // Opens the OTP modal; resolves with the user once signed in (or null if dismissed).
  const requireAuth = useCallback(
    (opts = {}) =>
      new Promise((resolve) => {
        if (user && !opts.force) return resolve(user)
        setModal({ mode: opts.mode || 'login', role: opts.role, resolve })
      }),
    [user],
  )

  useEffect(() => { refresh() }, [refresh])

  // Live notifications over SignalR.
  useEffect(() => {
    if (!user) return
    api.get('/api/me/notifications').then((n) => setUnread(n.filter((x) => !x.isRead).length)).catch(() => {})
    const hub = new HubConnectionBuilder()
      .withUrl('/hubs/notifications', { accessTokenFactory: () => getToken() })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.None)
      .build()
    hub.on('notification', (n) => {
      setUnread((c) => c + 1)
      toast(n.body, 'info', n.title)
    })
    hub.on('message', (m) => toast(m.body, 'info', '💬'))
    hub.start().catch(() => {})
    hubRef.current = hub
    return () => { hub.stop() }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthCtx.Provider value={{ user, setSession, logout, refresh, requireAuth, modal, setModal, unread, setUnread }}>
      {children}
    </AuthCtx.Provider>
  )
}

/* ---------------- Meta (cities, types, lookup lists) ---------------- */
const MetaCtx = createContext(null)
export const useMeta = () => useContext(MetaCtx)

export function MetaProvider({ children }) {
  const [meta, setMeta] = useState(null)
  const load = useCallback(() => api.get('/api/meta').then(setMeta).catch(() => setMeta(false)), [])
  useEffect(() => { load() }, [load])
  return <MetaCtx.Provider value={{ meta, reload: load }}>{children}</MetaCtx.Provider>
}

/* ---------------- Small data hook ---------------- */
export function useFetch(path, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const key = [path, ...deps].join('|')
  const load = useCallback(() => {
    if (!path) return
    setState((s) => ({ ...s, loading: true }))
    return api
      .get(path)
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => setState({ data: null, loading: false, error }))
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [load])
  return { ...state, reload: load, setData: (fn) => setState((s) => ({ ...s, data: typeof fn === 'function' ? fn(s.data) : fn })) }
}
