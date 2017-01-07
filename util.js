const err = require('./err');

module.exports = {
  unitsPerContract: obj => {
    const {commodity,txtype} = obj;
    if (txtype === 'FEES') return 1;
    if (commodity === 'CASH') return 1;
    if (commodity === 'LIVE CATTLE') return 400;
    if (commodity === 'CORN') return 5000;
    if (commodity === 'SOYBEANS') return 5000;
    throw err('util.unitsPerContract: commodity ('+commodity+') is not a known commodity');
  },
};
