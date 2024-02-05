import { ethers } from 'ethers'
import { IShardTransferListenerWorker } from '../types'
import { RedisClientType } from 'redis'
import { Logger } from 'pino'

interface IJobQueueSettings {
  removeOnComplete?: number | boolean
  removeOnFail?: number | boolean
  attempts?: number
  backoff?: number
}

export interface ILatestListenerJob {
  contractAddress: string
}

export interface IProcessEventListenerJob {
  contractAddress: string
  event: ethers.EventLog | ethers.Log
}

export interface IContracts {
  [key: string]: ethers.Contract
}

export type ProcessEventOutputType = {
  jobData: IShardTransferListenerWorker | null
  jobId: string
  jobName: string
  jobQueueSettings?: IJobQueueSettings
}

export type IListeners = {
  [index: string]: (redisClient: RedisClientType, logger: Logger) => void
}

export interface IShardTransfer {
  from: string
  to: string
  value: bigint
}

export type ListenerInitType = 'latest' | 'clear' | number
