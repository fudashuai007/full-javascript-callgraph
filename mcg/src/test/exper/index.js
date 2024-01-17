function flush() {
  /* jshint loopfunc: true */
  var task, domain;

  while (head.next) {
      head = head.next;
      task = head.task;
      head.task = void 0;
      domain = head.domain;

      if (domain) {
          head.domain = void 0;
          domain.enter();
      }
      runSingle(task, domain);

  }
  while (laterQueue.length) {
      task = laterQueue.pop();
      runSingle(task);
  }
  flushing = false;
}

flush()