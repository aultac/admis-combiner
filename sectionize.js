const _ = require('lodash');

// Split array of lines into activity (if exists), positions, and summary
module.exports = input => {
  const {lines} = input;
  const output = _.cloneDeep(input);
  delete output.lines; // won't need those anymore when we're done

  let state = 'start'; // start -> foundactivity -> foundpositions -> foundseg
  const result = _.reduce(lines, (acc,lineobj) => {
    const line = lineobj.line; // also have lineno
    // If any of these lines are found at any time, change state:
          if (line.match(/Y O U R   A C T I V I T Y   T H I S   M O N T H/))   state = 'foundactivity';
    else  if (line.match(/P O S I T I O N S   I N   Y O U R   A C C O U N T/)) state = 'foundpositions';
    else  if (line.match(/\*\*\* SEG USD \*\*\*/))                             state = 'foundseg';
    else { // not a state-changing line, so push onto proper array
      switch(state) {
        case          'start':                              break;
        case  'foundactivity': acc.activity.push(lineobj);  break;
        case 'foundpositions': acc.positions.push(lineobj); break;
        case       'foundseg': acc.summary.push(lineobj);   break;
      }
    }
    return acc;
  },{activity: [], positions: [], summary: []});
  output.activity = result.activity;
  output.positions = result.positions;
  output.summary = result.summary;

  return output;
};

