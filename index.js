module.exports = {
  activate() {
    this.subscription = inkdrop.commands.add(document.body, {
      'export-print:export-as-pdf': e =>
        require('./exporter').exportAsPDFCommand(e),
      'export-print:print': () => require('./exporter').printCommand()
    })
  },

  deactivate() {
    this.subscription.dispose()
  }
}
