const MyPromise = require('./MyPromise')

exports.deferred = function () {
  const defer = {}
  defer.promise = new MyPromise((resolve, reject) => {
    defer.resolve = resolve
    defer.reject = reject
  })
  return defer
}
