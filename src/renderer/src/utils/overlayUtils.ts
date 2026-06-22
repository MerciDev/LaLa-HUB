import { Theme, THEMES, SectionId } from '../components/overlay/types'

export function execPanelAction(
  section: SectionId, idx: number,
  theme: Theme, setTheme: (t: Theme) => void,
  volume: number, setVolume: (v: number) => void,
  _notifyOn: boolean, setNotifyOn: (fn: (p: boolean) => boolean) => void,
  dismiss: () => void
) {
  if (section === 'settings') {
    if (idx === 0) setVolume(volume >= 100 ? 0 : Math.min(100, volume + 10))
    if (idx === 1) setNotifyOn(n => !n)
    if (idx === 2) {
      const i = THEMES.findIndex(t => t.id === theme)
      setTheme(THEMES[(i + 1) % THEMES.length].id)
    }
  }
  if (section === 'power' && idx === 2) {
    dismiss()
  }
}
