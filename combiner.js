const moment = require('moment');
const _ = require('lodash');

module.exports = (output,input) => {
  if (!output.activity) output.activity = [];
  if (!output.positions) output.positions = [];
  if (!output.summary) output.summary = [];

  output.activity  = _.concat(output.activity,  input.activity);
  output.positions = _.concat(output.positions, input.positions);

  // re-sort by date
  output.activity = _.sortBy(output.activity,  a => a.date.unix());
  output.positions = _.sortBy(output.positions, p => p.date.unix());

  // Add together starting and ending balances across all accounts:
  _.each(input.summary, i => {
    const outindex = _.findIndex(output.summary, s => s.type === i.type);
    if (outindex < 0) {
      // this input item does not exist in output, put it in verbatim
      output.summary.push(i);
    } else {
      // this input item already exists in output, add them together.
      output.summary[outindex].amount += i.amount;
    }
  });

  return output;
};
