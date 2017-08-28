"use strict"

const multiaddr = require("multiaddr")
const cp = require("child_process")

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
  command: "ssh <hostname> [user]",
  describe: "Forwards the ssh port to localhost and executes ssh",
  builder: {
    hostname: {
      type: "string"
    },
    sshaddr: {
      alias: "p",
      type: "string",
      description: "Can be port or ip:port. Default localhost:22",
      default: "127.0.0.1:22"
    },
    user: {
      alias: "u",
      type: "string",
      description: "The user to ssh as",
      default: require("os").userInfo().username
    }
  },
  handler: (argv) => {
    const map = {
      local: toHostPortSafe(0),
      remote: toHostPortSafe(argv.sshaddr)
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
        swarm.networkServer(peer, toMa(map.local), toMa(map.remote), (err, listener, addrs) => {
          if (err) throw err
          const port = addrs[0].toOptions().port
          let a = []
          a.push(argv.user + "@localhost", "-p", port)
          a.push.apply(a, "-o StrictHostKeyChecking=no -o GlobalKnownHostsFile=/dev/null -o UserKnownHostsFile=/dev/null".split(" "))
          a.push.apply(a, argv._.slice(1))
          const p = cp.spawn("ssh", a, {
            stdio: "inherit"
          })
          p.on("exit", (e, s) => {
            listener.close(() => {
              process.exit(s ? 2 : e)
            })
          })
        })
      })
    })
  }
}
