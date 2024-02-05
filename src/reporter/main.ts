import { parseArgs } from 'node:util'
import type { RedisClientType } from 'redis'
import { createClient } from 'redis'
import { buildLogger } from '../logger'
import { REDIS_HOST, REDIS_PORT } from '../settings'
import { IReporters } from './types'
import { buildReporter } from './shard'

const REPORTERS: IReporters = {
  SHARD: buildReporter
}

const LOGGER = buildLogger('reporter')

async function main() {
  const reporter = loadArgs()

  const redisClient: RedisClientType = createClient({ url: `redis://${REDIS_HOST}:${REDIS_PORT}` })
  await redisClient.connect()

  REPORTERS[reporter](redisClient, LOGGER)
  LOGGER.debug('Reporter launched')
}

function loadArgs(): string {
  const {
    values: { reporter }
  } = parseArgs({
    options: {
      reporter: {
        type: 'string'
      }
    }
  })

  if (!reporter) {
    throw Error('Missing --reporter argument.')
  }

  if (!Object.keys(REPORTERS).includes(reporter)) {
    throw Error(`${reporter} is not supported reporter.`)
  }

  return reporter
}

main().catch((error) => {
  LOGGER.error(error)
  process.exitCode = 1
})
