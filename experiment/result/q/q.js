let stubs = new (require('d:\developDirs\full-js-callgrapgh/stubbifier_cjs.cjs'))('d:\developDirs\full-js-callgrapgh\experiment\result\q\q.js', true);
// vim:ts=4:sts=4:sw=4:
/*!
 *
 * Copyright 2009-2017 Kris Kowal under the terms of the MIT
 * license found at https://github.com/kriskowal/q/blob/v1/LICENSE
 *
 * With parts by Tyler Close
 * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
 * at http://www.opensource.org/licenses/mit-license.html
 * Forked at ref_send.js version: 2009-05-11
 *
 * With parts by Mark Miller
 * Copyright (C) 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

(function (definition) {
  "use strict";

  // This file will function properly as a <script> tag, or a module
  // using CommonJS and NodeJS or RequireJS module formats.  In
  // Common/Node/RequireJS, the module exports the Q API and when
  // executed as a simple <script>, it creates a Q global instead.

  // Montage Require
  if (typeof bootstrap === "function") {
    bootstrap("promise", definition);

    // CommonJS
  } else if (typeof exports === "object" && typeof module === "object") {
    module.exports = definition();

    // RequireJS
  } else if (typeof define === "function" && define.amd) {
    define(definition);

    // SES (Secure EcmaScript)
  } else if (typeof ses !== "undefined") {
    if (!ses.ok()) {
      return;
    } else {
      ses.makeQ = definition;
    }

    // <script>
  } else if (typeof window !== "undefined" || typeof self !== "undefined") {
    // Prefer window over self for add-on scripts. Use self for
    // non-windowed contexts.
    var global = typeof window !== "undefined" ? window : self;

    // Get the `window` object, save the previous Q global
    // and initialize Q as a global.
    var previousQ = global.Q;
    global.Q = definition();

    // Add a noConflict function so Q can be removed from the
    // global namespace.
    global.Q.noConflict = function () {
      global.Q = previousQ;
      return this;
    };
  } else {
    throw new Error("This environment was not anticipated by Q. Please file a bug.");
  }
})(function () {
  "use strict";

  var hasStacks = false;
  try {
    throw new Error();
  } catch (e) {
    hasStacks = !!e.stack;
  }

  // All code after this point will be filtered from stack traces reported
  // by Q.
  var qStartingLine = captureLine();
  var qFileName;

  // shims

  // used for fallback in "allResolved"
  var noop = function () {};

  // Use the fastest possible means to execute a task in a future turn
  // of the event loop.
  var nextTick = function () {
    // linked list of tasks (single, with head node)
    var head = {
      task: void 0,
      next: null
    };
    var tail = head;
    var flushing = false;
    var requestTick = void 0;
    var isNodeJS = false;
    // queue for late tasks, used by unhandled rejection tracking
    var laterQueue = [];
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
    // runs a single function in the async queue
    function runSingle(task, domain) {
      try {
        task();
      } catch (e) {
        if (isNodeJS) {
          // In node, uncaught exceptions are considered fatal errors.
          // Re-throw them synchronously to interrupt flushing!

          // Ensure continuation if the uncaught exception is suppressed
          // listening "uncaughtException" events (as domains does).
          // Continue in next event to avoid tick recursion.
          if (domain) {
            domain.exit();
          }
          setTimeout(flush, 0);
          if (domain) {
            domain.enter();
          }
          throw e;
        } else {
          // In browsers, uncaught exceptions are not fatal.
          // Re-throw them asynchronously to avoid slow-downs.
          setTimeout(function () {
            throw e;
          }, 0);
        }
      }
      if (domain) {
        domain.exit();
      }
    }
    nextTick = function (task) {
      tail = tail.next = {
        task: task,
        domain: isNodeJS && process.domain,
        next: null
      };
      if (!flushing) {
        flushing = true;
        requestTick();
      }
    };
    if (typeof process === "object" && process.toString() === "[object process]" && process.nextTick) {
      // Ensure Q is in a real Node environment, with a `process.nextTick`.
      // To see through fake Node environments:
      // * Mocha test runner - exposes a `process` global without a `nextTick`
      // * Browserify - exposes a `process.nexTick` function that uses
      //   `setTimeout`. In this case `setImmediate` is preferred because
      //    it is faster. Browserify's `process.toString()` yields
      //   "[object Object]", while in a real Node environment
      //   `process.toString()` yields "[object process]".
      isNodeJS = true;
      requestTick = function () {
        process.nextTick(flush);
      };
    } else if (typeof setImmediate === "function") {
      // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
      if (typeof window !== "undefined") {
        requestTick = setImmediate.bind(window, flush);
      } else {
        requestTick = function () {
          setImmediate(flush);
        };
      }
    } else if (typeof MessageChannel !== "undefined") {
      // modern browsers
      // http://www.nonblocking.io/2011/06/windownexttick.html
      var channel = new MessageChannel();
      // At least Safari Version 6.0.5 (8536.30.1) intermittently cannot create
      // working message ports the first time a page loads.
      channel.port1.onmessage = function () {
        requestTick = requestPortTick;
        channel.port1.onmessage = flush;
        flush();
      };
      var requestPortTick = function () {
        // Opera requires us to provide a message payload, regardless of
        // whether we use it.
        channel.port2.postMessage(0);
      };
      requestTick = function () {
        setTimeout(flush, 0);
        requestPortTick();
      };
    } else {
      // old browsers
      requestTick = function () {
        setTimeout(flush, 0);
      };
    }
    // runs a task after all other tasks have been run
    // this is useful for unhandled rejection tracking that needs to happen
    // after all `then`d tasks have been run.
    nextTick.runAfter = function (task) {
      laterQueue.push(task);
      if (!flushing) {
        flushing = true;
        requestTick();
      }
    };
    return nextTick;
  }();

  // Attempt to make generics safe in the face of downstream
  // modifications.
  // There is no situation where this is necessary.
  // If you need a security guarantee, these primordials need to be
  // deeply frozen anyway, and if you don’t need a security guarantee,
  // this is just plain paranoid.
  // However, this **might** have the nice side-effect of reducing the size of
  // the minified code by reducing x.call() to merely x()
  // See Mark Miller’s explanation of what this does.
  // http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
  var call = Function.call;
  function uncurryThis(f) {
    return function () {
      return call.apply(f, arguments);
    };
  }
  // This is equivalent, but slower:
  // uncurryThis = Function_bind.bind(Function_bind.call);
  // http://jsperf.com/uncurrythis

  var array_slice = uncurryThis(Array.prototype.slice);
  var array_reduce = uncurryThis(Array.prototype.reduce || function (callback, basis) {
    let fctID = "gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_273_57_298_5";
    let toExecString = stubs.getStub(fctID);
    if (!toExecString) {
      toExecString = stubs.getCode(fctID);
      stubs.setStub(fctID, toExecString);
    }
    let toExec = eval(toExecString);
    toExec = stubs.copyFunctionProperties(this, toExec);
    toExec.stubbifierExpandedStub = true;
    return toExec.apply(this, arguments);
  });
  var array_indexOf = uncurryThis(Array.prototype.indexOf || function (value) {
    let fctID = "gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_302_48_310_5";
    let toExecString = stubs.getStub(fctID);
    if (!toExecString) {
      toExecString = stubs.getCode(fctID);
      stubs.setStub(fctID, toExecString);
    }
    let toExec = eval(toExecString);
    toExec = stubs.copyFunctionProperties(this, toExec);
    toExec.stubbifierExpandedStub = true;
    return toExec.apply(this, arguments);
  });
  var array_map = uncurryThis(Array.prototype.map || function (callback, thisp) {
    let fctID = "gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_314_54_321_5";
    let toExecString = stubs.getStub(fctID);
    if (!toExecString) {
      toExecString = stubs.getCode(fctID);
      stubs.setStub(fctID, toExecString);
    }
    let toExec = eval(toExecString);
    toExec = stubs.copyFunctionProperties(this, toExec);
    toExec.stubbifierExpandedStub = true;
    return toExec.apply(this, arguments);
  });
  var object_create = Object.create || function (prototype) {
    function Type() {}
    Type.prototype = prototype;
    return new Type();
  };
  var object_defineProperty = Object.defineProperty || function (obj, prop, descriptor) {
    obj[prop] = descriptor.value;
    return obj;
  };
  var object_hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);
  var object_keys = Object.keys || function (object) {
    let fctID = "gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_337_51_345_1";
    let toExecString = stubs.getStub(fctID);
    if (!toExecString) {
      toExecString = stubs.getCode(fctID);
      stubs.setStub(fctID, toExecString);
    }
    let toExec = eval(toExecString);
    toExec = stubs.copyFunctionProperties(this, toExec);
    toExec.stubbifierExpandedStub = true;
    return toExec.apply(this, arguments);
  };
  var object_toString = uncurryThis(Object.prototype.toString);
  function isObject(value) {
    return value === Object(value);
  }

  // generator related shims

  // FIXME: Remove this function once ES6 generators are in SpiderMonkey.
  function isStopIteration(exception) {
    return object_toString(exception) === "[object StopIteration]" || exception instanceof QReturnValue;
  }

  // FIXME: Remove this helper and Q.return once ES6 generators are in
  // SpiderMonkey.
  var QReturnValue;
  if (typeof ReturnValue !== "undefined") {
    QReturnValue = ReturnValue;
  } else {
    QReturnValue = function (value) {
      this.value = value;
    };
  }

  // long stack traces

  var STACK_JUMP_SEPARATOR = "From previous event:";
  function makeStackTraceLong(error, promise) {
    // If possible, transform the error stack trace by removing Node and Q
    // cruft, then concatenating with the stack trace of `promise`. See #57.
    if (hasStacks && promise.stack && typeof error === "object" && error !== null && error.stack) {
      var stacks = [];
      for (var p = promise; !!p; p = p.source) {
        if (p.stack && (!error.__minimumStackCounter__ || error.__minimumStackCounter__ > p.stackCounter)) {
          object_defineProperty(error, "__minimumStackCounter__", {
            value: p.stackCounter,
            configurable: true
          });
          stacks.unshift(p.stack);
        }
      }
      stacks.unshift(error.stack);
      var concatedStacks = stacks.join("\n" + STACK_JUMP_SEPARATOR + "\n");
      var stack = filterStackString(concatedStacks);
      object_defineProperty(error, "stack", {
        value: stack,
        configurable: true
      });
    }
  }
  function filterStackString(stackString) {
    let toExec = eval(stubs.getCode("gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_402_40_413_1"));
    toExec = stubs.copyFunctionProperties(filterStackString, toExec);
    filterStackString = toExec;
    return toExec.apply(this, arguments);
  }
  function isNodeFrame(stackLine) {
    return stackLine.indexOf("(module.js:") !== -1 || stackLine.indexOf("(node.js:") !== -1;
  }
  function getFileNameAndLineNumber(stackLine) {
    // Named functions: "at functionName (filename:lineNumber:columnNumber)"
    // In IE10 function name can have spaces ("Anonymous function") O_o
    var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
    if (attempt1) {
      return [attempt1[1], Number(attempt1[2])];
    }

    // Anonymous functions: "at filename:lineNumber:columnNumber"
    var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
    if (attempt2) {
      return [attempt2[1], Number(attempt2[2])];
    }

    // Firefox style: "function@filename:lineNumber or @filename:lineNumber"
    var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
    if (attempt3) {
      return [attempt3[1], Number(attempt3[2])];
    }
  }
  function isInternalFrame(stackLine) {
    let toExec = eval(stubs.getCode("gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_441_36_454_1"));
    toExec = stubs.copyFunctionProperties(isInternalFrame, toExec);
    isInternalFrame = toExec;
    return toExec.apply(this, arguments);
  }

  // discover own file name and line number range for filtering stack
  // traces
  function captureLine() {
    if (!hasStacks) {
      return;
    }
    try {
      throw new Error();
    } catch (e) {
      var lines = e.stack.split("\n");
      var firstLine = lines[0].indexOf("@") > 0 ? lines[1] : lines[2];
      var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
      if (!fileNameAndLineNumber) {
        return;
      }
      qFileName = fileNameAndLineNumber[0];
      return fileNameAndLineNumber[1];
    }
  }
  function deprecate(callback, name, alternative) {
    return function () {
      let fctID = "gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_479_23_486_5";
      let toExecString = stubs.getStub(fctID);
      if (!toExecString) {
        toExecString = stubs.getCode(fctID);
        stubs.setStub(fctID, toExecString);
      }
      let toExec = eval(toExecString);
      toExec = stubs.copyFunctionProperties(this, toExec);
      toExec.stubbifierExpandedStub = true;
      return toExec.apply(this, arguments);
    };
  }

  // end of shims
  // beginning of real work

  /**
   * Constructs a promise for an immediate reference, passes promises through, or
   * coerces promises from different systems.
   * @param value immediate reference or promise
   */
  function Q(value) {
    // If the object is already a Promise, return it directly.  This enables
    // the resolve function to both be used to created references from objects,
    // but to tolerably coerce non-promises to promises.
    if (value instanceof Promise) {
      return value;
    }

    // assimilate thenables
    if (isPromiseAlike(value)) {
      return coerce(value);
    } else {
      return fulfill(value);
    }
  }
  Q.resolve = Q;

  /**
   * Performs a task in a future turn of the event loop.
   * @param {Function} task
   */
  Q.nextTick = nextTick;

  /**
   * Controls whether or not long stack traces will be on
   */
  Q.longStackSupport = false;

  /**
   * The counter is used to determine the stopping point for building
   * long stack traces. In makeStackTraceLong we walk backwards through
   * the linked list of promises, only stacks which were created before
   * the rejection are concatenated.
   */
  var longStackCounter = 1;

  // enable long stacks if Q_DEBUG is set
  if (typeof process === "object" && process && process.env && process.env.Q_DEBUG) {
    Q.longStackSupport = true;
  }

  /**
   * Constructs a {promise, resolve, reject} object.
   *
   * `resolve` is a callback to invoke with a more resolved value for the
   * promise. To fulfill the promise, invoke `resolve` with any value that is
   * not a thenable. To reject the promise, invoke `resolve` with a rejected
   * thenable, or invoke `reject` with the reason directly. To resolve the
   * promise to another thenable, thus putting it in the same state, invoke
   * `resolve` with that other thenable.
   */
  Q.defer = defer;
  function defer() {
    // if "messages" is an "Array", that indicates that the promise has not yet
    // been resolved.  If it is "undefined", it has been resolved.  Each
    // element of the messages array is itself an array of complete arguments to
    // forward to the resolved promise.  We coerce the resolution value to a
    // promise using the `resolve` function because it handles both fully
    // non-thenable values and other thenables gracefully.
    var messages = [],
      progressListeners = [],
      resolvedPromise;
    var deferred = object_create(defer.prototype);
    var promise = object_create(Promise.prototype);
    promise.promiseDispatch = function (resolve, op, operands) {
      var args = array_slice(arguments);
      if (messages) {
        messages.push(args);
        if (op === "when" && operands[1]) {
          // progress operand
          progressListeners.push(operands[1]);
        }
      } else {
        Q.nextTick(function () {
          resolvedPromise.promiseDispatch.apply(resolvedPromise, args);
        });
      }
    };

    // XXX deprecated
    promise.valueOf = function () {
      let fctID = "gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_576_34_585_5";
      let toExecString = stubs.getStub(fctID);
      if (!toExecString) {
        toExecString = stubs.getCode(fctID);
        stubs.setStub(fctID, toExecString);
      }
      let toExec = eval(toExecString);
      toExec = stubs.copyFunctionProperties(this, toExec);
      toExec.stubbifierExpandedStub = true;
      return toExec.apply(this, arguments);
    };
    promise.inspect = function () {
      if (!resolvedPromise) {
        return {
          state: "pending"
        };
      }
      return resolvedPromise.inspect();
    };
    if (Q.longStackSupport && hasStacks) {
      try {
        throw new Error();
      } catch (e) {
        // NOTE: don't try to use `Error.captureStackTrace` or transfer the
        // accessor around; that causes memory leaks as per GH-111. Just
        // reify the stack trace as a string ASAP.
        //
        // At the same time, cut off the first line; it's always just
        // "[object Promise]\n", as per the `toString`.
        promise.stack = e.stack.substring(e.stack.indexOf("\n") + 1);
        promise.stackCounter = longStackCounter++;
      }
    }

    // NOTE: we do the checks for `resolvedPromise` in each method, instead of
    // consolidating them into `become`, since otherwise we'd create new
    // promises with the lines `become(whatever(value))`. See e.g. GH-252.

    function become(newPromise) {
      resolvedPromise = newPromise;
      if (Q.longStackSupport && hasStacks) {
        // Only hold a reference to the new promise if long stacks
        // are enabled to reduce memory usage
        promise.source = newPromise;
      }
      array_reduce(messages, function (undefined, message) {
        Q.nextTick(function () {
          newPromise.promiseDispatch.apply(newPromise, message);
        });
      }, void 0);
      messages = void 0;
      progressListeners = void 0;
    }
    deferred.promise = promise;
    deferred.resolve = function (value) {
      if (resolvedPromise) {
        return;
      }
      become(Q(value));
    };
    deferred.fulfill = function (value) {
      let fctID = "gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_641_40_647_5";
      let toExecString = stubs.getStub(fctID);
      if (!toExecString) {
        toExecString = stubs.getCode(fctID);
        stubs.setStub(fctID, toExecString);
      }
      let toExec = eval(toExecString);
      toExec = stubs.copyFunctionProperties(this, toExec);
      toExec.stubbifierExpandedStub = true;
      return toExec.apply(this, arguments);
    };
    deferred.reject = function (reason) {
      if (resolvedPromise) {
        return;
      }
      become(reject(reason));
    };
    deferred.notify = function (progress) {
      let fctID = "gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_655_42_665_5";
      let toExecString = stubs.getStub(fctID);
      if (!toExecString) {
        toExecString = stubs.getCode(fctID);
        stubs.setStub(fctID, toExecString);
      }
      let toExec = eval(toExecString);
      toExec = stubs.copyFunctionProperties(this, toExec);
      toExec.stubbifierExpandedStub = true;
      return toExec.apply(this, arguments);
    };
    return deferred;
  }

  /**
   * Creates a Node-style callback that will resolve or reject the deferred
   * promise.
   * @returns a nodeback
   */
  defer.prototype.makeNodeResolver = function () {
    let fctID = "gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_675_47_686_1";
    let toExecString = stubs.getStub(fctID);
    if (!toExecString) {
      toExecString = stubs.getCode(fctID);
      stubs.setStub(fctID, toExecString);
    }
    let toExec = eval(toExecString);
    toExec = stubs.copyFunctionProperties(this, toExec);
    toExec.stubbifierExpandedStub = true;
    return toExec.apply(this, arguments);
  };

  /**
   * @param resolver {Function} a function that returns nothing and accepts
   * the resolve, reject, and notify functions for a deferred.
   * @returns a promise that may be resolved with the given resolve and reject
   * functions, or rejected by a thrown exception in resolver
   */
  Q.Promise = promise; // ES6
  Q.promise = promise;
  function promise(resolver) {
    let toExec = eval(stubs.getCode("gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_696_27_707_1"));
    toExec = stubs.copyFunctionProperties(promise, toExec);
    promise = toExec;
    return toExec.apply(this, arguments);
  }
  promise.race = race; // ES6
  promise.all = all; // ES6
  promise.reject = reject; // ES6
  promise.resolve = Q; // ES6

  // XXX experimental.  This method is a way to denote that a local value is
  // serializable and should be immediately dispatched to a remote upon request,
  // instead of passing a reference.
  Q.passByCopy = function (object) {
    //freeze(object);
    //passByCopies.set(object, true);
    return object;
  };
  Promise.prototype.passByCopy = function () {
    //freeze(object);
    //passByCopies.set(object, true);
    return this;
  };

  /**
   * If two promises eventually fulfill to the same value, promises that value,
   * but otherwise rejects.
   * @param x {Any*}
   * @param y {Any*}
   * @returns {Any*} a promise for x and y if they are the same, but a rejection
   * otherwise.
   *
   */
  Q.join = function (x, y) {
    return Q(x).join(y);
  };
  Promise.prototype.join = function (that) {
    let fctID = "gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_742_41_751_1";
    let toExecString = stubs.getStub(fctID);
    if (!toExecString) {
      toExecString = stubs.getCode(fctID);
      stubs.setStub(fctID, toExecString);
    }
    let toExec = eval(toExecString);
    toExec = stubs.copyFunctionProperties(this, toExec);
    toExec.stubbifierExpandedStub = true;
    return toExec.apply(this, arguments);
  };

  /**
   * Returns a promise for the first of an array of promises to become settled.
   * @param answers {Array[Any*]} promises to race
   * @returns {Any*} the first promise to be settled
   */
  Q.race = race;
  function race(answerPs) {
    let toExec = eval(stubs.getCode("gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_759_24_770_1"));
    toExec = stubs.copyFunctionProperties(race, toExec);
    race = toExec;
    return toExec.apply(this, arguments);
  }
  Promise.prototype.race = function () {
    return this.then(Q.race);
  };

  /**
   * Constructs a Promise with a promise descriptor object and optional fallback
   * function.  The descriptor contains methods like when(rejected), get(name),
   * set(name, value), post(name, args), and delete(name), which all
   * return either a value, a promise for a value, or a rejection.  The fallback
   * accepts the operation name, a resolver, and any further arguments that would
   * have been forwarded to the appropriate method above had a method been
   * provided with the proper name.  The API makes no guarantees about the nature
   * of the returned object, apart from that it is usable wherever promises are
   * bought and sold.
   */
  Q.makePromise = Promise;
  function Promise(descriptor, fallback, inspect) {
    if (fallback === void 0) {
      fallback = function (op) {
        return reject(new Error("Promise does not support operation: " + op));
      };
    }
    if (inspect === void 0) {
      inspect = function () {
        return {
          state: "unknown"
        };
      };
    }
    var promise = object_create(Promise.prototype);
    promise.promiseDispatch = function (resolve, op, args) {
      var result;
      try {
        if (descriptor[op]) {
          result = descriptor[op].apply(promise, args);
        } else {
          result = fallback.call(promise, op, args);
        }
      } catch (exception) {
        result = reject(exception);
      }
      if (resolve) {
        resolve(result);
      }
    };
    promise.inspect = inspect;

    // XXX deprecated `valueOf` and `exception` support
    if (inspect) {
      var inspected = inspect();
      if (inspected.state === "rejected") {
        promise.exception = inspected.reason;
      }
      promise.valueOf = function () {
        var inspected = inspect();
        if (inspected.state === "pending" || inspected.state === "rejected") {
          return promise;
        }
        return inspected.value;
      };
    }
    return promise;
  }
  Promise.prototype.toString = function () {
    return "[object Promise]";
  };
  Promise.prototype.then = function (fulfilled, rejected, progressed) {
    var self = this;
    var deferred = defer();
    var done = false; // ensure the untrusted promise makes at most a
    // single call to one of the callbacks

    function _fulfilled(value) {
      try {
        return typeof fulfilled === "function" ? fulfilled(value) : value;
      } catch (exception) {
        return reject(exception);
      }
    }
    function _rejected(exception) {
      if (typeof rejected === "function") {
        makeStackTraceLong(exception, self);
        try {
          return rejected(exception);
        } catch (newException) {
          return reject(newException);
        }
      }
      return reject(exception);
    }
    function _progressed(value) {
      return typeof progressed === "function" ? progressed(value) : value;
    }
    Q.nextTick(function () {
      self.promiseDispatch(function (value) {
        if (done) {
          return;
        }
        done = true;
        deferred.resolve(_fulfilled(value));
      }, "when", [function (exception) {
        if (done) {
          return;
        }
        done = true;
        deferred.resolve(_rejected(exception));
      }]);
    });

    // Progress propagator need to be attached in the current tick.
    self.promiseDispatch(void 0, "when", [void 0, function (value) {
      let fctID = "gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_895_67_912_5";
      let toExecString = stubs.getStub(fctID);
      if (!toExecString) {
        toExecString = stubs.getCode(fctID);
        stubs.setStub(fctID, toExecString);
      }
      let toExec = eval(toExecString);
      toExec = stubs.copyFunctionProperties(this, toExec);
      toExec.stubbifierExpandedStub = true;
      return toExec.apply(this, arguments);
    }]);
    return deferred.promise;
  };
  Q.tap = function (promise, callback) {
    return Q(promise).tap(callback);
  };

  /**
   * Works almost like "finally", but not called for rejections.
   * Original resolution value is passed through callback unaffected.
   * Callback may return a promise that will be awaited for.
   * @param {Function} callback
   * @returns {Q.Promise}
   * @example
   * doSomething()
   *   .then(...)
   *   .tap(console.log)
   *   .then(...);
   */
  Promise.prototype.tap = function (callback) {
    let fctID = "gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_933_44_939_1";
    let toExecString = stubs.getStub(fctID);
    if (!toExecString) {
      toExecString = stubs.getCode(fctID);
      stubs.setStub(fctID, toExecString);
    }
    let toExec = eval(toExecString);
    toExec = stubs.copyFunctionProperties(this, toExec);
    toExec.stubbifierExpandedStub = true;
    return toExec.apply(this, arguments);
  };

  /**
   * Registers an observer on a promise.
   *
   * Guarantees:
   *
   * 1. that fulfilled and rejected will be called only once.
   * 2. that either the fulfilled callback or the rejected callback will be
   *    called, but not both.
   * 3. that fulfilled and rejected will not be called in this turn.
   *
   * @param value      promise or immediate reference to observe
   * @param fulfilled  function to be called with the fulfilled value
   * @param rejected   function to be called with the rejection exception
   * @param progressed function to be called on any progress notifications
   * @return promise for the return value from the invoked callback
   */
  Q.when = when;
  function when(value, fulfilled, rejected, progressed) {
    return Q(value).then(fulfilled, rejected, progressed);
  }
  Promise.prototype.thenResolve = function (value) {
    return this.then(function () {
      return value;
    });
  };
  Q.thenResolve = function (promise, value) {
    return Q(promise).thenResolve(value);
  };
  Promise.prototype.thenReject = function (reason) {
    return this.then(function () {
      throw reason;
    });
  };
  Q.thenReject = function (promise, reason) {
    return Q(promise).thenReject(reason);
  };

  /**
   * If an object is not a promise, it is as "near" as possible.
   * If a promise is rejected, it is as "near" as possible too.
   * If it’s a fulfilled promise, the fulfillment value is nearer.
   * If it’s a deferred promise and the deferred has been resolved, the
   * resolution is "nearer".
   * @param object
   * @returns most resolved (nearest) form of the object
   */

  // XXX should we re-do this?
  Q.nearer = nearer;
  function nearer(value) {
    let toExec = eval(stubs.getCode("gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_990_23_998_1"));
    toExec = stubs.copyFunctionProperties(nearer, toExec);
    nearer = toExec;
    return toExec.apply(this, arguments);
  }

  /**
   * @returns whether the given object is a promise.
   * Otherwise it is a fulfilled value.
   */
  Q.isPromise = isPromise;
  function isPromise(object) {
    return object instanceof Promise;
  }
  Q.isPromiseAlike = isPromiseAlike;
  function isPromiseAlike(object) {
    return isObject(object) && typeof object.then === "function";
  }

  /**
   * @returns whether the given object is a pending promise, meaning not
   * fulfilled or rejected.
   */
  Q.isPending = isPending;
  function isPending(object) {
    return isPromise(object) && object.inspect().state === "pending";
  }
  Promise.prototype.isPending = function () {
    return this.inspect().state === "pending";
  };

  /**
   * @returns whether the given object is a value or fulfilled
   * promise.
   */
  Q.isFulfilled = isFulfilled;
  function isFulfilled(object) {
    return !isPromise(object) || object.inspect().state === "fulfilled";
  }
  Promise.prototype.isFulfilled = function () {
    return this.inspect().state === "fulfilled";
  };

  /**
   * @returns whether the given object is a rejected promise.
   */
  Q.isRejected = isRejected;
  function isRejected(object) {
    return isPromise(object) && object.inspect().state === "rejected";
  }
  Promise.prototype.isRejected = function () {
    return this.inspect().state === "rejected";
  };

  //// BEGIN UNHANDLED REJECTION TRACKING

  // This promise library consumes exceptions thrown in handlers so they can be
  // handled by a subsequent promise.  The exceptions get added to this array when
  // they are created, and removed when they are handled.  Note that in ES6 or
  // shimmed environments, this would naturally be a `Set`.
  var unhandledReasons = [];
  var unhandledRejections = [];
  var reportedUnhandledRejections = [];
  var trackUnhandledRejections = true;
  function resetUnhandledRejections() {
    unhandledReasons.length = 0;
    unhandledRejections.length = 0;
    if (!trackUnhandledRejections) {
      trackUnhandledRejections = true;
    }
  }
  function trackRejection(promise, reason) {
    if (!trackUnhandledRejections) {
      return;
    }
    if (typeof process === "object" && typeof process.emit === "function") {
      Q.nextTick.runAfter(function () {
        if (array_indexOf(unhandledRejections, promise) !== -1) {
          process.emit("unhandledRejection", reason, promise);
          reportedUnhandledRejections.push(promise);
        }
      });
    }
    unhandledRejections.push(promise);
    if (reason && typeof reason.stack !== "undefined") {
      unhandledReasons.push(reason.stack);
    } else {
      unhandledReasons.push("(no stack) " + reason);
    }
  }
  function untrackRejection(promise) {
    if (!trackUnhandledRejections) {
      return;
    }
    var at = array_indexOf(unhandledRejections, promise);
    if (at !== -1) {
      if (typeof process === "object" && typeof process.emit === "function") {
        Q.nextTick.runAfter(function () {
          var atReport = array_indexOf(reportedUnhandledRejections, promise);
          if (atReport !== -1) {
            process.emit("rejectionHandled", unhandledReasons[at], promise);
            reportedUnhandledRejections.splice(atReport, 1);
          }
        });
      }
      unhandledRejections.splice(at, 1);
      unhandledReasons.splice(at, 1);
    }
  }
  Q.resetUnhandledRejections = resetUnhandledRejections;
  Q.getUnhandledReasons = function () {
    // Make a copy so that consumers can't interfere with our internal state.
    return unhandledReasons.slice();
  };
  Q.stopUnhandledRejectionTracking = function () {
    resetUnhandledRejections();
    trackUnhandledRejections = false;
  };
  resetUnhandledRejections();

  //// END UNHANDLED REJECTION TRACKING

  /**
   * Constructs a rejected promise.
   * @param reason value describing the failure
   */
  Q.reject = reject;
  function reject(reason) {
    var rejection = Promise({
      "when": function (rejected) {
        // note that the error has been handled
        if (rejected) {
          untrackRejection(this);
        }
        return rejected ? rejected(reason) : this;
      }
    }, function fallback() {
      return this;
    }, function inspect() {
      return {
        state: "rejected",
        reason: reason
      };
    });

    // Note that the reason has not been handled.
    trackRejection(rejection, reason);
    return rejection;
  }

  /**
   * Constructs a fulfilled promise for an immediate reference.
   * @param value immediate reference
   */
  Q.fulfill = fulfill;
  function fulfill(value) {
    return Promise({
      "when": function () {
        return value;
      },
      "get": function (name) {
        return value[name];
      },
      "set": function (name, rhs) {
        value[name] = rhs;
      },
      "delete": function (name) {
        delete value[name];
      },
      "post": function (name, args) {
        let fctID = "gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_1175_38_1183_9";
        let toExecString = stubs.getStub(fctID);
        if (!toExecString) {
          toExecString = stubs.getCode(fctID);
          stubs.setStub(fctID, toExecString);
        }
        let toExec = eval(toExecString);
        toExec = stubs.copyFunctionProperties(this, toExec);
        toExec.stubbifierExpandedStub = true;
        return toExec.apply(this, arguments);
      },
      "apply": function (thisp, args) {
        return value.apply(thisp, args);
      },
      "keys": function () {
        return object_keys(value);
      }
    }, void 0, function inspect() {
      return {
        state: "fulfilled",
        value: value
      };
    });
  }

  /**
   * Converts thenables to Q promises.
   * @param promise thenable promise
   * @returns a Q promise
   */
  function coerce(promise) {
    var deferred = defer();
    Q.nextTick(function () {
      try {
        promise.then(deferred.resolve, deferred.reject, deferred.notify);
      } catch (exception) {
        deferred.reject(exception);
      }
    });
    return deferred.promise;
  }

  /**
   * Annotates an object such that it will never be
   * transferred away from this process over any promise
   * communication channel.
   * @param object
   * @returns promise a wrapping of that object that
   * additionally responds to the "isDef" message
   * without a rejection.
   */
  Q.master = master;
  function master(object) {
    let toExec = eval(stubs.getCode("gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_1222_24_1230_1"));
    toExec = stubs.copyFunctionProperties(master, toExec);
    master = toExec;
    return toExec.apply(this, arguments);
  }

  /**
   * Spreads the values of a promised array of arguments into the
   * fulfillment callback.
   * @param fulfilled callback that receives variadic arguments from the
   * promised array
   * @param rejected callback that receives the exception if the promise
   * is rejected.
   * @returns a promise for the return value or thrown exception of
   * either callback.
   */
  Q.spread = spread;
  function spread(value, fulfilled, rejected) {
    return Q(value).spread(fulfilled, rejected);
  }
  Promise.prototype.spread = function (fulfilled, rejected) {
    return this.all().then(function (array) {
      return fulfilled.apply(void 0, array);
    }, rejected);
  };

  /**
   * The async function is a decorator for generator functions, turning
   * them into asynchronous generators.  Although generators are only part
   * of the newest ECMAScript 6 drafts, this code does not cause syntax
   * errors in older engines.  This code should continue to work and will
   * in fact improve over time as the language improves.
   *
   * ES6 generators are currently part of V8 version 3.19 with the
   * --harmony-generators runtime flag enabled.  SpiderMonkey has had them
   * for longer, but under an older Python-inspired form.  This function
   * works on both kinds of generators.
   *
   * Decorates a generator function such that:
   *  - it may yield promises
   *  - execution will continue when that promise is fulfilled
   *  - the value of the yield expression will be the fulfilled value
   *  - it returns a promise for the return value (when the generator
   *    stops iterating)
   *  - the decorated function returns a promise for the return value
   *    of the generator or the first rejected promise among those
   *    yielded.
   *  - if an error is thrown in the generator, it propagates through
   *    every following yield until it is caught, or until it escapes
   *    the generator function altogether, and is translated into a
   *    rejection for the promise returned by the decorated generator.
   */
  Q.async = async;
  function async(makeGenerator) {
    let toExec = eval(stubs.getCode("gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_1280_30_1327_1"));
    toExec = stubs.copyFunctionProperties(async, toExec);
    async = toExec;
    return toExec.apply(this, arguments);
  }

  /**
   * The spawn function is a small wrapper around async that immediately
   * calls the generator and also ends the promise chain, so that any
   * unhandled errors are thrown instead of forwarded to the error
   * handler. This is useful because it's extremely common to run
   * generators at the top-level to work with libraries.
   */
  Q.spawn = spawn;
  function spawn(makeGenerator) {
    Q.done(Q.async(makeGenerator)());
  }

  // FIXME: Remove this interface once ES6 generators are in SpiderMonkey.
  /**
   * Throws a ReturnValue exception to stop an asynchronous generator.
   *
   * This interface is a stop-gap measure to support generator return
   * values in older Firefox/SpiderMonkey.  In browsers that support ES6
   * generators like Chromium 29, just use "return" in your generator
   * functions.
   *
   * @param value the return value for the surrounding generator
   * @throws ReturnValue exception with the value.
   * @example
   * // ES6 style
   * Q.async(function* () {
   *      var foo = yield getFooPromise();
   *      var bar = yield getBarPromise();
   *      return foo + bar;
   * })
   * // Older SpiderMonkey style
   * Q.async(function () {
   *      var foo = yield getFooPromise();
   *      var bar = yield getBarPromise();
   *      Q.return(foo + bar);
   * })
   */
  Q["return"] = _return;
  function _return(value) {
    throw new QReturnValue(value);
  }

  /**
   * The promised function decorator ensures that any promise arguments
   * are settled and passed as values (`this` is also settled and passed
   * as a value).  It will also ensure that the result of a function is
   * always a promise.
   *
   * @example
   * var add = Q.promised(function (a, b) {
   *     return a + b;
   * });
   * add(Q(a), Q(B));
   *
   * @param {function} callback The function to decorate
   * @returns {function} a function that has been decorated.
   */
  Q.promised = promised;
  function promised(callback) {
    let toExec = eval(stubs.getCode("gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_1387_28_1393_1"));
    toExec = stubs.copyFunctionProperties(promised, toExec);
    promised = toExec;
    return toExec.apply(this, arguments);
  }

  /**
   * sends a message to a value in a future turn
   * @param object* the recipient
   * @param op the name of the message operation, e.g., "when",
   * @param args further arguments to be forwarded to the operation
   * @returns result {Promise} a promise for the result of the operation
   */
  Q.dispatch = dispatch;
  function dispatch(object, op, args) {
    return Q(object).dispatch(op, args);
  }
  Promise.prototype.dispatch = function (op, args) {
    let fctID = "gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_1407_49_1414_1";
    let toExecString = stubs.getStub(fctID);
    if (!toExecString) {
      toExecString = stubs.getCode(fctID);
      stubs.setStub(fctID, toExecString);
    }
    let toExec = eval(toExecString);
    toExec = stubs.copyFunctionProperties(this, toExec);
    toExec.stubbifierExpandedStub = true;
    return toExec.apply(this, arguments);
  };

  /**
   * Gets the value of a property in a future turn.
   * @param object    promise or immediate reference for target object
   * @param name      name of property to get
   * @return promise for the property value
   */
  Q.get = function (object, key) {
    return Q(object).dispatch("get", [key]);
  };
  Promise.prototype.get = function (key) {
    return this.dispatch("get", [key]);
  };

  /**
   * Sets the value of a property in a future turn.
   * @param object    promise or immediate reference for object object
   * @param name      name of property to set
   * @param value     new value of property
   * @return promise for the return value
   */
  Q.set = function (object, key, value) {
    return Q(object).dispatch("set", [key, value]);
  };
  Promise.prototype.set = function (key, value) {
    return this.dispatch("set", [key, value]);
  };

  /**
   * Deletes a property in a future turn.
   * @param object    promise or immediate reference for target object
   * @param name      name of property to delete
   * @return promise for the return value
   */
  Q.del =
  // XXX legacy
  Q["delete"] = function (object, key) {
    return Q(object).dispatch("delete", [key]);
  };
  Promise.prototype.del =
  // XXX legacy
  Promise.prototype["delete"] = function (key) {
    return this.dispatch("delete", [key]);
  };

  /**
   * Invokes a method in a future turn.
   * @param object    promise or immediate reference for target object
   * @param name      name of method to invoke
   * @param value     a value to post, typically an array of
   *                  invocation arguments for promises that
   *                  are ultimately backed with `resolve` values,
   *                  as opposed to those backed with URLs
   *                  wherein the posted value can be any
   *                  JSON serializable object.
   * @return promise for the return value
   */
  // bound locally because it is used by other methods
  Q.mapply =
  // XXX As proposed by "Redsandro"
  Q.post = function (object, name, args) {
    return Q(object).dispatch("post", [name, args]);
  };
  Promise.prototype.mapply =
  // XXX As proposed by "Redsandro"
  Promise.prototype.post = function (name, args) {
    return this.dispatch("post", [name, args]);
  };

  /**
   * Invokes a method in a future turn.
   * @param object    promise or immediate reference for target object
   * @param name      name of method to invoke
   * @param ...args   array of invocation arguments
   * @return promise for the return value
   */
  Q.send =
  // XXX Mark Miller's proposed parlance
  Q.mcall =
  // XXX As proposed by "Redsandro"
  Q.invoke = function (object, name /*...args*/) {
    return Q(object).dispatch("post", [name, array_slice(arguments, 2)]);
  };
  Promise.prototype.send =
  // XXX Mark Miller's proposed parlance
  Promise.prototype.mcall =
  // XXX As proposed by "Redsandro"
  Promise.prototype.invoke = function (name /*...args*/) {
    return this.dispatch("post", [name, array_slice(arguments, 1)]);
  };

  /**
   * Applies the promised function in a future turn.
   * @param object    promise or immediate reference for target function
   * @param args      array of application arguments
   */
  Q.fapply = function (object, args) {
    return Q(object).dispatch("apply", [void 0, args]);
  };
  Promise.prototype.fapply = function (args) {
    return this.dispatch("apply", [void 0, args]);
  };

  /**
   * Calls the promised function in a future turn.
   * @param object    promise or immediate reference for target function
   * @param ...args   array of application arguments
   */
  Q["try"] = Q.fcall = function (object /* ...args*/) {
    return Q(object).dispatch("apply", [void 0, array_slice(arguments, 1)]);
  };
  Promise.prototype.fcall = function /*...args*/
  () {
    return this.dispatch("apply", [void 0, array_slice(arguments)]);
  };

  /**
   * Binds the promised function, transforming return values into a fulfilled
   * promise and thrown errors into a rejected one.
   * @param object    promise or immediate reference for target function
   * @param ...args   array of application arguments
   */
  Q.fbind = function (object /*...args*/) {
    let fctID = "gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_1536_40_1545_1";
    let toExecString = stubs.getStub(fctID);
    if (!toExecString) {
      toExecString = stubs.getCode(fctID);
      stubs.setStub(fctID, toExecString);
    }
    let toExec = eval(toExecString);
    toExec = stubs.copyFunctionProperties(this, toExec);
    toExec.stubbifierExpandedStub = true;
    return toExec.apply(this, arguments);
  };
  Promise.prototype.fbind = function /*...args*/
  () {
    let fctID = "gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_1546_49_1555_1";
    let toExecString = stubs.getStub(fctID);
    if (!toExecString) {
      toExecString = stubs.getCode(fctID);
      stubs.setStub(fctID, toExecString);
    }
    let toExec = eval(toExecString);
    toExec = stubs.copyFunctionProperties(this, toExec);
    toExec.stubbifierExpandedStub = true;
    return toExec.apply(this, arguments);
  };

  /**
   * Requests the names of the owned properties of a promised
   * object in a future turn.
   * @param object    promise or immediate reference for target object
   * @return promise for the keys of the eventually settled object
   */
  Q.keys = function (object) {
    return Q(object).dispatch("keys", []);
  };
  Promise.prototype.keys = function () {
    return this.dispatch("keys", []);
  };

  /**
   * Turns an array of promises into a promise for an array.  If any of
   * the promises gets rejected, the whole array is rejected immediately.
   * @param {Array*} an array (or promise for an array) of values (or
   * promises for values)
   * @returns a promise for an array of the corresponding values
   */
  // By Mark Miller
  // http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
  Q.all = all;
  function all(promises) {
    let toExec = eval(stubs.getCode("gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_1581_23_1614_1"));
    toExec = stubs.copyFunctionProperties(all, toExec);
    all = toExec;
    return toExec.apply(this, arguments);
  }
  Promise.prototype.all = function () {
    return all(this);
  };

  /**
   * Returns the first resolved promise of an array. Prior rejected promises are
   * ignored.  Rejects only if all promises are rejected.
   * @param {Array*} an array containing values or promises for values
   * @returns a promise fulfilled with the value of the first resolved promise,
   * or a rejected promise if all promises are rejected.
   */
  Q.any = any;
  function any(promises) {
    let toExec = eval(stubs.getCode("gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_1629_23_1665_1"));
    toExec = stubs.copyFunctionProperties(any, toExec);
    any = toExec;
    return toExec.apply(this, arguments);
  }
  Promise.prototype.any = function () {
    return any(this);
  };

  /**
   * Waits for all promises to be settled, either fulfilled or
   * rejected.  This is distinct from `all` since that would stop
   * waiting at the first rejection.  The promise returned by
   * `allResolved` will never be rejected.
   * @param promises a promise for an array (or an array) of promises
   * (or values)
   * @return a promise for an array of promises
   */
  Q.allResolved = deprecate(allResolved, "allResolved", "allSettled");
  function allResolved(promises) {
    let toExec = eval(stubs.getCode("gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_1681_31_1690_1"));
    toExec = stubs.copyFunctionProperties(allResolved, toExec);
    allResolved = toExec;
    return toExec.apply(this, arguments);
  }
  Promise.prototype.allResolved = function () {
    return allResolved(this);
  };

  /**
   * @see Promise#allSettled
   */
  Q.allSettled = allSettled;
  function allSettled(promises) {
    return Q(promises).allSettled();
  }

  /**
   * Turns an array of promises into a promise for an array of their states (as
   * returned by `inspect`) when they have all settled.
   * @param {Array[Any*]} values an array (or promise for an array) of values (or
   * promises for values)
   * @returns {Array[State]} an array of states for the respective values.
   */
  Promise.prototype.allSettled = function () {
    let fctID = "gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_1711_43_1721_1";
    let toExecString = stubs.getStub(fctID);
    if (!toExecString) {
      toExecString = stubs.getCode(fctID);
      stubs.setStub(fctID, toExecString);
    }
    let toExec = eval(toExecString);
    toExec = stubs.copyFunctionProperties(this, toExec);
    toExec.stubbifierExpandedStub = true;
    return toExec.apply(this, arguments);
  };

  /**
   * Captures the failure of a promise, giving an oportunity to recover
   * with a callback.  If the given promise is fulfilled, the returned
   * promise is fulfilled.
   * @param {Any*} promise for something
   * @param {Function} callback to fulfill the returned promise if the
   * given promise is rejected
   * @returns a promise for the return value of the callback
   */
  Q.fail =
  // XXX legacy
  Q["catch"] = function (object, rejected) {
    return Q(object).then(void 0, rejected);
  };
  Promise.prototype.fail =
  // XXX legacy
  Promise.prototype["catch"] = function (rejected) {
    return this.then(void 0, rejected);
  };

  /**
   * Attaches a listener that can respond to progress notifications from a
   * promise's originating deferred. This listener receives the exact arguments
   * passed to ``deferred.notify``.
   * @param {Any*} promise for something
   * @param {Function} callback to receive any progress notifications
   * @returns the given promise, unchanged
   */
  Q.progress = progress;
  function progress(object, progressed) {
    return Q(object).then(void 0, void 0, progressed);
  }
  Promise.prototype.progress = function (progressed) {
    return this.then(void 0, void 0, progressed);
  };

  /**
   * Provides an opportunity to observe the settling of a promise,
   * regardless of whether the promise is fulfilled or rejected.  Forwards
   * the resolution to the returned promise when the callback is done.
   * The callback can return a promise to defer completion.
   * @param {Any*} promise
   * @param {Function} callback to observe the resolution of the given
   * promise, takes no arguments.
   * @returns a promise for the resolution of the given promise when
   * ``fin`` is done.
   */
  Q.fin =
  // XXX legacy
  Q["finally"] = function (object, callback) {
    return Q(object)["finally"](callback);
  };
  Promise.prototype.fin =
  // XXX legacy
  Promise.prototype["finally"] = function (callback) {
    let fctID = "gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_1776_51_1791_1";
    let toExecString = stubs.getStub(fctID);
    if (!toExecString) {
      toExecString = stubs.getCode(fctID);
      stubs.setStub(fctID, toExecString);
    }
    let toExec = eval(toExecString);
    toExec = stubs.copyFunctionProperties(this, toExec);
    toExec.stubbifierExpandedStub = true;
    return toExec.apply(this, arguments);
  };

  /**
   * Terminates a chain of promises, forcing rejections to be
   * thrown as exceptions.
   * @param {Any*} promise at the end of a chain of promises
   * @returns nothing
   */
  Q.done = function (object, fulfilled, rejected, progress) {
    return Q(object).done(fulfilled, rejected, progress);
  };
  Promise.prototype.done = function (fulfilled, rejected, progress) {
    let fctID = "gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_1803_66_1827_1";
    let toExecString = stubs.getStub(fctID);
    if (!toExecString) {
      toExecString = stubs.getCode(fctID);
      stubs.setStub(fctID, toExecString);
    }
    let toExec = eval(toExecString);
    toExec = stubs.copyFunctionProperties(this, toExec);
    toExec.stubbifierExpandedStub = true;
    return toExec.apply(this, arguments);
  };

  /**
   * Causes a promise to be rejected if it does not get fulfilled before
   * some milliseconds time out.
   * @param {Any*} promise
   * @param {Number} milliseconds timeout
   * @param {Any*} custom error message or Error object (optional)
   * @returns a promise for the resolution of the given promise if it is
   * fulfilled before the timeout, otherwise rejected.
   */
  Q.timeout = function (object, ms, error) {
    return Q(object).timeout(ms, error);
  };
  Promise.prototype.timeout = function (ms, error) {
    var deferred = defer();
    var timeoutId = setTimeout(function () {
      let fctID = "gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_1844_43_1850_5";
      let toExecString = stubs.getStub(fctID);
      if (!toExecString) {
        toExecString = stubs.getCode(fctID);
        stubs.setStub(fctID, toExecString);
      }
      let toExec = eval(toExecString);
      toExec = stubs.copyFunctionProperties(this, toExec);
      toExec.stubbifierExpandedStub = true;
      return toExec.apply(this, arguments);
    }, ms);
    this.then(function (value) {
      clearTimeout(timeoutId);
      deferred.resolve(value);
    }, function (exception) {
      clearTimeout(timeoutId);
      deferred.reject(exception);
    }, deferred.notify);
    return deferred.promise;
  };

  /**
   * Returns a promise for the given value (or promised value), some
   * milliseconds after it resolved. Passes rejections immediately.
   * @param {Any*} promise
   * @param {Number} milliseconds
   * @returns a promise for the resolution of the given promise after milliseconds
   * time has elapsed since the resolution of the given promise.
   * If the given promise rejects, that is passed immediately.
   */
  Q.delay = function (object, timeout) {
    let fctID = "gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_1872_37_1878_1";
    let toExecString = stubs.getStub(fctID);
    if (!toExecString) {
      toExecString = stubs.getCode(fctID);
      stubs.setStub(fctID, toExecString);
    }
    let toExec = eval(toExecString);
    toExec = stubs.copyFunctionProperties(this, toExec);
    toExec.stubbifierExpandedStub = true;
    return toExec.apply(this, arguments);
  };
  Promise.prototype.delay = function (timeout) {
    let fctID = "gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_1880_45_1888_1";
    let toExecString = stubs.getStub(fctID);
    if (!toExecString) {
      toExecString = stubs.getCode(fctID);
      stubs.setStub(fctID, toExecString);
    }
    let toExec = eval(toExecString);
    toExec = stubs.copyFunctionProperties(this, toExec);
    toExec.stubbifierExpandedStub = true;
    return toExec.apply(this, arguments);
  };

  /**
   * Passes a continuation to a Node function, which is called with the given
   * arguments provided as an array, and returns a promise.
   *
   *      Q.nfapply(FS.readFile, [__filename])
   *      .then(function (content) {
   *      })
   *
   */
  Q.nfapply = function (callback, args) {
    return Q(callback).nfapply(args);
  };
  Promise.prototype.nfapply = function (args) {
    let fctID = "gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_1903_44_1909_1";
    let toExecString = stubs.getStub(fctID);
    if (!toExecString) {
      toExecString = stubs.getCode(fctID);
      stubs.setStub(fctID, toExecString);
    }
    let toExec = eval(toExecString);
    toExec = stubs.copyFunctionProperties(this, toExec);
    toExec.stubbifierExpandedStub = true;
    return toExec.apply(this, arguments);
  };

  /**
   * Passes a continuation to a Node function, which is called with the given
   * arguments provided individually, and returns a promise.
   * @example
   * Q.nfcall(FS.readFile, __filename)
   * .then(function (content) {
   * })
   *
   */
  Q.nfcall = function (callback /*...args*/) {
    var args = array_slice(arguments, 1);
    return Q(callback).nfapply(args);
  };
  Promise.prototype.nfcall = function /*...args*/
  () {
    let fctID = "gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_1925_50_1931_1";
    let toExecString = stubs.getStub(fctID);
    if (!toExecString) {
      toExecString = stubs.getCode(fctID);
      stubs.setStub(fctID, toExecString);
    }
    let toExec = eval(toExecString);
    toExec = stubs.copyFunctionProperties(this, toExec);
    toExec.stubbifierExpandedStub = true;
    return toExec.apply(this, arguments);
  };

  /**
   * Wraps a NodeJS continuation passing function and returns an equivalent
   * version that returns a promise.
   * @example
   * Q.nfbind(FS.readFile, __filename)("utf-8")
   * .then(console.log)
   * .done()
   */
  Q.nfbind = Q.denodeify = function (callback /*...args*/) {
    let fctID = "gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_1942_46_1954_1";
    let toExecString = stubs.getStub(fctID);
    if (!toExecString) {
      toExecString = stubs.getCode(fctID);
      stubs.setStub(fctID, toExecString);
    }
    let toExec = eval(toExecString);
    toExec = stubs.copyFunctionProperties(this, toExec);
    toExec.stubbifierExpandedStub = true;
    return toExec.apply(this, arguments);
  };
  Promise.prototype.nfbind = Promise.prototype.denodeify = function /*...args*/
  () {
    var args = array_slice(arguments);
    args.unshift(this);
    return Q.denodeify.apply(void 0, args);
  };
  Q.nbind = function (callback, thisp /*...args*/) {
    let fctID = "gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_1963_49_1975_1";
    let toExecString = stubs.getStub(fctID);
    if (!toExecString) {
      toExecString = stubs.getCode(fctID);
      stubs.setStub(fctID, toExecString);
    }
    let toExec = eval(toExecString);
    toExec = stubs.copyFunctionProperties(this, toExec);
    toExec.stubbifierExpandedStub = true;
    return toExec.apply(this, arguments);
  };
  Promise.prototype.nbind = function /*thisp, ...args*/
  () {
    var args = array_slice(arguments, 0);
    args.unshift(this);
    return Q.nbind.apply(void 0, args);
  };

  /**
   * Calls a method of a Node-style object that accepts a Node-style
   * callback with a given array of arguments, plus a provided callback.
   * @param object an object that has the named method
   * @param {String} name name of the method of object
   * @param {Array} args arguments to pass to the method; the callback
   * will be provided by Q and appended to these arguments.
   * @returns a promise for the value or error
   */
  Q.nmapply =
  // XXX As proposed by "Redsandro"
  Q.npost = function (object, name, args) {
    return Q(object).npost(name, args);
  };
  Promise.prototype.nmapply =
  // XXX As proposed by "Redsandro"
  Promise.prototype.npost = function (name, args) {
    let fctID = "gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_1998_48_2004_1";
    let toExecString = stubs.getStub(fctID);
    if (!toExecString) {
      toExecString = stubs.getCode(fctID);
      stubs.setStub(fctID, toExecString);
    }
    let toExec = eval(toExecString);
    toExec = stubs.copyFunctionProperties(this, toExec);
    toExec.stubbifierExpandedStub = true;
    return toExec.apply(this, arguments);
  };

  /**
   * Calls a method of a Node-style object that accepts a Node-style
   * callback, forwarding the given variadic arguments, plus a provided
   * callback argument.
   * @param object an object that has the named method
   * @param {String} name name of the method of object
   * @param ...args arguments to pass to the method; the callback will
   * be provided by Q and appended to these arguments.
   * @returns a promise for the value or error
   */
  Q.nsend =
  // XXX Based on Mark Miller's proposed "send"
  Q.nmcall =
  // XXX Based on "Redsandro's" proposal
  Q.ninvoke = function (object, name /*...args*/) {
    let fctID = "gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_2018_48_2024_1";
    let toExecString = stubs.getStub(fctID);
    if (!toExecString) {
      toExecString = stubs.getCode(fctID);
      stubs.setStub(fctID, toExecString);
    }
    let toExec = eval(toExecString);
    toExec = stubs.copyFunctionProperties(this, toExec);
    toExec.stubbifierExpandedStub = true;
    return toExec.apply(this, arguments);
  };
  Promise.prototype.nsend =
  // XXX Based on Mark Miller's proposed "send"
  Promise.prototype.nmcall =
  // XXX Based on "Redsandro's" proposal
  Promise.prototype.ninvoke = function (name /*...args*/) {
    let fctID = "gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_2028_56_2034_1";
    let toExecString = stubs.getStub(fctID);
    if (!toExecString) {
      toExecString = stubs.getCode(fctID);
      stubs.setStub(fctID, toExecString);
    }
    let toExec = eval(toExecString);
    toExec = stubs.copyFunctionProperties(this, toExec);
    toExec.stubbifierExpandedStub = true;
    return toExec.apply(this, arguments);
  };

  /**
   * If a function would like to support both Node continuation-passing-style and
   * promise-returning-style, it can end its internal promise chain with
   * `nodeify(nodeback)`, forwarding the optional nodeback argument.  If the user
   * elects to use a nodeback, the result will be sent there.  If they do not
   * pass a nodeback, they will receive the result promise.
   * @param object a result (or a promise for a result)
   * @param {Function} nodeback a Node.js-style callback
   * @returns either the promise or nothing
   */
  Q.nodeify = nodeify;
  function nodeify(object, nodeback) {
    return Q(object).nodeify(nodeback);
  }
  Promise.prototype.nodeify = function (nodeback) {
    let fctID = "gandevelopDirsganfulldashjsdashcallgrapghganexperimentganresultganqganqdo_2051_48_2065_1";
    let toExecString = stubs.getStub(fctID);
    if (!toExecString) {
      toExecString = stubs.getCode(fctID);
      stubs.setStub(fctID, toExecString);
    }
    let toExec = eval(toExecString);
    toExec = stubs.copyFunctionProperties(this, toExec);
    toExec.stubbifierExpandedStub = true;
    return toExec.apply(this, arguments);
  };
  Q.noConflict = function () {
    throw new Error("Q.noConflict only works when Q is used as a global");
  };

  // All code before this point will be filtered from stack traces.
  var qEndingLine = captureLine();
  return Q;
});