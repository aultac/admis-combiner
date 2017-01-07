const _ = require('lodash');

module.exports = input => {
  const {acct,date,stmt,stmt_buffer} = input;
  const output = _.cloneDeep(input);
  delete output.stmt_buffer;

  const orig_lines = stmt_buffer.toString().split('\n');
  output.lines = _.map(orig_lines,(line,lineno) => {
    return { 
      line,
      lineno,
      acct,
      stmt,
    }; // store original line number with line for debugging
  });
  delete output.stmt_buffer;

  return output;
};

