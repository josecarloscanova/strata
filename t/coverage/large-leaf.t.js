#!/usr/bin/env node

require('./proof')(2, function (step, Strata, tmp, load, serialize, objectify, gather, assert) {
    var strata = new Strata({ directory: tmp, leafSize: 3, branchSize: 3 })
    step(function () {
        serialize(__dirname + '/fixtures/large-leaf.before.json', tmp, step())
    }, function () {
        strata.open(step())
    }, function () {
        strata.mutator('_', step())
    }, function (cursor) {
        step(function () {
            cursor.insert('_', '_', ~ cursor.index, step())
        }, function () {
            cursor.unlock()
        })
    }, function () {
        gather(step, strata)
    }, function (records) {
        assert(records, '_abcdefghijklmnopqrstuvwxyz'.split(''), 'records')
        strata.balance(step())
    }, function () {
        objectify(tmp, step())
        load(__dirname + '/fixtures/large-leaf.after.json', step())
    }, function (actual, expected) {
        assert(actual, expected, 'split')
        strata.close(step())
    })
})
