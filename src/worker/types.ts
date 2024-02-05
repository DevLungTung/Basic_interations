import { Logger } from 'pino'
import { RedisClientType } from 'redis'

export interface IWorkers {
  [index: string]: (redisClient: RedisClientType, _logger: Logger) => Promise<void>
}
export interface ITornMetadata {
  name: string
  description: string
  image: string
  shardValue: number
  enchanted: number
  spoil: number
}
export interface Metadata {
  name: string
  description: string
  image: string
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  properties: any
}

export interface Property {
  name: string
  value: string
  display_value: string
}

export interface TornTrait {
  shardValue: number
}

export interface Spoil {
  type: string
  helmet: string
  chest: string
  arms: string
  background: string
  eyes: string
  headgear: string
  faceEmblem: string
  chestEmblem: string
  special: boolean
  weapon: string
  pet: string
}

export interface SpoilData {
  id: number
  name: string
  attack: number
  defense: number
  shard: number
  spoilTypeId: number
}

export interface MythicData {
  id: number
  name: string
  image: string
  description: string
  contract?: string
  rarityId?: number
  allegianceId?: number
}

export interface AccountAsset {
  account: string
  spoilId: number
  amount: number
}

export interface Reward {
  rewardName: string
  rewardType: number //1:spoil, 2: type
}
