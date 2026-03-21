import type { HttpClient } from '@substack-api/internal/http-client'
import { SubstackFeedPageC } from '@substack-api/internal/types'
import type { SubstackFeedComment } from '@substack-api/internal/types'
import { decodeOrThrow } from '@substack-api/internal/validation'

export interface PaginatedNotes {
  notes: SubstackFeedComment[]
  nextCursor?: string | null
}

export class NoteService {
  constructor(private readonly client: HttpClient) {}

  async getNotesForProfile(userId: number, options?: { cursor?: string }): Promise<PaginatedNotes> {
    const params: Record<string, string | undefined> = { filter: 'comment' }
    if (options?.cursor) params.cursor = options.cursor
    const raw = await this.client.get<unknown>(`/api/v1/reader/feed/profile/${userId}`, params)
    const page = decodeOrThrow(SubstackFeedPageC, raw, 'SubstackFeedPage')
    const notes = page.items
      .filter((item) => item.type === 'comment' && item.comment)
      .map((item) => item.comment!)
    return { notes, nextCursor: page.nextCursor }
  }
}
