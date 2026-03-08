import { ipcMain } from 'electron'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import fs from 'node:fs'

const execPromise = promisify(exec)

async function getSteamPathFromRegistry(): Promise<string | null> {
  try {
    const { stdout } = await execPromise('reg query "HKCU\\Software\\Valve\\Steam" /v SteamPath')
    const match = stdout.match(/SteamPath\s+REG_SZ\s+(.+)/)
    if (match && match[1]) {
      return match[1].trim()
    }
  } catch (error) {
    console.log('Failed to get Steam path from HKCU registry:', error)
  }

  try {
    const { stdout } = await execPromise('reg query "HKLM\\Software\\Valve\\Steam" /v InstallPath')
    const match = stdout.match(/InstallPath\s+REG_SZ\s+(.+)/)
    if (match && match[1]) {
      return match[1].trim()
    }
  } catch (error) {
    console.log('Failed to get Steam path from HKLM registry:', error)
  }

  try {
    const { stdout } = await execPromise('reg query "HKLM\\Software\\Wow6432Node\\Valve\\Steam" /v InstallPath')
    const match = stdout.match(/InstallPath\s+REG_SZ\s+(.+)/)
    if (match && match[1]) {
      return match[1].trim()
    }
  } catch (error) {
    console.log('Failed to get Steam path from Wow6432Node registry:', error)
  }

  const defaultPaths = [
    'C:\\Program Files (x86)\\Steam',
    'C:\\Program Files\\Steam',
    path.join(process.env.PROGRAMFILES || '', 'Steam'),
    path.join(process.env['PROGRAMFILES(X86)'] || '', 'Steam')
  ]

  for (const defaultPath of defaultPaths) {
    if (fs.existsSync(defaultPath)) {
      return defaultPath
    }
  }

  return null
}

async function getCSGO2Path(steamPath: string): Promise<string | null> {
  if (!steamPath) return null

  const libraryFoldersPath = path.join(steamPath, 'steamapps', 'libraryfolders.vdf')
  
  if (!fs.existsSync(libraryFoldersPath)) {
    return null
  }

  try {
    const vdfContent = fs.readFileSync(libraryFoldersPath, 'utf-8')
    
    const libraryPaths: string[] = [steamPath]
    
    const pathRegex = /"path"\s*"([^"]+)"/g
    let match
    while ((match = pathRegex.exec(vdfContent)) !== null) {
      if (match[1] && !libraryPaths.includes(match[1])) {
        libraryPaths.push(match[1])
      }
    }

    const csgo2AppIds = ['730', '2347770']
    
    for (const libraryPath of libraryPaths) {
      for (const appId of csgo2AppIds) {
        const csgo2Path = path.join(libraryPath, 'steamapps', 'common', 'Counter-Strike Global Offensive')
        if (fs.existsSync(csgo2Path)) {
          return csgo2Path
        }
        
        const cs2Path = path.join(libraryPath, 'steamapps', 'common', 'Counter-Strike 2')
        if (fs.existsSync(cs2Path)) {
          return cs2Path
        }
      }
    }
  } catch (error) {
    console.log('Failed to parse libraryfolders.vdf:', error)
  }

  return null
}

export function setupGamePathIpc() {
  ipcMain.handle('auto-detect-paths', async () => {
    const result = {
      steamPath: null as string | null,
      csgo2Path: null as string | null
    }

    result.steamPath = await getSteamPathFromRegistry()

    if (result.steamPath) {
      result.csgo2Path = await getCSGO2Path(result.steamPath)
    }

    return result
  })
}
