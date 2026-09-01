import { contentType } from '@optimizely/cms-sdk'

// ImageMedia is the built-in Optimizely SaaS CMS image asset type.
// Most image data lives in _metadata (url.default, displayName, mimeType).
//
// NOTE: `AltText` is declared here to MIRROR what already exists on the CMS
// instance. A manifest push REPLACES a content type's property set, so leaving
// it out does not mean "leave it alone" — it means DELETE it, taking every
// alt-text value stored on every image with it. Do not remove this without
// first confirming no site on the target instance uses it.
export const ImageMedia = contentType({
  key: 'ImageMedia',
  displayName: 'Image',
  baseType: '_image',
  properties: {
    AltText: {
      type:         'string',
      format:       'shortString',
      displayName:  'Alt text',
      isLocalized:  true,
      group:        'Content',
      sortOrder:    10,
      indexingType: 'searchable',
    },
  },
})
