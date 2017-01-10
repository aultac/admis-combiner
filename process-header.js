const _ = require('lodash');
const moment = require('moment');
const err = require('./err');
const {isStatementDate, isSectionSplit, parseStatementDate, isAcct, parseAcct, isColumnTitles} = require('./line-parsers.js');

function headerErr(lineobj,msg) {
  return err(lineobj, 'process-header: ' + msg);
}

module.exports = input => {
  const {lines} = input;
  const output = _.cloneDeep(input);

  let inHeader = false;
  let headerLineCount = 0;
  let acct = '';
  let stmt_date = '';

  output.lines = _.reduce(lines, (acc,lineobj) => {
    // Parse any useful data before deciding state machine
    if (isStatementDate(lineobj)) stmtdate = parseStatementDate(lineobj);
    if (isAcct(lineobj))          acct     = parseAcct(lineobj);

    // if inHeader, look for last header line and don't push any lines
    if (inHeader) {
      if (   lineobj.line.match(/Y O U R   A C T I V I T Y   T H I S   M O N T H/)
          || lineobj.line.match(/P O S I T I O N S   I N   Y O U R   A C C O U N T/)) {
        acc.push(lineobj); // The initial header has this indicator line for activity actually before the 
        return acc;        // column titles line, so include it in output and don't count against header linecount.
      }
      headerLineCount++;
      if (isColumnTitles(lineobj) || isSectionSplit(lineobj)) {
        // There is an edge case where *** SEG USD *** line which starts summary is located
        // immediately below header.  In that case, you have to push the current line 
        // because the sectionizer needs the SEG USD line to find start of summary
        if (lineobj.line.match(/\*\*\* SEG USD \*\*\*/)) acc.push(lineobj);
        inHeader = false; // next line is keeper
        if (headerLineCount !== 11) {
          throw headerErr('headerLineCount !== 11 , it is '+headerLineCount+' instead for statement '+input.stmt);
        }
      }
      return acc;
    }
    if (isStatementDate(lineobj)) { // start of header
      inHeader = true;
      headerLineCount = 1;
      return acc;
    }
    // on first page, a column title line is still possible:
    if (!isColumnTitles(lineobj)) acc.push(lineobj);
    return acc;
  },[]);
  output.header = {acct,stmtdate};

  return output;
};

