"use strict"

const log = console.log.bind(console)

module.exports = {
  command: "list",
  description: "Lists all peers and information about them in a table",
  builder: yargs => yargs,
  handler: () => {
    log("Waiting 5s for all peers to connect...")
    const swarm = global.NODE
    const peerdb = swarm.peerdb
    let online = {}
    swarm.on("peer:connect", peer => {
      const id = peer.id.toB58String()
      online[id] = true
    })
    setTimeout(() => {
      console.log("Creating table")
      swarm.stop(() => {})
      let table = []
      let pids = {}
      let id
      for (id in peerdb.ids)
        pids[id] = true
      for (id in online)
        pids[id] = true
      for (id in pids) {
        const name = peerdb.idToHostname(id)
        const rid = peerdb.hostnameToId(name)
        let hostname
        if (rid == id) hostname = name
        else hostname = name + " (@@@ SPOFED @@)"
        table.push({
          id,
          hostname,
          online: online[id]
        })
      }
      console.table(table)
    }, 5 * 1000)
  }
}
