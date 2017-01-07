module.exports = (lineobj,msg) => {
  if (typeof lineobj !== 'string')  {
    return new Error(lineobj.acct+'/'+lineobj.stmt+': LINE '+lineobj.lineno+': '+msg);
  }
  return new Error(lineobj); // otherwise, first item is just message
};
