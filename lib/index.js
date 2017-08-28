"use strict"

const libp2p = require("libp2p")

const SECIO = require("libp2p-secio")
const MULTIPLEX = require("libp2p-multiplex")
const SPDY = require("libp2p-spdy")

const debug = require('debug')

const log = debug('mkg-tool:node')
log.error = debug('mkg-tool:node:error')

const TCP = require("libp2p-tcp")
const Railing = require("libp2p-railing")

const Peer = require("peer-info")
const multiaddr = require("multiaddr")
const EventEmitter = require('events').EventEmitter

module.exports = function mkgNode(conf) {
  const id = conf.id
  const peerInfo = new Peer(id)
  conf.listen.forEach(addr => peerInfo.multiaddrs.add(multiaddr(addr)))

  class Pex extends EventEmitter {
    constructor() {
      super()
    }
    start(cb) {
      log("Pex ready")
      cb()
    }
    stop(cb) {
      log("Pex offline")
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
