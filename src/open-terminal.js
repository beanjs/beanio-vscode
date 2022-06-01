const { window, EventEmitter } = require('vscode')

function terminalName (path) {
  return `BeanIO: ${path}`
}

module.exports = async device => {
  let term = window.terminals.find(t => t.name === terminalName(device.path))

  if (!term) {
    term = await device
      .open()
      .then(dev => {
        const writeEmitter = new EventEmitter()
        const pty = {
          onDidWrite: writeEmitter.event,
          open () {
            dev.write("\n")
          },
          close () {
            dev.close()
          },
          handleInput (chunk) {
            // console.log({ chunk })
            dev.write(chunk)
          }
        }

        term = window.createTerminal({
          name: terminalName(dev.path),
          pty
        })

        dev.on('data', chunk => {
          writeEmitter.fire(chunk)
        })

        dev.on('close', () => {
          term.dispose()
        })

        term.device = dev
        return term
      })
      .catch(e => {
        window.showErrorMessage(e.message)
      })
  }

  if (term) {
    term.show(true)
  }
}
