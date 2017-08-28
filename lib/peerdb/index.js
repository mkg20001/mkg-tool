"use strict"

const jfile = require("jsonfile")
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
  if (!fs.existsSync(pfile)) fs.writeFileSync(pfile, "{}")
  const peerdb = jfile.readFileSync(pfile);
  ["ids", "hosts"].forEach(k => peerdb[k] || (peerdb[k] = {}))
  peerdb.idToHostname = (id) => peerdb.ids[id] ? peerdb.ids[id].name : false
  peerdb.hostnameToId = (host) => peerdb.hosts[host] ? peerdb.hosts[host].id : false
  peerdb.writeSync = () => {
    jfile.writeFileSync(pfile, peerdb)
    log("db written")
  }
  peerdb.map = (id, name) => {
    peerdb.hosts[name] = {
      id
    }
    peerdb.ids[id] = {
      name
    }
    peerdb.writeSync()
  }

  peerdb.map(swarm.ownid, os.hostname())

  swarm.on("peer:connect", peer => {
    const id = peer.id.toB58String()
    swarm.cmd(peer, "hostname", (err, res) => {
      if (err) return
      const name = res.hostname
      const realid = peerdb.hostnameToId(name)
      log("%s has hostname %s (db %s)", id, name, peerdb.idToHostname(id))
      if (realid != id && realid) {
        log.warn("@@@ WARN: %s is spoofing name %s which belongs to %s @@@", id, name, realid)
      } else if (!realid) {
        log("assign %s to %s", name, id)
        peerdb.map(id, name)
      }
    })
  })

  swarm.peerdb = peerdb
}
