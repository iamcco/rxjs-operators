# bufferMap

将值映射成内部 Observable，并按顺序订阅和发出

> 和 concatMap 不同之处在于，源发出一个值之后，如果内部源没有完成，这些值会被缓存起来，
> 直到内部源完成后这些缓存起来的值会作为一个数组调用

```javascript
Rx.Observable
  .interval(1000)
  .bufferMap((arr) => {
     console.log('map:', arr);
     return Rx.Observable.timer(10000).map(() =>  arr)
  })
  .subscribe(res => console.log('sub:', res))
```

output:

```text
map [0]
sub [0]
map [1, 2, 3, 4, 5, 6, 7, 8, 9]
sub [1, 2, 3, 4, 5, 6, 7, 8, 9]
map [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
sub [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
...
```
