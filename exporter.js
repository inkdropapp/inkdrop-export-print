const remote = require('electron').remote
const path = require('path')
const fs = require('fs')
const exportUtils = require('inkdrop-export-utils')
const { Note } = require('inkdrop').models
const { dialog } = remote

module.exports = {
  exportAsPDFCommand,
  printCommand,
  exportAsPDF,
  print
}

async function exportAsPDFCommand() {
  const { noteListBar, notes } = inkdrop.store.getState()
  const { actionTargetNoteIds } = noteListBar
  if(actionTargetNoteIds && actionTargetNoteIds.length > 1) {
    await exportMultipleNotesAsPDF(actionTargetNoteIds)
    inkdrop.notifications.addInfo('Exporting notes completed', {
      detail: '',
      dismissable: true
    })
  } else if (actionTargetNoteIds.length === 1) {
    const note = await Note.loadWithId(actionTargetNoteIds[0])
    exportAsPDF(note)
  } else {
    inkdrop.notifications.addError('No note opened', {
      detail: 'Please open a note to export as PDF',
      dismissable: true
    })
  }
}

async function printCommand() {
  const { editingNote } = inkdrop.store.getState()
  if (editingNote) {
    await print(editingNote)
  } else {
    inkdrop.notifications.addError('No note opened', {
      detail: 'Please open a note to export',
      dismissable: true
    })
  }
}

async function exportMultipleNotesAsPDF(noteIds) {
  const { notes } = inkdrop.store.getState()
  const { filePaths: res } = await dialog.showOpenDialog(inkdrop.window, {
    title: 'Select Destination Directory',
    properties: ['openDirectory']
  })
  if (res instanceof Array && res.length > 0) {
    const destDir = res[0]

    for (let noteId of noteIds) {
      const note = await Note.loadWithId(noteId)
      if (note) {
        const pathToSave = path.join(destDir, `${note.title}.pdf`)
        await exportAsPDF(note, pathToSave)
      }
    }
  }
}

async function exportAsPDF(note, pathToSave) {
  if (typeof pathToSave === 'undefined') {
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: 'Save PDF file',
      defaultPath: `${note.title}.pdf`,
      filters: [
        { name: 'PDF Files', extensions: ['pdf'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    if (typeof filePath === 'string' && filePath.length > 0) {
      pathToSave = filePath
    } else {
      return
    }
  }

  if (typeof pathToSave === 'string' && pathToSave.length > 0) {
    const webView = await exportUtils.createWebView(note)

    try {
      const opts = {
        pageSize: 'A4',
        printBackground: true
      }
      const data = await webView.printToPDF(opts)
      fs.writeFileSync(pathToSave, data)
    } catch (e) {
      inkdrop.notifications.addError('Failed to save PDF', {
        detail: e.stack,
        dismissable: true
      })
    }
    exportUtils.removeWebView(webView, 1)
  }
}

async function print(note) {
  const webView = await exportUtils.createWebView(note)
  // workaround to avoid crashing on Electron@7
  await webView.executeJavaScript('window.print()')
  exportUtils.removeWebView(webView, 1)
}
