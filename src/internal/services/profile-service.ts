import type { HttpClient } from '@substack-api/internal/http-client'
import { SubstackProfileC } from '@substack-api/internal/types'
import type { SubstackProfile } from '@substack-api/internal/types'
import { decodeOrThrow } from '@substack-api/internal/validation'

export class ProfileService {
  constructor(private readonly client: HttpClient) {}

  async getOwnProfile(handle: string): Promise<SubstackProfile> {
    const raw = await this.client.get<unknown>(
      `/api/v1/user/${encodeURIComponent(handle)}/public_profile`
    )
    return decodeOrThrow(SubstackProfileC, raw, 'SubstackProfile')
  }

  async getProfileBySlug(handle: string): Promise<SubstackProfile> {
    const raw = await this.client.get<unknown>(
      `/api/v1/user/${encodeURIComponent(handle)}/public_profile`
    )
    return decodeOrThrow(SubstackProfileC, raw, 'SubstackProfile')
  }
}
