const _ = require('lodash');

// Split array of lines into activity (if exists), positions, and summary
module.exports = input => {
  const {lines} = input;
  const output = _.cloneDeep(input);
  delete output.lines; // won't need those anymore when we're done

  let state = 'start'; // start -> foundactivity -> foundpositions -> foundseg
  const result = _.reduce(lines, (acc,lineobj) => {
    const line = lineobj.line; // also have lineno
    switch(state) {
      case 'start': if (line.match(/Y O U R   A C T I V I T Y   T H I S   M O N T H/)) 
                      state = 'foundactivity';
                    if (line.match(/P O S I T I O N S   I N   Y O U R   A C C O U N T/))
                      state = 'foundpositions';  // there wasn't any activity
        break;
      case 'foundactivity': if (line.match(/P O S I T I O N S   I N   Y O U R   A C C O U N T/))
                              state = 'foundpositions';
                            else
                              acc.activity.push(lineobj);
        break;
      case 'foundpositions': if (line.match(/\*\*\* SEG USD \*\*\*/))
                               state = 'foundseg';
                             else
                               acc.positions.push(lineobj);
        break;
      case 'foundseg': acc.summary.push(lineobj);
    }
    return acc;
  },{activity: [], positions: [], summary: []});
  output.activity = result.activity;
  output.positions = result.positions;
  output.summary = result.summary;

  return output;
};

