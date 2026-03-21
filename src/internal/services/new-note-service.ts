import type { HttpClient } from '@substack-api/internal/http-client'
import { SubstackCreateNoteResponseC } from '@substack-api/internal/types'
import type { SubstackCreateNoteResponse } from '@substack-api/internal/types'
import { decodeOrThrow } from '@substack-api/internal/validation'
import { markdownToProsemirror } from '@substack-api/internal/markdown-to-prosemirror'

export class NewNoteService {
  constructor(private readonly client: HttpClient) {}

  async publishNote(
    content: string,
    attachmentIds?: string[]
  ): Promise<SubstackCreateNoteResponse> {
    const bodyJson = markdownToProsemirror(content)

    const body: Record<string, unknown> = {
      bodyJson,
      replyMinimumRole: 'everyone'
    }

    if (attachmentIds && attachmentIds.length > 0) {
      body.attachmentIds = attachmentIds
    }

    const raw = await this.client.post<unknown>('/api/v1/comment/feed', body)
    return decodeOrThrow(SubstackCreateNoteResponseC, raw, 'SubstackCreateNoteResponse')
  }
}
