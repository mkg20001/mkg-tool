#!/usr/bin/env node

'use strict'

const Raven = require('raven')
Raven.config('https://80aa59f734b646e98a8d981528f99303:995f8b0f17284bdaaa1f9ebf9b523c76@sentry.io/277019').install()

const node = require('.')

node(require('./defaults'), (err, node) => {
  if (err) throw err
  require('./lib/network')(node)
})
