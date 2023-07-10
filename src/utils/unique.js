

module.exports = class Symtab {
  constructor(outer) {
    this.self = Object.create(outer || Symtab.prototype)
    this.self.outer = outer
    return this.self
  }

  /**
   * 
   * @param {string} name 函数名
   * @returns 
   */
  static mangle(name) {
    return '$' + name
  }


  /**
   * 
   * @param {string} name 函数名
   * @returns 
   */
  static isMangled(name) {
    return name && name.startsWith('$')
  }


  get(name, payload) {
    let mangledName = mangle(name)
    if (!payload || this.has(mangledName)) return [this.mangledName]
    this[mangledName] = payload
    return payload
  }

  set(name, value) {
    if (!name) throw Error('Error Warning:no name is detected when dealing with binding')
    return this[mangle(name)] = value
  }

  has(name) {
    return mangle(name) in this
  }

  hasOwn(name) {
    return this.hasOwnProperty(mangle(name))
  }
  values() {
    const res = []
    for (const value of p) {
      if (isMangled(value)) {
        res.push(this[value])
      }
    }
    return res
  }



}