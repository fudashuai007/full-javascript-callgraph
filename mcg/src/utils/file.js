const path = require('path')
const fs = require('fs')

// 获取文件目录
function getDir(dirname) {
  return path.resolve(process.cwd(), dirname);
}

// 获取所有js或ts文件列表
function getAllFiles(dirname, recurse = false, listOfFiles) {
  let baseListOfFiles = fs.readdirSync(dirname)

  baseListOfFiles.forEach(function (file) {
    if (fs.statSync(dirname + '/' + file).isDirectory() && recurse) {
      listOfFiles = getAllFiles(dirname + '/' + file, recurse, listOfFiles)
    } else {
      if (file.endsWith('.js') || file.endsWith('.ts')) {
        listOfFiles.push(path.join( dirname, '/', file))
      }
    }
  })

  return listOfFiles.flat(Infinity)
}
// 检测是否是合法文件夹
function checkDirectoryValidate(path) {
  return fs.lstatSync(path).isDirectory()
}

module.exports.getDir = getDir
module.exports.getAllFiles = getAllFiles
module.exports.checkDirectoryValidate = checkDirectoryValidate
