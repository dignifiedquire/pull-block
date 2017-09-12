'use strict'

var through = require('pull-through')
var Buffer = require('safe-buffer').Buffer

module.exports = function block (size, opts) {
  if (!opts) opts = {}
  if (typeof size === 'object') {
    opts = size
    size = opts.size
  }
  size = size || 512

  var zeroPadding

  if (opts.nopad) {
    zeroPadding = false
  } else {
    zeroPadding = typeof opts.zeroPadding !== 'undefined' ? opts.zeroPadding : true
  }

  var buffered = []
  var bufferedBytes = 0
  var emittedChunk = false

  return through(function transform (data) {
    if (typeof data === 'number') {
      data = Buffer([data])
    }
    bufferedBytes += data.length
    buffered.push(data)

    var b = Buffer.concat(buffered)
    var offset = 0
    while (bufferedBytes >= size) {
      this.queue(b.slice(offset, offset + size))
      offset += size
      bufferedBytes -= size
      emittedChunk = true
    }
    buffered = [ b.slice(offset, b.length) ]
  }, function flush (end) {
    if ((opts.emitEmpty && !emittedChunk) || bufferedBytes) {
      if (zeroPadding) {
        var zeroes = Buffer.alloc(size - bufferedBytes)
        zeroes.fill(0)
        buffered.push(zeroes)
      }
      if (buffered) {
        this.queue(Buffer.concat(buffered))
        buffered = null
      }
    }
    this.queue(null)
  })
}
