const pb = require("protocol-buffers")
const ppb = require("pull-protocol-buffers")
const pull = require("pull-stream")

const isAdmin = require("./auth")
const os = require("os")

function createProtobuf(swarm) {
  return (name, def, needAdmin, handler) => {
    if (def.startsWith("INEMPTY")) {
      def = def.replace(/^INEMPTY/, "message In { required bool empty = 1; }")
      def.inempty = true
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
        if (err || !res) return pull(conn, pull.drain(), pull.values([]), conn)
        else handle()
      })
      else handle()
    })
    swarm.msgs[name] = {
      inmsg,
      outmsg,
      def
    }
  }
}

module.exports = function Protocol(swarm) {
  const create = createProtobuf(swarm)
  swarm.msgs = {}
  create("hostname", "INEMPTY message Out { required string hostname = 1; }", false, (data, cb) =>
    cb(null, {
      hostname: os.hostname() //calling the function every time because the hostname might get changed
    }))

  create("isAuthorized", "INEMPTY message Out { required bool success = 1; }", true, (data, cb) => cb(null, {
    success: true
  }))

  create("getPeers", "INEMPTY message Out { message Peer { required string id = 1; repeated string multiaddr = 2; } repeated Peer peers = 1; }", false, (data, cb) => cb(null, {
    peers: [{
      id: "Qm...",
      multiaddr: ["/ip"]
    }]
  }))

  swarm.on("peer:discovery", pi => swarm.dial(pi, () => {}))
}
