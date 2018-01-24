#!/usr/bin/env node

'use strict'

require('colors')
require('console.table')

const node = require('.')
const debug = require('debug')
const yargs = require('yargs')

const raven = require('raven')
Raven.config('https://80aa59f734b646e98a8d981528f99303:995f8b0f17284bdaaa1f9ebf9b523c76@sentry.io/277019').install()

const log = debug('mkg-tool')
log.error = debug('mkg-tool:error')
log.warn = console.warn.bind(console)

const def = require('./defaults')
const rminmax = (min, max) => Math.floor(Math.random() * (max - min + 1) + min)
const rport = rminmax(10000, 30000)
def.listen = ['/ip4/0.0.0.0/tcp/' + rport, '/ip6/::/tcp/' + rport].concat(node.listen.slice(2))
def.silent = true

node(def, (err, node) => {
  if (err) throw err
  require('./lib/peerdb')(node)
  require('./lib/network')(node) // testing

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
