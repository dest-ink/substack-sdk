import { SubstackClient } from '@substack-api/substack-client'
import { Profile, FullPost, OwnProfile } from '@substack-api/domain'
import { HttpClient } from '@substack-api/internal/http-client'
import {
  PostService,
  NoteService,
  ProfileService,
  ConnectivityService,
  NewNoteService
} from '@substack-api/internal/services'
import { makeSubstackProfile } from '@test/unit/fixtures'

jest.mock('@substack-api/internal/http-client')
jest.mock('@substack-api/internal/services')

const MockPostService = PostService as jest.MockedClass<typeof PostService>
const MockNoteService = NoteService as jest.MockedClass<typeof NoteService>
const MockProfileService = ProfileService as jest.MockedClass<typeof ProfileService>
const MockConnectivityService = ConnectivityService as jest.MockedClass<typeof ConnectivityService>
const MockNewNoteService = NewNoteService as jest.MockedClass<typeof NewNoteService>

describe('SubstackClient', () => {
  let client: SubstackClient
  let mockPostService: jest.Mocked<PostService>
  let _mockNoteService: jest.Mocked<NoteService>
  let mockProfileService: jest.Mocked<ProfileService>
  let mockConnectivityService: jest.Mocked<ConnectivityService>
  let mockNewNoteService: jest.Mocked<NewNoteService>

  const config = {
    substackSid: 'test-sid',
    substackLli: 'test-lli',
    publicationUrl: 'https://test.substack.com',
    handle: 'testuser'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    client = new SubstackClient(config)

    mockPostService = MockPostService.mock.instances[0] as jest.Mocked<PostService>
    _mockNoteService = MockNoteService.mock.instances[0] as jest.Mocked<NoteService>
    mockProfileService = MockProfileService.mock.instances[0] as jest.Mocked<ProfileService>
    mockConnectivityService = MockConnectivityService.mock
      .instances[0] as jest.Mocked<ConnectivityService>
    mockNewNoteService = MockNewNoteService.mock.instances[0] as jest.Mocked<NewNoteService>
  })

  describe('constructor', () => {
    it('should create client instance', () => {
      expect(client).toBeInstanceOf(SubstackClient)
    })

    it('should construct HttpClient with cookie credentials', () => {
      jest.clearAllMocks()
      new SubstackClient(config)
      const constructorArgs = (HttpClient as jest.MockedClass<typeof HttpClient>).mock.calls[0][0]
      expect(constructorArgs).toEqual(
        expect.objectContaining({
          substackSid: 'test-sid',
          substackLli: 'test-lli',
          publicationUrl: 'https://test.substack.com'
        })
      )
    })
  })

  describe('testConnectivity', () => {
    it('should return true when API is accessible', async () => {
      mockConnectivityService.isConnected.mockResolvedValue(true)
      expect(await client.testConnectivity()).toBe(true)
    })

    it('should return false when API is not accessible', async () => {
      mockConnectivityService.isConnected.mockResolvedValue(false)
      expect(await client.testConnectivity()).toBe(false)
    })
  })

  describe('ownProfile', () => {
    it('should return OwnProfile when handle is configured', async () => {
      const mockProfile = makeSubstackProfile(123, 'testuser', 'Test User')
      mockProfileService.getOwnProfile.mockResolvedValueOnce(mockProfile)

      const result = await client.ownProfile()
      expect(result).toBeInstanceOf(OwnProfile)
      expect(result.id).toBe(123)
      expect(mockProfileService.getOwnProfile).toHaveBeenCalledWith('testuser')
    })

    it('should throw when handle is not configured', async () => {
      const clientNoHandle = new SubstackClient({
        substackSid: 'sid',
        substackLli: 'lli',
        publicationUrl: 'https://test.substack.com'
      })
      await expect(clientNoHandle.ownProfile()).rejects.toThrow(
        'Cannot get own profile: "handle" must be set'
      )
    })

    it('should throw when authentication fails', async () => {
      mockProfileService.getOwnProfile.mockRejectedValue(new Error('Unauthorized'))
      await expect(client.ownProfile()).rejects.toThrow('Failed to get own profile: Unauthorized')
    })

    it('should return OwnProfile with working publishNote method', async () => {
      const mockProfile = makeSubstackProfile(123, 'testuser', 'Test User')
      mockProfileService.getOwnProfile.mockResolvedValueOnce(mockProfile)
      mockNewNoteService.publishNote = jest.fn().mockResolvedValue({ id: 42 })

      const profile = await client.ownProfile()
      const result = await profile.publishNote('Hello world')

      expect(mockNewNoteService.publishNote).toHaveBeenCalledWith('Hello world', undefined)
      expect(result).toEqual({ id: 42 })
    })
  })

  describe('profileForHandle', () => {
    it('should return Profile by handle', async () => {
      const mockProfile = makeSubstackProfile(123, 'testuser', 'Test User')
      mockProfileService.getProfileBySlug.mockResolvedValue(mockProfile)

      const profile = await client.profileForHandle('testuser')
      expect(profile).toBeInstanceOf(Profile)
      expect(mockProfileService.getProfileBySlug).toHaveBeenCalledWith('testuser')
    })

    it('should throw for empty handle', async () => {
      await expect(client.profileForHandle('')).rejects.toThrow('Profile handle cannot be empty')
      await expect(client.profileForHandle('   ')).rejects.toThrow('Profile handle cannot be empty')
    })

    it('should throw when profile not found', async () => {
      mockProfileService.getProfileBySlug.mockRejectedValue(new Error('Not found'))
      await expect(client.profileForHandle('nonexistent')).rejects.toThrow(
        /Profile with handle.*nonexistent.*not found/
      )
    })
  })

  describe('postForSlug', () => {
    it('should return FullPost by slug', async () => {
      const mockPost = {
        id: 456,
        title: 'Test Post',
        slug: 'test-post',
        post_date: '2023-01-01T00:00:00Z',
        body_html: '<p>Test body</p>'
      }
      mockPostService.getPostBySlug.mockResolvedValueOnce(mockPost)

      const post = await client.postForSlug('test-post')
      expect(post).toBeInstanceOf(FullPost)
      expect(mockPostService.getPostBySlug).toHaveBeenCalledWith('test-post', undefined)
    })

    it('should pass publicationSubdomain when provided', async () => {
      const mockPost = {
        id: 456,
        title: 'Test Post',
        slug: 'test-post',
        post_date: '2023-01-01T00:00:00Z'
      }
      mockPostService.getPostBySlug.mockResolvedValueOnce(mockPost)

      await client.postForSlug('test-post', 'otherpub')
      expect(mockPostService.getPostBySlug).toHaveBeenCalledWith('test-post', 'otherpub')
    })

    it('should throw when post not found', async () => {
      mockPostService.getPostBySlug.mockRejectedValueOnce(new Error('HTTP 404'))
      await expect(client.postForSlug('bad-slug')).rejects.toThrow(
        /Post with slug.*bad-slug.*not found/
      )
    })
  })

  describe('close', () => {
    it('should close the HTTP client', async () => {
      const mockHttpClient = (HttpClient as jest.MockedClass<typeof HttpClient>).mock
        .instances[0] as jest.Mocked<HttpClient>
      mockHttpClient.close = jest.fn()

      await client.close()
      expect(mockHttpClient.close).toHaveBeenCalled()
    })
  })
})
