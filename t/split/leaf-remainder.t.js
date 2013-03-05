#!/usr/bin/env node

require('./proof')(3, function (step, Strata, tmp, deepEqual) {
  var strata = new Strata(tmp, { leafSize: 3, branchSize: 3 }), fs = require('fs');
  step(function (serialize) { 
    serialize(__dirname + '/fixtures/leaf-remainder.before.json', tmp, step());
  }, function () {
    strata.open(step());
  }, function () {
    strata.mutator('b', step());
  }, function (cursor) {
    step(function () {
      cursor.insert('b', 'b', ~ cursor.index, step());
    }, function () {
      cursor.unlock()
    });
  }, function (gather) {
    gather(step, strata);
  }, function (records) {
    deepEqual(records, [ 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h' ], 'records');
    strata.balance(step());
  }, function (gather) {
    gather(step, strata);
  }, function (records, load) {
    deepEqual(records, [ 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h' ], 'records after balance');
    load(__dirname + '/fixtures/leaf-remainder.after.json', step());
  }, function (expected, objectify) {
    objectify(tmp, step());
  }, function (actual, expected, say) {
    say(expected);
    say(actual);

    deepEqual(actual, expected, 'split');
  }, function() {
    strata.close(step());
  });
});
