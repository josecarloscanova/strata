#!/usr/bin/env node

require('./proof')(3, function (step, Strata, tmp, deepEqual) {
  var strata = new Strata(tmp, { leafSize: 3, branchSize: 3 }), fs = require('fs');
  step(function (serialize) { 
    serialize(__dirname + '/fixtures/branch.before.json', tmp, step());
  }, function () {
    strata.open(step());
  }, function () {
    strata.mutator('h', step());
  }, function (cursor) {
    step(function () {
      cursor.indexOf('h', step());
    }, function (index) {
      cursor.remove(index, step());
    }, function () {
      cursor.indexOf('i', step());
    }, function (index) {
      cursor.remove(index, step());
      cursor.unlock();
    });
  }, function (gather) {
    gather(step, strata);
  }, function (records) {
    deepEqual(records, [ 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'j', 'k', 'l', 'm', 'n' ], 'records');
    strata.balance(step());
  }, function (load) {
    load(__dirname + '/fixtures/branch.after.json', step());
  }, function (expected, objectify) {
    objectify(tmp, step());
  }, function (actual, expected, say) {
//    say(expected);
//    say(actual);

    deepEqual(actual, expected, 'merge');
  }, function (gather) {
    gather(step, strata);
  }, function (records) {
    deepEqual(records, [ 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'j', 'k', 'l', 'm', 'n' ], 'merged');
  }, function() {
    strata.close(step());
  });
});
