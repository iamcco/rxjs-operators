# rxjs-operators 补完计划

> Too Young Too Simple, Sometimes Naive.

## operators

操作符    | 状态
-------   |-----
[bufferMap](https://github.com/iamcco/rxjs-operators/tree/master/src/bufferMap) | Done

## install

```bash
npm install --save rxjs-operators
```

## usage

```javascript
import Rx from 'rxjs'
import 'rxjs-operators' // or import 'rxjs-operators/lib/bufferMap'

Rx.Observable
  .interval(1000)
  .bufferMap((arr) => {
     console.log('map:', arr);
     return Rx.Observable.timer(10000).map(() =>  arr)
  })
  .subscribe(res => console.log('sub:', res))
```
