import planRaw  from '../../plan.md?raw'
import tier1Raw from '../../tier1-beginner.md?raw'
import tier2Raw from '../../tier2-intermediate.md?raw'
import tier3Raw from '../../tier3-advanced.md?raw'

// Split a markdown file into pages on every \n## heading.
// The preamble (content before the first ##) becomes page 0.
// Each ## section is re-attached its heading and becomes a page.
function splitIntoPages(raw) {
  const parts = raw.split('\n## ')
  return parts
    .map((part, i) => (i === 0 ? part : '## ' + part))
    .map(p => p.trim())
    .filter(p => p.length > 0)
}

// Extract a clean title from any page's markdown content.
function extractTitle(content) {
  for (const line of content.split('\n')) {
    const t = line.trim()
    if (!t || t === '---') continue
    if (/^#{1,3}\s/.test(t)) {
      return t
        .replace(/^#{1,3}\s+/, '')
        .replace(/\*\*/g, '')
        .replace(/`/g, '')
        .trim()
    }
  }
  return 'Untitled'
}

function buildTierPages(raw, tierKey) {
  return splitIntoPages(raw).map((content, i) => ({
    id: `${tierKey}-${i}`,
    tier: tierKey,
    content,
    title: extractTitle(content),
  }))
}

const planPages  = buildTierPages(planRaw,  'plan')
const tier1Pages = buildTierPages(tier1Raw, 'beginner')
const tier2Pages = buildTierPages(tier2Raw, 'intermediate')
const tier3Pages = buildTierPages(tier3Raw, 'advanced')

export const ALL_PAGES = [...planPages, ...tier1Pages, ...tier2Pages, ...tier3Pages]

export const TIERS = [
  {
    key: 'plan',
    label: 'Overview',
    color: 'var(--text-muted)',
    pages: planPages,
  },
  {
    key: 'beginner',
    label: 'Tier 1: Beginner',
    color: 'var(--tier-beginner)',
    pages: tier1Pages,
  },
  {
    key: 'intermediate',
    label: 'Tier 2: Intermediate',
    color: 'var(--tier-intermediate)',
    pages: tier2Pages,
  },
  {
    key: 'advanced',
    label: 'Tier 3: Advanced',
    color: 'var(--tier-advanced)',
    pages: tier3Pages,
  },
]
