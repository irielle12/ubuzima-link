import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Health-post icon source: favicon.svg, rendered onto the app's background
// color so maskable icons don't clip the logo against a transparent edge.
export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: {
    ...minimal2023Preset,
    maskable: {
      ...minimal2023Preset.maskable,
      padding: 0.3,
      resizeOptions: { fit: 'contain', background: '#f8fafc' },
    },
    apple: {
      ...minimal2023Preset.apple,
      padding: 0.3,
      resizeOptions: { fit: 'contain', background: '#f8fafc' },
    },
  },
  images: ['public/favicon.svg'],
})
