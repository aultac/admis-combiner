const _ = require('lodash');
const {isDate} = require('./line-parsers.js');

module.exports = input => {
  let {activity,positions,summary} = input;
  const output = _.cloneDeep(input);

  // activity section:
  activity = removeNonDates(activity);
  activity = removeMatches(activity, / MEMO P&L /);

  // positions section
  positions = removeNonDates(positions);

  // summary section
  summary = removeUninterestingSummaryLines(summary);

  output.activity = activity;
  output.positions = positions;
  output.summary = summary;

  return output;
};

function removeNonDates(lines) {
  return _.filter(lines, lineobj => lineobj.line.match(/^ {1,2}[0-9]{1,2}\/[0-9]{2}\/[0-9] /));
}

function removeMatches(lines, regexp) {
  return _.filter(lines, lineobj => !lineobj.line.match(regexp));
}

function removeUninterestingSummaryLines(lines) {
  return _.filter(lines, (lineobj) => {
    const line = lineobj.line;
    return (   
         line.match(/BEGINNING ACCT BALANCE/)
      || line.match(/P&L AND CASH ACTIVITY/)
      || line.match(/ENDING ACCT BALANCE/)
      || line.match(/NET FUTURES P&L/)
      || line.match(/NET OPTION PREMIUM/)
      || line.match(/OPTIONS MARKET VALUE/)
      || line.match(/FUT OPEN TRADE EQUITY/)
      || line.match(/ACCT VALUE AT MARKET/)
      || line.match(/CONVERTED ACCT VALUE US/)
    );
  });
}

