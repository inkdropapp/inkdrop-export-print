const remote = require('electron').remote
const path = require('path')
const fs = require('fs')
const exportUtils = require('inkdrop-export-utils')
const { dialog } = remote

module.exports = {
  exportAsPDF,
  print
}

async function exportAsPDF() {
  const { editingNote } = inkdrop.store.getState()
  if (editingNote) {
    const pathToSave = dialog.showSaveDialog({
      title: 'Save PDF file',
      defaultPath: `${editingNote.title}.pdf`,
      filters: [
        { name: 'PDF Files', extensions: ['pdf'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (typeof pathToSave === 'string') {
      const webView = await createWebView(editingNote)

      try {
        const opts = {
          pageSize: 'A4',
          printBackground: true
        }
        await new Promise((resolve, reject) => {
          webView.printToPDF(opts, (error, data) => {
            if (error) {
              reject(error)
            }
            fs.writeFileSync(pathToSave, data)
          })
        })
      } catch (e) {
        inkdrop.notifications.addError('Failed to save HTML', e.stack)
      }
      removeWebView(webView)
    }
  } else {
    inkdrop.notifications.addError('No note opened', {
      detail: 'Please open a note to export as HTML',
      dismissable: true
    })
  }
}

async function print() {
  const { editingNote } = inkdrop.store.getState()
  if (editingNote) {
    const webView = await createWebView(editingNote)
    webView.print()
    removeWebView(webView)
  } else {
    inkdrop.notifications.addError('No note opened', {
      detail: 'Please open a note to export as HTML',
      dismissable: true
    })
  }
}

async function createWebView(note) {
  const templateFilePath = require.resolve(
    path.join('inkdrop-export-utils', 'assets', 'print-template.html')
  )
  const templateHtml = fs.readFileSync(templateFilePath, 'utf-8')

  const markdown = `# ${note.title}\n${note.body}`
  const htmlBody = await exportUtils.renderHTML(markdown)
  const htmlStyles = exportUtils.getStylesheets()
  const outputHtml = templateHtml
    .replace('{%body%}', htmlBody)
    .replace('{%styles%}', htmlStyles)
    .replace('{%title%}', note.title)
  const fn = saveHTMLToTmp(outputHtml)
  const webView = document.createElement('webview')
  window.document.body.appendChild(webView)
  global.el = webView
  webView.src = fn
  await new Promise(resolve => {
    webView.addEventListener('dom-ready', resolve)
  })
  return webView
}

function removeWebView(webView) {
  setTimeout(() => window.document.body.removeChild(webView), 30 * 60 * 1000)
}

function saveHTMLToTmp(html) {
  const fn = path.join(require('os').tmpdir(), 'inkdrop-export.html')
  fs.writeFileSync(fn, html, 'utf-8')
  return fn
}
