import { Queue, Worker } from 'bullmq'
import { Logger } from 'pino'
import type { RedisClientType } from 'redis'
import { IShardTransferListenerWorker, QueueType } from '../types'
import {
  BULLMQ_CONNECTION,
  REPORTER_SHARD_QUEUE_NAME,
  WORKER_JOB_SETTINGS,
  WORKER_SHARD_QUEUE_NAME
} from '../settings'

const FILE_NAME = import.meta.url

export async function buildShardWorker(redisClient: RedisClientType, _logger: Logger) {
  const logger = _logger.child({ name: 'shardWorker', file: FILE_NAME })

  const reporterQueue = new Queue(REPORTER_SHARD_QUEUE_NAME, BULLMQ_CONNECTION)
  const worker = new Worker(
    WORKER_SHARD_QUEUE_NAME,
    await job(reporterQueue, _logger),
    BULLMQ_CONNECTION
  )
  worker.on('error', (e) => {
    logger.error(e)
  })
  async function handleExit() {
    logger.info('Exiting. Wait for graceful shutdown.')

    await redisClient.quit()
    await worker.close()
  }
  process.on('SIGINT', handleExit)
  process.on('SIGTERM', handleExit)
}

export async function job(reporterQueue: QueueType, _logger: Logger) {
  const logger = _logger.child({ name: 'shardTransferJob', file: FILE_NAME })
  async function wrapper(job) {
    const inData: IShardTransferListenerWorker = job.data

    try {
      await reporterQueue.add('shardTransfer', inData, {
        //jobId: inData.txHash,
        ...WORKER_JOB_SETTINGS
      })
      logger.info(inData, 'inData')
      return inData
    } catch (e) {
      logger.error(`Shard transfer process error: tx[${inData.txHash}] - ${e} `)
      throw e
    }
  }
  return wrapper
}
