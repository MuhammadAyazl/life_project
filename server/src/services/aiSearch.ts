import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { env } from '../config/env.js';
import { CATEGORIES } from '../config/constants.js';

/**
 * AI product search.
 * - With ANTHROPIC_API_KEY: Claude reads the shopper's request ("best Xiaomi bluetooth under $50")
 *   plus a compact catalog and returns the best matching product ids, ranked, with a one-line reason.
 * - Without a key (or if the AI call fails): a built-in "smart" ranker that understands words like
 *   best / cheapest / under $50 and ranks by rating, reviews and price.
 */

export interface CatalogItem {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  mrp: number;
  rating: number;
  numReviews: number;
  sold: number;
  inStock: boolean;
}

export interface AiPick {
  id: string;
  reason: string;
}

export interface AiSearchResult {
  mode: 'ai' | 'smart';
  interpretation: string;
  picks: AiPick[];
}

const MODEL = 'claude-opus-5-5';
const MAX_RESULTS = 8;

let client: Anthropic | null = null;
const anthropic = () => (client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 25_000, maxRetries: 1 }));

// Stable instructions (cached). The catalog goes in a second system block; the shopper's words go in the user turn.
const SYSTEM = `You are the shopping assistant of ShopFussion, an online gadget store.
A shopper describes what they want in their own words (English, Urdu or Roman Urdu). Pick the products from the CATALOG that best match, best match first.

How to judge:
- Respect hard constraints exactly: budget ("under $50", "50 se kam"), brand or name words (e.g. "xiaomi"), category ("bluetooth" can mean earbuds, headphones or speakers), and stock (prefer in-stock items).
- "best" / "top" / "sab se acha" means highest quality: weigh rating and the number of reviews together (a 4.8 with 40 reviews beats a 5.0 with 1 review), then sales.
- "cheap" / "sasta" / "budget" means lowest price among good options.
- Only return products that genuinely fit. If nothing fits a hard constraint, return the closest alternatives and say so in the interpretation.
- Never invent products, prices or facts that are not in the catalog.

Return at most ${MAX_RESULTS} products. "interpretation" is one short sentence in English describing what you understood. Each "reason" is one short sentence (max 15 words) a shopper would find useful, e.g. "Highest rated Xiaomi earbuds under $50 (4.7★, 120 reviews)."`;

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    interpretation: { type: 'string' },
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, reason: { type: 'string' } },
        required: ['id', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['interpretation', 'results'],
  additionalProperties: false,
} as const;

const parsedSchema = z.object({
  interpretation: z.string(),
  results: z.array(z.object({ id: z.string(), reason: z.string() })),
});

function catalogText(items: CatalogItem[]) {
  return items
    .map(
      (p) =>
        `${p.id} | ${p.name} | ${p.category} | $${p.price}${p.mrp > p.price ? ` (was $${p.mrp})` : ''} | ` +
        `${p.rating}★ (${p.numReviews} reviews) | sold ${p.sold} | ${p.inStock ? 'in stock' : 'OUT OF STOCK'} | ` +
        p.description.replace(/\s+/g, ' ').slice(0, 140),
    )
    .join('\n');
}

async function claudeSearch(query: string, items: CatalogItem[]): Promise<AiSearchResult> {
  const response = await anthropic().beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    // a fast, inexpensive call: ranking a short list doesn't need deep reasoning
    output_config: { effort: 'low', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
    // if the model declines, the API retries on a fallback model in the same call
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: [
      { type: 'text', text: SYSTEM },
      { type: 'text', text: `CATALOG (id | name | category | price | rating | sales | stock | description):\n${catalogText(items)}`, cache_control: { type: 'ephemeral' } },
    ],
    messages: [{ role: 'user', content: query }],
  });

  if (response.stop_reason === 'refusal') throw new Error('AI declined the request');
  const text = response.content.find((b) => b.type === 'text');
  if (!text || text.type !== 'text') throw new Error('AI returned no text');
  const out = parsedSchema.parse(JSON.parse(text.text));

  const known = new Set(items.map((i) => i.id));
  const seen = new Set<string>();
  const picks = out.results
    .filter((r) => known.has(r.id) && !seen.has(r.id) && seen.add(r.id))
    .slice(0, MAX_RESULTS)
    .map((r) => ({ id: r.id, reason: r.reason.slice(0, 160) }));
  return { mode: 'ai', interpretation: out.interpretation.slice(0, 200), picks };
}

/* ------------------------------ smart fallback ------------------------------ */

const CATEGORY_WORDS: Record<string, string[]> = {
  Earbuds: ['earbud', 'earbuds', 'airpod', 'airpods', 'tws', 'buds', 'bluetooth', 'wireless'],
  Headphones: ['headphone', 'headphones', 'headset', 'bluetooth', 'wireless', 'noise'],
  Speakers: ['speaker', 'speakers', 'bluetooth', 'soundbar', 'audio'],
  Watch: ['watch', 'watches', 'smartwatch', 'fitness', 'band'],
  Mouse: ['mouse', 'mice', 'gaming'],
  Decoration: ['lamp', 'light', 'decor', 'decoration', 'led'],
  'Home & Kitchen': ['cleaner', 'vacuum', 'robot', 'kitchen', 'home'],
};
const STOP = new Set(['the', 'a', 'an', 'for', 'me', 'best', 'top', 'good', 'cheap', 'cheapest', 'under', 'below', 'less', 'than', 'with', 'and', 'or', 'se', 'ka', 'ki', 'ke', 'sab', 'sabse', 'acha', 'achi', 'wala', 'wali', 'kam', 'sasta', 'sasti', 'price', 'show', 'find', 'want', 'need', 'mujhe', 'chahiye', 'dikhao', 'usd', 'dollar', 'rs', 'in', 'of', 'to', 'is', 'my']);

function smartSearch(query: string, items: CatalogItem[]): AiSearchResult {
  const q = query.toLowerCase();
  const budget = q.match(/(?:under|below|less than|<|upto|up to|max)\s*\$?\s*(\d+(?:\.\d+)?)/)?.[1] ?? q.match(/\$?\s*(\d+(?:\.\d+)?)\s*(?:se kam|tak|or less|or below)/)?.[1];
  const maxPrice = budget ? Number(budget) : undefined;
  const wantsCheap = /\b(cheap|cheapest|budget|sasta|sasti|lowest|affordable)\b/.test(q);
  const words = q.split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w) && !/^\d+$/.test(w));
  // "bluetooth"/"wireless" fit several categories; a specific word ("speaker") wins over them
  const GENERIC = new Set(['bluetooth', 'wireless', 'audio', 'noise', 'gaming', 'home']);
  const catsFor = (pred: (w: string) => boolean) =>
    CATEGORIES.filter((c) => (CATEGORY_WORDS[c] ?? []).some((w) => pred(w) && words.includes(w)) || words.includes(c.toLowerCase()));
  const specific = catsFor((w) => !GENERIC.has(w));
  const cats = specific.length ? specific : catsFor(() => true);
  const nameWords = words.filter((w) => !Object.values(CATEGORY_WORDS).flat().includes(w));

  const quality = (p: CatalogItem) => p.rating * Math.log10(10 + p.numReviews) + Math.log10(1 + p.sold) * 0.3;
  let pool = items.filter((p) => p.inStock);
  if (maxPrice !== undefined) pool = pool.filter((p) => p.price <= maxPrice);
  if (cats.length) pool = pool.filter((p) => cats.includes(p.category as (typeof CATEGORIES)[number]));
  const text = (p: CatalogItem) => `${p.name} ${p.description}`.toLowerCase();
  if (nameWords.length) {
    const named = pool.filter((p) => nameWords.some((w) => text(p).includes(w)));
    if (named.length) pool = named;
  }

  pool.sort((a, b) => (wantsCheap ? a.price - b.price || quality(b) - quality(a) : quality(b) - quality(a)));
  const parts = [
    wantsCheap ? 'lowest price first' : 'best rated first',
    cats.length ? cats.join(' / ') : null,
    nameWords.length ? `matching "${nameWords.join(' ')}"` : null,
    maxPrice !== undefined ? `under $${maxPrice}` : null,
  ].filter(Boolean);

  return {
    mode: 'smart',
    interpretation: `Showing ${parts.join(', ')}.`,
    picks: pool.slice(0, MAX_RESULTS).map((p, i) => ({
      id: p.id,
      reason:
        i === 0 && !wantsCheap
          ? `Top pick: ${p.rating}★ from ${p.numReviews} reviews at $${p.price}.`
          : wantsCheap
            ? `$${p.price} with a ${p.rating}★ rating.`
            : `${p.rating}★ (${p.numReviews} reviews), $${p.price}.`,
    })),
  };
}

export const aiEnabled = () => !!env.ANTHROPIC_API_KEY;

export async function aiSearch(query: string, items: CatalogItem[]): Promise<AiSearchResult> {
  if (aiEnabled()) {
    try {
      return await claudeSearch(query, items);
    } catch (err) {
      // never leave the shopper with an error page - fall back to the smart ranker
      console.error('[ai-search] Claude call failed, using smart search:', err instanceof Error ? err.message : err);
    }
  }
  return smartSearch(query, items);
}
