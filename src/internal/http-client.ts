/**
 * HTTP client for direct Substack API access via CycleTLS
 *
 * Uses CycleTLS to bypass Cloudflare bot detection by spoofing browser
 * TLS/JA3 fingerprints. Authentication is via session cookies sent directly
 * to Substack — no third-party proxy involved.
 */
import initCycleTLS, { CycleTLSClient } from 'cycletls'

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export type RequestScope = 'global' | 'publication' | { subdomain: string }

export class HttpClient {
  private client: CycleTLSClient | null = null
  private readonly headers: Record<string, string>
  private readonly publicationBaseUrl: string
  private lastRequestTime = 0
  private readonly minInterval: number

  constructor(config: {
    substackSid: string
    substackLli: string
    publicationUrl: string
    maxRequestsPerSecond?: number
  }) {
    this.headers = {
      'Content-Type': 'application/json',
      Cookie: `substack.sid=${config.substackSid}; substack.lli=${config.substackLli}`
    }
    this.publicationBaseUrl = config.publicationUrl.replace(/\/$/, '')
    this.minInterval = 1000 / (config.maxRequestsPerSecond || 25)
  }

  private async getClient(): Promise<CycleTLSClient> {
    if (!this.client) {
      this.client = await initCycleTLS()
    }
    return this.client
  }

  private async throttle(): Promise<void> {
    const now = Date.now()
    const elapsed = now - this.lastRequestTime
    if (elapsed < this.minInterval) {
      await new Promise((r) => setTimeout(r, this.minInterval - elapsed))
    }
    this.lastRequestTime = Date.now()
  }

  private resolveBaseUrl(scope: RequestScope): string {
    if (scope === 'global') return 'https://substack.com'
    if (scope === 'publication') return this.publicationBaseUrl
    return `https://${scope.subdomain}.substack.com`
  }

  private buildUrl(
    path: string,
    scope: RequestScope,
    params?: Record<string, string | number | boolean | undefined>
  ): string {
    const base = this.resolveBaseUrl(scope)
    let url = `${base}${path}`
    if (params) {
      const searchParams = new URLSearchParams()
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          searchParams.set(key, String(value))
        }
      }
      const qs = searchParams.toString()
      if (qs) url += `?${qs}`
    }
    return url
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseResponseData(data: any): unknown {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data)
      } catch {
        return data
      }
    }
    return data
  }

  async get<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
    scope: RequestScope = 'global'
  ): Promise<T> {
    await this.throttle()
    const url = this.buildUrl(path, scope, params)
    const client = await this.getClient()
    const response = await client(url, { headers: this.headers, userAgent: USER_AGENT }, 'get')

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Authentication failed (${response.status}). Your session cookies may have expired.`
      )
    }
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`HTTP ${response.status} for GET ${path}`)
    }

    return this.parseResponseData(response.data) as T
  }

  async post<T>(path: string, data?: unknown, scope: RequestScope = 'global'): Promise<T> {
    await this.throttle()
    const url = this.buildUrl(path, scope)
    const client = await this.getClient()
    const response = await client(
      url,
      {
        headers: this.headers,
        userAgent: USER_AGENT,
        ...(data !== undefined ? { body: JSON.stringify(data) } : {})
      },
      'post'
    )

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Authentication failed (${response.status}). Your session cookies may have expired.`
      )
    }
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`HTTP ${response.status} for POST ${path}`)
    }

    return this.parseResponseData(response.data) as T
  }

  async put<T>(path: string, data?: unknown, scope: RequestScope = 'global'): Promise<T> {
    await this.throttle()
    const url = this.buildUrl(path, scope)
    const client = await this.getClient()
    const response = await client(
      url,
      {
        headers: this.headers,
        userAgent: USER_AGENT,
        ...(data !== undefined ? { body: JSON.stringify(data) } : {})
      },
      'put'
    )

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Authentication failed (${response.status}). Your session cookies may have expired.`
      )
    }
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`HTTP ${response.status} for PUT ${path}`)
    }

    return this.parseResponseData(response.data) as T
  }

  async delete(path: string, scope: RequestScope = 'global'): Promise<void> {
    await this.throttle()
    const url = this.buildUrl(path, scope)
    const client = await this.getClient()
    const response = await client(url, { headers: this.headers, userAgent: USER_AGENT }, 'delete')

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`HTTP ${response.status} for DELETE ${path}`)
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.exit()
      this.client = null
    }
  }
}
