const Device = require('./device')
const { SerialPort } = require('serialport')

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

module.exports = SerialDevice
