import * as dotenv from 'dotenv'
dotenv.config()

export const DEPLOYMENT_NAME = process.env.DEPLOYMENT_NAME || 'base_interration'

export const LISTENER_DELAY = Number(process.env.LISTENER_DELAY) || 1500

export const LISTENER_SHARD_LATEST_QUEUE_NAME = `${DEPLOYMENT_NAME}-listener-shard-latest-queue`
export const LISTENER_SHARD_PROCESS_EVENT_QUEUE_NAME = `${DEPLOYMENT_NAME}-listener-shard-process-event-queue`
export const WORKER_SHARD_QUEUE_NAME = `${DEPLOYMENT_NAME}-worker-shard-queue`
export const REPORTER_SHARD_QUEUE_NAME = `${DEPLOYMENT_NAME}-reporter-shard-queue`

export const REMOVE_ON_COMPLETE = 500
export const REMOVE_ON_FAIL = 1_000
export const CONCURRENCY = 12

export const LOG_LEVEL = process.env.LOG_LEVEL || 'info'
export const LOG_DIR = process.env.LOG_DIR || './'

export const REDIS_HOST = process.env.REDIS_HOST || 'localhost'
export const REDIS_PORT = process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379
export const PROVIDER_URL = process.env.PROVIDER_URL || 'http://127.0.0.1:8545'

export const SHARD_ADDRESS = process.env.SHARD_ADDRESS || ''

export const BULLMQ_CONNECTION = {
  concurrency: CONCURRENCY,
  connection: {
    host: REDIS_HOST,
    port: REDIS_PORT
  }
}

export const LISTENER_JOB_SETTINGS = {
  removeOnComplete: REMOVE_ON_COMPLETE,
  removeOnFail: REMOVE_ON_FAIL,
  attempts: 10,
  backoff: 1_000
}

export const WORKER_JOB_SETTINGS = {
  removeOnComplete: REMOVE_ON_COMPLETE,
  removeOnFail: REMOVE_ON_FAIL,
  attempts: 10,
  backoff: 1_000
}

export const ALL_QUEUES = [
  LISTENER_SHARD_LATEST_QUEUE_NAME,
  LISTENER_SHARD_PROCESS_EVENT_QUEUE_NAME,
  WORKER_SHARD_QUEUE_NAME
]

export function getObservedBlockRedisKey(contractAddress: string) {
  return `${contractAddress}-listener-${DEPLOYMENT_NAME}`
}
