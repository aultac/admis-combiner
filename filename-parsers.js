const moment = require('moment');
const path = require('path');

module.exports = (stmt_filename) => {
  stmt_filename = path.basename(stmt_filename); // in case directory prefix is on there 
  // 262-V8960:2016-04-29.txt
  let parts = stmt_filename.match(/^([0-9]{3}-V[0-9]{4}):/);
  if (!parts) throw new Error('filename-parsers: filename ('+stmt_filename+') does not match account name regexp');
  const acct = parts[1];

  parts = stmt_filename.match(/:([0-9]{4}-[0-9]{2}-[0-9]{2})\.txt$/);
  if (!parts) throw new Error('filename-parsers: parseDateFromFilename: filename ('+stmt_filename+') does not match regexp');
  const date = moment(parts[1],'YYYY-MM-DD');

  return {acct,date};

};
