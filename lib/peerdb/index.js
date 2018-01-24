'use strict'

const jfile = require('jsonfile')
const path = require('path')
const fs = require('fs')
const os = require('os')
const debug = require('debug')
const EventEmitter = require('events').EventEmitter
const multiaddr = require('multiaddr')
const Id = require('peer-id')
const Peer = require('peer-info')
const once = require('once')
const tables = ['ids', 'hosts', 'pi']

const log = debug('mkg-tool:peerdb')
log.error = debug('mkg-tool:peerdb:error')
log.warn = console.warn.bind(console)

module.exports = function PeerDB (swarm) {
  const pfile = path.join(swarm.dir, 'peers.json')
  const ee = new EventEmitter()

  // The simplest yet fastest db (for our purposes): a json file
  if (!fs.existsSync(pfile)) fs.writeFileSync(pfile, '{}')
  const peerdb = jfile.readFileSync(pfile)
  peerdb.on = ee.on.bind(ee)
  peerdb.once = ee.once.bind(ee)
  tables.forEach(k => peerdb[k] || (peerdb[k] = {}))
  peerdb.idToHostname = (id) => peerdb.ids[id] ? peerdb.ids[id].name : false
  peerdb.hostnameToId = (host) => peerdb.hosts[host] ? peerdb.hosts[host].id : false
  peerdb.piSave = (pi) => {
    peerdb.pi[pi.id.toB58String()] = pi.multiaddrs.toArray().map(a => a.toString())
    peerdb.writeSync()
  }
  peerdb.piLoad = (id) => {
    const addr = peerdb.pi[id] || []
    const pi = new Peer(Id.createFromB58String(id))
    addr.forEach(addr => pi.multiaddrs.add(addr))
    return pi
  }
  peerdb.writeSync = () => {
    jfile.writeFileSync(pfile, peerdb)
    log('db written')
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
  peerdb.rmId = (id) => {
    tables.forEach(key => delete peerdb[key][id])
    peerdb.writeSync()
  }

  peerdb.map(swarm.ownid, os.hostname())

  const online = {}

  swarm.on('peer:connect', peer => {
    const id = peer.id.toB58String()
    online[id] = peer
    swarm.cmd(peer, 'hostname', (err, res) => {
      if (err) return
      if (!res) return
      swarm.emit('peer:supported', peer)
      const name = res.hostname
      const realid = peerdb.hostnameToId(name)
      log('%s has hostname %s (db %s)', id, name, peerdb.idToHostname(id))
      if (realid != id && realid) {
        log.warn('@@@ WARNING: DIFFERENT REMOTE HOST IDENTIFICATION! %s IS CLAIMING %s WHICH BELONGS TO %s! @@@', id, name, realid)
        return // do not perform any "is online" emit
      } else if (!realid) {
        log('assign %s to %s', name, id)
        peerdb.map(id, name)
      }
      ee.emit('hostname.' + name, null, peer)
      ee.emit('id.' + id, null, peer)
      ee.emit('join', name, id, peer)
      peer.isOk = true
      peer.hostname = name
      peerdb.piSave(peer)
      swarm.emit('peer:valid', peer)
    })
  })

  swarm.on('peer:disconnect', peer => {
    const id = peer.id.toB58String()
    delete online[id]
    if (!peer.isOk) return
    ee.emit('d.hostname.' + peer.hostname, peer)
    ee.emit('d.id.' + peer.id.toB58String(), peer)
    ee.emit('leave', peer.hostname, peer.id.toB58String(), peer)
  })

  swarm.peerdb = peerdb

  swarm.waitForHost = (name, cb) => {
    let id
    const cb_ = once(cb)
    let intv
    cb = (...args) => {
      if (intv) {
        clearInterval(intv)
        intv = 0
      }
      cb_(...args)
    }
    if ((id = peerdb.hostnameToId(name))) {
      if (online[id]) {
        cb(null, online[id])
      } else {
        const pid = peerdb.hostnameToId(name)
        console.log('Waiting for host %s (id %s)...', name, pid)
        const dial = () => {
          swarm.dial(multiaddr('/p2p-circuit/ipfs/' + pid), () => {})
          swarm.dial(peerdb.piLoad(pid), () => {})
        }
        intv = setInterval(dial, 1000)
        ee.once('id.' + pid, cb)
        ee.once('hostname.' + name, cb)
      }
    } else {
      console.log('Waiting for host %s...', name)
      ee.once('hostname.' + name, cb)
    }
  }
}
