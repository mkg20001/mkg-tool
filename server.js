#!/usr/bin/env node

'use strict'

const node = require('.')

node(require('./defaults'), (err, node) => {
  if (err) throw err
  require('./lib/network')(node)
})
