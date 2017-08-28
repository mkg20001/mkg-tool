const multiaddr = require("multiaddr")

function toHostPort(addr) {
  if (typeof addr == "number") {
    return {
      host: "127.0.0.1",
      port: addr
    }
  }
  if (typeof addr == "string") {
    if (addr.indexOf(":") != -1) {
      const s = addr.split(":")
      return {
        host: s[0],
        port: parseInt(s[1], 10)
      }
    } else {
      return {
        host: "127.0.0.1",
        port: parseInt(addr, 10)
      }
    }
  }
}

function toHostPortSafe(addr) {
  const s = toHostPort(addr)
  if (isNaN(s.port)) throw new Error("Host:Port has NaN port")
  return s
}

function toMa(addrpair) {
  return multiaddr("/ip4/" + addrpair.host + "/tcp/" + addrpair.port)
}

module.exports = {
  command: "forward <hostname> <addr> <localaddr>",
  describe: "Forward a port from a host to a local address",
  builder: {
    hostname: {
      type: "string"
    },
    addr: {
      type: "string",
      description: "Can be port or ip:port. Default host=localhost"
    },
    localaddr: {
      type: "string",
      description: "Can be port or ip:port. Default host=localhost. Default port=0",
      default: "127.0.0.1:0"
    }
  },
  handler: (argv) => {
    const map = {
      local: toHostPortSafe(argv.localaddr),
      remote: toHostPortSafe(argv.addr)
    }
    console.log("Forwarding %s to %s...", toMa(map.remote).toString(), toMa(map.local).toString())
    const swarm = global.NODE
    const host = argv.hostname
    swarm.waitForHost(host, (err, peer) => {
      if (err) throw err
      console.log("Checking authorization...")
      swarm.isAuthorized(peer, (err, res) => {
        if (err) throw err
        if (!res) {
          console.error("Unauthorized")
          process.exit(2)
        }
        swarm.networkCall(peer, toMa(map.local), toMa(map.remote), err => {
          throw err
        })
      })
    })
  }
}
