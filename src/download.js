const { window, ProgressLocation } = require('vscode')
const { transformSync } = require('@babel/core')
const { default: axios } = require('axios')
const path = require('path')
const fs = require('fs')
const esprima = require('esprima')
const esmangle = require('esmangle')
const escodegen = require('escodegen')

function delay () {
  return new Promise(resolve => {
    setTimeout(resolve, 200)
  })
}

function minify (code) {
  const syntax0 = esprima.parse(code, { raw: true, loc: true })
  const syntax1 = esmangle.optimize(syntax0, null, {
    destructive: true,
    directive: true,
    preserveCompletionValue: false,
    legacy: false,
    topLevelContext: false,
    inStrictCode: false
  })

  const miniCode = escodegen.generate(esmangle.mangle(syntax1), {
    format: {
      renumber: true,
      hexadecimal: true,
      escapeless: false,
      indent: { style: '' },
      quotes: 'auto',
      compact: true,
      semicolons: false,
      parentheses: false
    }
  })

  return miniCode
}

function asyncWrite (dev, val) {
  dev.write(val)
  return delay()
}

function parseModules (code) {
  const builtIn = ['Storage', 'heatshrink', 'beanio']

  const modules = code
    .match(/require\('\w+'\)|require\("\w+"\)/g)
    .map(v =>
      v
        .replace(/require\(/g, '')
        .replace(/\)/g, '')
        .replace(/'/g, '')
        .replace(/"/g, '')
    )
    .filter(m => !builtIn.includes(m))

  const mobj = {}
  for (const m of modules) {
    mobj[m] = true
  }

  return Object.keys(mobj)
}

async function downloadCode () {
  const term = window.activeTerminal
  if (!term || term.name.indexOf('BeanIO: ') !== 0) {
    window.showErrorMessage('not beanio terminal')
    return
  }

  const doc = window.activeTextEditor.document
  if (doc.languageId !== 'javascript') {
    return
  }

  const { code } = transformSync(doc.getText(), { comments: false })
  const dirname = path.dirname(doc.fileName)
  const modules = parseModules(code)
  const moduleMiniCode = {}

  try {
    for (const m of modules) {
      const mCode = fs.readFileSync(path.join(dirname, `${m}.js`)).toString()
      moduleMiniCode[m] = minify(mCode)
      // const { code } = transformSync(
      //   fs.readFileSync(path.join(dirname, `${m}.js`)).toString(),
      //   {
      //     comments: false,
      //     // compact: true,
      //     presets: [require('babel-preset-minify')]
      //   }
      // )
      // moduleMiniCode[m] = code
    }
  } catch (e) {
    const err = e || new Error('unknow error')
    window.showErrorMessage(err.message)
    return
  }

  window.withProgress(
    {
      cancellable: false,
      title: 'downloading',
      location: ProgressLocation.Notification
    },
    async pro => {
      const { device } = term
      const blkSize = 48
      let evalCode

      pro.report({ increment: 0, message: 'reset device' })
      await device.request('reset()')
      await asyncWrite(device, '\n')
      await asyncWrite(device, 'echo(0)\n')

      if (modules.length > 0) {
        pro.report({ increment: 0, message: 'erase module' })
        for (const m of modules) {
          evalCode = `require('Storage').erase('${m}')\n`
          await asyncWrite(device, evalCode)
        }

        evalCode = `require('Storage').compact()\n`
        await asyncWrite(device, evalCode)
        pro.report({ increment: 10, message: 'erase done' })

        const proInc = 40 / modules.length
        for (const m of modules) {
          pro.report({ increment: 0, message: m })

          const mCode = moduleMiniCode[m]
          // console.log(mCode)
          const blkLen = parseInt(
            ((mCode.length + (blkSize - 1)) / blkSize).toString()
          )
          for (let i = 0; i < blkLen; i++) {
            const blkCode = mCode
              .substring(blkSize * i, blkSize * (i + 1))
              .replace(/'/g, "\\'")

            evalCode = `require('Storage').write('${m}','${blkCode}',${blkSize *
              i},${mCode.length})\n`
            // console.log(evalCode)
            await asyncWrite(device, evalCode)
            pro.report({
              increment: proInc / blkLen,
              message: m
            })
          }

          pro.report({ increment: 0, message: m })
        }
      } else {
        pro.report({ increment: 50, message: '' })
      }

      const blkLen = parseInt(
        ((code.length + (blkSize - 1)) / blkSize).toString()
      )
      const proInc = 40 / blkLen

      pro.report({ increment: 0, message: 'code' })
      for (let i = 0; i < blkLen; i++) {
        await asyncWrite(device, code.substring(blkSize * i, blkSize * (i + 1)))
        pro.report({ increment: proInc, message: 'code' })
      }

      await asyncWrite(device, 'echo(1)\n')
      pro.report({ increment: 10, message: 'done' })
    }
  )
}

async function installModule () {
  const doc = window.activeTextEditor.document
  if (doc.languageId !== 'javascript') {
    return
  }

  const { code } = transformSync(doc.getText(), { comments: false })
  const dirname = path.dirname(doc.fileName)
  const modules = parseModules(code)

  window.withProgress(
    {
      cancellable: false,
      title: 'install',
      location: ProgressLocation.Notification
    },
    async pro => {
      if (modules.length == 0) {
        pro.report({ increment: 100, message: 'done' })
        return
      }

      const proInc = 90 / modules.length
      for (const m of modules) {
        pro.report({ increment: 0, message: m })
        const data = await axios
          .get(`http://www.beanjs.com/beanio/modules/${m}.js`)
          .then(v => v.data)
          .catch(e => {
            console.log(e)
            return ''
          })

        if (data == '') {
          window.showErrorMessage(`not found ${m} module`)
        } else {
          fs.writeFileSync(path.join(dirname, `${m}.js`), data)
        }
        pro.report({ increment: proInc, message: m })
      }

      pro.report({ increment: 10, message: 'done' })
    }
  )
}

module.exports = {
  downloadCode,
  installModule
}
