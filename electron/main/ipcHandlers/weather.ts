import { ipcMain } from 'electron'
import { SignJWT, importPKCS8 } from 'jose'

/* ============ 配置 ============ */

/** Ed25519 私钥（PKCS8 DER，base64 编码），需包成 PEM 格式后才能交给 jose 解析 */
const PRIVATE_KEY_B64 = 'MC4CAQAwBQYDK2VwBCIEIFBgB6uoi5cPWdFHeFKS/O4oux/T0rQ5zIt8SkwEx3gL'

/** 凭据ID（JWT header 中的 kid） */
const CREDENTIAL_ID = 'KG5A74NB2H'

/** 项目ID（JWT payload 中的 sub） */
const PROJECT_ID = '48E4N66HWD'

/** token 有效期（秒），默认 15 分钟 */
const TOKEN_TTL = 15 * 60

/** 天气接口地址前缀（经纬度动态拼接：{base}/{lat}/{lon}） */
const WEATHER_API_BASE = 'https://kt6hf2gam9.re.qweatherapi.com/weather/v1/current'

/** Geo 城市查询接口（根据经纬度反查城市信息） */
const GEO_API_BASE = 'https://kt6hf2gam9.re.qweatherapi.com/geo/v2/city/lookup'

/** IP 定位服务（免 Key，返回指定公网 IP 对应的城市级经纬度） */
const GEO_API_URL = 'https://ipwho.is/'

/** IPv4 出口查询端点（域名仅 A 记录，强制走 IPv4，避免 IPv6 定位误判） */
const IPV4_ENDPOINT = 'https://4.ipwho.de/ip'

/** 定位请求超时（毫秒），避免服务不可达时长时间阻塞 */
const GEO_TIMEOUT = 5000

/** IP 定位失败时的兜底坐标（北京） */
const FALLBACK_LAT = 39.92
const FALLBACK_LON = 116.41

/** 定位结果缓存有效期（10 分钟，避免每次请求天气都重复调用定位服务） */
const LOCATION_CACHE_TTL = 10 * 60 * 1000

/* ============ JWT 生成 ============ */

/** base64 私钥 -> PEM 格式 */
const privateKeyPem = [
  '-----BEGIN PRIVATE KEY-----',
  PRIVATE_KEY_B64,
  '-----END PRIVATE KEY-----'
].join('\n')

/** 缓存解析后的 Ed25519 密钥对象（避免每次调用重复解析） */
let cachedPrivateKey: CryptoKey | null = null

/** 获取（并缓存）私钥对象 */
async function getPrivateKey(): Promise<CryptoKey> {
  if (!cachedPrivateKey) {
    cachedPrivateKey = await importPKCS8(privateKeyPem, 'EdDSA')
  }
  return cachedPrivateKey
}

/**
 * 生成 EdDSA(Ed25519) 签名的 JWT token
 * - iat = 当前时间 - 30s（容忍客户端时钟偏差）
 * - exp = iat + TOKEN_TTL（默认 15 分钟）
 */
async function generateJwtToken(): Promise<string> {
  const privateKey = await getPrivateKey()

  const iat = Math.floor(Date.now() / 1000) - 30
  const exp = iat + TOKEN_TTL

  return new SignJWT({ sub: PROJECT_ID, iat, exp })
    .setProtectedHeader({ alg: 'EdDSA', kid: CREDENTIAL_ID })
    .sign(privateKey)
}

/* ============ 当前定位 ============ */

/** ipwho.is 定位接口的返回结构（仅取用字段） */
interface GeoLocationResponse {
  success?: boolean
  latitude?: number
  longitude?: number
  city?: string
}

/** 和风天气 Geo API 城市查询返回的单条结果 */
interface GeoCityItem {
  name: string
  id: string
  lat: string
  lon: string
  adm2: string
  adm1: string
  country: string
  tz: string
  utcOffset: string
  isDst: string
  type: string
  rank: string
  fxLink: string
}

/** 和风天气 Geo API 城市查询完整响应 */
interface GeoLookupResponse {
  code: string
  location: GeoCityItem[]
  refer: {
    sources: string[]
    license: string[]
  }
}

/** 定位结果（含缓存过期时间） */
interface CachedLocation {
  latitude: number
  longitude: number
  city: string
  expireAt: number
}

/** 缓存的定位结果 */
let locationCache: CachedLocation | null = null

/** 请求定位服务并解析 JSON（带超时，避免服务不可达时长时间阻塞） */
async function fetchGeoWithTimeout(url: string): Promise<GeoLocationResponse> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GEO_TIMEOUT)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as GeoLocationResponse
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 获取当前经纬度（基于公网 IP 定位，城市级精度，对天气查询足够）
 * - 优先强制 IPv4 定位：IPv6 出口会被 GeoIP 按 WHOIS 注册地误判
 *   （如电信 240e:3bb 段会被定位到北京），故先取 IPv4 出口 IP 再精确查询
 * - IPv4 查询失败时回退到普通 IP 定位，结果缓存 10 分钟
 * - 全部失败时回退到默认坐标（北京，不缓存，下次重试）
 */
async function getCurrentLocation(): Promise<{ latitude: number; longitude: number; city: string }> {
  // 命中缓存则直接返回
  if (locationCache && locationCache.expireAt > Date.now()) {
    return locationCache
  }

  const applyCache = (data: GeoLocationResponse) => {
    locationCache = {
      latitude: data.latitude!,
      longitude: data.longitude!,
      city: data.city || '',
      expireAt: Date.now() + LOCATION_CACHE_TTL
    }
    return locationCache
  }

  // 1) 强制 IPv4 定位：先取 IPv4 出口 IP，再按该 IP 精确查询
  try {
    const res = await fetch(IPV4_ENDPOINT, { signal: AbortSignal.timeout(GEO_TIMEOUT) })
    const ipv4 = res.ok ? (await res.text()).trim() : ''
    if (/^\d+(\.\d+){3}$/.test(ipv4)) {
      const data = await fetchGeoWithTimeout(`${GEO_API_URL}${ipv4}`)
      if (data.success && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        return applyCache(data)
      }
    }
  } catch {
    // IPv4 定位失败，回退到普通 IP 定位
  }

  // 2) 普通 IP 定位（可能走 IPv6 出口，结果可能不准，仅作保底）
  try {
    const data = await fetchGeoWithTimeout(GEO_API_URL)
    if (data.success && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
      return applyCache(data)
    }
  } catch {
    // 定位失败，回退默认坐标
  }

  return { latitude: FALLBACK_LAT, longitude: FALLBACK_LON, city: 'Beijing' }
}

/* ============ 天气请求 ============ */

/**
 * 通过和风天气 Geo API 根据经纬度反查城市信息
 * @returns 格式化后的「国家 - 城市」字符串，查询失败则返回空字符串
 */
async function fetchCityByGeo(token: string, latitude: number, longitude: number): Promise<string> {
  const url = `${GEO_API_BASE}?location=${longitude},${latitude}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  if (!res.ok) {
    throw new Error(`Geo API 请求失败: HTTP ${res.status}`)
  }
  const data = (await res.json()) as GeoLookupResponse
  if (data.code === '200' && data.location && data.location.length > 0) {
    const loc = data.location[0]
    return `${loc.country} - ${loc.adm1} - ${loc.adm2}`
  }
  return ''
}

/**
 * 携带 Bearer token 请求当前天气接口（经纬度动态拼接 URL）
 * 返回响应原文（JSON 字符串），由调用方负责打印/解析
 */
async function fetchCurrentWeather(token: string, latitude: number, longitude: number): Promise<string> {
  const url = `${WEATHER_API_BASE}/${latitude}/${longitude}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  if (!res.ok) {
    throw new Error(`天气接口请求失败: HTTP ${res.status} ${res.statusText}`)
  }
  return res.text()
}

/* ============ IPC 注册 ============ */

/** 注册 IPC：渲染进程通过 window.ipcRenderer.fetchCurrentWeather() 调用 */
export function setupWeatherIpc() {
  ipcMain.handle('fetch-current-weather', async () => {
    // 1. 生成 JWT
    const token = await generateJwtToken()

    // 2. 获取当前定位
    const { latitude, longitude, city: ipCity } = await getCurrentLocation()

    // 3. 通过 Geo API 反查城市名称（国家 - 城市 格式），失败时回退到 IP 定位城市
    let cityName = ''
    try {
      cityName = await fetchCityByGeo(token, latitude, longitude)
    } catch {
      cityName = ipCity
    }

    // 4. 携带 Bearer token 请求天气
    const weather = await fetchCurrentWeather(token, latitude, longitude)

    return { token, latitude, longitude, city: cityName, weather }
  })
}
