const expect = require('chai').expect;
const _ = require('lodash');
const moment = require('moment');
const statefulFixes = require('../stateful-fixes.js');
statefulFixes.testmode();

function sfTest({activity,positions}) {
  return _.map(statefulFixes({activity,positions}), l => {
    l.date = l.date.format('YYYY-MM-DD').toString();
    return l;
  });
}

function d(date) {
  return moment(date, 'M/DD/YY').format('YYYY-MM-DD').toString();
}

describe('stateful-fixes for activity futures', () => {

  // including some options lines around the futures lines to make sure they don't get messed up 
  // by the stateful-fixes.  Note that it pulls valuePerUnit for futures trades from positions.
  const positions = _.map([
    {lineno:122,date: d('9/24/14'),qty:  10,txtype:'FUTURES',trademonth: 'DEC16',commodity: 'CORN',unitsPerContract: 5000,initialValuePerUnit: 3.9775,initialAmount: 0,currentAmount: -1250.00,currentValuePerUnit: -1250.0/(5000*10)    + 3.9775, netAmount: -1250.0},
    {lineno:122,date: d('9/25/14'),qty: -10,txtype:'FUTURES',trademonth: 'DEC16',commodity: 'CORN',unitsPerContract: 5000,initialValuePerUnit: 3.9775,initialAmount: 0,currentAmount: -1250.00,currentValuePerUnit: -1250.0/(5000*(-10)) + 3.9775, netAmount: -1250.0},
  ],o => { o.acct='ADMIS'; o.stmt='test'; return o; });

  // Here's the original activity objects from parse:
  const activity = _.map([
    {lineno: 0,date: d('5/03/16'),qty:  -1,txtype: 'PUT', trademonth: 'AUG16',commodity: 'LIVE CATTLE',strike: 108.0,unitsPerContract: 400,amount:   858.99},
    {lineno: 2,date: d('5/03/16'),qty: -11,txtype: 'PUT', trademonth: 'OCT16',commodity: 'LIVE CATTLE',strike: 108.0,unitsPerContract: 400,amount: 11978.89},
    {lineno:14,date: d('5/05/16'),qty:   2,txtype: 'CALL',trademonth: 'JUN17',commodity: 'LIVE CATTLE',strike: 122.0,unitsPerContract: 400,amount:  -880.02},
    
    // insert new entry here: 
    {lineno:32,date:d('9/24/14'),qty:       10,txtype: 'FEES',   trademonth: 'DEC16',commodity: 'CORN',unitsPerContract: 1.0,    valuePerUnit: -105.10/10.0,  amount: -105.10},
    // fix the qty on the entry below based on fees line below it
    {lineno:33,date:d('9/24/14'),qty: 'XXXXXX',txtype: 'FUTURES',trademonth: 'DEC16',commodity: 'CORN',unitsPerContract: 5000.0, valuePerUnit: 'XXXXXX',      amount: 4625.00},
    // leave next line alone, do not insert line before
    {lineno:35,date:d('9/24/14'),qty:      -10,txtype: 'FEES',   trademonth: 'DEC16',commodity: 'CORN',unitsPerContract: 1.0,    valuePerUnit: -105.10/10.0,  amount: -105.10},
    // insert line here, but this is example of a fee without a corresponding position to get valuePerUnit,
    // so valuePerUnit should be set to XXXXXX
    {lineno:38,date:d('5/26/16'),qty:   10,txtype: 'FEES',   trademonth: 'DEC17',commodity: 'CORN',unitsPerContract: 1.0,    valuePerUnit: -105.10/10.0,  amount: -105.10},

    {lineno:39,date: d('5/11/16'),qty:  1,txtype:  'PUT',trademonth: 'NOV16',commodity: 'SOYBEANS',strike: 12.00,unitsPerContract: 5000,amount: -1887.51},
    {lineno:41,date: d('5/11/16'),qty: -1,txtype: 'CALL',trademonth: 'NOV16',commodity: 'SOYBEANS',strike: 13.00,unitsPerContract: 5000,amount:  1191.49},     
  ],o => { o.acct='ADMIS'; o.stmt='test'; return o; });

  // Here's what they should look like when done:
  const expected = _.map([
    {lineno: 0,date: d('5/03/16'),qty:  -1,txtype: 'PUT', trademonth: 'AUG16',commodity: 'LIVE CATTLE',strike: 108.0,unitsPerContract: 400,amount:   858.99},
    {lineno: 2,date: d('5/03/16'),qty: -11,txtype: 'PUT', trademonth: 'OCT16',commodity: 'LIVE CATTLE',strike: 108.0,unitsPerContract: 400,amount: 11978.89},
    {lineno:14,date: d('5/05/16'),qty:   2,txtype: 'CALL',trademonth: 'JUN17',commodity: 'LIVE CATTLE',strike: 122.0,unitsPerContract: 400,amount:  -880.02},

    // added next line: initialValuePerUnit comes from looking at positions.
    {lineno:32,date:d('9/24/14'),qty:  10,txtype: 'FUTURES',trademonth: 'DEC16',commodity: 'CORN',unitsPerContract: 5000.0, valuePerUnit:       3.9775, amount: 0},
    {lineno:32,date:d('9/24/14'),qty:  10,txtype:    'FEES',trademonth: 'DEC16',commodity: 'CORN',unitsPerContract:    1.0, valuePerUnit: -105.10/10.0, amount: -105.10},
    // fixed next line (replaced qty with qty from FEES line below it):
    {lineno:33,date:d('9/24/14'),qty: -10,txtype: 'FUTURES',trademonth: 'DEC16',commodity: 'CORN',unitsPerContract: 5000.0, valuePerUnit:     'XXXXXX', amount: 4625.00},
    {lineno:35,date:d('9/24/14'),qty: -10,txtype:    'FEES',trademonth: 'DEC16',commodity: 'CORN',unitsPerContract:    1.0, valuePerUnit: -105.10/10.0, amount: -105.10},
    // added next line (no position, so valuePerUnit is XXXXXX)
    {lineno:38,date:d('5/26/16'),qty: 10,txtype: 'FUTURES',trademonth: 'DEC17',commodity: 'CORN',unitsPerContract: 5000.0, valuePerUnit:     'XXXXXX', amount: 0},
    {lineno:38,date:d('5/26/16'),qty: 10,txtype: 'FEES',   trademonth: 'DEC17',commodity: 'CORN',unitsPerContract:    1.0, valuePerUnit: -105.10/10.0, amount: -105.10},

    {lineno:39,date: d('5/11/16'),qty:  1,txtype:  'PUT',trademonth: 'NOV16',commodity: 'SOYBEANS',strike: 12.00,unitsPerContract: 5000,amount: -1887.51},
    {lineno:41,date: d('5/11/16'),qty: -1,txtype: 'CALL',trademonth: 'NOV16',commodity: 'SOYBEANS',strike: 13.00,unitsPerContract: 5000,amount:  1191.49},     
  ],o => { o.acct='ADMIS'; o.stmt='test'; return o; });

  it('should equal expected', () => expect(statefulFixes({activity,positions}).activity).to.deep.equal(expected));
});

