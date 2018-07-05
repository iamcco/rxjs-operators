# rxjs-operators 补完计划

> Too Young Too Simple, Sometimes Naive.

## operators

操作符    | 状态
-------   |-----
[bufferMap](./src/bufferMap/READMD.md) | Done

## install

```bash
npm install --save rxjs-operators
```

## usage

```javascript
import Rx from 'rxjs'
import 'rxjs-operators'

Rx.Observable
  .interval(1000)
  .bufferMap((arr) => {
     console.log('map:', arr);
     return Rx.Observable.timer(10000).map(() =>  arr)
  })
  .subscribe(res => console.log('sub:', res))
```
