const { window, ProgressLocation } = require('vscode')
const { transformSync } = require('@babel/core')

function delay () {
  return new Promise(resolve => {
    setTimeout(resolve, 100)
  })
}

function asyncWrite (dev, val) {
  dev.write(val)
  return delay()
}

module.exports = async (opts) => {
  const term = window.activeTerminal
  if (!term || term.name.indexOf('BeanIO: ') !== 0) {
    window.showErrorMessage('not beanio terminal')
    return
  }

  const doc = window.activeTextEditor.document
  if (doc.languageId !== 'javascript') {
    return
  }

  const { code } = transformSync(doc.getText(),opts)

  window.withProgress(
    {
      cancellable: false,
      title: 'downloading',
      location: ProgressLocation.Notification
    },
    async pro => {
      const { device } = term

      pro.report({ increment: 0, message: 'reset device' })
      await device.request('reset()')
      await asyncWrite(device, '\n')
      pro.report({ increment: 10, message: 'transmission code' })

      const blkSize = 32
      const codLen = code.length
      const blkLen = parseInt(((codLen + (blkSize - 1)) / blkSize).toString())
      const proInc = 90 / blkLen

      await asyncWrite(device, '\n')
      await asyncWrite(device, 'echo(0)\n')
      for (let i = 0; i < blkLen; i++) {
        await asyncWrite(device, code.substring(blkSize * i, blkSize * (i + 1)))
        pro.report({ increment: proInc, message: 'transmission code' })
      }
      await asyncWrite(device, 'echo(1)\n')
    }
  )
}
