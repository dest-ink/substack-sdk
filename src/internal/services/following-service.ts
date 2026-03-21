import type { HttpClient } from '@substack-api/internal/http-client'
import { SubstackSubscriptionsResponseC } from '@substack-api/internal/types'
import { decodeOrThrow } from '@substack-api/internal/validation'

export interface FollowingUser {
  id: number
  handle: string
}

export class FollowingService {
  constructor(private readonly client: HttpClient) {}

  async getFollowing(): Promise<FollowingUser[]> {
    const raw = await this.client.get<unknown>('/api/v1/subscriptions/page')
    const response = decodeOrThrow(
      SubstackSubscriptionsResponseC,
      raw,
      'SubstackSubscriptionsResponse'
    )

    const users: FollowingUser[] = []
    for (const sub of response.subscriptions) {
      const author = sub.publication?.author
      if (author) {
        users.push({ id: author.id, handle: author.handle })
      }
    }
    return users
  }
}
