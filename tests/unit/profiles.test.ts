import { Profile } from '@substack-api/domain/profile'
import { OwnProfile } from '@substack-api/domain/own-profile'
import { PreviewPost } from '@substack-api/domain/post'
import { Note } from '@substack-api/domain/note'
import { HttpClient } from '@substack-api/internal/http-client'
import {
  PostService,
  NoteService,
  CommentService,
  ProfileService,
  FollowingService,
  NewNoteService
} from '@substack-api/internal/services'
import {
  createMockHttpClient,
  makeSubstackProfile,
  makeSubstackFeedItem,
  makeSubstackFeedComment
} from '@test/unit/fixtures'

jest.mock('@substack-api/internal/http-client')

// ---------------------------------------------------------------------------
// Profile entity
// ---------------------------------------------------------------------------

describe('Profile Entity', () => {
  let mockPostService: jest.Mocked<PostService>
  let mockNoteService: jest.Mocked<NoteService>
  let mockCommentService: jest.Mocked<CommentService>
  let profile: Profile

  beforeEach(() => {
    mockPostService = {
      getPostBySlug: jest.fn(),
      getPostsForProfile: jest.fn()
    } as unknown as jest.Mocked<PostService>

    mockNoteService = {
      getNotesForProfile: jest.fn()
    } as unknown as jest.Mocked<NoteService>

    mockCommentService = { getCommentsForPost: jest.fn() } as unknown as jest.Mocked<CommentService>

    profile = new Profile(
      makeSubstackProfile(123, 'testuser', 'Test User'),
      mockPostService,
      mockNoteService,
      mockCommentService,
      25
    )
  })

  describe('properties', () => {
    it('should expose id, name, handle, and slug', () => {
      expect(profile.id).toBe(123)
      expect(profile.name).toBe('Test User')
      expect(profile.handle).toBe('testuser')
      expect(profile.slug).toBe('testuser')
    })

    it('should derive url from handle', () => {
      expect(profile.url).toBe('https://substack.com/@testuser')
    })

    it('should map photo_url to avatarUrl', () => {
      expect(profile.avatarUrl).toBe('https://example.com/testuser.jpg')
    })
  })

  describe('posts()', () => {
    it('should iterate through profile posts as PreviewPost instances', async () => {
      mockPostService.getPostsForProfile.mockResolvedValue({
        posts: [makeSubstackFeedItem(1, 'Post 1'), makeSubstackFeedItem(2, 'Post 2')],
        nextCursor: null
      })

      const posts = []
      for await (const post of profile.posts()) {
        posts.push(post)
      }

      expect(posts).toHaveLength(2)
      expect(posts[0]).toBeInstanceOf(PreviewPost)
      expect(posts[0].title).toBe('Post 1')
      expect(posts[1].title).toBe('Post 2')
      expect(mockPostService.getPostsForProfile).toHaveBeenCalledWith(123, { cursor: undefined })
    })

    it('should respect limit parameter', async () => {
      mockPostService.getPostsForProfile.mockResolvedValue({
        posts: [makeSubstackFeedItem(1, 'Post 1'), makeSubstackFeedItem(2, 'Post 2')],
        nextCursor: null
      })

      const posts = []
      for await (const post of profile.posts({ limit: 1 })) {
        posts.push(post)
      }

      expect(posts).toHaveLength(1)
      expect(posts[0].title).toBe('Post 1')
    })

    it('should paginate using cursor', async () => {
      mockPostService.getPostsForProfile
        .mockResolvedValueOnce({
          posts: [makeSubstackFeedItem(1, 'Post 1'), makeSubstackFeedItem(2, 'Post 2')],
          nextCursor: 'cursor1'
        })
        .mockResolvedValueOnce({
          posts: [makeSubstackFeedItem(3, 'Post 3')],
          nextCursor: null
        })

      const posts = []
      for await (const post of profile.posts()) {
        posts.push(post)
      }

      expect(posts).toHaveLength(3)
      expect(posts.map((p) => p.title)).toEqual(['Post 1', 'Post 2', 'Post 3'])
      expect(mockPostService.getPostsForProfile).toHaveBeenCalledTimes(2)
    })

    it('should handle empty posts', async () => {
      mockPostService.getPostsForProfile.mockResolvedValue({ posts: [], nextCursor: null })

      const posts = []
      for await (const post of profile.posts()) {
        posts.push(post)
      }

      expect(posts).toHaveLength(0)
    })
  })

  describe('notes()', () => {
    it('should iterate through profile notes as Note instances', async () => {
      mockNoteService.getNotesForProfile.mockResolvedValue({
        notes: [makeSubstackFeedComment(10, 'Note 1'), makeSubstackFeedComment(11, 'Note 2')],
        nextCursor: undefined
      })

      const notes = []
      for await (const note of profile.notes()) {
        notes.push(note)
      }

      expect(notes).toHaveLength(2)
      expect(notes[0]).toBeInstanceOf(Note)
      expect(notes[0].body).toBe('Note 1')
      expect(mockNoteService.getNotesForProfile).toHaveBeenCalledWith(123, {
        cursor: undefined
      })
    })

    it('should respect limit parameter', async () => {
      mockNoteService.getNotesForProfile.mockResolvedValue({
        notes: [makeSubstackFeedComment(10, 'Note 1'), makeSubstackFeedComment(11, 'Note 2')],
        nextCursor: undefined
      })

      const notes = []
      for await (const note of profile.notes({ limit: 1 })) {
        notes.push(note)
      }

      expect(notes).toHaveLength(1)
    })

    it('should paginate using cursor until no next cursor', async () => {
      mockNoteService.getNotesForProfile
        .mockResolvedValueOnce({
          notes: [makeSubstackFeedComment(1, 'Note 1'), makeSubstackFeedComment(2, 'Note 2')],
          nextCursor: 'cursor1'
        })
        .mockResolvedValueOnce({
          notes: [makeSubstackFeedComment(3, 'Note 3')],
          nextCursor: undefined
        })

      const notes = []
      for await (const note of profile.notes()) {
        notes.push(note)
      }

      expect(notes).toHaveLength(3)
      expect(notes.map((n) => n.body)).toEqual(['Note 1', 'Note 2', 'Note 3'])
      expect(mockNoteService.getNotesForProfile).toHaveBeenCalledTimes(2)
    })

    it('should handle empty notes', async () => {
      mockNoteService.getNotesForProfile.mockResolvedValue({ notes: [], nextCursor: undefined })

      const notes = []
      for await (const note of profile.notes()) {
        notes.push(note)
      }

      expect(notes).toHaveLength(0)
    })
  })
})

// ---------------------------------------------------------------------------
// OwnProfile entity
// ---------------------------------------------------------------------------

describe('OwnProfile Entity', () => {
  let mockProfileService: jest.Mocked<ProfileService>
  let mockPostService: jest.Mocked<PostService>
  let mockCommentService: jest.Mocked<CommentService>
  let mockNoteService: jest.Mocked<NoteService>
  let mockFollowingService: jest.Mocked<FollowingService>
  let mockNewNoteService: jest.Mocked<NewNoteService>
  let ownProfile: OwnProfile

  beforeEach(() => {
    mockProfileService = {
      getOwnProfile: jest.fn(),
      getProfileBySlug: jest.fn()
    } as unknown as jest.Mocked<ProfileService>

    mockPostService = {
      getPostBySlug: jest.fn(),
      getPostsForProfile: jest.fn()
    } as unknown as jest.Mocked<PostService>

    mockCommentService = { getCommentsForPost: jest.fn() } as unknown as jest.Mocked<CommentService>

    mockNoteService = {
      getNotesForProfile: jest.fn()
    } as unknown as jest.Mocked<NoteService>

    mockFollowingService = { getFollowing: jest.fn() } as unknown as jest.Mocked<FollowingService>

    mockNewNoteService = {
      publishNote: jest.fn().mockResolvedValue({ id: 42 })
    } as unknown as jest.Mocked<NewNoteService>

    ownProfile = new OwnProfile(
      makeSubstackProfile(123, 'testuser', 'Test User'),
      mockPostService,
      mockNoteService,
      mockCommentService,
      mockProfileService,
      mockFollowingService,
      mockNewNoteService,
      25
    )
  })

  it('should inherit Profile properties', () => {
    expect(ownProfile.id).toBe(123)
    expect(ownProfile.name).toBe('Test User')
    expect(ownProfile.slug).toBe('testuser')
  })

  describe('publishNote()', () => {
    it('should delegate to newNoteService.publishNote with content', async () => {
      const result = await ownProfile.publishNote('Hello **world**')
      expect(mockNewNoteService.publishNote).toHaveBeenCalledWith('Hello **world**', undefined)
      expect(result).toEqual({ id: 42 })
    })

    it('should pass attachmentIds when provided', async () => {
      await ownProfile.publishNote('Check this out', { attachmentIds: ['uuid-1'] })
      expect(mockNewNoteService.publishNote).toHaveBeenCalledWith('Check this out', ['uuid-1'])
    })
  })

  describe('following()', () => {
    it('should iterate through following users as Profile instances', async () => {
      mockFollowingService.getFollowing.mockResolvedValue([
        { id: 1, handle: 'user1' },
        { id: 2, handle: 'user2' }
      ])
      mockProfileService.getProfileBySlug
        .mockResolvedValueOnce(makeSubstackProfile(1, 'user1', 'User One'))
        .mockResolvedValueOnce(makeSubstackProfile(2, 'user2', 'User Two'))

      const following = []
      for await (const p of ownProfile.following()) {
        following.push(p)
      }

      expect(following).toHaveLength(2)
      expect(following[0]).toBeInstanceOf(Profile)
      expect(following[0].name).toBe('User One')
      expect(following[1].name).toBe('User Two')
    })

    it('should skip profiles that fail to load', async () => {
      mockFollowingService.getFollowing.mockResolvedValue([
        { id: 1, handle: 'user1' },
        { id: 2, handle: 'user2' },
        { id: 3, handle: 'user3' }
      ])
      mockProfileService.getProfileBySlug.mockImplementation((slug: string) => {
        if (slug === 'user2') return Promise.reject(new Error('Not found'))
        const id = slug === 'user1' ? 1 : 3
        return Promise.resolve(makeSubstackProfile(id, slug, `User ${id}`))
      })

      const following = []
      for await (const p of ownProfile.following()) {
        following.push(p)
      }

      expect(following).toHaveLength(2)
      expect(following[0].slug).toBe('user1')
      expect(following[1].slug).toBe('user3')
    })
  })

  describe('notes()', () => {
    it('should use getNotesForProfile with own userId', async () => {
      mockNoteService.getNotesForProfile.mockResolvedValue({
        notes: [makeSubstackFeedComment(1, 'Note 1'), makeSubstackFeedComment(2, 'Note 2')],
        nextCursor: undefined
      })

      const notes = []
      for await (const note of ownProfile.notes()) {
        notes.push(note)
      }

      expect(notes).toHaveLength(2)
      expect(notes[0]).toBeInstanceOf(Note)
      expect(mockNoteService.getNotesForProfile).toHaveBeenCalledWith(123, { cursor: undefined })
    })

    it('should respect limit parameter', async () => {
      mockNoteService.getNotesForProfile.mockResolvedValue({
        notes: [makeSubstackFeedComment(1, 'Note 1'), makeSubstackFeedComment(2, 'Note 2')],
        nextCursor: undefined
      })

      const notes = []
      for await (const note of ownProfile.notes({ limit: 1 })) {
        notes.push(note)
      }

      expect(notes).toHaveLength(1)
    })
  })
})

// ---------------------------------------------------------------------------
// ProfileService
// ---------------------------------------------------------------------------

describe('ProfileService', () => {
  let profileService: ProfileService
  let mockClient: jest.Mocked<HttpClient>

  beforeEach(() => {
    jest.clearAllMocks()
    mockClient = createMockHttpClient()
    profileService = new ProfileService(mockClient)
  })

  describe('getOwnProfile', () => {
    it('should return profile from /api/v1/user/{handle}/public_profile', async () => {
      const mockProfile = makeSubstackProfile(123, 'testuser', 'Test User')
      mockClient.get.mockResolvedValueOnce(mockProfile)

      expect(await profileService.getOwnProfile('testuser')).toEqual(mockProfile)
      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/user/testuser/public_profile')
    })

    it('should throw when request fails', async () => {
      mockClient.get.mockRejectedValueOnce(new Error('Unauthorized'))
      await expect(profileService.getOwnProfile('testuser')).rejects.toThrow('Unauthorized')
    })
  })

  describe('getProfileBySlug', () => {
    it('should return profile from /api/v1/user/{handle}/public_profile', async () => {
      const mockProfile = makeSubstackProfile(456, 'sluguser', 'Slug User')
      mockClient.get.mockResolvedValueOnce(mockProfile)

      expect(await profileService.getProfileBySlug('sluguser')).toEqual(mockProfile)
      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/user/sluguser/public_profile')
    })

    it('should throw when profile not found', async () => {
      mockClient.get.mockRejectedValueOnce(new Error('Not Found'))
      await expect(profileService.getProfileBySlug('unknown')).rejects.toThrow('Not Found')
    })
  })
})
