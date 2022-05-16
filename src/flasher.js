const { window, env } = require('vscode')
const { SerialPort } = require('serialport')
const cp = require('child_process')
const os = require('os')
const fs = require('fs')
const path = require('path')

const firmwareUrl = 'https://github.com/beanjs/beanio-firmware.git'
const firmwareDir = path.join(os.homedir(), 'beanio-firmware')

// const firmwareUrl = 'https://github.com/espruino/Espruino.git'
// const firmwareDir = path.join(os.homedir(), 'Espruino')

function exec (cmd, options = {}) {
  return new Promise((resolve, reject) => {
    options.shell = env.shell
    if (Array.isArray(cmd)) {
      cmd = cmd.join(' ')
    }

    const spawn = cp.spawn(cmd, options)

    spawn.stderr.on('data', message => {
      const lines = message.toString().split('\n')
      for (const line of lines) {
        if (line.length > 1) {
          this.appendLine(`-> ${line}`)
        } else if (line.length == 1) {
          this.append(line)
        }
      }
    })

    spawn.stdout.on('data', message => {
      const lines = message.toString().split('\n')
      for (const line of lines) {
        if (line.length > 1) {
          this.appendLine(`-> ${line}`)
        } else if (line.length == 1) {
          this.append(line)
        }
      }
    })

    spawn.on('close', code => {
      if (code == 0) resolve()
      else reject()
    })
  })
}

async function pythonShell () {
  if (process.platform == 'win32') {
    return 'python'
  }

  return 'python3'
}

async function wmToolBuild (cwd) {
  if (process.platform == 'win32') {
    return './wm_tool.exe'
  }

  await exec.call(this, 'gcc ./wm_tool.c -lpthread -o ./wm_tool', { cwd })
  return './wm_tool'
}

const flashFactory = {
  async esp32 (port, cwd) {
    await exec.call(
      this,
      [
        await pythonShell(),
        './esptool.py',
        `--port ${port}`,
        '--baud 460800',
        '--before default_reset',
        '--after hard_reset',
        '--chip esp32',
        'write_flash',
        '--flash_mode dio',
        '--flash_size detect',
        '--flash_freq 40m',
        '0x1000 ./bootloader.bin',
        '0x8000 ./partition-table.bin',
        '0x10000 ./beanio.bin'
      ],
      { cwd }
    )
  },
  async esp32c3 (port, cwd) {
    await exec.call(
      this,
      [
        await pythonShell(),
        './esptool.py',
        `--port ${port}`,
        '--baud 460800',
        '--before default_reset',
        '--after hard_reset',
        '--chip esp32c3',
        'write_flash',
        '--flash_mode dio',
        '--flash_size detect',
        '--flash_freq 40m',
        '0x1000 ./bootloader.bin',
        '0x8000 ./partition-table.bin',
        '0x10000 ./beanio.bin'
      ],
      { cwd }
    )
  },
  async esp32s2 (port, cwd) {
    await exec.call(
      this,
      [
        await pythonShell(),
        './esptool.py',
        `--port ${port}`,
        '--baud 460800',
        '--before default_reset',
        '--after hard_reset',
        '--chip esp32s2',
        'write_flash',
        '--flash_mode dio',
        '--flash_size detect',
        '--flash_freq 40m',
        '0x1000 ./bootloader.bin',
        '0x8000 ./partition-table.bin',
        '0x10000 ./beanio.bin'
      ],
      { cwd }
    )
  },
  async esp32s3 (port, cwd) {
    await exec.call(
      this,
      [
        await pythonShell(),
        './esptool.py',
        `--port ${port}`,
        '--baud 460800',
        '--before default_reset',
        '--after hard_reset',
        '--chip esp32s3',
        'write_flash',
        '--flash_mode dio',
        '--flash_size detect',
        '--flash_freq 40m',
        '0x1000 ./bootloader.bin',
        '0x8000 ./partition-table.bin',
        '0x10000 ./beanio.bin'
      ],
      { cwd }
    )
  },
  async esp8266 (port, cwd) {
    await exec.call(
      this,
      [
        await pythonShell(),
        './esptool.py',
        `--port ${port}`,
        '--baud 460800',
        'write_flash',
        '0x0000 "./boot_v1.6.bin"',
        '0x1000 "./beanio_esp8266_user1.bin"',
        '0xFC000  "./esp_init_data_default.bin"',
        '0xFE000 "./blank.bin"'
      ],
      { cwd }
    )
  },
  async w800 (port, cwd) {
    await exec.call(
      this,
      [
        await wmToolBuild.call(this, cwd),
        `-c ${port}`,
        '-dl ./beanio_w800.fls',
        '-rs rts'
      ],
      { cwd }
    )
  },
  async w801 (port, cwd) {
    await exec.call(
      this,
      [
        await wmToolBuild.call(this, cwd),
        `-c ${port}`,
        '-dl ./beanio_w801.fls',
        '-rs rts'
      ],
      { cwd }
    )
  },
  async w600 (port, cwd) {
    await exec.call(
      this,
      [await pythonShell(), `./download.py`, port, './beanio_w600.fls'],
      { cwd }
    )
  },
  async w601 (port, cwd) {
    await exec.call(
      this,
      [await pythonShell(), `./download.py`, port, './beanio_w601.fls'],
      { cwd }
    )
  }
}

module.exports = async () => {
  const term = window.createOutputChannel('BeanIO Flasher')
  term.clear()
  term.show(true)

  try {
    term.appendLine('BeanIO Flasher: Check git')
    await exec.call(term, 'git --version')

    if (fs.existsSync(firmwareDir)) {
      term.appendLine('BeanIO Flasher: Pull firmware')
      await exec.call(term, `git pull`, { cwd: firmwareDir })
    } else {
      term.appendLine('BeanIO Flasher: Clone firmware')
      await exec.call(term, `git clone ${firmwareUrl}`, { cwd: os.homedir() })
    }

    const chips = fs
      .readdirSync(firmwareDir, { withFileTypes: true })
      .filter(v => v.isDirectory())
      .filter(v => v.name !== '.git' && v.name !== 'linux')
      .map(v => v.name)

    const ports = await SerialPort.list().then(p => {
      return p.filter(v => v.serialNumber).map(v => v.path)
    })

    const chip = await window.showQuickPick(chips, { title: 'Selected Chip' })
    if (!chip) return

    const port = await window.showQuickPick(ports, { title: 'Selected Device' })
    if (!port) return

    const factory = flashFactory[chip]
    if (!factory) {
      throw new Error('This chip is not supported')
    }

    term.appendLine(`BeanIO Flasher: Firmware ${chip}`)
    await factory.call(term, port, path.join(firmwareDir, chip))
  } catch (e) {}
  term.appendLine('BeanIO Flasher: All Done')
}