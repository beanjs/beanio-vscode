const { EventEmitter } = require('events')

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

module.exports = Device
