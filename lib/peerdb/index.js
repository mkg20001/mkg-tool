"use strict"

const jsonfile = require("json-file")
const path = require("path")
const fs = require("fs")
const os = require("os")
const debug = require("debug")

const log = debug('mkg-tool:peerdb')
log.error = debug('mkg-tool:peerdb:error')
log.warn = console.warn.bind(console)

module.exports = function PeerDB(swarm) {
  const pfile = path.join(swarm.dir, "peers.json")

  //The simplest yet fastest db (for our purposes): a json file
  const peerdb = new jsonfile.File(pfile)
  if (!fs.existsSync(pfile)) fs.writeFileSync(pfile, "{}")
  peerdb.readSync()

  peerdb.getSafe = id => {
    try {
      return peerdb.get(id)
    } catch (e) {
      log.error(e)
      return false
    }
  }
  peerdb.setSafe = (id, data) => {
    try {
      return peerdb.set(id, data)
    } catch (e) {
      log.error("set error", e)
      return false
    }
  }
  if (!peerdb.getSafe("ids")) peerdb.set("ids", {})
  if (!peerdb.getSafe("hosts")) peerdb.set("hosts", {})
  peerdb.idToHostname = (id) => peerdb.getSafe("ids." + id + ".name")
  peerdb.hostnameToId = (host) => peerdb.getSafe("hosts." + host + ".id")
  peerdb.map = (id, name) => {
    peerdb.setSafe("hosts." + name, {
      id
    })
    peerdb.setSafe("ids." + id, {
      name
    })
    peerdb.writeSync()
    log("db written")
  }

  peerdb.map(swarm.ownid, os.hostname())

  swarm.on("peer:connect", peer => {
    const id = peer.id.toB58String()
    swarm.cmd(peer, "hostname", (err, res) => {
      if (err) return
      const name = res.hostname
      const realid = peerdb.hostnameToId(id)
      if (realid != id && realid) {
        log.warn("@@@ WARN: %s is spoofing name %s which belongs to %s @@@", id, name, realid)
      } else if (!realid) {
        log("Map %s to %s", id, name)
        peerdb.setSafe(id, name)
      }
      log("%s has hostname %s", id, name)
      log("db:", peerdb.idToHostname(id))
    })
  })
}
