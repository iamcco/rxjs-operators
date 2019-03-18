import {
  Observable,
  PartialObserver,
  Subscription
} from 'rxjs';

/**
 * will cache the source observable values until inner observable is complete,
 * then the cache values will trigger as array
 */
export function bufferMap<T, K>(
  fn: (args: T[]) => Observable<K>
): (preObs: Observable<T>) => Observable<K> {
  let isComplete = false
  let values: T[] = []
  let resultSubp: Subscription
  let subp: Subscription

  const doNext = (observer: PartialObserver<K>) => {
    const params: T[] = values
    values = []
    try {
      subp = fn(params).subscribe({
        next: (res) => observer.next(res),
        error: err => observer.error(err),
        complete: () => {
          if (values.length !== 0) {
            doNext(observer)
          } else if (isComplete) {
            isComplete = true
            observer.complete()
          }
        }
      })
    } catch (err) {
      isComplete = true
      return observer.error(err)
    }
  }

  return (preObs: Observable<T>) => {
    return Observable.create((observer: PartialObserver<K>) => {
      resultSubp = preObs.subscribe({
        next: res => {
          values.push(res)
          if (subp === undefined || subp.closed) {
            doNext(observer)
          }
        },
        error: (err) => {
          isComplete = true
          return observer.error(err)
        },
        complete: () => {
          isComplete = true
          if (!values.length && subp.closed) {
            observer.complete()
          }
        }
      })
      return () => {
        isComplete = true
        if (!resultSubp.closed) {
          resultSubp.unsubscribe()
        }
        if (subp !== undefined && !subp.closed) {
          subp.unsubscribe()
        }
      }
    })
  }
}
