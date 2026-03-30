import { loadIcons } from '@iconify/vue'

const loadedIcons = new Set<string>()

export async function preloadIcons(icons: string[]): Promise<void> {
  const iconsToLoad = icons.filter(icon => !loadedIcons.has(icon))
  if (iconsToLoad.length === 0) {
    return
  }
  
  try {
    await new Promise<void>((resolve) => {
      loadIcons(iconsToLoad, (loaded, missing) => {
        if (missing && missing.length > 0) {
          console.warn('[Icon] 缺少图标:', missing)
        }
        loaded.forEach(icon => loadedIcons.add(icon as unknown as string))
        resolve()
      })
    })
  } catch (error) {
    console.error('[Icon] 预加载图标失败:', error)
  }
}

export function isIconLoaded(icon: string): boolean {
  return loadedIcons.has(icon)
}

export const commonIcons = [
  'ic:twotone-settings',
  'ic:baseline-accessible-forward',
  'ic:baseline-close',
  'ic:round-refresh',
  'ic:round-remove',
  'ic:round-plus',
  'heroicons:cpu-chip',
  'material-symbols:refresh',
  'material-symbols:bring-your-own-ip',
  'material-symbols:account-circle',
  'material-symbols:alarm-smart-wake-outline',
  'material-symbols:cloud-off',
  'material-symbols:download',
  'material-symbols:deployed-code-update-outline',
  'tabler:settings',
  'material-symbols:home-outline-rounded',
  'material-symbols:sunny-outline',
  'material-symbols:nightlight-outline',
  'hugeicons:start-up-02',
  'ix:success-filled',
  'solar:gamepad-broken',
  'solar:info-square-broken',
  'solar:copy-outline',
  'solar:round-alt-arrow-left-outline',
  'solar:round-alt-arrow-right-outline',
  'solar:settings-minimalistic-outline',
  'lets-icons:stop',
  'tdesign:translate',
  'mdi:map-legend',
  'mdi:steam',
  'mdi:earth',
  'mdi:tag-multiple-outline',
  'mdi:server-off',
  'iconamoon:enter',
  'mingcute:safe-shield-line',
  'streamline:desktop-game',
  'pepicons:leave',
  'majesticons:door-exit-line',
  'tabler:server',
  'basil:qq-outline',
  'gg:toolbox',
  'ph:sign-out',
  'ph:sign-in',
  'solar:health-broken',
  'hugeicons:body-armor',
  'material-symbols:price-change-outline',
  'ph:knife',
  'mdi:scoreboard-outline',
  'solar:tag-price-broken',
  'hugeicons:gun',
  'material-symbols:info-outline',
  'octicon:cache-24',
  'material-symbols:keyboard-alt-outline',
  'material-symbols:map-outline',
  'line-md:question-circle',
  'material-symbols:arrow-back',
  'material-symbols:person',
  'material-symbols:add',
  'material-symbols:schedule-outline',
  'material-symbols:delete-outline',
  'material-symbols:edit-square-outline',
  'material-symbols:visibility',
  'material-symbols:share',
  'material-symbols:save',
  'material-symbols:check-circle-outline',
  'material-symbols:arrow-downward',
  'material-symbols:help-outline',
  'material-symbols:touch-double-outline',
  'ic:outline-check-circle',
  'ic:sharp-clear',
  'material-symbols:lightbulb-2-outline',
  'material-symbols:search',
  'tabler:device-desktop',
  'fluent-emoji-high-contrast:package',
  'material-symbols:inbox-outline',
  'material-symbols:left-panel-open-outline',
  'material-symbols:check'
]
