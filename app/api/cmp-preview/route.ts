import { type NextRequest, NextResponse } from 'next/server'
import { putDelivery, getLatestDelivery, previewStoreIsDurable } from '@/lib/cmpPreviewStore'
import { captureSafeHeaders } from '@/lib/captureHeaders'
import { mapCmpPreviewToBlog } from '@/lib/cmpBlog'
import { cmpConfigured, acknowledgePreview, completePreview } from '@/lib/cmpApi'

// CMP blog preview webhook.
//
// Optimizely CMP fires a POST here when an editor requests a preview. The flow:
//   1. Verify the inbound `callback-secret` header against CMP_CALLBACK_SECRET.
//   2. Persist the delivery (KV) keyed by preview_id so the render page can load
//      it later — CMP caches the completed URL and fetches it on its own clock.
//   3. POST `acknowledge` (with content_hash) — tells CMP we can render it.
//   4. POST `complete` with keyed_previews → our /cmp-preview render URL, which
//      CMP embeds in its preview pane (framing allowed in next.config.mjs).
//
// GET returns the most recently captured delivery as JSON (inspection aid).
//
// If CMP_* env vars are absent the route still captures + stores (so the
// renderer works in dev), and simply skips the acknowledge/complete round-trip.

export const dynamic = 'force-dynamic'
export const revalidate = 0

type CapturedMeta = {
  receivedAt: string
  method: string
  contentType: string
  query: Record<string, string>
  headers: Record<string, string>
  withheldHeaders: string[]
}

// Reads the request body without assuming a content type: tries JSON first, then
// form encodings, then falls back to raw text (re-parsing as JSON in case the
// content-type header lied, which webhooks sometimes do).
async function readBody(req: NextRequest): Promise<unknown> {
  const contentType = req.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    try {
      return await req.json()
    } catch {
      /* malformed JSON — fall through to raw text */
    }
  }

  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    try {
      const form = await req.formData()
      return Object.fromEntries(form.entries())
    } catch {
      /* fall through to raw text */
    }
  }

  const text = await req.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

// Completes the CMP preview handshake: acknowledge, then hand CMP the render URL.
// Best-effort — logs each callback's status/body so a body-shape mismatch is
// visible immediately. Never throws into the webhook response path.
async function runPreviewHandshake(mapped: NonNullable<ReturnType<typeof mapCmpPreviewToBlog>>, origin: string) {
  const { previewId, contentHash, links } = mapped
  if (!cmpConfigured()) {
    console.log('[cmp-preview] CMP_* not configured — skipping acknowledge/complete')
    return
  }

  try {
    if (links?.acknowledge && contentHash) {
      const ack = await acknowledgePreview(links.acknowledge, contentHash)
      console.log(`[cmp-preview] acknowledge → ${ack.status} ${ack.body}`)
    }

    if (links?.complete && previewId) {
      const renderUrl = `${origin}/cmp-preview?id=${encodeURIComponent(previewId)}`
      // The dictionary key is the label shown in CMP's preview dropdown; the
      // value is the preview URL as a plain string.
      const done = await completePreview(links.complete, { 'Web Preview': renderUrl })
      console.log(`[cmp-preview] complete (${renderUrl}) → ${done.status} ${done.body}`)
    }
  } catch (err) {
    console.error('[cmp-preview] handshake failed:', err)
  }
}

export async function POST(req: NextRequest) {
  // ── 1. Verify the inbound webhook secret (when configured) ──────────────────
  const expectedSecret = process.env.CMP_CALLBACK_SECRET
  if (expectedSecret) {
    const provided = req.headers.get('callback-secret')
    if (provided !== expectedSecret) {
      console.warn('[cmp-preview] rejected webhook — callback-secret mismatch')
      return NextResponse.json({ ok: false, error: 'invalid callback secret' }, { status: 401 })
    }
  }

  const body = await readBody(req)

  // Allowlisted capture: this meta is republished by the unauthenticated GET
  // below, and the platform injects credential-bearing headers a denylist would
  // miss (x-vercel-oidc-token, x-vercel-sc-headers, …). See lib/captureHeaders.
  const { headers, withheld } = captureSafeHeaders(req.headers)
  const meta: CapturedMeta = {
    receivedAt: new Date().toISOString(),
    method: req.method,
    contentType: req.headers.get('content-type') ?? '',
    query: Object.fromEntries(req.nextUrl.searchParams.entries()),
    headers,
    withheldHeaders: withheld,
  }

  const previewId = (body as { data?: { preview_id?: string } })?.data?.preview_id

  // ── 2. Persist (durable) so the render page can load it later ───────────────
  await putDelivery({ receivedAt: meta.receivedAt, meta, payload: body }, previewId)

  if (process.env.NODE_ENV !== 'production') {
    console.log('[cmp-preview] webhook received:\n' + JSON.stringify({ meta, body }, null, 2))
  }

  // ── 3 + 4. Acknowledge + complete the preview back to CMP ───────────────────
  const mapped = mapCmpPreviewToBlog(body)
  if (mapped) {
    await runPreviewHandshake(mapped, req.nextUrl.origin)
  }

  return NextResponse.json({ ok: true, previewId, captured: meta })
}

export async function GET() {
  const durable = previewStoreIsDurable()

  // Surfaced on every response: without KV the store is per-instance memory, so
  // a delivery captured by one lambda is invisible to the next one. That makes
  // the preview work intermittently rather than fail outright — the hardest
  // kind of bug to spot — so the transport is stated rather than inferred.
  const store = durable
    ? { durable: true, backend: 'kv' as const }
    : {
        durable: false,
        backend: 'memory' as const,
        warning:
          'No KV backend configured — deliveries are held in per-instance memory and ' +
          'are lost on redeploy or when a request lands on a different serverless ' +
          'instance. Set KV_REST_API_URL + KV_REST_API_TOKEN (or the UPSTASH_* ' +
          'equivalents) for the production CMP preview flow.',
      }

  const latest = await getLatestDelivery()
  if (!latest) {
    return NextResponse.json({
      ok: true,
      store,
      message:
        'No payload captured yet. Point the CMP preview webhook (POST) at this URL, ' +
        'trigger a preview, then reload this page to inspect the delivery.',
    })
  }

  return NextResponse.json({
    ok: true,
    store,
    message: 'Most recently captured CMP webhook delivery.',
    captured: latest.meta,
    payload: latest.payload,
  })
}
