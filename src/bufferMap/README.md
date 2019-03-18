# bufferMap

收集源输出的值，并把值作为数组发出

> bufferMap 和 concatMap 很相近, 不同之处在于，bufferMap 会对源输出的值进行缓存，
> 并映射成内部 Observable，在这个内部 Observable 没有完成前，
> 源发出的值会一直缓存到内部 Observable 完成并映射成新的内部 Observable，
> 而 concatMap 会对源发出的值按顺序映射成内部 Observable
> 简单来说就是 concatMap 会对源发出的每个值按顺序映射成 Observable，
> 而 bufferMap 会对源发出的值的缓存映射成 Observable

```javascript
import { interval, timer } from 'rxjs'
import { map } from 'rxjs/operators'
import { bufferMap } from 'rxjs-operators'

interval(1000).pipe(
  bufferMap((arr) => {
   console.log('map:', arr);
   return timer(10000).pipe(
     map(() =>  arr)
   )
  })
).subscribe(res => console.log('sub:', res))
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
