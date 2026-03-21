/**
 * Endpoint Discovery Script
 *
 * Tests Substack API endpoints via CycleTLS and saves response shapes as JSON fixtures.
 * Usage: npx tsx scripts/discover-endpoints.ts
 */
import initCycleTLS, { CycleTLSClient } from 'cycletls'
import { config } from 'dotenv'
import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = resolve(__dirname, 'fixtures')

config({ path: resolve(__dirname, '..', '.env') })

const SID = process.env.SUBSTACK_SID!
const LLI = process.env.SUBSTACK_LLI!
const PUB_URL = process.env.PUBLICATION_URL!

if (!SID || !LLI || !PUB_URL) {
  console.error('Missing SUBSTACK_SID, SUBSTACK_LLI, or PUBLICATION_URL in .env')
  process.exit(1)
}

// Extract publication subdomain
const pubMatch = PUB_URL.match(/https?:\/\/([^.]+)\.substack\.com/)
if (!pubMatch) {
  console.error('Invalid PUBLICATION_URL format')
  process.exit(1)
}
const PUB = pubMatch[1]

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const HEADERS = {
  'Content-Type': 'application/json',
  Cookie: `substack.sid=${SID}; substack.lli=${LLI}`,
}

// Extract userId from the LLI JWT payload
function getUserIdFromLli(lli: string): number {
  const payload = JSON.parse(Buffer.from(lli.split('.')[1], 'base64').toString())
  return payload.userId
}

const USER_ID = getUserIdFromLli(LLI)

interface EndpointTest {
  name: string
  url: string
  method: 'get' | 'post'
  body?: string
  description: string
}

function buildTests(): EndpointTest[] {
  return [
    // === KNOWN WORKING (confirm shapes) ===
    {
      name: 'profile-by-slug',
      url: `https://substack.com/api/v1/user/${PUB}/public_profile`,
      method: 'get',
      description: 'Profile by slug (publication name as slug)',
    },
    {
      name: 'own-profile',
      url: `https://substack.com/api/v1/user/${USER_ID}-${PUB}/public_profile/self`,
      method: 'get',
      description: 'Own profile via userId-slug',
    },
    {
      name: 'profile-feed',
      url: `https://substack.com/api/v1/reader/feed/profile/${USER_ID}`,
      method: 'get',
      description: 'Posts feed for a user',
    },
    {
      name: 'subscriptions',
      url: 'https://substack.com/api/v1/subscriptions/page',
      method: 'get',
      description: 'Following/subscriptions list',
    },
    {
      name: 'following-feed',
      url: 'https://substack.com/api/v1/feed/following',
      method: 'get',
      description: 'Following feed',
    },
    {
      name: 'pub-notes',
      url: `https://${PUB}.substack.com/api/v1/notes`,
      method: 'get',
      description: 'Notes for publication',
    },

    // === UNKNOWN — NEED DISCOVERY ===

    // Try profile by slug directly (not publication name)
    {
      name: 'profile-by-userid',
      url: `https://substack.com/api/v1/user/${USER_ID}/public_profile`,
      method: 'get',
      description: 'Profile by userId only',
    },

    // Post by ID — try various URL patterns
    // We'll get a real post ID from the profile feed, but test the pattern with a placeholder
    // These will be tested dynamically below

    // Notes feed on global domain
    {
      name: 'global-notes',
      url: 'https://substack.com/api/v1/notes',
      method: 'get',
      description: 'Notes on global domain',
    },

    // Reader feed variants
    {
      name: 'reader-feed',
      url: 'https://substack.com/api/v1/reader/feed',
      method: 'get',
      description: 'Reader feed (no filter)',
    },

    // Me endpoint variants
    {
      name: 'me-v1',
      url: 'https://substack.com/api/v1/me',
      method: 'get',
      description: '/api/v1/me endpoint',
    },
    {
      name: 'me-root',
      url: 'https://substack.com/api/v1/user/self',
      method: 'get',
      description: '/api/v1/user/self endpoint',
    },

    // Notes for specific user
    {
      name: 'user-notes-feed',
      url: `https://substack.com/api/v1/reader/feed/notes/${USER_ID}`,
      method: 'get',
      description: 'Notes feed for specific user',
    },
  ]
}

async function runTest(
  client: CycleTLSClient,
  test: EndpointTest
): Promise<{ name: string; status: number; data: unknown; error?: string }> {
  try {
    console.log(`  Testing: ${test.description}`)
    console.log(`    ${test.method.toUpperCase()} ${test.url}`)

    const response = await client(
      test.url,
      {
        headers: HEADERS,
        userAgent: USER_AGENT,
        ...(test.body ? { body: test.body } : {}),
      },
      test.method
    )

    const data = typeof response.data === 'string' ? tryParseJSON(response.data) : response.data

    console.log(`    → ${response.status}`)

    return { name: test.name, status: response.status, data }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`    → ERROR: ${msg}`)
    return { name: test.name, status: -1, data: null, error: msg }
  }
}

function tryParseJSON(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return s
  }
}

/** Truncate large arrays to first 2 items + count for readable fixtures */
function summarize(data: unknown, depth = 0): unknown {
  if (depth > 5) return data
  if (Array.isArray(data)) {
    const summary = data.slice(0, 2).map((item) => summarize(item, depth + 1))
    if (data.length > 2) {
      return [...summary, `... (${data.length} total items)`]
    }
    return summary
  }
  if (data && typeof data === 'object') {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      result[k] = summarize(v, depth + 1)
    }
    return result
  }
  return data
}

async function main() {
  mkdirSync(FIXTURES_DIR, { recursive: true })

  console.log(`\nSubstack API Endpoint Discovery`)
  console.log(`Publication: ${PUB} (userId: ${USER_ID})`)
  console.log(`${'='.repeat(60)}\n`)

  const client = await initCycleTLS()

  try {
    const tests = buildTests()
    const results: Record<string, { status: number; data: unknown }> = {}

    // Run initial tests
    console.log('Phase 1: Testing known and speculative endpoints\n')
    for (const test of tests) {
      const result = await runTest(client, test)
      results[result.name] = { status: result.status, data: result.data }

      // Save individual fixture
      const fixturePath = resolve(FIXTURES_DIR, `${result.name}.json`)
      writeFileSync(fixturePath, JSON.stringify(summarize(result.data), null, 2) + '\n')

      // Small delay to be polite
      await new Promise((r) => setTimeout(r, 300))
    }

    // Phase 2: Dynamic tests based on Phase 1 results
    console.log('\nPhase 2: Dynamic endpoint tests based on Phase 1 data\n')

    // Extract a post ID from the profile feed if available
    const feedResult = results['profile-feed']
    let postId: number | null = null
    let postPub: string | null = null

    if (feedResult?.status === 200 && feedResult.data) {
      const feedData = feedResult.data as Record<string, unknown>
      // Try to find posts in the feed response
      const items = (feedData.items || feedData.posts || feedData.feed || []) as Array<Record<string, unknown>>
      if (items.length > 0) {
        const firstItem = items[0]
        postId = (firstItem.id || firstItem.post_id) as number | null

        // Try to extract publication subdomain from the post
        const pubDomain = (firstItem.publication_url || firstItem.canonical_url || '') as string
        const pubDomainMatch = pubDomain.match?.(/https?:\/\/([^.]+)\.substack\.com/)
        if (pubDomainMatch) {
          postPub = pubDomainMatch[1]
        }
      }
    }

    if (postId) {
      const pub = postPub || PUB
      console.log(`  Found post ID: ${postId} (pub: ${pub})`)

      // Test post-by-ID endpoint variants
      const postTests: EndpointTest[] = [
        {
          name: 'post-by-id-pub',
          url: `https://${pub}.substack.com/api/v1/post/${postId}`,
          method: 'get',
          description: `Post by ID on publication domain`,
        },
        {
          name: 'post-by-id-global',
          url: `https://substack.com/api/v1/post/${postId}`,
          method: 'get',
          description: `Post by ID on global domain`,
        },
        {
          name: 'post-comments',
          url: `https://${pub}.substack.com/api/v1/post/${postId}/comments?all_comments=true&sort=best_first`,
          method: 'get',
          description: `Comments for post ${postId}`,
        },
      ]

      for (const test of postTests) {
        const result = await runTest(client, test)
        results[result.name] = { status: result.status, data: result.data }
        const fixturePath = resolve(FIXTURES_DIR, `${result.name}.json`)
        writeFileSync(fixturePath, JSON.stringify(summarize(result.data), null, 2) + '\n')
        await new Promise((r) => setTimeout(r, 300))
      }
    } else {
      console.log('  No post ID found in feed — skipping post-specific tests')
    }

    // Extract a note ID if available
    const notesResult = results['pub-notes'] || results['global-notes']
    let noteId: number | null = null

    if (notesResult?.status === 200 && notesResult.data) {
      const notesData = notesResult.data as Record<string, unknown>
      const notes = (notesData.notes || notesData.items || notesData.comments || []) as Array<Record<string, unknown>>
      if (notes.length > 0) {
        noteId = (notes[0].id || notes[0].note_id || notes[0].comment_id) as number | null
      }
    }

    if (noteId) {
      console.log(`  Found note ID: ${noteId}`)

      const noteTests: EndpointTest[] = [
        {
          name: 'note-by-id-global',
          url: `https://substack.com/api/v1/comment/${noteId}`,
          method: 'get',
          description: `Note/comment by ID on global domain`,
        },
        {
          name: 'note-by-id-pub',
          url: `https://${PUB}.substack.com/api/v1/comment/${noteId}`,
          method: 'get',
          description: `Note/comment by ID on publication domain`,
        },
        {
          name: 'note-as-post',
          url: `https://substack.com/api/v1/post/${noteId}`,
          method: 'get',
          description: `Note via post endpoint (notes may be posts)`,
        },
      ]

      for (const test of noteTests) {
        const result = await runTest(client, test)
        results[result.name] = { status: result.status, data: result.data }
        const fixturePath = resolve(FIXTURES_DIR, `${result.name}.json`)
        writeFileSync(fixturePath, JSON.stringify(summarize(result.data), null, 2) + '\n')
        await new Promise((r) => setTimeout(r, 300))
      }
    } else {
      console.log('  No note ID found — skipping note-specific tests')
    }

    // Write summary
    console.log(`\n${'='.repeat(60)}`)
    console.log('Summary:\n')

    const summary: Record<string, { status: number; keys?: string[] }> = {}
    for (const [name, result] of Object.entries(results)) {
      const keys =
        result.data && typeof result.data === 'object' && !Array.isArray(result.data)
          ? Object.keys(result.data as Record<string, unknown>)
          : undefined
      summary[name] = { status: result.status, ...(keys ? { keys } : {}) }
      const statusEmoji = result.status === 200 ? '✓' : '✗'
      console.log(`  ${statusEmoji} ${name}: ${result.status}${keys ? ` (keys: ${keys.join(', ')})` : ''}`)
    }

    const summaryPath = resolve(FIXTURES_DIR, '_summary.json')
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n')
    console.log(`\nFixtures saved to: ${FIXTURES_DIR}`)
  } finally {
    await client.exit()
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
