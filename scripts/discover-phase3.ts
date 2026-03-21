/**
 * Phase 3: Test post-by-ID and comments with correct publication
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

// From Phase 1+2: post 191067613 belongs to "aalx" publication
const POST_ID = 191067613
const PUB = 'aalx'
const NOTE_ID = 217303447  // from the notes feed

async function main() {
  const client = await initCycleTLS()

  const tests = [
    // Post by ID on correct publication
    { name: 'post-by-id-correct-pub', url: `https://${PUB}.substack.com/api/v1/post/${POST_ID}` },

    // Post by slug
    { name: 'post-by-slug', url: `https://${PUB}.substack.com/api/v1/post/90-of-your-feed-is-a-lie` },

    // Comments on correct pub
    { name: 'comments-correct-pub', url: `https://${PUB}.substack.com/api/v1/post/${POST_ID}/comments?all_comments=true&sort=best_first` },

    // Note by ID - try comment endpoint on pub domain
    { name: 'note-by-id-thoughtcurators', url: `https://thoughtcurators.substack.com/api/v1/comment/${NOTE_ID}` },

    // Try /api/v1/reader/note/{id}
    { name: 'reader-note-by-id', url: `https://substack.com/api/v1/reader/note/${NOTE_ID}` },

    // Notes feed - try POST instead of GET
    // Skipping POST for now

    // Try the notes endpoint on frankietubs with for_profile param
    { name: 'notes-for-profile', url: `https://frankietubs.substack.com/api/v1/notes?for_profile=478606087` },

    // Try getting user's notes through their profile feed with comment type filter
    { name: 'profile-feed-comments', url: `https://substack.com/api/v1/reader/feed/profile/478606087?filter=comment` },
    { name: 'profile-feed-notes', url: `https://substack.com/api/v1/reader/feed/profile/478606087?filter=note` },

    // A popular author to test with actual posts
    { name: 'popular-profile-feed', url: `https://substack.com/api/v1/reader/feed/profile/41856304` },
  ]

  for (const test of tests) {
    try {
      console.log(`\n${test.name}: GET ${test.url}`)
      const resp = await client(test.url, { headers: HEADERS, userAgent: USER_AGENT }, 'get')
      const data = typeof resp.data === 'string' ? tryParse(resp.data) : resp.data

      const isObj = data && typeof data === 'object' && !Array.isArray(data)
      const topKeys = isObj ? Object.keys(data as Record<string, unknown>).slice(0, 15) : undefined
      const isArr = Array.isArray(data)

      console.log(`  → ${resp.status}${topKeys ? ` keys: ${topKeys.join(', ')}` : ''}${isArr ? ` [array len=${(data as unknown[]).length}]` : ''}`)

      if (resp.status === 200) {
        writeFileSync(
          resolve(FIXTURES_DIR, `${test.name}.json`),
          JSON.stringify(summarize(data), null, 2) + '\n'
        )

        // Print a few interesting fields for posts
        if (isObj) {
          const d = data as Record<string, unknown>
          if (d.id) console.log(`  id: ${d.id}`)
          if (d.title) console.log(`  title: ${d.title}`)
          if (d.slug) console.log(`  slug: ${d.slug}`)
          if (d.type) console.log(`  type: ${d.type}`)
          if (d.comments && Array.isArray(d.comments)) console.log(`  comments: ${(d.comments as unknown[]).length}`)
          if (d.items && Array.isArray(d.items)) console.log(`  items: ${(d.items as unknown[]).length}`)
        }
      }
    } catch (err) {
      console.log(`  → ERROR: ${err instanceof Error ? err.message : err}`)
    }
    await new Promise(r => setTimeout(r, 300))
  }

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
