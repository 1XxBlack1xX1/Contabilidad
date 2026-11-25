import type { ErrorApi } from './tipos'

/** Error de la API con mensaje comprensible para el usuario. */
export class ApiError extends Error {
  readonly estado: number
  readonly campos?: Record<string, string>

  constructor(datos: ErrorApi) {
    super(datos.mensaje)
    this.estado = datos.estado
    this.campos = datos.campos
  }
}

type Escucha = () => void
let alExpirarSesion: Escucha | null = null

/** Permite que la capa de sesión reaccione cuando el servidor responde 401. */
export function registrarExpiracionSesion(fn: Escucha) {
  alExpirarSesion = fn
}

function leerCookie(nombre: string): string | undefined {
  return document.cookie
    .split('; ')
    .find((c) => c.startsWith(nombre + '='))
    ?.split('=')[1]
}

/** Obtiene (o renueva) el token CSRF que el servidor entrega en la cookie XSRF-TOKEN. */
export async function prepararCsrf() {
  await fetch('/api/auth/csrf', { credentials: 'same-origin' })
}

export function construirQuery(params: Record<string, string | number | boolean | undefined | null>) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v))
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

async function solicitud(metodo: string, ruta: string, cuerpo?: unknown): Promise<Response> {
  const cabeceras: Record<string, string> = { Accept: 'application/json' }
  const esFormulario = cuerpo instanceof FormData
  if (cuerpo !== undefined && !esFormulario) cabeceras['Content-Type'] = 'application/json'
  if (metodo !== 'GET') {
    if (!leerCookie('XSRF-TOKEN')) await prepararCsrf()
    const token = leerCookie('XSRF-TOKEN')
    if (token) cabeceras['X-XSRF-TOKEN'] = decodeURIComponent(token)
  }
  let respuesta: Response
  try {
    respuesta = await fetch(ruta, {
      method: metodo,
      credentials: 'same-origin',
      headers: cabeceras,
      body: cuerpo === undefined ? undefined : esFormulario ? (cuerpo as FormData) : JSON.stringify(cuerpo),
    })
  } catch {
    throw new ApiError({ estado: 0, mensaje: 'No se pudo conectar con el servidor. Verifique su conexión.' })
  }
  if (!respuesta.ok) {
    let datos: ErrorApi = { estado: respuesta.status, mensaje: 'Ocurrió un error inesperado.' }
    try {
      const json = await respuesta.json()
      datos = { estado: respuesta.status, mensaje: json.mensaje ?? datos.mensaje, campos: json.campos }
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    if (respuesta.status === 401 && !ruta.endsWith('/auth/login')) alExpirarSesion?.()
    throw new ApiError(datos)
  }
  return respuesta
}

async function json<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  const r = await solicitud(metodo, ruta, cuerpo)
  return r.status === 204 ? (undefined as T) : ((await r.json()) as T)
}

export const api = {
  get: <T>(ruta: string) => json<T>('GET', ruta),
  post: <T>(ruta: string, cuerpo?: unknown) => json<T>('POST', ruta, cuerpo),
  put: <T>(ruta: string, cuerpo?: unknown) => json<T>('PUT', ruta, cuerpo),
  patch: <T>(ruta: string, cuerpo?: unknown) => json<T>('PATCH', ruta, cuerpo),

  /** Descarga un archivo respetando la sesión y mostrando errores comprensibles. */
  async descargar(ruta: string) {
    const r = await solicitud('GET', ruta)
    const disposicion = r.headers.get('Content-Disposition') ?? ''
    const nombre =
      decodeURIComponent(disposicion.match(/filename\*=UTF-8''([^;]+)/)?.[1] ?? '') ||
      disposicion.match(/filename="?([^";]+)"?/)?.[1] ||
      'exportacion'
    const url = URL.createObjectURL(await r.blob())
    const a = document.createElement('a')
    a.href = url
    a.download = nombre
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  },
}
