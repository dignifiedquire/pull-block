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
  var bufferSkip = 0
  var emittedChunk = false

  return through(function transform (data) {
    if (typeof data === 'number') {
      data = Buffer([data])
    }
    bufferedBytes += data.length
    buffered.push(data)

    while (bufferedBytes >= size) {
      var copied = 0
      var target = Buffer.alloc(size)

      while (copied < size) {
        var b = buffered[0]
        var end = Math.min(bufferSkip + size - copied, b.length)

        var c = b.copy(target, copied, bufferSkip, end)
        copied += c
        bufferedBytes -= c

        if (end === b.length) {
          buffered.shift()
          bufferSkip = 0
        } else {
          bufferSkip += c
        }
      }

      this.queue(target)
      emittedChunk = true
    }
  }, function flush (end) {
    if ((opts.emitEmpty && !emittedChunk) || bufferedBytes) {
      if (zeroPadding) {
        var zeroes = Buffer.alloc(size - bufferedBytes)
        zeroes.fill(0)
        buffered.push(zeroes)
      }
      if (buffered) {
        this.queue(Buffer.concat(buffered).slice(bufferSkip))
        buffered = null
      }
    }
    this.queue(null)
  })
}
