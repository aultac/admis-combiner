const expect = require('chai').expect;
const _ = require('lodash');
const moment = require('moment');
const parse = require('../parse');
const {parseActivity,parsePositions,parseSummary} = parse; // pull out internal functions

function d(date) {
  return moment(date, 'M/DD/YY').format('YYYY-MM-DD').toString();
}

function paTest(line) {
  return _.map(parseActivity(line), l => {
    l.date = l.date.format('YYYY-MM-DD').toString();
    return l;
  });
}

function ppTest(line) {
  return _.map(parsePositions(line), l => {
    l.date = l.date.format('YYYY-MM-DD').toString();
    return l;
  });
}

describe('parse', () => {

  describe('activity', () => {
    describe('LIVE CATTLE puts/calls', () => {
      const original = _.map([
        {lineno:0, line: '  5/03/6                        1  PUT  AUG 16 LIVE CATTLE   1080  B     NET PREM  US                           858.99'},
        {lineno:2, line: '  5/03/6                       11  PUT  OCT 16 LIVE CATTLE   1080  B     NET PREM  US                        11,978.89'},
        {lineno:14,line: '  5/05/6             2             CALL JUN 17 LIVE CATTLE   1220  B     NET PREM  US         880.02'},
        {lineno:17,line: '  5/09/6             1             PUT  APR 17 LIVE CATTLE   1160  B     NET PREM  US       2,451.01'},
        {lineno:19,line: '  5/09/6                        1  CALL APR 17 LIVE CATTLE   1260  B     NET PREM  US                           808.99'},
        {lineno:23,line: '  5/11/6             2             CALL JUN 17 LIVE CATTLE   1220  B     NET PREM  US         940.02'},
      ],o => { o.acct='ADMIS'; o.stmt='test'; return o; });
      const expected = _.map([
        {lineno: 0,date: d('5/03/16'),qty:  -1,txtype: 'PUT', trademonth: 'AUG16',commodity: 'LIVE CATTLE',strike: 108.0,unitsPerContract: 400,amount:   858.99},
        {lineno: 2,date: d('5/03/16'),qty: -11,txtype: 'PUT', trademonth: 'OCT16',commodity: 'LIVE CATTLE',strike: 108.0,unitsPerContract: 400,amount: 11978.89},
        {lineno:14,date: d('5/05/16'),qty:   2,txtype: 'CALL',trademonth: 'JUN17',commodity: 'LIVE CATTLE',strike: 122.0,unitsPerContract: 400,amount:  -880.02},
        {lineno:17,date: d('5/09/16'),qty:   1,txtype: 'PUT', trademonth: 'APR17',commodity: 'LIVE CATTLE',strike: 116.0,unitsPerContract: 400,amount: -2451.01},
        {lineno:19,date: d('5/09/16'),qty:  -1,txtype: 'CALL',trademonth: 'APR17',commodity: 'LIVE CATTLE',strike: 126.0,unitsPerContract: 400,amount:   808.99},
        {lineno:23,date: d('5/11/16'),qty:   2,txtype: 'CALL',trademonth: 'JUN17',commodity: 'LIVE CATTLE',strike: 122.0,unitsPerContract: 400,amount:  -940.02},  
      ],o => { o.valuePerUnit = o.amount / (o.unitsPerContract * o.qty); o.acct='ADMIS'; o.stmt='test'; return o; });
      it('should equal expected', () => expect(paTest(original)).to.deep.equal(expected));
    });

    describe('CORN puts/calls', () => {
      const original = _.map([
        {lineno:29,line: '  5/10/6                        9  PUT  DEC 16 CORN           350  A     NET PREM  US                         6,335.91'},
        {lineno:31,line: '  5/10/6             9             CALL DEC 16 CORN           400  A     NET PREM  US       9,414.09'},
      ],o => { o.acct='ADMIS'; o.stmt='test'; return o; });
      const expected = _.map([
        {lineno:29,date: d('5/10/16'),qty: -9,txtype: 'PUT', trademonth: 'DEC16',commodity: 'CORN',strike: 3.50,unitsPerContract: 5000,amount:  6335.91},
        {lineno:31,date: d('5/10/16'),qty:  9,txtype: 'CALL',trademonth: 'DEC16',commodity: 'CORN',strike: 4.00,unitsPerContract: 5000,amount: -9414.09},
      ],o => { o.valuePerUnit = o.amount / (o.unitsPerContract * o.qty); o.acct='ADMIS'; o.stmt='test'; return o; });
      it ('should equal expected', () => expect(paTest(original)).to.deep.equal(expected));
    });

    describe('SOYBEANS puts/calls', () => {
      const original =  _.map([
        {lineno:39,line: '  5/11/6             1             PUT  NOV 16 SOYBEANS      1200  A     NET PREM  US       1,887.51'},
        {lineno:41,line: '  5/11/6                        1  CALL NOV 16 SOYBEANS      1300  A     NET PREM  US                         1,191.49'},
      ],o => { o.acct='ADMIS'; o.stmt='test'; return o; });
      const expected = _.map([
        {lineno:39,date: d('5/11/16'),qty:  1,txtype:  'PUT',trademonth: 'NOV16',commodity: 'SOYBEANS',strike: 12.00,unitsPerContract: 5000,amount: -1887.51},
        {lineno:41,date: d('5/11/16'),qty: -1,txtype: 'CALL',trademonth: 'NOV16',commodity: 'SOYBEANS',strike: 13.00,unitsPerContract: 5000,amount:  1191.49},     
      ],o => { o.valuePerUnit = o.amount / (o.unitsPerContract * o.qty); o.acct='ADMIS'; o.stmt = 'test'; return o; });
      it ('should equal expected', () => expect(paTest(original)).to.deep.equal(expected));
    });

    describe('CORN futures', () => {
      const original = _.map([
        {lineno:32,line: '  5/25/6            10             DEC 16 CORN                     A     FEE/COMM  US         105.10'},
        // the line below represents closing a futures transaction.  You don't know from the line alone what the qty should be: buy or sell.  Use line under it.
        {lineno:33,line: '  5/25/6            10         10  DEC 16 CORN                     A          P&L  US                         4,625.00'},
        // the line below does not generate a zero-amount futures transaction because it is preceded by a P&L line, but it informs P&L line for correct qty.
        {lineno:35,line: '  5/25/6                       10  DEC 16 CORN                     A     FEE/COMM  US         105.10'},
      ],o => { o.acct='ADMIS'; o.stmt='test'; return o; });
      const expected = _.map([
        {lineno:32,date:d('5/25/16'),qty:       10,txtype: 'FEES',   trademonth: 'DEC16',commodity: 'CORN',unitsPerContract: 1.0,    valuePerUnit: -105.10/10.0,  amount: -105.10},
        {lineno:33,date:d('5/25/16'),qty: 'XXXXXX',txtype: 'FUTURES',trademonth: 'DEC16',commodity: 'CORN',unitsPerContract: 5000.0, valuePerUnit: 'XXXXXX',      amount: 4625.00},
        {lineno:35,date:d('5/25/16'),qty:      -10,txtype: 'FEES',   trademonth: 'DEC16',commodity: 'CORN',unitsPerContract: 1.0,    valuePerUnit: -105.10/10.0,  amount: -105.10},
      ],o => { o.acct='ADMIS'; o.stmt='test'; return o; });
      it('should equal expected', () => expect(paTest(original)).to.deep.equal(expected));
    });

    describe('CASH', () => {
      const original = _.map([
        {lineno:42,line: '  9/06/6                           Ach Sent                                  CASH  US      60,000.00'},
        {lineno:43,line: ' 12/28/6                           Ach Received                              CASH  US                        20,000.00'},
      ],o => { o.acct='ADMIS'; o.stmt='test'; return o; });
      const expected = _.map([
        {lineno:42,date: d( '9/06/16'),txtype: 'TRANSFER',commodity: 'CASH',unitsPerContract:1,amount: -60000.00}, // transfer out
        {lineno:43,date: d('12/28/16'),txtype: 'TRANSFER',commodity: 'CASH',unitsPerContract:1,amount:  20000.00}, // transfer in
      ],o => { o.acct='ADMIS'; o.stmt='test'; return o; });
      it('should equal expected', () => expect(paTest(original)).to.deep.equal(expected));
    });

  }); // end activity

  describe('positions', () => {
    describe('LIVE CATTLE puts/calls', () => {
      const original = _.map([
        {lineno:5,  line: '  5/05/6                        6  PUT  DEC 16 LIVE CATTLE   1060  B     2.10      US       4,260.00'},
        {lineno:35, line: ' 12/15/5             4             PUT  DEC 16 LIVE CATTLE   1160  B     7.37 1/2  US                         8,000.00'},
        {lineno:92, line: '  5/09/6                        1  CALL APR 17 LIVE CATTLE   1260  B     2.07 1/2  US         690.00'},
      ],o => { o.acct='ADMIS'; o.stmt='test'; return o; });
      const expected = _.map([
        {lineno: 5,date: d( '5/05/16'),qty: -6,txtype: 'PUT', trademonth: 'DEC16',commodity: 'LIVE CATTLE',strike: 106.0,unitsPerContract: 400,initialValuePerUnit: 2.100,             initialAmount: -6*400*2.100,      currentAmount: -4260.00,currentValuePerUnit: 4260.00/(400*6),netAmount: -4260.00 - (-6*400*2.100)},
        {lineno:35,date: d('12/15/15'),qty:  4,txtype: 'PUT', trademonth: 'DEC16',commodity: 'LIVE CATTLE',strike: 116.0,unitsPerContract: 400,initialValuePerUnit: 7.375,             initialAmount:  4*400*7.375,      currentAmount:  8000.00,currentValuePerUnit: 8000.00/(400*4),netAmount:  8000.00 - ( 4*400*7.375)},
        {lineno:92,date: d( '5/09/16'),qty: -1,txtype: 'CALL',trademonth: 'APR17',commodity: 'LIVE CATTLE',strike: 126.0,unitsPerContract: 400,initialValuePerUnit: 2.07+.01*(1.0/2.0),initialAmount: -829.9999999999999,currentAmount:  -690.00,currentValuePerUnit:  690.00/(400*1),netAmount:  139.9999999999999},
      ],o => { o.acct='ADMIS'; o.stmt='test'; return o; });
      it('should match expected', () => expect(ppTest(original)).to.deep.equal(expected));
    });

    describe('CORN puts/calls', () => {
      const original = _.map([
        {lineno:102,line: '  5/10/6                        9  PUT  DEC 16 CORN           350  A      .14 1/2  US       3,375.00'},
        {lineno:107,line: '  5/10/6             9             CALL DEC 16 CORN           400  A      .20 1/2  US                        15,412.50'},
      ],o => { o.acct='ADMIS'; o.stmt='test'; return o; });
      const expected = _.map([
        {lineno:102,date: d('5/10/16'),qty: -9,txtype: 'PUT', trademonth: 'DEC16',commodity: 'CORN',strike: 3.50,unitsPerContract: 5000,initialValuePerUnit: 0.14+(0.01*1.0/2.0),initialAmount: -6525.000000000001,currentAmount: -3375.00,currentValuePerUnit:  3375.00/(5000*9),netAmount: 3150.000000000001 },
        {lineno:107,date: d('5/10/16'),qty:  9,txtype: 'CALL',trademonth: 'DEC16',commodity: 'CORN',strike: 4.00,unitsPerContract: 5000,initialValuePerUnit: 0.20+(0.01*1.0/2.0),initialAmount:  9*5000*0.205,currentAmount: 15412.50,currentValuePerUnit: 15412.50/(5000*9),netAmount: 15412.50 - ( 9*5000*0.205)},
      ],o => { o.acct='ADMIS'; o.stmt='test'; return o; });
      it('should match expected', () => expect(ppTest(original)).to.deep.equal(expected));
    });

    describe('SOYBEANS puts/calls', () => {
      const original = _.map([
        {lineno:112,line: '  4/26/6             1             PUT  NOV 16 SOYBEANS       960  A      .34 1/4  US                           806.25'},
        {lineno:117,line: '  5/11/6                        1  CALL NOV 16 SOYBEANS      1300  A      .24 1/4  US         643.75'},
      ],o => { o.acct='ADMIS'; o.stmt='test'; return o; });
      const expected = _.map([
        {lineno:112,date: d('4/26/16'),qty:  1,txtype: 'PUT', trademonth: 'NOV16',commodity: 'SOYBEANS',strike:  9.60,unitsPerContract: 5000,initialValuePerUnit: 0.3425,initialAmount:  1*5000*0.3425,currentAmount:  806.25,currentValuePerUnit:  806.25/(5000*1),netAmount:  806.25 - ( 1*5000*0.3425)},
        {lineno:117,date: d('5/11/16'),qty: -1,txtype: 'CALL',trademonth: 'NOV16',commodity: 'SOYBEANS',strike: 13.00,unitsPerContract: 5000,initialValuePerUnit: 0.2425,initialAmount: -1*5000*0.2425,currentAmount: -643.75,currentValuePerUnit: -643.75/(5000*(-1)),netAmount: -643.75 - (-1*5000*0.2425)},
      ],o => { o.acct='ADMIS'; o.stmt='test'; return o; });
      it('should match expected', () => expect(ppTest(original)).to.deep.equal(expected));
    });

    describe('CORN futures', () => {
      const original = _.map([
        {lineno:122,line: '  9/24/4            10             DEC 16 CORN                     A     3.97 3/4  US       1,250.00'},
        {lineno:122,line: '  9/24/4                       10  DEC 16 CORN                     A     3.97 3/4  US       1,250.00'},
      ],o => { o.acct='ADMIS'; o.stmt='test'; return o; });
      const expected = _.map([
        {lineno:122,date: d('9/24/14'),qty:  10,txtype:'FUTURES',trademonth: 'DEC16',commodity: 'CORN',unitsPerContract: 5000,initialValuePerUnit: 3.9775,initialAmount: 0,currentAmount: -1250.00,currentValuePerUnit: -1250.0/(5000*10)    + 3.9775, netAmount: -1250.0},
        {lineno:122,date: d('9/24/14'),qty: -10,txtype:'FUTURES',trademonth: 'DEC16',commodity: 'CORN',unitsPerContract: 5000,initialValuePerUnit: 3.9775,initialAmount: 0,currentAmount: -1250.00,currentValuePerUnit: -1250.0/(5000*(-10)) + 3.9775, netAmount: -1250.0},
      ],o => { o.acct='ADMIS'; o.stmt='test'; return o; });
      it('should match expected', () => expect(ppTest(original)).to.deep.equal(expected));
    });

  });

  describe('summary', () => {
    const original = _.map([
      //                         111111111122222222223333333333444444444
      //               0123456789012345678901234567890123456789012345678
      {lineno:0, line:'  1. BEGINNING ACCT BALANCE            90,122.69'},
      {lineno:1, line:'  2. P&L AND CASH ACTIVITY             23,932.40-'},
      {lineno:2, line:'  3. ENDING ACCT BALANCE               66,190.29'},
      {lineno:3, line:'  4. NET FUTURES P&L                    4,519.90'},
      {lineno:4, line:'  5. NET OPTION PREMIUM                26,067.60'},
      {lineno:5, line:'  8. OPTIONS MARKET VALUE             268,880.00'},
      {lineno:6, line:'  9. ACCT VALUE AT MARKET             335,070.29'},
      {lineno:7, line:' 11. CONVERTED ACCT VALUE US          335,070.29'},
    ], o => { o.acct='ADMIS'; o.stmt='test'; return o; });
    const expected = _.map([
      {lineno:0, type: '1. BEGINNING ACCT BALANCE', amount:  90122.69},
      {lineno:1, type: '2. P&L AND CASH ACTIVITY',  amount: -23932.40},
      {lineno:2, type: '3. ENDING ACCT BALANCE',    amount:  66190.29},
      {lineno:3, type: '4. NET FUTURES P&L',        amount:   4519.90},
      {lineno:4, type: '5. NET OPTION PREMIUM',     amount:  26067.60},
      {lineno:5, type: '8. OPTIONS MARKET VALUE',   amount: 268880.00},
      {lineno:6, type: '9. ACCT VALUE AT MARKET',   amount: 335070.29},
      {lineno:7, type:'11. CONVERTED ACCT VALUE US',amount: 335070.29},
    ], o => { o.acct='ADMIS'; o.stmt='test'; return o; });
    it('should match expected', () => expect(parseSummary(original)).to.deep.equal(expected));
  });

});
