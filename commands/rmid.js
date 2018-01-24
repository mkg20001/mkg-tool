'use strict'

const log = console.log.bind(console)

module.exports = {
  command: 'rmid <id>',
  describe: 'Removes an id from the list',
  builder: {
    id: {
      type: 'string',
      description: 'Id to remove',
      required: true
    }
  },
  handler: (argv) => {
    global.NODE.peerdb.rmId(argv.id)
    global.NODE.stop(() => {})
  }
}
