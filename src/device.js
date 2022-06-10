const { EventEmitter } = require('events')
const { SerialPort } = require('serialport')

class Device extends EventEmitter {
  constructor (path) {
    super()

    this.path = path
    this.timeout = 500
    this.pending = ''
    this.timer = null
    this.callback = null

    this.on('chunk', chunk => {
      if (this.callback) {
        if (this.timer) {
          clearTimeout(this.timer)
          this.timer = null
        }

        this.pending += chunk.toString()

        this.timer = setTimeout(() => {
          this.callback(this.pending)
          this.pending = ''
          this.callback = null
          this.timer = null
        }, this.timeout)
      } else {
        this.emit('data', chunk.toString())
      }
    })
  }

  async open () {
    throw new Error('Device.open Not Implementation')
  }

  async close () {
    throw new Error('Device.close Not Implementation')
  }

  async write (c) {
    throw new Error('Device.write Not Implementation')
  }

  request (chunk) {
    return new Promise(resolve => {
      this.pending = ''
      this.callback = resolve

      this.write(chunk)
      this.write('\n')
    })
  }
}

class SerialDevice extends Device {
  constructor (path) {
    super(path)

    this.opened = false
  }

  open () {
    return new Promise((resolve, reject) => {
      this.port = new SerialPort({
        path: this.path,
        baudRate: 115200
      })

      this.port.on('error', reject)

      this.port.on('open', () => {
        this.opened = true
        resolve(this)
      })

      this.port.on('close', () => {
        this.emit('close')
      })

      this.port.on('data', chunk => {
        this.emit('chunk', chunk)
      })
    })
  }

  async close () {
    if (this.opened) {
      this.port.close()
    }
    this.opened = false
  }

  async write (chunk) {
    if (this.opened) {
      this.port.write(chunk)
    }
  }
}

module.exports = {
  Device,
  SerialDevice
}
