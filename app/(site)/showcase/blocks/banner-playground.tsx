'use client'

import { BlockPlayground } from '../playground'
import OT_BannerBlock from '@/cms/components/OT_BannerBlock'

const BANNER_IMG   = 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=80&fit=crop'
const BANNER_VIDEO = '/video/background-sample.mp4'

const DEMO_CONTENT = {
  heading:           'Confidence is a competitive advantage.',
  eyebrow:           'The platform',
  body:              { html: '<p>Stop launching and hoping. Start launching and knowing. Real-time data means every decision is an informed one.</p>' },
  primaryCtaLabel:   'Book a demo',
  primaryCtaUrl:     { default: '#' },
  secondaryCtaLabel: 'See pricing',
  secondaryCtaUrl:   { default: '#' },
}

export default function BannerPlayground() {
  return (
    <BlockPlayground
      defaults={{ treatment: 'scrim', color: 'canvas', alignment: 'center', size: 'large', media: 'image' }}
      controls={[
        {
          type: 'buttons',
          key: 'treatment',
          label: 'Overlay',
          options: [
            { label: 'Scrim', value: 'scrim' },
            { label: 'Glass', value: 'glass' },
          ],
        },
        {
          type: 'buttons',
          key: 'color',
          label: 'Color',
          options: [
            { label: 'Canvas',  value: 'canvas'  },
            { label: 'Brand',   value: 'brand'   },
            { label: 'Surface', value: 'surface' },
          ],
        },
        {
          type: 'buttons',
          key: 'alignment',
          label: 'Align',
          options: [
            { label: 'Center', value: 'center' },
            { label: 'Left',   value: 'left'   },
          ],
        },
        {
          type: 'buttons',
          key: 'size',
          label: 'Size',
          options: [
            { label: 'Large',   value: 'large'   },
            { label: 'Compact', value: 'compact' },
          ],
        },
        {
          type: 'buttons',
          key: 'media',
          label: 'Media',
          options: [
            { label: 'Image',         value: 'image'         },
            { label: 'Video',         value: 'video'         },
            { label: 'Video + Poster', value: 'video-poster' },
            { label: 'None',          value: 'none'          },
          ],
        },
      ]}
    >
      {s => {
        const mediaContent =
          s.media === 'image'         ? { backgroundImage: BANNER_IMG } :
          s.media === 'video'         ? { backgroundVideo: BANNER_VIDEO } :
          s.media === 'video-poster'  ? { backgroundVideo: BANNER_VIDEO, backgroundImage: BANNER_IMG } :
          {}

        return (
          <OT_BannerBlock
            content={{ ...DEMO_CONTENT, ...mediaContent } as any}
            displaySettings={{ treatment: s.treatment, color: s.color, alignment: s.alignment, size: s.size, imageBlend: 'overlay' }}
          />
        )
      }}
    </BlockPlayground>
  )
}
