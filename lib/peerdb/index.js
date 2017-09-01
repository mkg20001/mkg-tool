"use strict"

const jfile = require("jsonfile")
const path = require("path")
const fs = require("fs")
const os = require("os")
const debug = require("debug")
const EventEmitter = require('events').EventEmitter

const log = debug('mkg-tool:peerdb')
log.error = debug('mkg-tool:peerdb:error')
log.warn = console.warn.bind(console)

module.exports = function PeerDB(swarm) {
  const pfile = path.join(swarm.dir, "peers.json")
  const ee = new EventEmitter()

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

  const online = {}

  swarm.on("peer:connect", peer => {
    const id = peer.id.toB58String()
    online[id] = peer
    swarm.cmd(peer, "hostname", (err, res) => {
      if (err) return
      if (!res) return
      const name = res.hostname
      const realid = peerdb.hostnameToId(name)
      log("%s has hostname %s (db %s)", id, name, peerdb.idToHostname(id))
      if (realid != id && realid) {
        log.warn("@@@ WARNING: DIFFERENT REMOTE HOST IDENTIFICATION! %s IS CLAIMING %s WHICH BELONGS TO %s! @@@", id, name, realid)
        return //do not perform any "is online" emit
      } else if (!realid) {
        log("assign %s to %s", name, id)
        peerdb.map(id, name)
      }
      ee.emit("hostname." + name, null, peer)
      ee.emit("id." + id, null, peer)
    })
  })

  swarm.on("peer:disconnect", peer => {
    const id = peer.id.toB58String()
    delete online[id]
  })

  swarm.peerdb = peerdb

  swarm.waitForHost = (name, cb) => {
    let id
    if ((id = peerdb.hostnameToId(name))) {
      if (online[id]) {
        cb(null, online[id])
      } else {
        console.log("Waiting for host %s (id %s)...", name, peerdb.hostnameToId(name))
        ee.once("id." + peerdb.hostnameToId(name), cb)
      }
    } else {
      console.log("Waiting for host %s...", name)
      ee.once("hostname." + name, cb)
    }
  }
}
