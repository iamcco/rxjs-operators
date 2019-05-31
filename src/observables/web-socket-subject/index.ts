import { Observable, Observer, of, Subject } from 'rxjs'
import { concatMap, filter, map } from 'rxjs/operators'

const NOOP = () => {}

export class WebSocketSubject<T> extends Subject<any> {
  private values$: Observable<T>
  private socket: WebSocket | undefined
  private records: {
    [key: string]: {
      count: number
      sendData: () => void
      delay: number | undefined
    }
  } = {}
  private queueSubscribe: Array<{
    run: () => void
    delay: number | undefined
  }> = []
  private requestBaseId: number = 0
  private isTryReconnect: boolean = false

  constructor(
    private url: string,
    private protocol: string = 'json',
    private retryGap: number = 5000
  ) {
    super()
    this.values$ = this.pipe(
      concatMap(data => {
        return data instanceof Blob
          ? new Promise<string | ArrayBuffer | Blob | null>(resolve => {
            const reader = new FileReader()
            reader.onload = () => {
              resolve(reader.result)
            }
            reader.onerror = e => {
              // tslint:disable-next-line:no-console
              console.error(e)
              resolve(data)
            }
            reader.readAsText(data)
          })
          : of(data)
      }),
      map(data => {
        try {
          return JSON.parse(data as string)
        } catch (e) {
          // tslint:disable-next-line:no-console
          console.error(e)
          return undefined
        }
      }),
      filter(item => !!item)
    )
  }

  multiplex (params: any, delay?: number | undefined): Observable<any> {
    this.initSocket()

    const requestId = this.createRequestId()
    const sendData = () => {
      const newParms = typeof params === 'function' ? params() : params
      this.socket!.send(JSON.stringify({ requestId, ...newParms }))
    }
    const obs = Observable.create((observer: Observer<any>) => {
      let subscription: any
      const run = () => {
        const clearSubscribe = () => {
          if (this.records[requestId] !== undefined) {
            this.records[requestId].count -= 1
            if (this.records[requestId].count === 0) {
              delete this.records[requestId]
            }
          }
          this.queueSubscribe = this.queueSubscribe.filter(r => r.run !== run)
          if (
            Object.keys(this.records).length === 0 &&
            this.socket!.readyState === WebSocket.OPEN
          ) {
            this.socket!.close()
          }
        }
        const error = (err: Error) => {
          observer.error(err)
          clearSubscribe()
        }
        subscription = this.values$.subscribe({
          next: (data: any) => {
            const { requestId: resRequestid, ...newRes } = data
            if (requestId === resRequestid) {
              observer.next(newRes)
            }
          },
          error,
          complete: () => {
            observer.complete()
            clearSubscribe()
          }
        })
        if (this.records[requestId] !== undefined) {
          this.records[requestId].count += 1
        } else {
          this.records[requestId] = {
            count: 1,
            sendData,
            delay
          }
        }
        sendData()
      }

      if (this.socket!.readyState === WebSocket.OPEN) {
        run()
      } else if (this.socket!.readyState === WebSocket.CONNECTING) {
        this.queueSubscribe.push({ run, delay })
      } else if (this.socket!.readyState === WebSocket.CLOSED) {
        this.queueSubscribe.push({ run, delay })
        this.tryReconnect()
      } else if (this.socket!.readyState === WebSocket.CLOSING) {
        this.queueSubscribe.push({ run, delay })
        this.tryReconnect()
      }
      return {
        unsubscribe: () => {
          if (subscription && subscription.unsubscribe) {
            subscription.unsubscribe()
          }
          if (this.records[requestId] !== undefined) {
            this.records[requestId].count -= 1
            if (this.records[requestId].count === 0) {
              delete this.records[requestId]
            }
          }
          this.queueSubscribe = this.queueSubscribe.filter(r => r.run !== run)
          if (
            Object.keys(this.records).length === 0 &&
            this.socket!.readyState === WebSocket.OPEN
          ) {
            this.socket!.close()
          }
        }
      }
    })

    return obs
  }

  private onopen = () => {
    Object.keys(this.records).forEach(requestId => {
      const { sendData, delay } = this.records[requestId]
      if (delay !== undefined) {
        setTimeout(() => {
          sendData()
        }, delay)
      } else {
        sendData()
      }
    })
    this.queueSubscribe.forEach(item => {
      if (item.delay !== undefined) {
        setTimeout(() => {
          item.run()
        }, item.delay)
      } else {
        item.run()
      }
    })
    this.queueSubscribe = []
  }

  private onmessage = ({
    data
  }: {
    data: ArrayBuffer | string | null | Blob
  }) => {
    this.next(data)
  }

  private onclose = () => {
    this.tryReconnect()
  }
  private onerror = () => {
    // TODO: resolve error
  }
  private reconnect = () => {
    if (this.socket) {
      this.socket.onopen = NOOP
      this.socket.onmessage = NOOP
      this.socket.onclose = NOOP
      this.socket.onerror = NOOP
    }
    this.socket = undefined
    this.initSocket()
  }
  private tryReconnect = () => {
    if (
      this.isTryReconnect ||
      (Object.keys(this.records).length === 0 &&
        this.queueSubscribe.length === 0)
    ) {
      return
    }
    this.isTryReconnect = true
    setTimeout(() => {
      this.isTryReconnect = false
      this.reconnect()
    }, this.retryGap)
  }
  private createRequestId () {
    this.requestBaseId += 1
    return `${this.requestBaseId}`
  }

  private initSocket (force?: boolean) {
    if (!this.socket || force) {
      this.socket = new WebSocket(this.url, this.protocol)
      this.socket.onopen = this.onopen
      this.socket.onmessage = this.onmessage
      this.socket.onclose = this.onclose
      this.socket.onerror = this.onerror
    }
  }
}
