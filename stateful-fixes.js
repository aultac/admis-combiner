const _ = require ('lodash');
const chalk = require('chalk');
const err = require('./err');
const util = require('./util');

function statefulErr(message) {
  return err('stateful-fixes: '+message);
}

// Fill in any "stateful" info that can't be known from single line:
// - NOTE: options fees are already included in net premium on monthly statements.
// - fix buy/sell qty for futures P&L line above a fee using qty from fee
// - insert new buy/sell $0 amount item for fee that isn't preceded by closeout futures
// - remove any 'CANCEL' TX types

function newFuturesLineFromFees(fees,input) {
  const futures = _.cloneDeep(fees);
  const positions = input.positions;
  futures.txtype = 'FUTURES';
  futures.unitsPerContract = util.unitsPerContract(futures);
  futures.amount = 0; // initial futures value is always zero.
  futures.valuePerUnit = 'XXXXXX';
  // Now need to lookup initial valuePerUnit for this from positions.  This should
  // work 90% of the time, except when a futures transaction is exited the same
  // month it was made, meaning it's not in the final positions at end of month.
  // Of course, then there should be an offsetting entry in activity, but let's
  // leave that out for now.
  const matchingPosition = _.find(positions, p => {
    return (p.txtype     === 'FUTURES'
         && p.qty        === futures.qty
         && p.commodity  === futures.commodity
         && p.trademonth === futures.trademonth
         && p.date === futures.date
    );
  });
  if (!matchingPosition) {
    if (!_testmode) {
      console.log(chalk.yellow('-----------------------------------------------'));
      console.log(chalk.red('stateful-fixes: newFuturesLineFromFees: did not find futures transaction in positions.'));
      console.log(chalk.green('acct: '+fees.acct+', stmt: '+fees.stmt));
      console.log(chalk.green( futures.date.toString()+'\t'
                              +futures.txtype+'\t'
                              +futures.qty+'\t'
                              +futures.commodity+'\t'
                              +futures.trademonth+'\t'));
      console.log(chalk.yellow('Must have been made and then gotten out of in same month.'));
      console.log(chalk.yellow('Check activity log for total transaction.  valuePerUnit in Excel will be ')+chalk.green('XXXXXX'));
      console.log(chalk.yellow('-----------------------------------------------'));
    }
  } else
    futures.valuePerUnit = matchingPosition.initialValuePerUnit;
  return futures;
}

function main(input) {
  const {activity,positions} = input;
  const output = _.cloneDeep(input);

  output.activity = _.reduce(activity, (acc,obj,index) => {
    // If this is a 'CANCEL' line, don't push it onto accumulator
    if (obj.txtype === 'CANCEL') return acc;

    // If this is a futures line, need to fill in qty from line below it
    if (obj.txtype === 'FUTURES') {
      if (obj.qty !== 'XXXXXX')
        throw statefulErr('line is FUTURES line, but qty ('+obj.qty+') is not XXXXXX.  Should not have quantity before fixing from FEES line below it.');
      if (index >= activity.length)
        throw statefulErr('FUTURES line ended activity log, was expecting a FEES line after it.');
      if (activity[index+1].txtype !== 'FEES')
        throw statefulErr('FUTURES line was not followed by line with txtype FEES: it was ('+activity[index+1].txtype+') instead');
      obj.qty = activity[index+1].qty;
    }

    // If this is a fees line, need to figure out if it's for initial futures transaction and
    // add both the initial FUTURES transaction and the fees line
    if (obj.txtype === 'FEES') {
      if (index === 0 || activity[index-1].txtype !== 'FUTURES') {
        acc.push(newFuturesLineFromFees(obj,input));
      }
    }

    acc.push(obj);
    return acc;
  },[]);

  return output;
};

let _testmode = false;
main.testmode = function() {
  _testmode = true;
}

module.exports = main;
