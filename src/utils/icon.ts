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
  // ic
  'ic:baseline-accessible-forward',
  'ic:baseline-close',
  'ic:round-plus',
  'ic:round-remove',
  'ic:sharp-clear',
  'ic:twotone-settings',
  // heroicons
  'heroicons:cpu-chip',
  // material-symbols
  'material-symbols:account-circle',
  'material-symbols:add',
  'material-symbols:add-photo-alternate-outline',
  'material-symbols:alarm-smart-wake-outline',
  'material-symbols:arrow-back',
  'material-symbols:bolt',
  'material-symbols:bring-your-own-ip',
  'material-symbols:check',
  'material-symbols:chevron-left',
  'material-symbols:chevron-right',
  'material-symbols:close',
  'material-symbols:cloud-off',
  'material-symbols:delete-outline',
  'material-symbols:deployed-code-update-outline',
  'material-symbols:download',
  'material-symbols:drag-indicator',
  'material-symbols:edit-outline',
  'material-symbols:edit-square-outline',
  'material-symbols:folder-code-outline',
  'material-symbols:home-outline-rounded',
  'material-symbols:inbox-outline',
  'material-symbols:info-outline',
  'material-symbols:keyboard',
  'material-symbols:keyboard-alt-outline',
  'material-symbols:left-panel-open-outline',
  'material-symbols:lightbulb-2-outline',
  'material-symbols:map-outline',
  'material-symbols:mouse',
  'material-symbols:nightlight-outline',
  'material-symbols:price-change-outline',
  'material-symbols:refresh',
  'material-symbols:search',
  'material-symbols:sunny-outline',
  'material-symbols:swap-vert',
  'material-symbols:view-list',
  // hugeicons
  'hugeicons:authorized',
  'hugeicons:body-armor',
  'hugeicons:gun',
  'hugeicons:start-up-02',
  // ix
  'ix:success',
  'ix:success-filled',
  // solar
  'solar:copy-outline',
  'solar:gamepad-broken',
  'solar:health-broken',
  'solar:info-square-broken',
  'solar:pin-line-duotone',
  'solar:round-alt-arrow-left-outline',
  'solar:round-alt-arrow-right-outline',
  'solar:settings-minimalistic-outline',
  'solar:tag-price-broken',
  // lets-icons
  'lets-icons:stop',
  // tdesign
  'tdesign:translate',
  // mdi
  'mdi:account',
  'mdi:account-group',
  'mdi:account-group-outline',
  'mdi:account-key',
  'mdi:account-multiple',
  'mdi:account-off',
  'mdi:account-off-outline',
  'mdi:account-search',
  'mdi:account-supervisor-outline',
  'mdi:alert',
  'mdi:alert-decagram',
  'mdi:alphabetical-variant',
  'mdi:arrow-left',
  'mdi:arrow-right',
  'mdi:bell-outline',
  'mdi:book-off-outline',
  'mdi:book-open-outline',
  'mdi:book-open-variant',
  'mdi:broom',
  'mdi:calendar-end',
  'mdi:calendar-start',
  'mdi:check',
  'mdi:check-circle',
  'mdi:check-all',
  'mdi:chevron-down',
  'mdi:chevron-right',
  'mdi:clock-outline',
  'mdi:close',
  'mdi:cloud-download-outline',
  'mdi:code-tags',
  'mdi:cog',
  'mdi:content-copy',
  'mdi:cursor-pointer',
  'mdi:delete',
  'mdi:delete-alert',
  'mdi:download',
  'mdi:earth',
  'mdi:file-document-outline',
  'mdi:form-textbox',
  'mdi:gamepad-variant',
  'mdi:heart-multiple',
  'mdi:history',
  'mdi:image-multiple',
  'mdi:information-outline',
  'mdi:key-outline',
  'mdi:key-remove',
  'mdi:link-variant',
  'mdi:loading',
  'mdi:login',
  'mdi:magnify',
  'mdi:map',
  'mdi:map-legend',
  'mdi:map-marker',
  'mdi:map-marker-off',
  'mdi:message-text',
  'mdi:minus',
  'mdi:note-text-outline',
  'mdi:pencil',
  'mdi:plus',
  'mdi:power',
  'mdi:progress-download',
  'mdi:qqchat',
  'mdi:refresh',
  'mdi:restart',
  'mdi:robot-confused',
  'mdi:robot-excited',
  'mdi:routes',
  'mdi:scoreboard-outline',
  'mdi:server',
  'mdi:server-network',
  'mdi:server-off',
  'mdi:shape-outline',
  'mdi:shield-account',
  'mdi:shield-lock',
  'mdi:shield-off-outline',
  'mdi:shield-star',
  'mdi:sort',
  'mdi:speedometer',
  'mdi:steam',
  'mdi:storefront-outline',
  'mdi:tag-multiple-outline',
  'mdi:tag-outline',
  'mdi:text-box-outline',
  'mdi:timeline-clock',
  'mdi:translate',
  'mdi:trash-can-outline',
  'mdi:update',
  'mdi:view-list',
  // iconamoon
  'iconamoon:arrow-down-2-bold',
  'iconamoon:arrow-up-2-bold',
  'iconamoon:enter',
  'iconamoon:player-next-bold',
  'iconamoon:player-play-bold',
  'iconamoon:screen-full',
  'iconamoon:screen-normal',
  // ph
  'ph:caret-up-down-bold',
  'ph:knife',
  'ph:sign-in',
  'ph:sign-out',
  // lucide
  'lucide:calendar-1',
  'lucide:languages',
  'lucide:tag',
  // tabler
  'tabler:device-desktop',
  'tabler:history',
  'tabler:server',
  'tabler:settings',
  'tabler:users',
  // 其他
  'basil:qq-outline',
  'eos-icons:loading',
  'fluent-emoji-high-contrast:package',
  'gg:toolbox',
  'majesticons:door-exit-line',
  'mingcute:safe-shield-line',
  'octicon:cache-24',
  'pepicons:leave',
  'streamline:desktop-game',
  'unjs:theme-colors',
]
