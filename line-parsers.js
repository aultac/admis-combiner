const moment = require('moment');
const err = require('./err');

function parseErr(lineobj,msg) {
  return err(lineobj,'line-parser: '+msg);
}

function notImplemented(func) {
  return () => {
    throw err('line-parser: '+func+': NOT IMPLEMENTED');
  };
}

const _LP = {

  //                                                                      STATEMENT  DATE:  SEP 30, 2016
  isStatementDate: (lineobj) => (typeof lineobj.line === 'string' && lineobj.line.match(/STATEMENT  DATE:/)),
  parseStatementDate: (lineobj) => {
    const parts = lineobj.line.match(/STATEMENT  DATE:  ([A-Z]{3} +[0-9]{1,2}, [0-9]{4})/);
    if (!parts) {
      throw parseErr(lineobj,'parseDate: date did not match regexp for line ('+lineobj.line+')');
    }
    return moment(parts[1],'MMM D, YYYY'); // SEP 30, 2016
  },

  //                                                                      ACCOUNT  NUMBER:  262 V8956
  isAcct: (lineobj) => ( typeof lineobj.line === 'string' && lineobj.line.match(/ACCOUNT  NUMBER:/)),
  parseAcct: (lineobj) => {
    const parts = lineobj.line.match(/ACCOUNT  NUMBER:  ([0-9]{3} V[0-9]{4,})/);
    if (!parts) {
      throw parseErr(lineobj,'parseAcct: account line did not match regexp for line '+lineobj.line);
    }
    return parts[1].trim().replace(' ','-'); // 262-V8956
  },

  //   DATE            LONG/BUY  SHRT/SELL      DESCRIPTION           EX   PRICE/LEGND CC          DEBIT            CREDIT
  isColumnTitles: (lineobj) => (typeof lineobj.line === 'string' && lineobj.line.match(/^ +DATE/)),
  isSectionSplit: lineobj => (typeof lineobj.line === 'string' && (
                               lineobj.line.match(/P O S I T I O N S   I N   Y O U R  A C C O U N T/)
                            || lineobj.line.match(/Y O U R   A C T I V I T Y   T H I S   M O N T H/)
                            || lineobj.line.match(/SEG USD/))),

  //   DATE            LONG/BUY  SHRT/SELL      DESCRIPTION           EX   PRICE/LEGND CC          DEBIT            CREDIT
  //  5/10/6                        9  PUT  DEC 16 CORN           350  A     NET PREM  US                         6,335.91
  isDate: (lineobj) => (typeof lineobj.line === 'string' && lineobj.line.match(/^ +([0-9]{1,2})\/([0-9]{2})\/([0-9]{1}) /)),
  parseDate: function(lineobj) {
    let line = lineobj.line.substr(0,9);
    const parts = line.match(/^ +([0-9]{1,2})\/([0-9]{2})\/([0-9]{1,}) /);
    if (!parts) throw parseErr(lineobj,'parseDate: date column ('+line+') does not match regexp');
    let month = parts[1];
    if (+month < 10) month = '0' + month;
    const day = parts[2];
    let year = parts[3];
    if (+year >= 10) throw parseErr('parseDate: year was not a single digit!');
    year = '201' + year;
    return moment(year+'-'+month+'-'+day,'YYYY-MM-DD');
  },

  // First line is example option transaction, second is example futures transaction
  //   DATE            LONG/BUY  SHRT/SELL      DESCRIPTION           EX   PRICE/LEGND CC          DEBIT            CREDIT
  //Activity:                                                                                                   111111111111111111
  //          111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999000000000011111111
  //0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567
  //  5/10/6                        9  PUT  DEC 16 CORN           350  A     NET PREM  US                         6,335.91
  //  5/25/6            10         10  DEC 16 CORN                     A          P&L  US                         4,625.00'},
  //Positions:
  //  9/24/4            10             DEC 16 CORN                     A     3.97 3/4  US       1,250.00
  parseBuy:  lineobj => +(lineobj.line.slice(16,26).trim()),
  parseSell: lineobj => +(lineobj.line.slice(27,33).trim()),
  parseQty:  lineobj => {
    const netqty = _LP.parseBuy(lineobj) - _LP.parseSell(lineobj); // negative for sell, positive for buy
    if (_LP.parseTxType(lineobj) === 'FUTURES') {
      if (netqty === 0) {
        if (_LP.hasInitialValuePerUnit(lineobj))
          throw parseErr(lineobj, 'parseQty: netqty is 0 and type is futures, but this is a positions line with an initialValuePerUnit.  That should not happen.');
        return 'XXXXXX'; // in activity, FUTURES lines are net 
      }
      if (!_LP.hasInitialValuePerUnit(lineobj))
        throw parseErr(lineobj, 'parseQty: line is FUTURES and is an activity line (no initialValuePerUnit), but netqty is not 0!');
      return netqty; // positions lines have a valid netqty
    }
    return netqty;
  },
  // parseDescription returns things like 'PUT DEC16 CORN 350'
  parseDescription: lineobj => lineobj.line.slice(35,65).trim()
                               .replace(/ +/g,' ') // get rid of extra spaces in the middle
                               .replace(/([A-Z]{3}) ([0-9]{2})/,'$1$2'), // gets rid of extra white space between month and year
  parseTradeMonth: lineobj => _LP.parseDescription(lineobj)
                              .replace(/^.*([A-Z]{3}[0-9]{2}).*$/,'$1'),
  parsePriceLegend: lineobj => lineobj.line.slice(71,81).trim(),
  parseTxType : lineobj => {
    const desc = _LP.parseDescription(lineobj);
    if (desc.match(/^PUT/)) return 'PUT';
    if (desc.match(/^CALL/)) return 'CALL';
    if (desc.match(/^Ach (Sent|Received)/)) return 'TRANSFER';
    // Futures are weird, because the true entries are added later after parsing
    // fee and/or P&L lines.  If this is a 'FUTURES' line from the original statement,
    // then it is either a P&L line or a FEES line only.
    if (desc.match(/^[A-F]{3}[0-9]{2}/)) {
      const pricelegend = _LP.parsePriceLegend(lineobj);
      if (pricelegend.match(/FEE\/COMM/)) return 'FEES';
      if (pricelegend.match(/P\&L/)) return 'FUTURES';
      if (_LP.hasInitialValuePerUnit(lineobj)) return 'FUTURES'; // this was a position line instead of an activity line
      throw parseErr(lineobj, 'parseTxType: line was futures activity (not positions), but PRICE/LEGND was neither P&L or FEE/COMM');
    }
    throw parseErr(lineobj, 'parseTxType: was not PUT, CALL, FUTURES, or CASH')
  },
  parseCommodity: lineobj => {
    const desc = _LP.parseDescription(lineobj);
    if (desc.match(/CORN/)) return 'CORN';
    if (desc.match(/SOYBEANS/)) return 'SOYBEANS';
    if (desc.match(/LIVE CATTLE/)) return 'LIVE CATTLE';
    if (desc.match(/Ach (Sent|Received)/)) return 'CASH';
    throw parseErr(lineobj, 'parseCommodity: was not CORN, SOYBEANS, or LIVE CATTLE')
  },
  hasStrike: lineobj => {
    const type = _LP.parseTxType(lineobj);
    return type === 'PUT' || type === 'CALL';
  },
  parseStrike: lineobj => {
    const desc = _LP.parseDescription(lineobj);
    const parts = desc.match(/ ([0-9]{3,4})$/);
    if (!parts) throw parseErr('parseStrike: description '+desc+' does not match regexp');
    const commodity = _LP.parseCommodity(lineobj);
    let divisor = 1.0;
    if (commodity === 'LIVE CATTLE')   divisor = 10.0;
    else if (commodity === 'CORN')     divisor = 100.0;
    else if (commodity === 'SOYBEANS') divisor = 100.0;
    else throw parseErr(lineobj, 'parseStrike: commodity '+commodity+' is not known for strike price divisor.  Only know LIVE CATTLE, CORN, and SOYBEANS.');
    return +(parts[1]) / divisor;
  },
  // can either be a number with a fraction, or 'NET PREM' for options
  // it's on the line under column "PRICE/LEGEND"
  hasInitialValuePerUnit: lineobj => {
    const str = _LP.parsePriceLegend(lineobj);
    return !!str.match(/^[0-9]*\.[0-9]{2}( +[0-9]{1}\/[0-9]{1})?/);
  },
  parseInitialValuePerUnit: lineobj => {
    const str = _LP.parsePriceLegend(lineobj);
    const parts = str.match(/^([0-9]*\.[0-9]{2}) *(([0-9])\/([0-9]))?$/);
    if (!parts) throw parseErr('parseInitialValuePerUnit: price/legend column ('+str+') did not match regexp!');
    let fraction = 0.0;
    if (parts[3] && parts[4]) fraction = 0.01 * (+parts[3]*1.0) / (+parts[4]*1.0);
    return +(parts[1]) + fraction;
  },
  parseDebit: lineobj => -1.0*+(lineobj.line.slice(87,100).replace(/,/g,'').trim()),
  parseCredit: lineobj => +(lineobj.line.slice(101,118).replace(/,/g,'').trim()),
  parseAmount: lineobj => _LP.parseCredit(lineobj) + _LP.parseDebit(lineobj),

  // Summary line parsers:
  parseSummaryType: lineobj => {
    const l = lineobj.line.slice(0,30).trim();
    if (l.match(/^1. BEGINNING ACCT BALANCE/)) return l;
    if (l.match(/^2. P&L AND CASH ACTIVITY/)) return l;
    if (l.match(/^3. ENDING ACCT BALANCE/)) return l;
    if (l.match(/^4. NET FUTURES P&L/)) return l;
    if (l.match(/^5. NET OPTION PREMIUM/)) return l;
    if (l.match(/^8. OPTIONS MARKET VALUE/)) return l;
    if (l.match(/^9. ACCT VALUE AT MARKET/)) return l;
    if (l.match(/^11. CONVERTED ACCT VALUE US/)) return l;
    throw parseErr('parseSummaryType: line type ('+l+') did not match known types.');
  },
  parseSummaryAmount: lineobj => {
    let l = lineobj.line.slice(32).trim();
    let multiplier = 1.0;
    if (l.match(/-$/)) multiplier = -1.0;
    l = l.replace('-','').replace(/,/g,'');
    return multiplier * (+l);
  },

};

module.exports = _LP;

