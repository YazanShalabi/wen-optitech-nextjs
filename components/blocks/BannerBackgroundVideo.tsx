'use client'

/**
 * BannerBackgroundVideo
 *
 * Client wrapper around the banner's background <video>. Playback is driven
 * imperatively (no `autoPlay` attribute) so prefers-reduced-motion can be
 * honored precisely: the video never starts playing for a reduced-motion
 * visitor, rather than starting and then being hidden by CSS. It stays on
 * its first frame (or the `poster`, when supplied) instead.
 */

import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion'

type Props = {
  src:        string
  poster?:    string
  className?: string
}

export default function BannerBackgroundVideo({ src, poster, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (prefersReducedMotion) {
      video.pause()
      return
    }

    video.play().catch(() => {
      // Autoplay can be rejected before the user has interacted with the
      // page in some browser configurations; the poster/first frame remains
      // a fine static fallback in that case.
    })
  }, [prefersReducedMotion])

  return (
    <video
      ref={videoRef}
      className={className}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
    />
  )
}
