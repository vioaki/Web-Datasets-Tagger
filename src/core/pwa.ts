import { create } from 'zustand'

interface InstallPrompt extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
export const usePwa = create<{ ready: boolean; update: boolean; error: boolean; install: InstallPrompt | null }>(() => ({ ready: false, update: false, error: false, install: null }))
let registration: ServiceWorkerRegistration | undefined
let applying = false

export function registerOffline() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); usePwa.setState({ install: event as InstallPrompt })
  })
  window.addEventListener('appinstalled', () => usePwa.setState({ install: null }))
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (applying) window.location.reload() })
  void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL, updateViaCache: 'none' }).then((reg) => {
    registration = reg
    if (reg.waiting) usePwa.setState({ update: true })
    reg.addEventListener('updatefound', () => {
      reg.installing?.addEventListener('statechange', () => {
        if (reg.waiting && navigator.serviceWorker.controller) usePwa.setState({ update: true })
      })
    })
    void navigator.serviceWorker.ready.then(() => usePwa.setState({ ready: true }))
  }).catch(() => usePwa.setState({ error: true }))
}

export function applyUpdate() {
  if (!registration?.waiting) return
  applying = true
  registration.waiting.postMessage('ACTIVATE_UPDATE')
}

export async function installApp() {
  const prompt = usePwa.getState().install
  if (!prompt) return
  await prompt.prompt()
  await prompt.userChoice
  usePwa.setState({ install: null })
}
