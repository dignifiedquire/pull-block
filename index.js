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
      data = Buffer.from([data])
    }
    bufferedBytes += data.length
    buffered.push(data)

    while (bufferedBytes >= size) {
      var targetLength = 0
      var target = []
      var b, end, out

      while (targetLength < size) {
        b = buffered[0]

        // Slice as much as we can from the next buffer.
        end = Math.min(bufferSkip + size - targetLength, b.length)
        out = b.slice(bufferSkip, end)
        targetLength += out.length
        target.push(out)

        if (end === b.length) {
          // If that "consumes" the buffer, remove it.
          buffered.shift()
          bufferSkip = 0
        } else {
          // Otherwise keep track of how much we used.
          bufferSkip += out.length
        }
      }

      bufferedBytes -= targetLength

      // Try to avoid concat, as it copies data.
      if (target.length === 1) {
        this.queue(target[0])
      } else {
        this.queue(Buffer.concat(target))
      }

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
