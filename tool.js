#!/usr/bin/env node

"use strict"

const node = require(".")
const debug = require("debug")

const log = debug('mkg-tool:')
log.error = debug('mkg-tool:error')
log.warn = console.warn.bind(console)

const def = require("./defaults")
const rminmax = (min, max) => Math.floor(Math.random() * (max - min + 1) + min)
const rport = rminmax(10000, 30000)
def.listen = ["/ip4/0.0.0.0/tcp/" + rport, "/ip6/::/tcp/" + rport]

node(def, (err, node) => {
  if (err) throw err
  require("./lib/peerdb")(node)
})
