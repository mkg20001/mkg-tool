'use strict'

const libp2p = require('libp2p')

const SECIO = require('libp2p-secio')
const MULTIPLEX = require('libp2p-multiplex')
const SPDY = require('libp2p-spdy')

const debug = require('debug')

const log = debug('mkg-tool:node')
log.error = debug('mkg-tool:node:error')

const TCP = require('libp2p-tcp')
const EventEmitter = require('events').EventEmitter
const MDNS = require('libp2p-mdns')
const WSStarMulti = require('libp2p-websocket-star-multi')

class Railing extends EventEmitter {
  constructor (bootstrapers) {
    super()
    this.bootstrapers = bootstrapers
    this.interval = null
  }

  start (callback) {
    setImmediate(() => callback())
    if (this.interval) {
      return
    }

    const self = this

    function bootFnc () {
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
    this.timeout = setTimeout(bootFnc, 500)
  }

  stop (callback) {
    setImmediate(callback)
    if (this.interval) {
      clearInterval(this.interval)
      clearTimeout(this.timeout)
      this.interval = null
      this.timeout = null
    }
  }
}

const Peer = require('peer-info')
const Id = require('peer-id')
const multiaddr = require('multiaddr')

module.exports = function mkgNode (conf) {
  const id = conf.id
  const peerInfo = new Peer(id)
  const wserv = conf.listen.filter(addr => addr.indexOf('p2p-websocket-star') != -1)
  conf.listen.filter(addr => addr.indexOf('p2p-websocket-star') == -1).concat(wserv.length ? ['/p2p-websocket-star'] : []).forEach(addr => peerInfo.multiaddrs.add(multiaddr(addr)))

  class Pex extends EventEmitter {
    constructor () {
      super()
    }
    start (cb) {
      if (!this.reg) {
        this.reg = true
        lp2p.on('pex:getall', cb => cb(this.list))

        lp2p.on('peer:disconnect', peer => {
          if (!this.map) return
          const id = peer.id.toB58String()
          log('removing %s from list', id)
          delete this.map[id]
          this.list = Object.keys(this.map).map(key => this.map[key])
        })

        lp2p.on('peer:connect', peer => {
          if (!this.map) return
          const id = peer.id.toB58String()
          if (id == lp2p.ownid) return
          log('adding %s to list', id)
          this.map[id] = {
            id,
            multiaddr: peer.multiaddrs.toArray().map(addr => addr.toString())
          }
          this.list = Object.keys(this.map).map(key => this.map[key])
          log('pexing %s', id)
          lp2p.cmd(peer, 'getPeers', (err, res) => {
            if (err) log.error(err)
            if (!res) return
            if (!res.peers) return
            if (!Array.isArray(res.peers)) return
            log('pex from %s gave us %s peer(s)', id, res.peers.length)
            res.peers.forEach(peer => {
              try {
                if (peer.id == lp2p.ownid && !process.env.DIAL_SELF) return
                const pi = new Peer(Id.createFromB58String(peer.id))
                peer.multiaddr.filter(addr => addr.indexOf('libp2p-web') == -1).forEach(addr => pi.multiaddrs.add(multiaddr(addr)))
                log('pex-dial', peer.id)
                lp2p.dial(pi, () => {})
              } catch (e) {
                log.error(e)
              }
            })
          })
        })
      }
      this.list = []
      this.map = {}
      log('Pex ready')

      cb()
    }
    stop (cb) {
      log('Pex offline')
      this.list = null
      this.map = null
      setTimeout(() => process.exit(0), 1000).unref()
      cb()
    }
  }

  const wstar = new WSStarMulti({
    id,
    ignore_no_online: true,
    servers: wserv
  })

  const modules = {
    transport: [
      new TCP(),
      wstar
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
      new Pex(),
      wstar.discovery,
      new MDNS(peerInfo, 'mkg-tool')
    ]
  }

  const options = {
    relay: {
      enabled: true,
      hop: {
        enabled: true,
        active: false // passive relay
      }
    }
  }

  const lp2p = new libp2p(modules, peerInfo, null, options)

  require('./protocol')(lp2p)
  lp2p.logger = console.log.bind(console)

  return lp2p
}
