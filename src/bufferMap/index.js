const Observable = require('rxjs/Observable').Observable

Observable.prototype.bufferMap = function (factory) {
  const preObservable = this
  let values = []
  let isComplete = false
  let isPending = false
  const next = observer => (arg) => {
    if (arg !== undefined) {
      values.push(arg)
    }
    if (!isPending) {
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
              next(observer)()
            } else if (isComplete) {
              observer.complete()
            }
          }
        })
      } catch (err) {
        return observer.error(err)
      }
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
