module.exports = {
  activate(env) {
    this.subscription = env.commands.add(document.body, {
      'export-print:export-as-pdf': e =>
        require('./exporter').exportAsPDFCommand(env, e),
      'export-print:print': () => require('./exporter').printCommand(env)
    })
  },

  deactivate() {
    this.subscription.dispose()
  }
}
