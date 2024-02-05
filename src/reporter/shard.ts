import { Job, Worker } from 'bullmq'
import { Logger } from 'pino'
import { IShardTransferListenerWorker } from '../types'
import { BULLMQ_CONNECTION, REPORTER_SHARD_QUEUE_NAME } from '../settings'
import { RedisClientType } from 'redis'

const FILE_NAME = import.meta.url

export async function buildReporter(redisClient: RedisClientType, _logger: Logger) {
  const logger = _logger.child({ name: 'shardReporter', file: FILE_NAME })
  const reporterWorker = new Worker(
    REPORTER_SHARD_QUEUE_NAME,
    await reporter(logger),
    BULLMQ_CONNECTION
  )
  reporterWorker.on('error', (e) => {
    logger.error(e)
  })
  async function handleExit() {
    logger.info('Exiting. Wait for graceful shutdown.')

    await redisClient.quit()
    await reporterWorker.close()
  }
  process.on('SIGINT', handleExit)
  process.on('SIGTERM', handleExit)
}
export async function reporter(logger: Logger) {
  async function wrapper(job: Job) {
    const inData: IShardTransferListenerWorker = job.data
    logger.info(inData, 'inData')
  }

  logger.debug('Reporter job built')
  return wrapper
}
