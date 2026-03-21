/**
 * Configuration interfaces for the Substack API client
 */

export interface SubstackConfig {
  substackSid: string // substack.sid cookie value
  substackLli: string // substack.lli cookie value
  publicationUrl: string // Publication base URL, e.g. "https://mypub.substack.com"
  handle?: string // Your Substack handle (required for ownProfile())
  perPage?: number // Default items per page for pagination (optional, defaults to 25)
  maxRequestsPerSecond?: number // Maximum API requests per second (optional, defaults to 25)
}

export interface PaginationParams {
  limit?: number
  offset?: number
}

export interface SearchParams extends PaginationParams {
  query: string
  sort?: 'top' | 'new'
  author?: string
}
