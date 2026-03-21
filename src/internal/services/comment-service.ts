import type { HttpClient } from '@substack-api/internal/http-client'
import { SubstackCommentsResponseC } from '@substack-api/internal/types'
import type { SubstackComment } from '@substack-api/internal/types'
import { decodeOrThrow } from '@substack-api/internal/validation'

export class CommentService {
  constructor(private readonly client: HttpClient) {}

  async getCommentsForPost(postId: number, subdomain?: string): Promise<SubstackComment[]> {
    const scope = subdomain ? { subdomain } : ('publication' as const)
    const raw = await this.client.get<unknown>(
      `/api/v1/post/${postId}/comments`,
      { all_comments: true, sort: 'best_first' },
      scope
    )
    const response = decodeOrThrow(SubstackCommentsResponseC, raw, 'SubstackCommentsResponse')
    return response.comments
  }
}
