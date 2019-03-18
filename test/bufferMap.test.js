const { interval, timer } = require('rxjs')
const { bufferMap } = require('../lib/bufferMap')
const { take, takeUntil, map } = require('rxjs/operators')

it('source Observable complete with buffer data', () => {
  return new Promise((resolve) => {
    const value = []
    interval(100).pipe(
      take(10),
      bufferMap((arr) => {
        return timer(500).pipe(
          map(() => arr)
        )
      })
    ).subscribe({
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
    timer(100, 500).pipe(
      takeUntil(timer(300)),
      bufferMap((arr) => {
        return timer(150).pipe(
          map(() => arr)
        )
      })
    ).subscribe({
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
    timer(100, 500).pipe(
      takeUntil(timer(200)),
      bufferMap((arr) => {
        return timer(150).pipe(
          map(() => arr)
        )
      })
    ).subscribe({
      next: (arr) => {
        value.push(arr)
      },
      complete: () => {
        resolve(value)
      }
    })
  }).then(res => expect(res.join('-')).toEqual('0'))
})
