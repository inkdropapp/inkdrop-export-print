const remote = require('electron').remote
const path = require('path')
const fs = require('fs')
const exportUtils = require('inkdrop-export-utils')
const dialog = remote.dialog

module.exports = {
  activate () {
    this.subscription = inkdrop.commands.add(document.body, {
      'export-print:export-as-pdf': () => this.exportAsPDF(),
      'export-print:print': () => this.print()
    })
  },

  async exportAsPDF () {
    const { document } = inkdrop.flux.getStore('editor').getState()
    if (document) {
      const pathToSave = dialog.showSaveDialog({
        title: 'Save PDF file',
        defaultPath: `${document.title}.pdf`,
        filters: [
          { name: 'PDF Files', extensions: [ 'pdf' ] },
          { name: 'All Files', extensions: [ '*' ] }
        ]
      })

      if (typeof pathToSave === 'string') {
        const webView = await this.createWebView(document)

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
        this.removeWebView(webView)
      }
    } else {
      inkdrop.notifications.addError('No note opened', { detail: 'Please open a note to export as HTML', dismissable: true })
    }
  },

  async print () {
    const { document } = inkdrop.flux.getStore('editor').getState()
    if (document) {
      const webView = await this.createWebView(document)
      webView.print()
      this.removeWebView(webView)
    } else {
      inkdrop.notifications.addError('No note opened', { detail: 'Please open a note to export as HTML', dismissable: true })
    }
  },

  async createWebView (note) {
    const templateFilePath = path.join(__dirname, 'node_modules', 'inkdrop-export-utils', 'assets', 'template.html')
    const templateHtml = fs.readFileSync(templateFilePath, 'utf-8')

    let markdown = `# ${note.title}\n${note.body}`
    const htmlBody = await exportUtils.renderHTML(markdown)
    const htmlStyles = exportUtils.getStylesheets()
    const outputHtml = templateHtml
      .replace('{%body%}', htmlBody)
      .replace('{%styles%}', htmlStyles)
      .replace('{%title%}', note.title)
    const fn = this.saveHTMLToTmp(outputHtml)
    const webView = document.createElement('webview')
    window.document.body.appendChild(webView)
    global.el = webView
    webView.src = fn
    await new Promise((resolve) => {
      webView.addEventListener('dom-ready', resolve)
    })
    return webView
  },

  removeWebView (webView) {
    setTimeout(() => window.document.body.removeChild(webView), 60 * 1000)
  },

  saveHTMLToTmp (html) {
    const fn = path.join(require('os').tmpdir(), 'inkdrop-export.html')
    fs.writeFileSync(fn, html, 'utf-8')
    return fn
  },

  deactivate () {
    this.subscription.dispose()
  }
}
