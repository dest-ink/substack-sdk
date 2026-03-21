import type { HttpClient } from '@substack-api/internal/http-client'

export class ConnectivityService {
  constructor(private readonly client: HttpClient) {}

  async isConnected(): Promise<boolean> {
    try {
      // Use a lightweight profile self-check as a health probe
      await this.client.get('/api/v1/subscriptions/page')
      return true
    } catch {
      return false
    }
  }
}
