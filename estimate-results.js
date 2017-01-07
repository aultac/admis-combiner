const _ = require('lodash');
const sectionize = require('./sectionize');
const prune = require('./prune');

// Without fully parsing everything, estimate the total number of entries we should
// have so we can do a sanity check when it's all done
module.exports = input => {
  const output = _.cloneDeep(input);

  lines = _.cloneDeep(input.lines);

  // 1. Sort lines into sections: activity, positions, summary, prune useless lines
  const sections = prune(sectionize(lines));

  // 2. remaining lines should each represent one legit thing in result
  output.estimates = {
    activity: { 
      count: sections.activity.length,
    },
    positions: {
      count: sections.positions.length,
    },
    summary: {
      count: sections.summary.length,
    },
  };

  return output;
};


