import { Observable, Observer, of, Subject } from 'rxjs'
import { concatMap, filter, map } from 'rxjs/operators'

const NOOP = () => {}

const wsEndpoint = ''

export class WebSocketSubject {
  private url: string = wsEndpoint
  private protocol: string = 'json'
  private reconnectTimeGap: number = 5000
  private subject: Subject<any> = new Subject()
  private streamObservable = this.subject.pipe(
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
  private socket: WebSocket | undefined
  private allSubscribe: {
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

  init ({
    url,
    protocol,
    reconnectTimeGap
  }: {
    url?: string
    protocol?: string
    reconnectTimeGap?: number
  }): void {
    this.url = url || this.url
    this.protocol = protocol || this.protocol
    this.reconnectTimeGap = reconnectTimeGap || this.reconnectTimeGap
  }

  subscribe (params: any, delay?: number | undefined): Observable<any> {
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
          if (this.allSubscribe[requestId] !== undefined) {
            this.allSubscribe[requestId].count -= 1
            if (this.allSubscribe[requestId].count === 0) {
              delete this.allSubscribe[requestId]
            }
          }
          this.queueSubscribe = this.queueSubscribe.filter(r => r.run !== run)
          if (
            Object.keys(this.allSubscribe).length === 0 &&
            this.socket!.readyState === WebSocket.OPEN
          ) {
            this.socket!.close()
          }
        }
        const error = (err: Error) => {
          observer.error(err)
          clearSubscribe()
        }
        subscription = this.streamObservable.subscribe({
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
        if (this.allSubscribe[requestId] !== undefined) {
          this.allSubscribe[requestId].count += 1
        } else {
          this.allSubscribe[requestId] = {
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
          if (this.allSubscribe[requestId] !== undefined) {
            this.allSubscribe[requestId].count -= 1
            if (this.allSubscribe[requestId].count === 0) {
              delete this.allSubscribe[requestId]
            }
          }
          this.queueSubscribe = this.queueSubscribe.filter(r => r.run !== run)
          if (
            Object.keys(this.allSubscribe).length === 0 &&
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
    Object.keys(this.allSubscribe).forEach(requestId => {
      const { sendData, delay } = this.allSubscribe[requestId]
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
    this.subject.next(data)
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
      (Object.keys(this.allSubscribe).length === 0 &&
        this.queueSubscribe.length === 0)
    ) {
      return
    }
    this.isTryReconnect = true
    setTimeout(() => {
      this.isTryReconnect = false
      this.reconnect()
    }, this.reconnectTimeGap)
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
