import { Queue } from 'bullmq'

export interface IListenerConfig {
  id: string
  address: string
  eventName: string
  chain: string
}

export interface MockQueue {
  add: any // eslint-disable-line @typescript-eslint/no-explicit-any
  process: any // eslint-disable-line @typescript-eslint/no-explicit-any
  on: any // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface IShardTransferListenerWorker {
  txHash: string
  from: string
  to: string
  value: number
}

export type QueueType = Queue | MockQueue
