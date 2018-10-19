/*
 *
 * TODO:
 * unsubscribe 的时候判断是否还存在订阅
 *
 */
import { Subject, Observable, Observer } from 'rxjs'

export class WS {
  constructor(private url: string, private protocol: string = 'json') {}
  private subject: Subject<any> = new Subject()
  private socket: WebSocket
  private queueSubscribe: (() => void)[]
  private requestBaseId: number = 0
  private onopen = () => {
    this.queueSubscribe.forEach(run => {
      run()
    })
    this.queueSubscribe = []
  }
  private onmessage = (evt: Event) => {
    this.subject.next(evt)
  }
  private onclose = () => {
    this.subject.complete()
  }
  private onerror = (evt: Event): any => {
    this.subject.error(evt)
  }
  private createRequestId() {
    this.requestBaseId += 1
    return this.requestBaseId
  }

  private initSocket(cb?: (() => void)) {
    if (!this.socket || cb) {
      this.socket = new WebSocket(this.url, this.protocol)
      this.socket.onopen = this.onopen
      this.socket.onmessage = this.onmessage
      this.socket.onclose = this.onclose
      this.socket.onerror = this.onerror
    }
    cb && cb()
  }

  public subscribe(params: any) {
    this.initSocket()

    const requestId = this.createRequestId()
    const obs = Observable.create((observer: Observer<any>) => {
      let subscription: any
      const run = () => {
        this.socket.send({ requestId, ...params })
        subscription = this.subject.subscribe({
          next: (data: any) => {
            const {
              requestId: resRequestid,
              ...res
            } = data
            if (requestId === resRequestid) {
              observer.next(res)
            }
          },
          error: observer.error,
          complete: observer.complete
        })
      }
      if (this.socket.readyState === WebSocket.OPEN) {
        run()
      } else if (this.socket.readyState === WebSocket.CONNECTING) {
        this.queueSubscribe.push(run)
      } else if (this.socket.readyState === WebSocket.CLOSED) {
        this.initSocket(run)
      } else if (this.socket.readyState === WebSocket.CLOSING) {
        this.initSocket(run)
      }
      return {
        unsubscription: () => {
          if (subscription && subscription.unsubscribe) {
            subscription.unsubscribe()
          }
        }
      }
    })

    return obs
  }
}


