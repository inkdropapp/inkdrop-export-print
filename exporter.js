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
    const { filePath: pathToSave, canceled } = await dialog.showSaveDialog({
      title: 'Save PDF file',
      defaultPath: `${editingNote.title}.pdf`,
      filters: [
        { name: 'PDF Files', extensions: ['pdf'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (typeof pathToSave === 'string') {
      const webView = await exportUtils.createWebView(editingNote)

      try {
        const opts = {
          pageSize: 'A4',
          printBackground: true
        }
        const data = await webView.printToPDF(opts)
        fs.writeFileSync(pathToSave, data)
      } catch (e) {
        inkdrop.notifications.addError('Failed to save HTML', e.stack)
      }
      exportUtils.removeWebView(webView)
    }
  } else if (!canceled) {
    inkdrop.notifications.addError('No note opened', {
      detail: 'Please open a note to export as HTML',
      dismissable: true
    })
  }
}

async function print() {
  const { editingNote } = inkdrop.store.getState()
  if (editingNote) {
    const webView = await exportUtils.createWebView(editingNote)
    // workaround to avoid crashing on Electron@7
    webView.executeJavaScript('window.print()')
    exportUtils.removeWebView(webView)
  } else {
    inkdrop.notifications.addError('No note opened', {
      detail: 'Please open a note to export as HTML',
      dismissable: true
    })
  }
}
