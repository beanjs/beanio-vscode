// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode')
const DeviceProvider = require('./src/provider')
const { downloadCode, installModule } = require('./src/download')

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate (context) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  // console.log('Congratulations, your extension "beanio-vscode" is now active!')
  // const { autoDetect } = require('@serialport/bindings-cpp')
  // const SerialPort = autoDetect()
  // const { SerialPort } = require('serialport')
  // SerialPort.list().then(infos => {
  //   console.log(infos)
  // })
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json
  // let disposable = vscode.commands.registerCommand(
  //   'beanio-vscode.helloWorld',
  //   function () {
  //     // The code you place here will be executed every time your command is executed
  //     // Display a message box to the user
  //     vscode.window.showInformationMessage('Hello World from beanio!')
  //   }
  // )
  // context.subscriptions.push(disposable)
  const deviceProvider = new DeviceProvider()

  vscode.window.registerTreeDataProvider('beanio', deviceProvider)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'beanio.open-terminal',
      require('./src/terminal')
    )
  )
  context.subscriptions.push(
    vscode.commands.registerCommand('beanio.download-code', downloadCode)
  )
  context.subscriptions.push(
    vscode.commands.registerCommand('beanio.install-module', installModule)
  )
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'beanio.flash-firmware',
      require('./src/flasher')
    )
  )
  context.subscriptions.push(
    vscode.commands.registerCommand('beanio.reload-device', () => {
      deviceProvider.refresh()
    })
  )
}

// this method is called when your extension is deactivated
function deactivate () {}

module.exports = {
  activate,
  deactivate
}
