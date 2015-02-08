var ok = require('assert').ok
var fs = require('fs')
var cadence = require('cadence/redux')

function Player () {
}

// todo: outgoing
Player.prototype.io = cadence(function (async, direction, filename) {
    async(function () {
        fs.open(filename, direction[0], async())
    }, function (fd) {
        async(function () {
            fs.fstat(fd, async())
        }, function (stat) {
            var io = cadence(function (async, buffer, position) {
                var offset = 0

                var length = stat.size - position
                var slice = length < buffer.length ? buffer.slice(0, length) : buffer

                var loop = async(function (count) {
                    if (count < slice.length - offset) {
                        offset += count
                        fs[direction](fd, slice, offset, slice.length - offset, position + offset, async())
                    } else {
                        return [ loop, slice, position ]
                    }
                })(0)
            })
            return [ fd, stat, io ]
        })
    })
})

Player.prototype.read = cadence(function (async, sheaf, page) {
    page.entries = page.ghosts = page.position = 0
    var rotation = 0, loop = async([function () {
        this.io('read', sheaf._filename(page.address, rotation), async())
    }, function (error) {
        if (rotation === 0 || error.code !== 'ENOENT') {
            throw error
        }
        return [ loop, page ]
    }], function (fd, stat, read) {
        page.rotation = rotation++
        this.play(sheaf, fd, stat, read, page, async())
    })()
})

Player.prototype.readEntry = function (sheaf, buffer, isKey) {
    for (var count = 2, i = 0, I = buffer.length; i < I && count; i++) {
        if (buffer[i] == 0x20) count--
    }
    for (count = 1; i < I && count; i++) {
        if (buffer[i] == 0x20 || buffer[i] == 0x0a) count--
    }
    ok(!count, 'corrupt line: could not find end of line header')
    var fields = buffer.toString('utf8', 0, i - 1).split(' ')
    var hash = sheaf.checksum(), body, length
    hash.update(fields[2])
    if (buffer[i - 1] == 0x20) {
        body = buffer.slice(i, buffer.length - 1)
        length = body.length
        hash.update(body)
    }
    var digest = hash.digest('hex')
    ok(fields[1] == '-' || digest == fields[1], 'corrupt line: invalid checksum')
    if (buffer[i - 1] == 0x20) {
        body = sheaf.deserialize(body, isKey)
    }
    var entry = { length: length, header: JSON.parse(fields[2]), body: body }
    ok(entry.header.every(function (n) { return typeof n == 'number' }), 'header values must be numbers')
    return entry
}

Player.prototype.readHeader = function (entry) {
    var header = entry.header
    return {
        entry:      header[0],
        index:      header[1],
        address:    header[2]
    }
}

Player.prototype.play = cadence(function (async, sheaf, fd, stat, read, page) {
    var leaf = !!(page.address % 2),
        seen = {},
        buffer = new Buffer(sheaf.options.readLeafStartLength || 1024),
        footer, length

    // todo: really want to register a cleanup without an indent.
    async([function () {
        fs.close(fd, async())
    }], function () {
        var loop = async(function (buffer, position) {
            read(buffer, position, async())
        }, function (slice, start) {
            for (var offset = 0, i = 0, I = slice.length; i < I; i++) {
                if (slice[i] == 0x20) {
                    var sip = slice.toString('utf8', offset, i)
                    length = parseInt(sip)
                    ok(String(length).length == sip.length, 'invalid length')
                    if (offset + length > slice.length) {
                        break
                    }
                    var position = start + offset
                    ok(length)
                    page.position += length
                    var entry = this.readEntry(sheaf, slice.slice(offset, offset + length), !leaf)
                    var header = this.readHeader(entry)
                    if (entry.header[1] == 0) {
                        page.right = {
                            address: entry.header[2],
                            key: entry.body || null
                        }
                        if (entry.header[3] == 0 && page.ghosts) {
                            sheaf.splice(page, 0, 1)
                            page.ghosts = 0
                        }
                        page.entries++
                    } else {
                        ok(header.entry == ++page.entries, 'entry count is off')
                        var index = header.index
                        if (leaf) {
                            if (index > 0) {
                                seen[position] = true
                                sheaf.splice(page, index - 1, 0, {
                                    key: sheaf.extractor(entry.body),
                                    record: entry.body,
                                    heft: length
                                })
                            } else if (~index == 0 && page.address != 1) {
                                ok(!page.ghosts, 'double ghosts')
                                page.ghosts++
                            } else if (index < 0) {
                                sheaf.splice(page, -(index + 1), 1)
                            }
                        } else {
                            var address = header.address, key = null, heft = 0
                            if (index - 1) {
                                key = entry.body
                                heft = length
                            }
                            sheaf.splice(page, index - 1, 0, {
                                key: key, address: address, heft: heft
                            })
                        }
                    }
                    i = offset = offset + length
                }
            }

            if (start + buffer.length < stat.size) {
                if (offset == 0) {
                    buffer = new Buffer(buffer.length * 2)
                    read(buffer, start, async())
                } else {
                    read(buffer, start + offset, async())
                }
            } else {
                return [ loop ]
            }
        })(buffer, 0)
    })
})

module.exports = Player