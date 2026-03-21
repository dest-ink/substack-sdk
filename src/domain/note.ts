import type { SubstackFeedComment } from '@substack-api/internal/types'

export class Note {
  public readonly id: number
  public readonly body: string
  public readonly likesCount: number
  public readonly author: {
    id: number
    name: string
    handle: string
    avatarUrl: string
  }
  public readonly publishedAt: Date

  constructor(private readonly rawData: SubstackFeedComment) {
    this.id = rawData.id
    this.body = rawData.body
    this.likesCount = rawData.reaction_count ?? 0
    this.publishedAt = new Date(rawData.date)
    this.author = {
      id: rawData.user_id,
      name: rawData.name || '',
      handle: rawData.handle || '',
      avatarUrl: rawData.photo_url || ''
    }
  }
}
