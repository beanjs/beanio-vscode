const { window, env } = require('vscode')
const { SerialPort } = require('serialport')
const cp = require('child_process')
const os = require('os')
const fs = require('fs')
const path = require('path')
const { default: axios } = require('axios')

const ip138Url = 'https://2022.ip138.com/'

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
      else reject(new Error(`spawn error: ${code}`))
    })
  })
}

async function pythonExcutor () {
  if (process.platform == 'win32') {
    return 'python'
  }

  if (process.platform == 'darwin') {
    return 'python3'
  }

  return 'python3'
}

async function wmToolExcutor (opts) {
  if (process.platform == 'win32') {
    return './wm_tool.exe'
  }

  await exec.call(this, 'gcc ./wm_tool.c -lpthread -o ./wm_tool', opts)
  return './wm_tool'
}

async function selectSerialPort () {
  const ports = await SerialPort.list().then(p => {
    return p.filter(v => v.manufacturer && v.vendorId).map(v => v.path)
  })

  const port = await window.showQuickPick(ports, { title: 'Select Port' })
  if (!port) throw new Error('Port is undefined')
  return port
}

const flashFactory = {
  qs100: {
    getExcutor: pythonExcutor,
    getParams: async () => {
      // python3 zos.py -mdl /dev/ttyUSB0
      const port = await selectSerialPort()
      return ['./zos.py', '-mdl', port]
    }
  },
  air724: {
    getExcutor: pythonExcutor,
    getParams: async () => {
      return [
        './down.py',
        '0x838000 ./fdl1.img',
        '0x810000 ./fdl2.img',
        '0x60180000 ./Air720U_V302340_CSDK_beanio.img'
      ]
    }
  },
  air780: {
    getExcutor: pythonExcutor,
    getParams: async () => {
      return [
        './downloader.py',
        './agentboot.bin',
        './ap_bootloader.bin',
        './ap_flash.bin',
        './cp-demo-flash.bin'
      ]
    }
  },
  esp32: {
    getExcutor: pythonExcutor,
    getParams: async () => {
      const port = await selectSerialPort()
      return [
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
      ]
    }
  },
  esp32c3: {
    getExcutor: pythonExcutor,
    getParams: async () => {
      const port = await selectSerialPort()
      return [
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
        '0x0000 ./bootloader.bin',
        '0x8000 ./partition-table.bin',
        '0x10000 ./beanio.bin'
      ]
    }
  },
  'esp32c3-usb': {
    getExcutor: pythonExcutor,
    getParams: async () => {
      const port = await selectSerialPort()
      return [
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
        '0x0000 ./bootloader.bin',
        '0x8000 ./partition-table.bin',
        '0x10000 ./beanio.bin'
      ]
    }
  },
  esp32s2: {
    getExcutor: pythonExcutor,
    getParams: async () => {
      const port = await selectSerialPort()
      return [
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
      ]
    }
  },
  esp32s3: {
    getExcutor: pythonExcutor,
    getParams: async () => {
      const port = await selectSerialPort()
      return [
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
        '0x0000 ./bootloader.bin',
        '0x8000 ./partition-table.bin',
        '0x10000 ./beanio.bin'
      ]
    }
  },
  esp8266: {
    getExcutor: pythonExcutor,
    getParams: async () => {
      const port = await selectSerialPort()
      return [
        './esptool.py',
        `--port ${port}`,
        '--baud 460800',
        'write_flash',
        '--flash_freq 80m',
        '--flash_mode qio',
        '--flash_size 1MB',
        '0x0000 "./boot_v1.6.bin"',
        '0x1000 "./beanio_esp8266_user1.bin"',
        '0xFC000  "./esp_init_data_default.bin"',
        '0xFE000 "./blank.bin"'
      ]
    }
  },
  w800: {
    getExcutor: wmToolExcutor,
    getParams: async () => {
      const port = await selectSerialPort()
      return [`-c ${port}`, '-dl ./beanio_w800.fls', '-rs rts']
    }
  },
  w801: {
    getExcutor: wmToolExcutor,
    getParams: async () => {
      const port = await selectSerialPort()
      return [`-c ${port}`, '-dl ./beanio_w801.fls', '-rs rts']
    }
  },
  w600: {
    getExcutor: pythonExcutor,
    getParams: async () => {
      const port = await selectSerialPort()
      return ['./download.py', port, './beanio_w600.fls']
    }
  },
  w601: {
    getExcutor: pythonExcutor,
    getParams: async () => {
      const port = await selectSerialPort()
      return ['./download.py', port, './beanio_w601.fls']
    }
  }
}

module.exports = async () => {
  const term = window.createOutputChannel('BeanIO Flasher')
  term.clear()
  term.show(true)

  try {
    term.appendLine('BeanIO Flasher: Check git')
    await exec.call(term, 'git --version')

    const firmwareDir = path.join(os.homedir(), 'beanio-firmware')
    let firmwareUrl = 'https://github.com/beanjs/beanio-firmware.git'

    if (fs.existsSync(firmwareDir)) {
      term.appendLine('BeanIO Flasher: Pull firmware')
      await exec.call(term, `git pull`, { cwd: firmwareDir })
    } else {
      term.appendLine('BeanIO Flasher: Clone firmware')

      const { data } = await axios.get(ip138Url)

      if (data.indexOf('中国') !== -1) {
        firmwareUrl = 'https://gitee.com/beanjs/beanio-firmware.git'
      }

      await exec.call(term, `git clone ${firmwareUrl}`, { cwd: os.homedir() })
    }

    const chips = fs
      .readdirSync(firmwareDir, { withFileTypes: true })
      .filter(v => v.isDirectory())
      .filter(v => v.name !== '.git' && v.name !== 'linux')
      .map(v => v.name)

    const chip = await window.showQuickPick(chips, { title: 'Select Chip' })
    if (!chip) throw new Error('Chip is undefined')

    const flashOption = flashFactory[chip]
    if (!flashOption) throw new Error('This chip is not supported')

    const params = await flashOption.getParams()
    const excutor = await flashOption.getExcutor({
      cwd: path.join(firmwareDir, chip)
    })

    term.appendLine(`BeanIO Flasher: Firmware ${chip}`)
    await exec.call(term, [excutor, ...params], {
      cwd: path.join(firmwareDir, chip)
    })
  } catch (e) {
    window.showErrorMessage(e.message)
  }
  term.appendLine('BeanIO Flasher: All Done')
}
