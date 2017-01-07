const moment = require('moment');
const _ = require('lodash');

module.exports = (output,input) => {
  if (!output.activity) output.activity = [];
  if (!output.positions) output.positions = [];

  output.activity  = _.concat(output.activity,  input.activity);
  output.positions = _.concat(output.positions, input.positions);

  // re-sort by date
  _.sortBy(output.activity,  a => a.date.unix());
  _.sortBy(output.positions, p => p.date.unix());

  return output;
};
