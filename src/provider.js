const { TreeItem, TreeItemCollapsibleState, EventEmitter } = require('vscode')
const { SerialPort } = require('serialport')
const { SerialDevice } = require('./device')

class Provider {
  constructor () {
    this.terminals = []
    this._onDidChangeTreeData = new EventEmitter()
  }

  get onDidChangeTreeData () {
    return this._onDidChangeTreeData.event
  }

  refresh () {
    this._onDidChangeTreeData.fire()
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
        console.log({ ports })
        return ports.filter(p => p.vendorId)
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
