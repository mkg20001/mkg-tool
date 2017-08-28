"use strict"

const pb = require("protocol-buffers")
const ppb = require("pull-protocol-buffers")
const pull = require("pull-stream")

const isAdmin = require("./auth")
const os = require("os")

function createProtobuf(swarm) {
  return (name, def, needAdmin, handler) => {
    let empty = false
    if (def.startsWith("INEMPTY")) {
      def = def.replace(/^INEMPTY/, "message In { required bool empty = 1; }")
      empty = true
    }
    const msg = pb(def)
    const inmsg = msg.In //what client sends
    const outmsg = msg.Out //what server sends
    swarm.handle("/mkg/" + name + "/1.0.0", (proto, conn) => {
      const handle = () => {
        pull(
          conn,
          ppb.decode(inmsg),
          pull.asyncMap(handler),
          ppb.encode(outmsg),
          conn
        )
      }
      if (needAdmin) isAdmin(conn, (err, res) => {
        if (err || !res) {
          pull(conn, pull.collect())
          pull(pull.values([]), conn)
          return
        } else handle()
      })
      else handle()
    })
    swarm.msgs[name] = {
      inmsg,
      outmsg,
      def,
      empty
    }
  }
}

module.exports = function Protocol(swarm) {
  const create = swarm.handleProto = createProtobuf(swarm)
  swarm.msgs = {}
  create("hostname", "INEMPTY message Out { required string hostname = 1; }", false, (data, cb) =>
    cb(null, {
      hostname: os.hostname() //calling the function every time because the hostname might get changed
    }))

  create("isAuthorized", "INEMPTY message Out { required bool success = 1; }", true, (data, cb) => cb(null, {
    success: true
  }))

  create("getPeers", "INEMPTY message Out { message Peer { required string id = 1; repeated string multiaddr = 2; } repeated Peer peers = 1; }", false, (data, cb) => cb(null, swarm.emit("pex:getall", peers => cb(null, {
    peers
  }))))

  swarm.cmd = (peer, name, data, cb) => {
    const msg = swarm.msgs[name]
    if (typeof data == "function") {
      cb = data
      data = null
    }
    if (!msg) cb(new Error("Unknown cmd"))
    if (!data) {
      if (!msg.empty) return cb(new Error("No data given"))
      else data = {
        empty: true
      }
    }
    swarm.dial(peer, "/mkg/" + name + "/1.0.0", (err, conn) => {
      if (err) return cb(err)
      const darray = Array.isArray(data)
      pull(
        pull.values(darray ? data.slice(0) : [data]),
        ppb.encode(msg.inmsg),
        pull.collect((err, newdata) => {
          if (err) return cb(err)
          pull(
            pull.values(newdata),
            conn,
            ppb.decode(msg.outmsg),
            pull.collect((err, res) => {
              if (err) return cb(err)
              if (!res.length) return cb(new Error("Error or unauthorized"))
              return cb(null, darray ? res : res[0])
            })
          )
        })
      )
    })
  }

  swarm.isAuthorized = (peer, cb) => {
    swarm.cmd(peer, "isAuthorized", (err, data) => {
      if (err) {
        if (err.toString().startsWith("Error: Error or unauthorized")) return cb(null, false)
        else return cb(err)
      }
      return cb(null, data.success)
    })
  }

  swarm.on("peer:discovery", pi => swarm.dial(pi, () => {}))
}
