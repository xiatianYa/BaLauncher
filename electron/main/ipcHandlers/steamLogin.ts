import { ipcMain } from 'electron'
import { buildLoginHeaderScript, createLoginWindow, LoginWindowRef } from './loginWindow'

let steamLoginWindow: LoginWindowRef = { window: null }

/** Steam 徽标 */
const STEAM_ICON_SVG = '<svg viewBox="0 0 496 512"><path d="M496 256c0 137-111.2 248-248.4 248-113.8 0-209.6-76.3-239-180.4l95.2 39.3c6.4 2.6 12.3 4.2 18.8 4.2 28.7 0 52-23.3 52-52 0-5.5-1.1-10.9-3.1-15.8 2.1-.3 4.2-.5 6.4-.5 20.4 0 37 16.6 37 37s-16.6 37-37 37c-1.3 0-2.6 0-3.8-.1l-38.2 15.8c12.5 25.2 38.1 42.6 67.7 42.6 41.5 0 75.2-33.7 75.2-75.2 0-41.5-33.7-75.2-75.2-75.2-7.1 0-14 .9-20.5 2.8-10.1-18.4-29.7-31.3-52.4-31.3-10.4 0-20.2 2.6-28.7 7.3L108.4 178c17.5-39.4 55.6-67.1 100.4-67.1 60.5 0 109.5 49 109.5 109.5 0 10.9-1.7 21.5-4.7 31.4l54.1 22.4c17.1 7.1 31.8 20.8 41.5 38.1 13.2 23.4 21.2 50.8 21.2 79.8 0 32.3-9.9 62.2-26.9 87.3C414.7 449.3 458.8 361.3 458.8 256c0-111.9-91.1-202.9-203-202.9-33.9 0-65.8 8.4-93.8 23.2L138.7 41.5C172.8 16.6 213 1 256 1 391.2 1 496 113 496 256zM240.2 385.8c-29.1 0-52.7-23.6-52.7-52.7 0-29.1 23.6-52.7 52.7-52.7s52.7 23.6 52.7 52.7c0 29.1-23.6 52.7-52.7 52.7z"/></svg>'

const INJECT_HEADER_SCRIPT = buildLoginHeaderScript({
  title: '蔚蓝档案登录器 - Steam登录',
  iconSvg: STEAM_ICON_SVG,
  accentColor: '#66c0f4'
})

export function setupSteamLoginIpc() {
  ipcMain.handle('open-steam-login-window', (_, url) => {
    return createLoginWindow({
      ref: steamLoginWindow,
      title: '蔚蓝档案登录器 - Steam登录',
      width: 1000,
      height: 800,
      url,
      injectScript: INJECT_HEADER_SCRIPT,
      handleRedirect(redirectUrl) {
        // Steam OpenID 回调：从 claimed_id 中提取 17 位 Steam ID
        const claimedId = new URL(redirectUrl).searchParams.get('openid.claimed_id')
        const steamIdMatch = claimedId?.match(/\/id\/(\d+)/)
        if (steamIdMatch) {
          return { steamId: steamIdMatch[1] }
        }
        throw new Error('无法获取 Steam ID')
      }
    })
  })
}
