import { h, type Slots } from 'vue'

// Komponenterna använder <RouterLink> globalt. I testerna ersätts den med en vanlig
// <a> så att testet kan läsa ut href:en utan att starta en riktig router.
export const RouterLinkStub = {
  props: { to: { type: String, required: true } },
  setup(props: { to: string }, { slots }: { slots: Slots }) {
    return () => h('a', { href: props.to }, slots.default?.())
  },
}
