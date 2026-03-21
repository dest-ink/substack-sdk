import { HttpClient } from '@substack-api/internal/http-client'
import { FullPost, OwnProfile, Profile } from '@substack-api/domain'
import {
  CommentService,
  ConnectivityService,
  FollowingService,
  NewNoteService,
  NoteService,
  PostService,
  ProfileService
} from '@substack-api/internal/services'
import type { SubstackConfig } from '@substack-api/types'

export class SubstackClient {
  private readonly client: HttpClient
  private readonly postService: PostService
  private readonly noteService: NoteService
  private readonly profileService: ProfileService
  private readonly commentService: CommentService
  private readonly followingService: FollowingService
  private readonly connectivityService: ConnectivityService
  private readonly newNoteService: NewNoteService
  private readonly perPage: number
  private readonly handle?: string

  constructor(config: SubstackConfig) {
    this.perPage = config.perPage || 25
    this.handle = config.handle

    this.client = new HttpClient({
      substackSid: config.substackSid,
      substackLli: config.substackLli,
      publicationUrl: config.publicationUrl,
      maxRequestsPerSecond: config.maxRequestsPerSecond
    })

    this.postService = new PostService(this.client)
    this.noteService = new NoteService(this.client)
    this.profileService = new ProfileService(this.client)
    this.commentService = new CommentService(this.client)
    this.followingService = new FollowingService(this.client)
    this.connectivityService = new ConnectivityService(this.client)
    this.newNoteService = new NewNoteService(this.client)
  }

  async testConnectivity(): Promise<boolean> {
    return this.connectivityService.isConnected()
  }

  async ownProfile(): Promise<OwnProfile> {
    if (!this.handle) {
      throw new Error(
        'Cannot get own profile: "handle" must be set in SubstackConfig. ' +
          'Provide your Substack handle (e.g. "myname") in the config.'
      )
    }

    try {
      const profile = await this.profileService.getOwnProfile(this.handle)
      return new OwnProfile(
        profile,
        this.postService,
        this.noteService,
        this.commentService,
        this.profileService,
        this.followingService,
        this.newNoteService,
        this.perPage
      )
    } catch (error) {
      throw new Error(`Failed to get own profile: ${(error as Error).message}`)
    }
  }

  async profileForHandle(handle: string): Promise<Profile> {
    if (!handle || handle.trim() === '') {
      throw new Error('Profile handle cannot be empty')
    }

    try {
      const profile = await this.profileService.getProfileBySlug(handle)
      return new Profile(
        profile,
        this.postService,
        this.noteService,
        this.commentService,
        this.perPage
      )
    } catch (error) {
      throw new Error(`Profile with handle '${handle}' not found: ${(error as Error).message}`)
    }
  }

  async postForSlug(slug: string, publicationSubdomain?: string): Promise<FullPost> {
    try {
      const post = await this.postService.getPostBySlug(slug, publicationSubdomain)
      return new FullPost(post, this.commentService, publicationSubdomain)
    } catch (error) {
      throw new Error(`Post with slug '${slug}' not found: ${(error as Error).message}`)
    }
  }

  async close(): Promise<void> {
    await this.client.close()
  }
}
