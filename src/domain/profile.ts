import type { SubstackProfile } from '@substack-api/internal/types'
import type { CommentService, PostService, NoteService } from '@substack-api/internal/services'
import { PreviewPost } from '@substack-api/domain/post'
import { Note } from '@substack-api/domain/note'

export class Profile {
  public readonly id: number
  public readonly slug: string
  public readonly handle: string
  public readonly name: string
  public readonly url: string
  public readonly avatarUrl: string
  public readonly bio?: string

  constructor(
    protected readonly rawData: SubstackProfile,
    protected readonly postService: PostService,
    protected readonly noteService: NoteService,
    protected readonly commentService: CommentService,
    protected readonly perPage: number
  ) {
    this.id = rawData.id
    this.slug = rawData.handle
    this.handle = rawData.handle
    this.name = rawData.name
    this.url = `https://substack.com/@${rawData.handle}`
    this.avatarUrl = rawData.photo_url
    this.bio = rawData.bio ?? undefined
  }

  async *posts(options: { limit?: number } = {}): AsyncIterable<PreviewPost> {
    try {
      let cursor: string | undefined = undefined
      let totalYielded = 0

      while (true) {
        const result = await this.postService.getPostsForProfile(this.id, { cursor })

        for (const feedItem of result.posts) {
          if (options.limit && totalYielded >= options.limit) {
            return
          }
          if (feedItem.post) {
            const subdomain = feedItem.publication?.subdomain
            yield new PreviewPost(feedItem.post, this.commentService, this.postService, subdomain)
            totalYielded++
          }
        }

        if (!result.nextCursor || result.posts.length === 0) {
          break
        }

        cursor = result.nextCursor
      }
    } catch {
      yield* []
    }
  }

  async *notes(options: { limit?: number } = {}): AsyncIterable<Note> {
    try {
      let cursor: string | undefined = undefined
      let totalYielded = 0

      while (true) {
        const paginatedNotes = await this.noteService.getNotesForProfile(this.id, { cursor })

        for (const item of paginatedNotes.notes) {
          if (options.limit && totalYielded >= options.limit) {
            return
          }
          yield new Note(item)
          totalYielded++
        }

        if (!paginatedNotes.nextCursor) {
          break
        }

        cursor = paginatedNotes.nextCursor
      }
    } catch {
      yield* []
    }
  }
}
