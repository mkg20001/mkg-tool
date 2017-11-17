"use strict"

const log = console.log.bind(console)

module.exports = {
  command: "crashsec",
  description: "Watch for disconnects to find misbehaving nodes",
  builder: yargs => yargs,
  handler: () => {
    log("Watching for connects and disconnects...")
    const swarm = global.NODE
    const ma = peer => process.env.FULL_MA ? peer.multiaddrs.toArray().map(a => a.toString()).join(", ") : ""
    swarm.on("peer:connect", peer => log("%s: %s", "CONNECT".blue.bold, peer.id.toB58String(), ma(peer)))
    swarm.on("peer:disconnect", peer => log("%s: %s", "DISCONN".yellow.bold, peer.id.toB58String(), ma(peer)))
    swarm.peerdb.on("join", (host, id) => log("%s   : %s (%s)", "JOIN".green.bold, host, id))
    swarm.peerdb.on("leave", (host, id) => log("%s  : %s (%s)", "LEAVE".red.bold, host, id))
  }
}
