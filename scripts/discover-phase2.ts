/**
 * Phase 2: Test specific endpoints with known IDs from Phase 1
 */
import initCycleTLS from 'cycletls'
import { config } from 'dotenv'
import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = resolve(__dirname, 'fixtures')
mkdirSync(FIXTURES_DIR, { recursive: true })

config({ path: resolve(__dirname, '..', '.env') })

const SID = process.env.SUBSTACK_SID!
const LLI = process.env.SUBSTACK_LLI!

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const HEADERS = {
  'Content-Type': 'application/json',
  Cookie: `substack.sid=${SID}; substack.lli=${LLI}`,
}

// Known from Phase 1:
// - Post ID from feed: 191067613 (entity_key "p-191067613")
// - Note/comment IDs from notes feed: 217303447 (entity_key "c-217303447")
// - Publication with posts: use a popular one like "on" (On Substack, pub_id=1)

const POST_ID = 191067613
const NOTE_ID = 217303447

interface TestResult {
  name: string
  url: string
  status: number
  topKeys?: string[]
  snippet?: unknown
}

async function main() {
  const client = await initCycleTLS()
  const results: TestResult[] = []

  const tests = [
    // Post by ID - various patterns
    { name: 'post-by-id-global', url: `https://substack.com/api/v1/post/${POST_ID}` },
    { name: 'post-by-id-on-pub', url: `https://on.substack.com/api/v1/post/${POST_ID}` },

    // Note/comment by ID
    { name: 'comment-by-id-global', url: `https://substack.com/api/v1/comment/${NOTE_ID}` },
    { name: 'comment-by-id-feed', url: `https://substack.com/api/v1/comment/feed/${NOTE_ID}` },

    // Notes endpoint with different approach - it may need POST or query params
    { name: 'notes-global-for-you', url: 'https://substack.com/api/v1/notes/feed' },

    // User's own notes via reader feed
    { name: 'reader-notes-profile', url: `https://substack.com/api/v1/reader/feed/profile/478606087?type=comment` },

    // Comments for a known post - need to find a post with comments
    // Use a post from "On Substack" which likely has comments
    { name: 'post-comments-global', url: `https://substack.com/api/v1/post/${POST_ID}/comments?all_comments=true&sort=best_first` },

    // Try getting post detail via the publication that owns it
    // First need to figure out which pub owns post 191067613

    // Alternate profile endpoints
    { name: 'profile-by-handle', url: 'https://substack.com/api/v1/user/frankietubs/public_profile' },

    // Try /me with different cookie format
    { name: 'me-api', url: 'https://substack.com/api/v1/me' },

    // Activity/notifications
    { name: 'activity', url: 'https://substack.com/api/v1/activity' },
    { name: 'notifications', url: 'https://substack.com/api/v1/notifications' },

    // Search
    { name: 'search-posts', url: 'https://substack.com/api/v1/search/posts?query=test&page=0' },
    { name: 'search-publications', url: 'https://substack.com/api/v1/search/publications?query=test&page=0' },
  ]

  for (const test of tests) {
    try {
      console.log(`${test.name}: GET ${test.url}`)
      const resp = await client(test.url, { headers: HEADERS, userAgent: USER_AGENT }, 'get')
      const data = typeof resp.data === 'string' ? tryParse(resp.data) : resp.data

      const topKeys = data && typeof data === 'object' && !Array.isArray(data)
        ? Object.keys(data as Record<string, unknown>)
        : undefined

      console.log(`  → ${resp.status}${topKeys ? ` (keys: ${topKeys.join(', ')})` : ''}`)

      results.push({ name: test.name, url: test.url, status: resp.status, topKeys })

      // Save full fixture for successful responses
      if (resp.status === 200) {
        writeFileSync(
          resolve(FIXTURES_DIR, `${test.name}.json`),
          JSON.stringify(summarize(data), null, 2) + '\n'
        )
      }
    } catch (err) {
      console.log(`  → ERROR: ${err instanceof Error ? err.message : err}`)
      results.push({ name: test.name, url: test.url, status: -1 })
    }
    await new Promise(r => setTimeout(r, 300))
  }

  console.log('\n=== SUMMARY ===\n')
  for (const r of results) {
    const icon = r.status === 200 ? '✓' : '✗'
    console.log(`${icon} [${r.status}] ${r.name}${r.topKeys ? ` → ${r.topKeys.join(', ')}` : ''}`)
  }

  writeFileSync(resolve(FIXTURES_DIR, '_phase2-summary.json'), JSON.stringify(results, null, 2) + '\n')

  await client.exit()
}

function tryParse(s: string): unknown {
  try { return JSON.parse(s) } catch { return s }
}

function summarize(data: unknown, depth = 0): unknown {
  if (depth > 5) return data
  if (Array.isArray(data)) {
    const s = data.slice(0, 2).map(i => summarize(i, depth + 1))
    if (data.length > 2) s.push(`... (${data.length} total)`)
    return s
  }
  if (data && typeof data === 'object') {
    const r: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      r[k] = summarize(v, depth + 1)
    }
    return r
  }
  return data
}

main().catch(e => { console.error(e); process.exit(1) })
