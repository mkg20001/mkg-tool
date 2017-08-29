#!/usr/bin/env node

"use strict"

require("colors")
require("console.table")

const node = require(".")
const debug = require("debug")
const yargs = require("yargs")

const log = debug('mkg-tool')
log.error = debug('mkg-tool:error')
log.warn = console.warn.bind(console)

const def = require("./defaults")
const rminmax = (min, max) => Math.floor(Math.random() * (max - min + 1) + min)
const rport = rminmax(10000, 30000)
def.listen = ["/ip4/0.0.0.0/tcp/" + rport, "/ip6/::/tcp/" + rport, "/libp2p-webrtc-star/ip4/148.251.206.162/tcp/4278/ws/"]
def.silent = true

node(def, (err, node) => {
  if (err) throw err
  require("./lib/peerdb")(node)
  require("./lib/network")(node) //testing

  global.NODE = node

  global.ARGS = yargs
    .commandDir('commands')
    .demandCommand(1)
    .fail((msg, err, yargs) => {
      if (err) {
        throw err // preserve stack
      }
      node.stop(() => {})
      yargs.showHelp()
    })
    .argv
})
