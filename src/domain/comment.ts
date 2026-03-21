import type { SubstackComment } from '@substack-api/internal/types'

export class Comment {
  public readonly id: number
  public readonly body: string
  public readonly date?: string
  public readonly authorName?: string
  public readonly authorHandle?: string
  public readonly reactionCount?: number

  constructor(private readonly rawData: SubstackComment) {
    this.id = rawData.id
    this.body = rawData.body
    this.date = rawData.date
    this.authorName = rawData.name ?? undefined
    this.authorHandle = rawData.handle ?? undefined
    this.reactionCount = rawData.reaction_count
  }
}
