import { Observable, PartialObserver, Subscription } from 'rxjs';

/**
 *
 * only keep the lastest source observable value until the inner observable complete,
 * then trigger the lastest source observable value
 *
 * @param isAbandon - is abandon inner observable value when there is newer source observable value
 *
 */
export function waitMap<T, K>(
  fn: (res: T) => Observable<K>,
  isAbandon: boolean = true
): (obs: Observable<T>) => Observable<K> {
  return (preObs: Observable<T>) => {
    return Observable.create((observer: PartialObserver<K>) => {
      let closed = false
      let latestRes: T
      let resultSubp: Subscription
      let subp: Subscription
      const run = (res: T) => {
        const obs = fn(res)
        return obs.subscribe({
          next: res => {
            if (latestRes !== undefined && isAbandon) {
              return
            }
            observer.next(res)
          },
          error: err => {
            closed = true
            observer.error(err)
            resultSubp.unsubscribe()
          },
          complete: () => {
            if (latestRes && !closed) {
              const res = latestRes
              latestRes = undefined
              run(res)
            }
          }
        })
      }
      resultSubp = preObs.subscribe({
        next: res => {
          latestRes = res
          if (!subp || subp.closed) {
            latestRes = undefined
            subp = run(res)
          }
        },
        error: err => {
          closed = true
          observer.error(err)
        },
        complete: () => {
          closed = true
          observer.complete()
        }
      })
      return resultSubp
    })
  }
}
