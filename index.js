module.exports = {
  activate() {
    this.subscription = inkdrop.commands.add(document.body, {
      'export-print:export-as-pdf': () => require('./exporter').exportAsPDFCommand(),
      'export-print:print': () => require('./exporter').printCommand()
    })
  },

  deactivate() {
    this.subscription.dispose()
  }
}
