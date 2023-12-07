function errorLog(err, payload) {
  console.log('-----------ERROR--------------');
  console.log(payload ? payload + '----' + err : err)
  console.log('-----------*****--------------');
}

function messageLog(msg, payload) {
  console.log('--------- ******** ------------');
  console.log(payload ? msg + '----' + payload : msg)
  console.log('--------- ******** ------------');
}

function timeLog(msg, cb) {
  console.log(`--------- ${msg} start ---------`);
  let startTime = new Date()
  cb()
  console.log(`${msg} costs ${new Date() - startTime}(ms)`);
  console.log(`--------- ${msg} end -----------`);
}



module.exports.errorLog = errorLog
module.exports.timeLog = timeLog
module.exports.messageLog = messageLog