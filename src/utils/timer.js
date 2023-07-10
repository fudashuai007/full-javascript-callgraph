export default class Timer {
  startTime
  constructor() {
    this.startTime = new Date()
  }


  timeEnd() {
    return new Date().getTime() - this.startTime.getTime()
  }
}

