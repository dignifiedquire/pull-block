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
      var b
      var out
      var c = 0
      var end = 0

      while (targetLength < size) {
        b = buffered[0]
        end = bufferSkip + size - targetLength

        if (end <= b.length) {
          // large enough, just slice it
          out = b.slice(bufferSkip, end)
          c = out.length
          targetLength += c
          target.push(out)

          if (end === b.length) {
            buffered.shift()
            bufferSkip = 0
          } else {
            bufferSkip += c
          }
        } else {
          // not enough, push what we have
          targetLength += b.length - bufferSkip
          target.push(b.slice(bufferSkip, b.length))

          buffered.shift()
          bufferSkip = 0
        }
      }

      bufferedBytes -= targetLength

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
