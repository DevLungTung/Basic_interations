import { parseArgs } from 'node:util'
import type { RedisClientType } from 'redis'
import { buildLogger } from '../logger'
import { REDIS_HOST, REDIS_PORT } from '../settings'
import { IListeners } from './types'
import { createClient } from 'redis'
import { buildShardListener } from './shard'

const LOGGER = buildLogger('listener')
const LISTENERS: IListeners = {
  SHARD: buildShardListener
}
async function main() {
  const service = loadArgs()

  const redisClient: RedisClientType = createClient({ url: `redis://${REDIS_HOST}:${REDIS_PORT}` })

  await redisClient.connect()

  LISTENERS[service](redisClient, LOGGER)
  LOGGER.info('Listener launched')
}

function loadArgs(): string {
  const {
    values: { service }
  } = parseArgs({
    options: {
      service: {
        type: 'string'
      }
    }
  })

  if (!service) {
    throw Error('Missing --service argument.')
  }

  if (!Object.keys(LISTENERS).includes(service)) {
    throw Error(`${service} is not supported service.`)
  }

  return service
}

main().catch((e) => {
  LOGGER.error(e)
  process.exitCode = 1
})
