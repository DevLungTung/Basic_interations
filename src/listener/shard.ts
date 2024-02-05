import { ethers } from 'ethers'
import { Logger } from 'pino'
import type { RedisClientType } from 'redis'
import { listenerService } from './listener'
import { IShardTransfer, ProcessEventOutputType } from './types'
import { IShardTransferListenerWorker } from '../types'
import {
  LISTENER_SHARD_LATEST_QUEUE_NAME,
  LISTENER_SHARD_PROCESS_EVENT_QUEUE_NAME,
  SHARD_ADDRESS,
  WORKER_SHARD_QUEUE_NAME
} from '../settings'
import { Erc20Abis } from '../contracts/erc20'
const FILE_NAME = import.meta.url

export async function buildShardListener(redisClient: RedisClientType, logger: Logger) {
  const eventName = 'Transfer'
  const latestQueueName = LISTENER_SHARD_LATEST_QUEUE_NAME
  const processEventQueueName = LISTENER_SHARD_PROCESS_EVENT_QUEUE_NAME
  const workerQueueName = WORKER_SHARD_QUEUE_NAME
  const iface = new ethers.Interface(Erc20Abis)
  listenerService({
    contractAddress: SHARD_ADDRESS,
    abi: Erc20Abis,
    eventName,
    latestQueueName,
    processEventQueueName,
    workerQueueName,
    processFn: await processEvent({ iface, logger }),
    redisClient,
    logger
  })
}

async function processEvent({ iface, logger }: { iface: ethers.Interface; logger: Logger }) {
  const _logger = logger.child({ name: 'processEvent', file: FILE_NAME })
  async function wrapper(log): Promise<ProcessEventOutputType | undefined> {
    const eventData = iface.parseLog(log)?.args as unknown as IShardTransfer
    _logger.debug(eventData, 'eventData')
    const jobName = 'shardTransfer'
    const txHash = log.transactionHash
    const jobData: IShardTransferListenerWorker = {
      txHash,
      from: eventData.from,
      to: eventData.to,
      value: Number(eventData.value)
    }
    _logger.info(jobData, 'jobData')

    return { jobName, jobId: txHash, jobData }
  }

  return wrapper
}
