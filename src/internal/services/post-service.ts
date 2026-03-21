import type { HttpClient } from '@substack-api/internal/http-client'
import { SubstackFullPostC, SubstackFeedPageC } from '@substack-api/internal/types'
import type { SubstackFullPost, SubstackFeedItem } from '@substack-api/internal/types'
import { decodeOrThrow } from '@substack-api/internal/validation'

export interface PaginatedPosts {
  posts: SubstackFeedItem[]
  nextCursor?: string | null
}

export class PostService {
  constructor(private readonly client: HttpClient) {}

  async getPostBySlug(slug: string, subdomain?: string): Promise<SubstackFullPost> {
    const scope = subdomain ? { subdomain } : ('publication' as const)
    const raw = await this.client.get<unknown>(
      `/api/v1/posts/${encodeURIComponent(slug)}`,
      undefined,
      scope
    )
    return decodeOrThrow(SubstackFullPostC, raw, 'SubstackFullPost')
  }

  async getPostsForProfile(userId: number, options?: { cursor?: string }): Promise<PaginatedPosts> {
    const params: Record<string, string | undefined> = {}
    if (options?.cursor) params.cursor = options.cursor
    const raw = await this.client.get<unknown>(`/api/v1/reader/feed/profile/${userId}`, params)
    const page = decodeOrThrow(SubstackFeedPageC, raw, 'SubstackFeedPage')
    const postItems = page.items.filter((item) => item.type === 'post')
    return { posts: postItems, nextCursor: page.nextCursor }
  }
}
