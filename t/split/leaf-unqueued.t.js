#!/usr/bin/env node

require('./proof')(3, function (async, assert) {
    var strata = new Strata({ directory: tmp, leafSize: 3, branchSize: 3 })
    async(function () {
        serialize(__dirname + '/fixtures/leaf-remainder.before.json', tmp, async())
    }, function () {
        strata.open(async())
    }, function () {
        gather(strata, async())
    }, function (records) {
        assert(records, [ 'a', 'c', 'd', 'e', 'f', 'g', 'h' ], 'records')
        strata.balance(async())
    }, function () {
        gather(strata, async())
    }, function (records) {
        assert(records, [ 'a', 'c', 'd', 'e', 'f', 'g', 'h' ], 'records after balance')

        vivify(tmp, async())
        load(__dirname + '/fixtures/leaf-remainder.before.json', async())
    }, function (actual, expected) {
        assert(actual, expected, 'split')
    }, function() {
        strata.close(async())
    })
})
