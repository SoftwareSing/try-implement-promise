const pending = 'pending'
const fulfilled = 'fulfilled'
const rejected = 'rejected'

const STATUS = Symbol('PromiseStatus')
const CHILDPROMISES = Symbol('ChildPromises')
const VALUE = Symbol('PromiseValue')

class MyPromise {
  constructor (executor) {
    this[STATUS] = pending
    this[CHILDPROMISES] = []
    this[VALUE] = undefined

    const THIS = this
    const resolve = (value) => {
      resolvePromise(THIS, value)
    }
    const reject = (reason) => {
      rejectPromise(THIS, reason)
    }

    executor(resolve, reject)
  }

  then (onFulfilled, onRejected) {
    const childPromise = new ChildPromise(onFulfilled, onRejected)

    switch (this[STATUS]) {
      case pending: {
        this[CHILDPROMISES].push(childPromise)
        break
      }
      case fulfilled: {
        childPromise.runOnFulfilled(this[VALUE])
        break
      }
      case rejected: {
        childPromise.runOnRejected(this[VALUE])
        break
      }
    }

    const { promise } = childPromise
    return promise
  }
}

function resolvePromise (promise, value) {
  return changeStatus(promise, fulfilled, value, 'runOnFulfilled')
}

function rejectPromise (promise, reason) {
  return changeStatus(promise, rejected, reason, 'runOnRejected')
}

function changeStatus (promise, status, value, targetRun) {
  if (promise[STATUS] !== pending) {
    return
  }

  promise[STATUS] = status
  promise[VALUE] = value

  for (const childPromise of promise[CHILDPROMISES]) {
    childPromise[targetRun](value)
  }
  promise[CHILDPROMISES] = undefined
}

class ChildPromise {
  constructor (onFulfilled, onRejected) {
    this.promise = new MyPromise(function () {})
    if (typeof onFulfilled === 'function') {
      this.onFulfilled = onFulfilled
    }
    if (typeof onRejected === 'function') {
      this.onRejected = onRejected
    }
  }

  runOnFulfilled (value) {
    const THIS = this
    asyncRun(() => {
      THIS._runTarget(value, THIS.onFulfilled, resolvePromise)
    })
  }

  runOnRejected (reason) {
    const THIS = this
    asyncRun(() => {
      THIS._runTarget(reason, THIS.onRejected, rejectPromise)
    })
  }

  _runTarget (value, target, onTargetNotFunction) {
    const { promise } = this
    if (typeof target !== 'function') {
      onTargetNotFunction(promise, value)
      return
    }

    try {
      const x = target(value)
      promiseResolutionProcedure(promise, x)
    } catch (err) {
      rejectPromise(promise, err)
    }
  }
}

/**
 * 2.3 The Promise Resolution Procedure
 * @param {MyPromise} promise
 * @param {Any} x
 * @return {void}
 */
function promiseResolutionProcedure (promise, x) {
  if (promise === x) {
    rejectPromise(promise, new TypeError('2.3.1 If promise and x refer to the same object, reject promise with a TypeError as the reason.'))
    return
  }

  if (x === null || (typeof x !== 'function' && typeof x !== 'object')) {
    resolvePromise(promise, x)
    return
  }

  let called = false
  try {
    const then = x.then
    if (typeof then !== 'function') {
      resolvePromise(promise, x)
      return
    }

    const resolveIt = (y) => {
      if (called) {
        return
      }
      called = true
      promiseResolutionProcedure(promise, y)
    }
    const rejectIt = (r) => {
      if (called) {
        return
      }
      called = true
      rejectPromise(promise, r)
    }
    then.call(x, resolveIt, rejectIt)
  } catch (e) {
    if (!called) {
      rejectPromise(promise, e)
    }
  }
}

function asyncRun (callback) {
  return process.nextTick(callback)
}

module.exports = MyPromise
