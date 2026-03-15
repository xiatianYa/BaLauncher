import { ipcMain } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

function getAutoexecPath(csgo2Path: string): string {
  return path.join(csgo2Path, 'game', 'csgo', 'cfg', 'autoexec.cfg')
}

export function setupCs2CfgIpc() {
  ipcMain.handle('write-autoexec-cfg', async (_event, csgo2Path: string, content: string) => {
    try {
      if (!csgo2Path) {
        return { success: false, error: 'CS2 path not provided' }
      }

      const autoexecPath = getAutoexecPath(csgo2Path)
      
      const cfgDir = path.dirname(autoexecPath)
      if (!fs.existsSync(cfgDir)) {
        fs.mkdirSync(cfgDir, { recursive: true })
      }

      fs.writeFileSync(autoexecPath, content, 'utf-8')

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
}
