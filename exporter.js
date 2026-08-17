const path = require('path')
const fs = require('fs')
const { exportUtils } = require('inkdrop')
const { Note } = require('inkdrop').models

module.exports = {
  exportAsPDFCommand,
  printCommand,
  exportAsPDF,
  print
}

async function exportAsPDFCommand(env, e) {
  const { noteListBar, editingNote } = env.store.getState()
  const { actionTargetNoteIds } = noteListBar
  const noteIds = e.detail?.noteId ? [e.detail.noteId] : (actionTargetNoteIds.length > 0 ? actionTargetNoteIds : [editingNote?._id])
  if (noteIds && noteIds.length > 1) {
    await exportMultipleNotesAsPDF(env, noteIds)
    env.notifications.addInfo('Exporting notes completed', {
      detail: '',
      dismissable: true
    })
  } else if (noteIds.length === 1) {
    const note = await Note.loadWithId(noteIds[0])
    exportAsPDF(env, note)
  } else {
    env.notifications.addError('No note opened', {
      detail: 'Please open a note to export as PDF',
      dismissable: true
    })
  }
}

async function printCommand(env) {
  const { editingNote } = env.store.getState()
  if (editingNote) {
    await print(editingNote)
  } else {
    env.notifications.addError('No note opened', {
      detail: 'Please open a note to export',
      dismissable: true
    })
  }
}

async function exportMultipleNotesAsPDF(env, noteIds) {
  const { filePaths: res } = await env.dialog.showOpenDialog({
    title: 'Select Destination Directory',
    properties: ['openDirectory']
  })
  if (res instanceof Array && res.length > 0) {
    const destDir = res[0]

    for (let noteId of noteIds) {
      const note = await Note.loadWithId(noteId)
      if (note) {
        const pathToSave = path.join(destDir, `${note.title}.pdf`)
        await exportAsPDF(env, note, pathToSave)
      }
    }
  }
}

async function exportAsPDF(env, note, pathToSave) {
  if (typeof pathToSave === 'undefined') {
    const { filePath, canceled } = await env.dialog.showSaveDialog({
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
      env.notifications.addError('Failed to save PDF', {
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
