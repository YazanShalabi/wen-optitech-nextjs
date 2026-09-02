// ─── Safe header capture for webhook inspection endpoints ────────────────────
//
// The CMP webhook routes expose their last captured delivery over an
// unauthenticated GET so the integration can be inspected from a browser. That
// makes the captured `headers` map a published artefact, so it is built from an
// ALLOWLIST rather than a denylist.
//
// A denylist is the wrong shape here: the platform injects credential-bearing
// headers that no hand-maintained blocklist anticipates. On Vercel a single
// inbound webhook carries at least:
//
//   x-vercel-oidc-token      signed OIDC JWT scoped to the project/environment
//   x-vercel-sc-headers      JSON blob containing an `Authorization: Bearer …`
//   x-vercel-proxy-signature `Bearer …` request signature
//   forwarded                repeats that same signature in its `sig=` parameter
//
// Every one of those is a live credential, and none of them is named
// `authorization` / `cookie` / `callback-secret`. Echoing them from a public
// endpoint hands them to any unauthenticated caller. Anything not named below is
// therefore dropped, so a new platform header is excluded by default instead of
// leaking until someone notices it.

/** Headers that are useful for debugging a webhook and carry no credential. */
const SAFE_HEADERS = new Set([
  'accept',
  'accept-encoding',
  'content-length',
  'content-type',
  'host',
  'organization-id',
  'user-agent',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-matched-path',
  'x-vercel-id',
  'x-vercel-ip-country',
])

/**
 * Builds the header map published by the inspection GET.
 *
 * Returns only allowlisted headers. Names that were present but withheld are
 * reported as a sorted `withheld` list — enough to debug "did CMP send X?"
 * without disclosing any value.
 */
export function captureSafeHeaders(headers: Headers): {
  headers: Record<string, string>
  withheld: string[]
} {
  const safe: Record<string, string> = {}
  const withheld: string[] = []

  for (const [rawName, value] of headers.entries()) {
    const name = rawName.toLowerCase()
    if (SAFE_HEADERS.has(name)) safe[name] = value
    else withheld.push(name)
  }

  return { headers: safe, withheld: withheld.sort() }
}
