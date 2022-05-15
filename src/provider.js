const { TreeItem, TreeItemCollapsibleState } = require('vscode')
const { SerialPort } = require('serialport')
const SerialDevice = require('./serial-device')

class Provider {
  constructor () {
    this.terminals = []
  }

  getTreeItem (item) {
    return item
  }

  async getChildren (item) {
    const childs = []

    if (!item) {
      childs.push(new TreeItem('DEVICES', TreeItemCollapsibleState.Collapsed))
    } else if (item.label == 'DEVICES') {
      const serialports = await SerialPort.list().then(ports => {
        return ports.filter(p => p.serialNumber)
      })

      for (const port of serialports) {
        const dev = new TreeItem(port.path, TreeItemCollapsibleState.None)
        dev.command = {
          command: 'beanio.open-terminal',
          title: 'Open Terminal',
          arguments: [new SerialDevice(port.path)]
        }
        childs.push(dev)
      }
    }

    return childs
  }

  // async open (dev) {
  //   let term = this.terminals.find(t => t.device.path == dev.path)

  //   if (!term) {
  //     term = new Terminal(dev)
  //     term.on('open', term => {
  //       this.terminals.push(term)
  //     })

  //     term.on('close', term => {
  //       this.terminals = this.terminals.filter(trm => {
  //         return trm.device.path !== term.device.path
  //       })
  //     })
  //   }

  //   term.show()
  // }
}

module.exports = Provider
