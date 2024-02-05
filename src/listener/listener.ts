import { Job, Worker, Queue } from 'bullmq'
import { ethers } from 'ethers'
import { Logger } from 'pino'
import type { RedisClientType } from 'redis'
import { BULLMQ_CONNECTION, LISTENER_JOB_SETTINGS, getObservedBlockRedisKey } from '../settings'
import {
  ILatestListenerJob,
  IProcessEventListenerJob,
  ListenerInitType,
  ProcessEventOutputType
} from './types'
import { State } from './state'

const FILE_NAME = import.meta.url

export async function listenerService({
  contractAddress,
  abi,
  eventName,
  latestQueueName,
  processEventQueueName,
  workerQueueName,
  processFn,
  redisClient,
  logger
}: {
  contractAddress: string
  abi: ethers.InterfaceAbi
  eventName: string
  latestQueueName: string
  processEventQueueName: string
  workerQueueName: string
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  processFn: (log: any) => Promise<ProcessEventOutputType | undefined>
  redisClient: RedisClientType
  logger: Logger
}) {
  const latestListenerQueue = new Queue(latestQueueName, BULLMQ_CONNECTION)
  const processEventQueue = new Queue(processEventQueueName, BULLMQ_CONNECTION)
  const workerQueue = new Queue(workerQueueName, BULLMQ_CONNECTION)

  const listenerInitType: ListenerInitType = 'clear'
  const state = new State({
    redisClient,
    eventName,
    logger,
    abi,
    latestListenerQueue,
    listenerInitType
  })
  const latestWorker = new Worker(
    latestQueueName,
    latestJob({
      state,
      processEventQueue,
      redisClient,
      logger
    }),
    BULLMQ_CONNECTION
  )
  latestWorker.on('error', (e) => {
    logger.error(e)
  })

  const processEventWorker = new Worker(
    processEventQueueName,
    processEventJob({ workerQueue, processFn, logger }),
    BULLMQ_CONNECTION
  )
  processEventWorker.on('error', (e) => {
    logger.error(e)
  })

  await state.add(contractAddress)

  async function handleExit() {
    logger.info('Exiting. Wait for graceful shutdown.')

    await latestWorker.close()
    await processEventWorker.close()
    await redisClient.quit()
  }
  process.on('SIGINT', handleExit)
  process.on('SIGTERM', handleExit)
}

function latestJob({
  state,
  processEventQueue,
  redisClient,
  logger
}: {
  state: State
  processEventQueue: Queue
  redisClient: RedisClientType
  logger: Logger
}) {
  async function wrapper(job: Job) {
    const inData: ILatestListenerJob = job.data
    const { contractAddress } = inData
    const observedBlockRedisKey = getObservedBlockRedisKey(contractAddress)

    let latestBlock: number
    let observedBlock: number

    try {
      latestBlock = await state.latestBlockNumber()
    } catch (e) {
      // The observed block number has not been updated, therefore
      // we do not need to submit job to history queue. The next
      // repeatable job will re-request the latest block number and
      // continue from there.
      logger.error('Failed to fetch the latest block number.')
      logger.error(e)
      throw e
    }

    try {
      // We assume that redis cache has been initialized within
      // `State.add` method call.
      observedBlock = Number(await redisClient.get(observedBlockRedisKey))
    } catch (e) {
      // Similarly to the failure during fetching the latest block
      // number, this error doesn't require job resubmission. The next
      // repeatable job will re-request the latest observed block number and
      // continue from there.
      logger.error('Failed to fetch the latest observed block from Redis.')
      logger.error(e)
      throw e
    }

    if (latestBlock < observedBlock) {
      logger.warn('latestBlock < observedBlock. Updating observed block to revert the condition.')
      observedBlock = Math.max(0, latestBlock - 1)
    }

    const logPrefix = generateListenerLogPrefix(contractAddress, observedBlock, latestBlock)
    try {
      if (latestBlock > observedBlock) {
        await redisClient.set(observedBlockRedisKey, latestBlock)
        // //test
        // observedBlock = 10295700
        // latestBlock = 10295708
        const events = await state.queryEvent(contractAddress, observedBlock + 1, latestBlock)
        for (const [index, eventLog] of events.entries()) {
          const outData: IProcessEventListenerJob = {
            contractAddress,
            event: eventLog
          }
          const jobId = getUniqueEventIdentifier(eventLog, index)
          await processEventQueue.add('latest', outData, {
            jobId,
            ...LISTENER_JOB_SETTINGS
          })
        }
        logger.info(logPrefix)
      } else {
        logger.info(`${logPrefix} noop`)
      }
    } catch (e) {
      logger.warn(`${logPrefix} fail with ${e}`)
    }
  }

  return wrapper
}

function processEventJob({
  workerQueue,
  processFn,
  logger
}: {
  workerQueue: Queue
  processFn: (log: ethers.EventLog | ethers.Log) => Promise<ProcessEventOutputType | undefined>
  logger: Logger
}) {
  const _logger = logger.child({ name: 'processEventJob', file: FILE_NAME })

  async function wrapper(job: Job) {
    const inData: IProcessEventListenerJob = job.data
    const { event } = inData
    _logger.debug(event, 'event')

    try {
      const jobMetadata = await processFn(event)
      if (jobMetadata) {
        const { jobId, jobName, jobData, jobQueueSettings } = jobMetadata
        const queueSettings = jobQueueSettings ? jobQueueSettings : LISTENER_JOB_SETTINGS
        console.log('add queue', jobData)

        await workerQueue.add(jobName, jobData, {
          jobId,
          ...queueSettings
        })
        _logger.debug(`Listener submitted job [${jobId}] for [${jobName}]`)
      }
    } catch (e) {
      _logger.error(e, 'Error in user defined listener processing function')
      throw e
    }
  }

  return wrapper
}

function getUniqueEventIdentifier(event: ethers.EventLog | ethers.Log, index: number) {
  return `${event.blockNumber}-${event.transactionHash}-${index}`
}

function generateListenerLogPrefix(contractAddress: string, fromBlock: number, toBlock: number) {
  return `${contractAddress} ${fromBlock}-${toBlock} (${toBlock - fromBlock})`
}
