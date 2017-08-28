"use strict"

const isAdmin = require("../protocol/auth")
const pull = require("pull-stream")
const multiaddr = require("multiaddr")

const TCP = require("libp2p-tcp")
const uuid = require("uuid")
const once = require("once")

module.exports = function NetworkProtocol(swarm) {

  const net = new TCP()

  function oneTimeListener(proto, handle, match) {
    swarm.swarm.protocols[proto] = {
      matchFunc: match,
      handlerFunc: (pr, conn) => {
        isAdmin(conn, (err, res) => {
          if (err || !res) {
            pull(conn, pull.collect())
            pull(pull.values([]), conn)
            return
          } else {
            delete swarm.swarm.protocols[proto]
            handle(pr, conn)
          }
        })
      }
    }
  }

  swarm.handleProto("networkPipe", "message In { required string ma = 1; } message Out { required bool success = 1; string token = 1; }", true, (data, cb) => {
    net.dial(multiaddr(data.ma), (err, conn) => {
      if (err) {
        return cb(null, {
          success: false
        })
      } else {
        const token = uuid()
        oneTimeListener(token, (proto, conn_) => {
          pull(
            conn_,
            conn
          )
          pull(
            conn,
            conn_
          )
        })
        return cb(null, {
          success: true,
          token
        })
      }
    })
  })

  swarm.networkCall = (peer, ma, cb) => {
    swarm.cmd("networkPipe", {
      ma
    }, (err, data) => {
      if (err) return cb(err)
      if (!data.success) return cb(new Error("Dialing failed"))
      swarm.dial(peer, data.token, (err, conn) => {
        if (err) return cb(err)
        return cb(null, conn)
      })
    })
  }

  swarm.networkServer = (peer, listenma, dialma, cb) => {
    const done = once(cb)
    const listener = net.createListener(conn => {
      conn.id = uuid()
      console.log("New conn %s", conn.id)
      console.log("Circuiting %s to %s", conn.id, dialma.toString())
      swarm.networkCall(peer, dialma.toString(), (err, conn_) => {
        if (err) {
          console.log("Circuiting %s was unsuccessful: %s", conn.id, err.toString().split("\n")[0])
          pull(conn, pull.collect())
          pull(pull.values([]), conn)
          return
        }
        pull(
          conn_,
          conn
        )
        pull(
          conn,
          conn_
        )
      })
    })
    listener.once('error', done)

    listener.listen(listenma, (err) => {
      if (err) {
        return done(err)
      }
      console.log("Listening on %s", listenma)
      listener.removeListener('error', done)
      done()
    })

  }

}
