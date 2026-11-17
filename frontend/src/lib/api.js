// Thin fetch wrapper. In dev Vite proxies /api to the ASP.NET backend; set VITE_API_URL for other setups.
const BASE = import.meta.env.VITE_API_URL ?? ''

export const getToken = () => localStorage.getItem('token')

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || `HTTP ${status}`)
    this.status = status
    this.code = body?.error
  }
}

async function request(method, path, body) {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  let payload = body
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const res = await fetch(BASE + path, { method, headers, body: payload })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new ApiError(res.status, data)
  return data
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b ?? {}),
  put: (p, b) => request('PUT', p, b),
  del: (p) => request('DELETE', p),
  upload: (files) => {
    const fd = new FormData()
    for (const f of files) fd.append('files', f)
    return request('POST', '/api/uploads', fd)
  },
}

export const qs = (obj) => {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '' || v === false || (Array.isArray(v) && !v.length)) continue
    p.set(k, Array.isArray(v) ? v.join(',') : v)
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const assetUrl = (u) => (u && u.startsWith('/uploads') ? BASE + u : u)
