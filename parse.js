const _ = require('lodash');
const moment = require('moment');
const lp = require('./line-parsers');
const err = require('./err');
const util = require('./util');

// Turn a set of cleaned and pruned lines from account statements
// into a set of objects, one per item.  
const exported_function = input => {
  const {activity,positions,summary} = input;
  const output = _.cloneDeep(input);

  output.activity  = parseActivity(activity);
  output.positions = parsePositions(positions);
  output.summary   = parseSummary(summary);

  return output;
};

// Include internal functions so they can be tested separately
exported_function.parseActivity = parseActivity;
exported_function.parsePositions = parsePositions;
exported_function.parseSummary = parseSummary;
module.exports = exported_function;

function parseActivity(lines) {
  // Each line in activity corresponds to a transaction.  Types: FUTURES, PUT, CALL, TRANSFER
  //   DATE            LONG/BUY  SHRT/SELL      DESCRIPTION           EX   PRICE/LEGND CC          DEBIT            CREDIT
  //Options:
  //  5/10/6                        9  PUT  DEC 16 CORN           350  A     NET PREM  US                         6,335.91
  //Futures:
  //  5/25/6            10         10  DEC 16 CORN                     A          P&L  US                         4,625.00
  //  5/25/6                       10  DEC 16 CORN                     A     FEE/COMM  US         105.10
  //Transfers:
  //  9/06/6                           Ach Sent                                  CASH  US      60,000.00
  // 12/28/6                           Ach Received                              CASH  US                        20,000.00
  return _.map(lines, line => {
    const r = {
      lineno: line.lineno,
      acct: line.acct,
      stmt: line.stmt,
      date: lp.parseDate(line),
      txtype: lp.parseTxType(line),
      commodity: lp.parseCommodity(line),
      amount: lp.parseAmount(line),
    };
    // Now the weirdness:
    // Everything but cash transfers have quantities and trademonths.  
    if (r.txtype !== 'TRANSFER') {
      r.qty = lp.parseQty(line);
      r.trademonth = lp.parseTradeMonth(line);
    }
    // only options have strikes:
    if (r.txtype === 'PUT' || r.txtype === 'CALL' || r.txtype === 'TRANSFER-PUT' || r.txtype === 'TRANSFER-CALL')
      r.strike = lp.parseStrike(line);
    // corn,beans have 5000 bu/cont, cattle 400 cwt/cont, fees are 1 fee/cont
    r.unitsPerContract = util.unitsPerContract(r);
    // valuePerUnit isn't yet known for futures (need stateful fixes)
    if (r.txtype === 'FUTURES') {
      if (r.qty !== 'XXXXXX') throw err(line, 'txtype is futures, but qty ('+r.qty+') is not XXXXXX!  Must be XXXXXX before stateful fixes since only futures lines in stmt are P&L');
      r.valuePerUnit = 'XXXXXX';
      r.initialDate = 'XXXXXX';
      r.initialQtyClosedHere = 'XXXXXX';
      r.initialValuePerUnit = 'XXXXXX';
      r.initialAmount = 'XXXXXX';
      r.netAmount = 'XXXXXX';
      r.netPerUnit = 'XXXXXX';
    // fee valuePerUnit is always negative
    } else if (r.txtype === 'FEES') {
      r.valuePerUnit = -1.0 * Math.abs(r.amount / (r.qty * r.unitsPerContract));
    // all others except transfer are regular function
    } else if (r.txtype !== 'TRANSFER')
      r.valuePerUnit = r.amount / (r.qty * r.unitsPerContract);
    // for testing, get rid of moment object so deep equal comparison works
    return r;
  });

}

function parsePositions(lines) {
  return _.map(lines, line => {
    const r = {
      lineno: line.lineno,
      acct: line.acct,
      stmt: line.stmt,
      date: lp.parseDate(line),
      txtype: lp.parseTxType(line),
      commodity: lp.parseCommodity(line),
      currentAmount: lp.parseAmount(line),
      qty: lp.parseQty(line),
      trademonth: lp.parseTradeMonth(line),
      initialValuePerUnit: lp.parseInitialValuePerUnit(line),
    };
    // Now the weirdness:
    // only options have strikes:
    if (r.txtype === 'PUT' || r.txtype === 'CALL' || r.txtype === 'TRANSFER-PUT' || r.txtype === 'TRANSFER-CALL')
      r.strike = lp.parseStrike(line);
    // corn,beans have 5000 bu/cont, cattle 400 cwt/cont, fees are 1 fee/cont
    if (r.commodity === 'LIVE CATTLE')
      r.unitsPerContract = 400;
    else if (r.commodity !== 'CASH') 
      r.unitsPerContract = 5000;
    // Compute currentValuePerUnit, initialAmount, and netAmount
    r.currentValuePerUnit = r.currentAmount / (r.unitsPerContract * r.qty);
    if (r.txtype === 'FUTURES') {
      // have to add back in initialValuePerUnit since futures only tracks net change
      r.currentValuePerUnit += r.initialValuePerUnit;
    }
    r.initialAmount = r.initialValuePerUnit * r.unitsPerContract * r.qty;
    if (r.txtype === 'FUTURES') {
      r.initialAmount = 0; // futures have no initial net value
    }
    r.netAmount = r.currentAmount - r.initialAmount;
    return r;
  });
}

function parseSummary(lines) {
  return _.map(lines, line => {
    const r = {
      lineno: line.lineno,
      acct: line.acct,
      stmt: line.stmt,
      type: lp.parseSummaryType(line),
      amount: lp.parseSummaryAmount(line),
    };
    return r;
  });
}
