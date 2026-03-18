import { ipcMain } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

function getAutoexecPath(csgo2Path: string): string {
  return path.join(csgo2Path, 'game', 'csgo', 'cfg', 'autoexec.cfg')
}

export function setupCs2CfgIpc() {
  ipcMain.handle('write-autoexec-cfg', async (_event, csgo2Path: string, content: string, overwrite: boolean = false) => {
    try {
      if (!csgo2Path) {
        return { success: false, error: 'CS2 path not provided' }
      }

      const autoexecPath = getAutoexecPath(csgo2Path)
      
      const cfgDir = path.dirname(autoexecPath)
      if (!fs.existsSync(cfgDir)) {
        fs.mkdirSync(cfgDir, { recursive: true })
      }

      if (overwrite) {
        // 覆盖模式：直接写入新内容
        fs.writeFileSync(autoexecPath, content, 'utf-8')
      } else {
        // 追加模式：读取原有内容并在下方追加
        let existingContent = ''
        if (fs.existsSync(autoexecPath)) {
          existingContent = fs.readFileSync(autoexecPath, 'utf-8')
        }
        const newContent = existingContent ? existingContent + '\n\n' + content : content
        fs.writeFileSync(autoexecPath, newContent, 'utf-8')
      }

      return { success: true, path: autoexecPath }
    } catch (error) {
      console.error('Failed to write autoexec.cfg:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('read-autoexec-cfg', async (_event, csgo2Path: string) => {
    try {
      if (!csgo2Path) {
        return { success: false, error: 'CS2 path not provided' }
      }

      const autoexecPath = getAutoexecPath(csgo2Path)

      if (!fs.existsSync(autoexecPath)) {
        return { success: true, content: '' }
      }

      const content = fs.readFileSync(autoexecPath, 'utf-8')
      return { success: true, content }
    } catch (error) {
      console.error('Failed to read autoexec.cfg:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  ipcMain.handle('remove-autoexec-cfg-content', async (_event, csgo2Path: string, contentToRemove: string) => {
    try {
      if (!csgo2Path) {
        return { success: false, error: 'CS2 path not provided' }
      }

      const autoexecPath = getAutoexecPath(csgo2Path)

      if (!fs.existsSync(autoexecPath)) {
        return { success: true, message: 'File does not exist' }
      }

      let content = fs.readFileSync(autoexecPath, 'utf-8')
      const trimmedContent = contentToRemove.trim()

      // 查找并删除包含指定内容的 BaLauncher 配置块
      // 匹配模式: // ======== ... // BaLauncher ... // ======== ... bind ...
      const blockPattern = /(\/\/ ={40}\n\/\/ BaLauncher 按键绑定配置[\s\S]*?\/\/ ={40}\nbind[^\n]*)/g

      content = content.replace(blockPattern, (match) => {
        // 如果这个块包含要删除的内容，则返回空字符串（删除）
        if (match.includes(trimmedContent)) {
          return ''
        }
        // 否则保留原样
        return match
      })

      // 清理多余的空行
      content = content.replace(/\n{3,}/g, '\n\n').trim()

      fs.writeFileSync(autoexecPath, content, 'utf-8')

      return { success: true }
    } catch (error) {
      console.error('Failed to remove autoexec.cfg content:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })
}
