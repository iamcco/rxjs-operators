require('../lib/bufferMap')
const { Observable } = require('rxjs')

it('source Observable complete with buffer data', () => {
  return new Promise((resolve) => {
    const value = []
    Observable.interval(100).take(10)
      .bufferMap((arr) => {
        return Observable.timer(500).map(() => arr)
      })
      .subscribe({
        next: (arr) => {
          value.push(arr)
        },
        complete: () => {
          resolve(value)
        }
      })
  }).then(res => expect(res.join('-')).toEqual('0-1,2,3,4-5,6,7,8,9'))
})

it('source Observable complete with no buffer data', () => {
  return new Promise((resolve) => {
    const value = []
    Observable.timer(100, 500)
      .takeUntil(Observable.timer(300))
      .bufferMap((arr) => {
        return Observable.timer(150).map(() => arr)
      })
      .subscribe({
        next: (arr) => {
          value.push(arr)
        },
        complete: () => {
          resolve(value)
        }
      })
  }).then(res => expect(res.join('-')).toEqual('0'))
})

it('source Observable complete with no buffer data and inner Observable is pending', () => {
  return new Promise((resolve) => {
    const value = []
    Observable.timer(100, 500)
      .takeUntil(Observable.timer(200))
      .bufferMap((arr) => {
        return Observable.timer(150).map(() => arr)
      })
      .subscribe({
        next: (arr) => {
          value.push(arr)
        },
        complete: () => {
          resolve(value)
        }
      })
  }).then(res => expect(res.join('-')).toEqual('0'))
})
