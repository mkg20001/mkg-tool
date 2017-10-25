"use strict"

const MNode = require("./lib")

const Id = require("peer-id")
const fs = require("fs")
const jfile = require("jsonfile")
const os = require("os")
const path = require("path")
const mkdirp = require("mkdirp")
const debug = require("debug")

const defaults = {}

const clone = require("clone")
const merge = require("merge-recursive").recursive

function getHome() {
  const isroot = !process.getuid()
  if (process.env.SNAP) {
    if (isroot)
      return process.env.SNAP_COMMON
    else
      return process.env.SNAP_USER_COMMON
  } else {
    if (isroot)
      return "/usr/lib/mkg-tool"
    else
      return os.homedir()
  }
}

module.exports = function mkgNode(conf, cb) {
  if (!conf.bootstrap) throw new Error("No bootstrap peers")
  if (!conf.listen) conf.listen = module.exports.listen
  const logger = conf.silent ? debug("mkg-tool") : console.log.bind(console)

  const confpath = path.join(getHome(), ".mkg", "config.json")
  const liftoff = (id, userconf) => {
    logger("Starting node...")
    delete userconf.id
    conf = merge(conf, userconf)
    conf.id = id
    const node = MNode(conf)
    node.dir = path.join(getHome(), ".mkg")
    node.ownid = id.toB58String()

    function onExit() {
      node.stop(err => {
        if (err) console.error(err)
        process.exit(err ? 2 : 0)
      })
    }

    node.start(err => {
      if (err) return cb(err)
      process.on("SIGTERM", onExit)
      process.on("SIGINT", onExit)
      logger("Ready")
      return cb(null, node)
    })
  }

  if (!fs.existsSync(confpath)) {
    logger("Generating 4K RSA key...")
    Id.create({
      bits: 4096
    }, (err, id) => {
      if (err) return cb(err)
      logger("Init config...")
      let c = clone(defaults)
      c.id = id
      mkdirp.sync(path.dirname(confpath))
      jfile.writeFileSync(confpath, c)
      liftoff(id, c)
    })
  } else {
    logger("Read config...")
    const c = jfile.readFileSync(confpath)
    Id.createFromJSON(c.id, (err, id) => {
      if (err) return cb(err)
      return liftoff(id, c)
    })
  }
}

module.exports.listen = ["/ip4/0.0.0.0/tcp/5235", "/ip6/::/tcp/5235", "/ip4/148.251.206.162/tcp/4278/ws/p2p-websocket-star/", "/dns4/ws-star-signal-1.servep2p.com/wss/p2p-websocket-star/", "/dns/ws-star-signal-2.servep2p.com/wss/p2p-websocket-star/", "/dns4/ws-star-signal-3.servep2p.com/wss/p2p-websocket-star/", "/dns4/localhost/ws/p2p-websocket-star/"]
