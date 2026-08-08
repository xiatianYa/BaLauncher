// electron-builder afterPack 钩子（Windows）
//
// 背景：win 打包配置了 signAndEditExecutable: false 以绕开 winCodeSign 下载
//（winCodeSign 内含 darwin 符号链接，无符号链接权限的机器解压会失败），
// 但该配置同时跳过了 electron-builder 内置的 rcedit 图标/版本信息嵌入，
// 导致打包出的 exe 仍是 Electron 默认图标。
//
// 此钩子在 appOutDir 打包完成后，用独立的 rcedit-x64.exe（单文件、无符号链接）
// 重新嵌入自定义图标与版本信息，不触发任何 winCodeSign 下载。

const fs = require('node:fs')
const path = require('node:path')
const { execFile } = require('node:child_process')

// 项目内已内置的 rcedit（scripts/rcedit/rcedit-x64.exe），不存在时尝试下载
const RCEDIT_URL = 'https://github.com/electron/rcedit/releases/download/v2.0.0/rcedit-x64.exe'

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const req = require('node:https').get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        return download(res.headers.location, dest).then(resolve, reject)
      }
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`下载 rcedit 失败: HTTP ${res.statusCode}`))
      }
      const tmp = `${dest}.tmp`
      const ws = fs.createWriteStream(tmp)
      res.pipe(ws)
      ws.on('finish', () => ws.close(() => {
        fs.renameSync(tmp, dest)
        resolve()
      }))
      ws.on('error', reject)
    })
    req.on('error', reject)
    req.setTimeout(120000, () => req.destroy(new Error('下载 rcedit 超时')))
  })
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) return reject(new Error(`rcedit 执行失败: ${err.message}\n${stderr || stdout}`))
      resolve()
    })
  })
}

async function afterPack(context) {
  // 仅 Windows 需要注入 exe 图标
  if (context.electronPlatformName !== 'win32') return

  const { appOutDir, packager } = context
  const projectDir = packager.projectDir
  const exePath = path.join(appOutDir, `${packager.appInfo.productFilename}.exe`)
  if (!fs.existsSync(exePath)) {
    console.warn('[afterPack] 未找到主程序 exe，跳过图标注入:', exePath)
    return
  }

  // 定位 rcedit：优先项目内置（scripts/rcedit/rcedit-x64.exe），缺失则下载到该目录
  const rceditPath = path.join(projectDir, 'scripts', 'rcedit', 'rcedit-x64.exe')
  if (!fs.existsSync(rceditPath)) {
    fs.mkdirSync(path.dirname(rceditPath), { recursive: true })
    console.log('[afterPack] 下载 rcedit...')
    await download(RCEDIT_URL, rceditPath)
  }

  const iconPath = path.join(projectDir, 'public', 'favicon.ico')
  const args = [exePath]
  if (fs.existsSync(iconPath)) {
    args.push('--set-icon', iconPath)
  } else {
    console.warn('[afterPack] 未找到图标文件，仅写入版本信息:', iconPath)
  }

  // 恢复被 signAndEditExecutable: false 跳过的版本信息
  const { productName, version } = packager.appInfo
  args.push(
    '--set-version-string', 'FileDescription', productName,
    '--set-version-string', 'ProductName', productName,
    '--set-version-string', 'FileVersion', version,
    '--set-version-string', 'ProductVersion', version,
    '--set-file-version', version,
    '--set-product-version', version
  )

  await run(rceditPath, args)
  console.log(`[afterPack] 已注入图标与版本信息: ${path.basename(exePath)} (v${version})`)
}

// electron-builder 钩子兼容 module.exports / module.exports.default 两种加载方式
module.exports = afterPack
module.exports.default = afterPack
