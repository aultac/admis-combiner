const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const chalk = require('chalk');
const path = require('path');
const parseFilename = require('./filename-parsers.js');

module.exports = stmt => {
  console.log(chalk.green('Found Statement: ' + stmt));
  const {acct,date} = parseFilename(stmt);

  return fs.readFileAsync(stmt)
  .then(stmt_buffer => {
    return {
      acct,
      date,
      stmt: path.basename(stmt),
      stmt_buffer
    };
  });
};
