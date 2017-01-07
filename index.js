// node index.js -m 6 -y 2016
//     will combine all the statements in a single month directory into one combined statement.

// Get list of accounts
// For each account:
//     Get list of monthly statements
//     Generate line-item transactions
//     Track asset purchase vs. current values
//     Track transfers

const Promise = require('bluebird');
const args = require('minimist')(process.argv.slice(2));
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');
const _ = require('lodash');
const chalk = require('chalk');

const reader = require('./reader');
const splitter = require('./splitter');
const header = require('./process-header');
const estimator = require('./estimate-results');
const sectionize = require('./sectionize');
const prune = require('./prune');
const parse = require('./parse');
const statefulFixes = require('./stateful-fixes');
const combiner = require('./combiner');
const exporter = require('./exporter');
const err = require('./err');

function indexErr(msg) {
  return err('index: ' + msg);
}

if (!args.m || !args.y) {
  throw indexErr('USAGE: node index.js -m 6 -y 2016 [--force]');
}
const year = '' + args.y;
const month = (+args.m < 10 ? '0' + args.m : args.m); // add leading zero if necessary
const force = args.force;

// Read list of statements for this month:
const basedir = '../statements/ADMIS/'+year+'-'+month;
return fs.readdirAsync(basedir)
.filter(stmt => !stmt.match('Combined')) // no need to read the combined statement if it already exists
.filter(stmt => !stmt.startsWith('.')) // also don't need vim .swp files
.map(stmt => basedir+'/'+stmt)
// keep in mind each "map" and "reduce" below is dealing with an array of statements, 
// each of which has an array of lines inside.  Model is that of Cerebral signals, where each
// level takes an input, and adds it's own output to successively build a result object.
.map(reader)         // each returned item is {acct,date,stmt,stmt_buffer}
.map(splitter)       // each returned item is {acct,date,stmt,lines}
.map(estimator)      // each returned item is {acct,date,stmt,lines,estimates}
.map(header)         // each returned item is {acct,date,stmt,lines,estimates,header}, but lines has header lines removed
.map(sectionize)     // each returned item is {acct,date,stmt,estimates,header,activity,positions,summary}
.map(prune)          // each returned item is same name, but activity, positions, and summary have extraneous lines removed.  1 line per item of interest now.
.map(parse)          // each returned item is same name, but activity, positions, and summary lines are now objects instead of text lines.
.map(statefulFixes)  // each futures FEES has had corresponding futures line added or fixed before it
.reduce(combiner,{}) // returned item is a single {acct,date,estimates,header,activity,positions,summary} instead of one per statement
.then(exporter({month,year,basedir,force})) // returns nothing, just saves out combined file
.then(() => console.log('Done!'));

