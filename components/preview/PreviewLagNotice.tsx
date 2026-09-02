'use client'

/**
 * PreviewLagNotice
 *
 * Shown only inside the Optimizely CMS editor's preview frame.
 *
 * Why this exists: this app renders preview content from Optimizely Graph, and
 * Graph reindexes a draft on its own schedule — measured at roughly a minute on
 * this instance. So an editor changes a field, sees AUTOSAVED, looks at the
 * preview, and finds their edit missing with nothing explaining the gap. The
 * natural conclusion is that preview is broken; in fact it is showing the last
 * version Graph has indexed.
 *
 * Note what this deliberately does NOT do: it does not poll, refetch, or read
 * around Graph via the Management API. An earlier attempt at that bypass took
 * the blog route down twice in production, and the lag resolves on its own —
 * so the honest fix is to make the wait legible rather than to engineer around
 * it. Naming the behaviour costs nothing and cannot fail.
 */

import { useState } from 'react'
import { Clock, X } from 'lucide-react'

// Warm amber, matching DraftStateBanner's draft-state signal. Deliberately not
// a design token: preview-only chrome, never rendered on a brand surface.
const DRAFT_AMBER = 'oklch(76% 0.17 68)'

export function PreviewLagNotice() {
  const [open, setOpen] = useState(true)
  if (!open) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position:     'fixed',
        bottom:       '1rem',
        left:         '1rem',
        zIndex:       9999,
        display:      'flex',
        alignItems:   'flex-start',
        gap:          '0.625rem',
        maxWidth:     '22rem',
        padding:      '0.625rem 0.75rem',
        borderRadius: '0.5rem',
        border:       `1px solid ${DRAFT_AMBER}`,
        background:   'oklch(21% 0.02 250 / 0.96)',
        color:        'oklch(97% 0 0)',
        font:         '400 0.75rem/1.45 ui-sans-serif, system-ui, sans-serif',
        boxShadow:    '0 4px 16px oklch(0% 0 0 / 0.3)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <Clock size={14} style={{ color: DRAFT_AMBER, flexShrink: 0, marginTop: '0.1rem' }} aria-hidden />
      <span>
        Preview shows the last version indexed by Optimizely Graph. A change you
        just saved can take up to a minute to appear here — reload the preview
        after a moment, or publish to see it immediately.
      </span>
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="Dismiss preview timing notice"
        style={{
          flexShrink:  0,
          marginLeft:  'auto',
          padding:     0,
          border:      'none',
          background:  'transparent',
          color:       'oklch(70% 0 0)',
          cursor:      'pointer',
          lineHeight:  0,
        }}
      >
        <X size={14} aria-hidden />
      </button>
    </div>
  )
}
