import { SubstackClient } from '@substack-api/substack-client'
import { Profile, OwnProfile, FullPost, Note, Comment, PreviewPost } from '@substack-api/domain'

describe('SubstackClient Integration Tests', () => {
  let client: SubstackClient

  beforeEach(() => {
    client = new SubstackClient({
      substackSid: 'test-sid',
      substackLli: 'test-lli',
      publicationUrl: 'https://iam-slys-dev.substack.com',
      handle: 'jakubslys'
    })
  })

  afterEach(async () => {
    await client.close()
  })

  describe('testConnectivity', () => {
    test('should return true when API is accessible', async () => {
      const result = await client.testConnectivity()
      expect(result).toBe(true)
    })
  })

  describe('ownProfile', () => {
    test('should return OwnProfile instance with required fields', async () => {
      const profile = await client.ownProfile()
      expect(profile).toBeInstanceOf(OwnProfile)
      expect(profile.id).toBeGreaterThan(0)
      expect(profile.name).toBeTruthy()
      expect(profile.slug).toBeTruthy()
      expect(profile.bio).toBeTruthy()
    })
  })

  describe('profileForHandle', () => {
    test('should retrieve profile by handle', async () => {
      const profile = await client.profileForHandle('jakubslys')
      expect(profile).toBeInstanceOf(Profile)
      expect(profile.id).toBeGreaterThan(0)
      expect(profile.name).toBeTruthy()
      expect(profile.slug).toBe('jakubslys')
      expect(profile.bio).toBeTruthy()
      expect(typeof profile.posts).toBe('function')
      expect(typeof profile.notes).toBe('function')
    })

    test('should reject empty handle', async () => {
      await expect(client.profileForHandle('')).rejects.toThrow('Profile handle cannot be empty')
      await expect(client.profileForHandle('   ')).rejects.toThrow('Profile handle cannot be empty')
    })

    test('should throw when profile not found', async () => {
      await expect(client.profileForHandle('nonexistentuser123')).rejects.toThrow(/not found/)
    })
  })

  describe('postForSlug', () => {
    test('should retrieve full post by slug', async () => {
      const post = await client.postForSlug('week-of-june-24-2025-build-saas-without')
      expect(post).toBeInstanceOf(FullPost)
      expect(post.id).toBe(167180194)
      expect(post.title).toBeTruthy()
      expect(post.subtitle).toBeTruthy()
      expect(post.slug).toBeTruthy()
      expect(post.htmlBody).toBeTruthy()
      expect(post.createdAt).toBeInstanceOf(Date)
      expect(typeof post.reactions).toBe('object')
      expect(typeof post.restacks).toBe('number')
      expect(typeof post.coverImage).toBe('string')
      expect(typeof post.comments).toBe('function')
    })

    test('should throw when post not found', async () => {
      await expect(client.postForSlug('nonexistent-post-slug')).rejects.toThrow()
    })
  })

  describe('profile.posts() iteration', () => {
    test('should yield PreviewPost instances', async () => {
      const profile = await client.profileForHandle('jakubslys')
      const posts: PreviewPost[] = []
      for await (const post of profile.posts()) {
        posts.push(post)
      }
      expect(posts.length).toBeGreaterThan(0)
      expect(posts[0]).toBeInstanceOf(PreviewPost)
      expect(posts[0].id).toBeGreaterThan(0)
      expect(posts[0].title).toBeTruthy()
      expect(posts[0].publishedAt).toBeInstanceOf(Date)
    })
  })

  describe('profile.notes() iteration', () => {
    test('should yield Note instances', async () => {
      const profile = await client.profileForHandle('jakubslys')
      const notes: Note[] = []
      for await (const note of profile.notes()) {
        notes.push(note)
      }
      expect(notes.length).toBeGreaterThan(0)
      expect(notes[0]).toBeInstanceOf(Note)
      expect(notes[0].id).toBeGreaterThan(0)
      expect(notes[0].body).toBeTruthy()
    })
  })

  describe('post.comments() iteration', () => {
    test('should yield Comment instances', async () => {
      const post = await client.postForSlug('week-of-june-24-2025-build-saas-without')
      const comments: Comment[] = []
      for await (const comment of post.comments()) {
        comments.push(comment)
      }
      expect(comments.length).toBeGreaterThan(0)
      expect(comments[0]).toBeInstanceOf(Comment)
      expect(comments[0].body).toBeTruthy()
    })
  })
})
