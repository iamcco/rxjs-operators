const Observable = require('rxjs/Observable').Observable

Observable.prototype.bufferMap = function (factory) {
  const preObservable = this
  let values = []
  let isComplete = false
  let isPending = false
  const doNext = (observer) => {
    isPending = true
    const params = values
    values = []
    try {
      return factory(params).subscribe({
        next: (res) => observer.next(res),
        error: err => observer.error(err),
        complete: () => {
          isPending = false
          if (values.length) {
            doNext(observer)
          } else if (isComplete) {
            observer.complete()
          }
        }
      })
    } catch (err) {
      return observer.error(err)
    }
  }
  const next = observer => (arg) => {
    values.push(arg)
    if (!isPending) {
      doNext(observer)
    }
  }
  return new Observable(observer => preObservable.subscribe({
    next: next(observer),
    error: (err) => {
      isComplete = true
      return observer.error(err)
    },
    complete: () => {
      isComplete = true
    }
  }))
}
