const _ = require('lodash');
const xlsx = require('xlsx');
const chalk = require('chalk');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const err = require('./err');

const enc = (r,c) => xlsx.utils.encode_cell({c,r});

function jsonToSheet({cols,arr}) {
  const ws = {};
  let row = 0;
  // add header row to sheet:
  _.each(cols, (c,index) => {
    ws[enc(row,index)] = { v: c };
  });
  row++;
  // add all rows under header assuming obj. names are same as header:
  _.each(arr, a => {
    _.each(cols, (col,index) => {
      let v = a[col];
      let t = 's'; // type of column
      if (col === 'date') {
        v = a[col].format('YYYY-MM-DD');
        t = 'd'; // date type
      }
      if (typeof v === 'number') {
        t = 'n'; // number type
      }
      ws[enc(row,index)] = { v, t };
    });
    row++;
  });
  // Tell Excel the extent of the rows/cols we're interested in
  const maxcell = _.reduce(ws, (max,cell,key) => {
    const c = xlsx.utils.decode_cell(key); // c.c and c.r are numbers
    if (c.c > max.c) max.c = c.c;
    if (c.r > max.r) max.r = c.r;
    return max;
  },{ c: 0, r: 0 });
  ws['!ref'] = xlsx.utils.encode_range({
    s: { c: 0, r: 0},
    e: maxcell
  });
  return ws;
}

module.exports = ({month,year,basedir,force}) => {
  const outfilename = basedir+'/'+year+'-'+month+'_Combined.xlsx';
  return input => {
    const wb = {
      SheetNames: [ 'activity', 'positions' ],
      Sheets: {
        activity: {},
        positions: {},
      },
    };

    // Fill out the worksheets:
    wb.Sheets.activity = jsonToSheet({
      arr: input.activity,
      cols: [ 'date','qty','txtype','trademonth','commodity','strike',
              'unitsPerContract','valuePerUnit','amount','balance',
              'initialDate','initialQtyClosedHere','initialValuePerUnit',
              'initialAmount','netAmount','netPerUnit','acct','stmt'],
    });
    wb.Sheets.positions = jsonToSheet({
      arr: input.positions,
      cols: [ 'date','qty','txtype','trademonth','commodity','strike',
              'unitsPerContract','initialValuePerUnit','currentValuePerUnit',
              'initialAmount', 'currentAmount', 'netAmount', 'acct', 'stmt' ],
    });

    return fs.statAsync(outfilename)
    .then(stats => {
      if (stats.isFile() && !force) {
        throw err('exporter: cowardly refusing to overwrite existing '+outfilename+' without the --force option');
      }
      xlsx.writeFile(wb, outfilename);
      console.log(chalk.green('Wrote file '+outfilename));
    });
  };
};
