const pending = 'pending'
const fulfilled = 'fulfilled'
const rejected = 'rejected'

const STATUS = Symbol('PromiseStatus')
const CHILDPROMISES = Symbol('ChildPromises')
const VALUE = Symbol('PromiseValue')
const REASON = Symbol('PromiseReason')
const RESOLVE = Symbol('PromiseResolve')
const REJECT = Symbol('PromiseReject')

class MyPromise {
  constructor (executor) {
    this[STATUS] = pending
    this[CHILDPROMISES] = []
    this[VALUE] = undefined

    this[RESOLVE] = (value) => {
      if (this[STATUS] !== pending) {
        return
      }

      this[STATUS] = fulfilled
      this[VALUE] = value

      for (const childPromise of this[CHILDPROMISES]) {
        childPromise.runOnFulfilled(value)
      }
      this[CHILDPROMISES] = undefined
    }

    this[REJECT] = (reason) => {
      if (this[STATUS] !== pending) {
        return
      }

      this[STATUS] = rejected
      this[REASON] = reason

      for (const childPromise of this[CHILDPROMISES]) {
        childPromise.runOnRejected(reason)
      }
      this[CHILDPROMISES] = undefined
    }

    executor(this[RESOLVE], this[REJECT])
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
        childPromise.runOnRejected(this[REASON])
        break
      }
    }

    const { promise } = childPromise
    return promise
  }
}

class ChildPromise {
  constructor (onFulfilled, onRejected) {
    this.promise = new MyPromise((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
    })
    if (typeof onFulfilled === 'function') {
      this.onFulfilled = onFulfilled
    }
    if (typeof onRejected === 'function') {
      this.onRejected = onRejected
    }
  }

  runOnFulfilled (value) {
    asyncRun(() => {
      this._runOnFulfilled(value)
    })
  }

  runOnRejected (reason) {
    asyncRun(() => {
      this._runOnRejected(reason)
    })
  }

  _runOnFulfilled (value) {
    const { promise, resolve, reject, onFulfilled } = this
    if (typeof onFulfilled !== 'function') {
      resolve(value)
      return
    }

    try {
      const x = onFulfilled(value)
      promiseResolutionProcedure(promise, x)
    } catch (err) {
      reject(err)
    }
  }

  _runOnRejected (reason) {
    const { promise, reject, onRejected } = this
    if (typeof onRejected !== 'function') {
      reject(reason)
      return
    }

    try {
      const x = onRejected(reason)
      promiseResolutionProcedure(promise, x)
    } catch (err) {
      reject(err)
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
    promise[REJECT](new TypeError('2.3.1 If promise and x refer to the same object, reject promise with a TypeError as the reason.'))
    return
  }

  if (x === null || (typeof x !== 'function' && typeof x !== 'object')) {
    promise[RESOLVE](x)
    return
  }

  let called = false
  try {
    const then = x.then
    if (typeof then !== 'function') {
      promise[RESOLVE](x)
      return
    }

    const resolvePromise = (y) => {
      if (called) {
        return
      }
      called = true
      promiseResolutionProcedure(promise, y)
    }
    const rejectPromise = (r) => {
      if (called) {
        return
      }
      called = true
      promise[REJECT](r)
    }
    then.call(x, resolvePromise, rejectPromise)
  } catch (e) {
    if (!called) {
      promise[REJECT](e)
    }
  }
}

function asyncRun (callback) {
  return process.nextTick(callback)
}

module.exports = MyPromise
