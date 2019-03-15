module.exports = {
  activate() {
    this.subscription = inkdrop.commands.add(document.body, {
      'export-print:export-as-pdf': () => require('./exporter').exportAsPDF(),
      'export-print:print': () => require('./exporter').print()
    })
  },

  deactivate() {
    this.subscription.dispose()
  }
}
