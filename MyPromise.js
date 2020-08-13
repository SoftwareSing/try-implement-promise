const pending = 'pending'
const fulfilled = 'fulfilled'
const rejected = 'rejected'

const STATUS = Symbol('PromiseStatus')
const CHILDPROMISES = Symbol('ChildPromises')
const VALUE = Symbol('PromiseValue')
const REASON = Symbol('PromiseReason')

class MyPromise {
  constructor (executor) {
    this[STATUS] = pending
    this[CHILDPROMISES] = []
    this[VALUE] = undefined

    const resolve = (value) => {
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

    const reject = (reason) => {
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
    const { resolve, reject, onFulfilled } = this
    if (typeof onFulfilled !== 'function') {
      resolve(value)
      return
    }

    try {
      const result = onFulfilled(value)
      resolve(result)
    } catch (err) {
      reject(err)
    }
  }

  _runOnRejected (reason) {
    const { resolve, reject, onRejected } = this
    if (typeof onRejected !== 'function') {
      reject(reason)
      return
    }

    try {
      const result = onRejected(reason)
      resolve(result)
    } catch (err) {
      reject(err)
    }
  }
}

function asyncRun (callback) {
  return process.nextTick(callback)
}

module.exports = MyPromise
