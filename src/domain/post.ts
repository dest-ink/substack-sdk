import type { SubstackFullPost, SubstackFeedItemPost } from '@substack-api/internal/types'
import type { CommentService, PostService } from '@substack-api/internal/services'
import { Comment } from '@substack-api/domain/comment'

export interface Post {
  readonly id: number
  readonly title: string
  readonly subtitle: string
  readonly body: string
  readonly truncatedBody: string
  readonly publishedAt: Date

  comments(options?: { limit?: number }): AsyncIterable<Comment>
  like(): Promise<void>
  addComment(data: { body: string }): Promise<Comment>
}

export class PreviewPost implements Post {
  public readonly id: number
  public readonly title: string
  public readonly subtitle: string
  public readonly body: string
  public readonly truncatedBody: string
  public readonly publishedAt: Date
  public readonly slug: string
  public readonly publicationSubdomain?: string

  constructor(
    rawData: SubstackFeedItemPost,
    private readonly commentService: CommentService,
    private readonly postService: PostService,
    publicationSubdomain?: string
  ) {
    this.id = rawData.id
    this.title = rawData.title
    this.slug = rawData.slug
    this.subtitle = rawData.subtitle || ''
    this.truncatedBody = rawData.truncated_body_text || ''
    this.body = rawData.body_html || rawData.truncated_body_text || ''
    this.publishedAt = new Date(rawData.post_date)
    this.publicationSubdomain = publicationSubdomain
  }

  async fullPost(): Promise<FullPost> {
    try {
      const fullPostData = await this.postService.getPostBySlug(
        this.slug,
        this.publicationSubdomain
      )
      return new FullPost(fullPostData, this.commentService, this.publicationSubdomain)
    } catch (error) {
      throw new Error(`Failed to fetch full post ${this.slug}: ${(error as Error).message}`)
    }
  }

  async *comments(options: { limit?: number } = {}): AsyncIterable<Comment> {
    try {
      const commentsData = await this.commentService.getCommentsForPost(
        this.id,
        this.publicationSubdomain
      )
      let count = 0
      for (const commentData of commentsData) {
        if (options.limit && count >= options.limit) break
        yield new Comment(commentData)
        count++
      }
    } catch (error) {
      throw new Error(`Failed to get comments for post ${this.id}: ${(error as Error).message}`)
    }
  }

  async like(): Promise<void> {
    throw new Error('Post liking not implemented yet - requires like API')
  }

  async addComment(_data: { body: string }): Promise<Comment> {
    throw new Error('Comment creation not implemented yet - requires comment creation API')
  }
}

export class FullPost implements Post {
  public readonly id: number
  public readonly title: string
  public readonly subtitle: string
  public readonly body: string
  public readonly truncatedBody: string
  public readonly publishedAt: Date
  public readonly htmlBody: string
  public readonly slug: string
  public readonly createdAt: Date
  public readonly reactions?: Record<string, number>
  public readonly restacks?: number
  public readonly coverImage?: string
  public readonly url: string

  constructor(
    rawData: SubstackFullPost,
    private readonly commentService: CommentService,
    private readonly publicationSubdomain?: string
  ) {
    this.id = rawData.id
    this.title = rawData.title
    this.subtitle = rawData.subtitle || ''
    this.truncatedBody = rawData.truncated_body_text || ''
    this.body = rawData.body_html || rawData.truncated_body_text || ''
    this.publishedAt = new Date(rawData.post_date)
    this.url = rawData.canonical_url || ''
    this.htmlBody = rawData.body_html || ''
    this.slug = rawData.slug
    this.createdAt = new Date(rawData.post_date)
    this.reactions = rawData.reactions ?? undefined
    this.restacks = rawData.restacks ?? undefined
    this.coverImage = rawData.cover_image ?? undefined
  }

  async *comments(options: { limit?: number } = {}): AsyncIterable<Comment> {
    try {
      const commentsData = await this.commentService.getCommentsForPost(
        this.id,
        this.publicationSubdomain
      )
      let count = 0
      for (const commentData of commentsData) {
        if (options.limit && count >= options.limit) break
        yield new Comment(commentData)
        count++
      }
    } catch (error) {
      throw new Error(`Failed to get comments for post ${this.id}: ${(error as Error).message}`)
    }
  }

  async like(): Promise<void> {
    throw new Error('Post liking not implemented yet - requires like API')
  }

  async addComment(_data: { body: string }): Promise<Comment> {
    throw new Error('Comment creation not implemented yet - requires comment creation API')
  }
}
