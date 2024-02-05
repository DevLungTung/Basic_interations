import { ethers } from 'ethers'
import { IContracts, ILatestListenerJob, ListenerInitType } from './types'
import { Logger } from 'pino'
import {
  LISTENER_DELAY,
  LISTENER_JOB_SETTINGS,
  PROVIDER_URL,
  getObservedBlockRedisKey
} from '../settings'
import { RedisClientType } from 'redis'
import { Queue } from 'bullmq'

export class State {
  latestListenerQueue: Queue
  abi: ethers.InterfaceAbi
  contracts: IContracts
  eventName: string
  provider: ethers.JsonRpcProvider
  redisClient: RedisClientType
  logger: Logger
  listenerInitType: ListenerInitType
  constructor({
    redisClient,
    eventName,
    logger,
    abi,
    latestListenerQueue,
    listenerInitType
  }: {
    redisClient: RedisClientType
    eventName: string
    logger: Logger
    abi: ethers.InterfaceAbi
    latestListenerQueue: Queue
    listenerInitType: ListenerInitType
  }) {
    this.eventName = eventName
    this.logger = logger
    this.provider = new ethers.JsonRpcProvider(PROVIDER_URL)
    logger.info(`url ${PROVIDER_URL}`)
    this.abi = abi
    this.redisClient = redisClient
    this.latestListenerQueue = latestListenerQueue
    this.listenerInitType = listenerInitType
    this.contracts = {}
  }

  async add(contractAddress: string) {
    this.logger.debug('State.add')

    const contract = new ethers.Contract(contractAddress, this.abi, this.provider)
    this.contracts = { ...this.contracts, [contractAddress]: contract }
    const observedBlockRedisKey = getObservedBlockRedisKey(contractAddress)
    const latestBlock = await this.latestBlockNumber()

    switch (this.listenerInitType) {
      case 'clear':
        // Clear metadata about previously observed blocks for a specific
        // `contractAddress`.
        await this.redisClient.set(observedBlockRedisKey, latestBlock - 1)
        break

      case 'latest':
        await this.setObservedBlockNumberIfNotDefined(observedBlockRedisKey, latestBlock - 1)
        break

      default:
        // [block number] initialization
        await this.setObservedBlockNumberIfNotDefined(observedBlockRedisKey, latestBlock - 1)
        break
    }
    await this.setObservedBlockNumberIfNotDefined(observedBlockRedisKey, latestBlock - 1)

    // Insert listener jobs
    const outData: ILatestListenerJob = {
      contractAddress
    }
    await this.latestListenerQueue.add('latest-repeatable', outData, {
      ...LISTENER_JOB_SETTINGS,
      jobId: contractAddress,
      repeat: {
        every: LISTENER_DELAY
      }
    })
  }
  /**
   * Query event on smart contract (specified by `contractAddress`) from
   * blocks in between `fromBlockNumber` and `toBlockNumber`.
   */
  async queryEvent(contractAddress: string, fromBlockNumber: number, toBlockNumber: number) {
    return await this.contracts[contractAddress].queryFilter(
      this.eventName,
      fromBlockNumber,
      toBlockNumber
    )
  }

  /**
   * Fetch the latest block number.
   */
  async latestBlockNumber() {
    return await this.provider.getBlockNumber()
  }

  async setObservedBlockNumberIfNotDefined(
    observedBlockRedisKey: string,
    observedBlockNumber: number
  ) {
    if ((await this.redisClient.get(observedBlockRedisKey)) === null) {
      await this.redisClient.set(observedBlockRedisKey, observedBlockNumber)
    }
  }
}
