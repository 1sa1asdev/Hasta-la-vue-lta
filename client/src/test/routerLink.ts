import { h, type Slots } from 'vue'

// The components use <RouterLink> globally. In the tests it is replaced by a plain
// <a> so the test can read the href without starting a real router.
export const RouterLinkStub = {
  props: { to: { type: String, required: true } },
  setup(props: { to: string }, { slots }: { slots: Slots }) {
    return () => h('a', { href: props.to }, slots.default?.())
  },
}
