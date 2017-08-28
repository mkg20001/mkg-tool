"use strict"

const libp2p = require("libp2p")

const SECIO = require("libp2p-secio")
const MULTIPLEX = require("libp2p-multiplex")
const SPDY = require("libp2p-spdy")

const debug = require('debug')

const log = debug('mkg-tool:node')
log.error = debug('mkg-tool:node:error')

const TCP = require("libp2p-tcp")
const EventEmitter = require('events').EventEmitter

class Railing extends EventEmitter {
  constructor(bootstrapers) {
    super()
    this.bootstrapers = bootstrapers
    this.interval = null
  }

  start(callback) {
    setImmediate(() => callback())
    if (this.interval) {
      return
    }

    const self = this

    function bootFnc() {
      self.bootstrapers.forEach((candidate) => {
        const ma = multiaddr(candidate)

        const peerId = Id.createFromB58String(ma.getPeerId())

        Peer.create(peerId, (err, peerInfo) => {
          if (err) {
            return log.error('Invalid bootstrap peer id', err)
          }

          peerInfo.multiaddrs.add(ma)

          self.emit('peer', peerInfo)
        })
      })
    }

    this.interval = setInterval(bootFnc, 10000)
    setTimeout(bootFnc, 500)
  }

  stop(callback) {
    setImmediate(callback)
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
  }
}

const Peer = require("peer-info")
const Id = require("peer-id")
const multiaddr = require("multiaddr")

module.exports = function mkgNode(conf) {
  const id = conf.id
  const peerInfo = new Peer(id)
  conf.listen.forEach(addr => peerInfo.multiaddrs.add(multiaddr(addr)))

  class Pex extends EventEmitter {
    constructor() {
      super()
    }
    start(cb) {
      if (!this.reg) {
        this.reg = true
        lp2p.on("pex:getall", cb => cb(this.list))
      }
      this.list = []
      this.map = {}
      log("Pex ready")
      lp2p.on("peer:disconnect", peer => {
        const id = peer.id.toB58String()
        log("removing %s from list", id)
        delete this.map[id]
        this.list = Object.keys(this.map).map(key => this.map[key])
      })

      lp2p.on("peer:connect", peer => {
        const id = peer.id.toB58String()
        log("adding %s to list", id)
        this.map[id] = {
          id,
          multiaddr: peer.multiaddrs.toArray().map(addr => addr.toString())
        }
        this.list = Object.keys(this.map).map(key => this.map[key])
        log("pexing %s", id)
        lp2p.cmd(peer, "getPeers", (err, res) => {
          if (err) log.error(err)
          log("pex from %s gave us %s peer(s)", id, res.peers.length)
          res.peers.forEach(peer => {
            try {
              const pi = new Peer(Id.createFromB58String(peer.id))
              peer.multiaddr.forEach(addr => pi.multiaddrs.add(multiaddr(addr)))
              log("pex-dial", peer.id)
              lp2p.dial(pi, () => {})
            } catch (e) {
              log.error(e)
            }
          })
        })
      })

      cb()
    }
    stop(cb) {
      log("Pex offline")
      this.list = null
      this.map = null
      cb()
    }
  }

  const modules = {
    transport: [
      new TCP()
    ],
    connection: {
      muxer: [
        MULTIPLEX,
        SPDY
      ],
      crypto: [SECIO]
    },
    discovery: [
      new Railing(conf.bootstrap),
      new Pex()
    ]
  }

  const lp2p = new libp2p(modules, peerInfo)

  require("./protocol")(lp2p)
  lp2p.logger = console.log.bind(console)

  return lp2p
}
