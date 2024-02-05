import { parseUnits } from 'ethers'
import fs from 'fs/promises'
export function createProperty(name: string, value: number, display_value: number) {
  return { name, value, display_value }
}

export async function abis(name: string) {
  return JSON.parse(await fs.readFile(`./data/${name}.json`, 'utf8'))
}
export function buildUrl(host: string, path: string) {
  const url = [host, path].join('/')
  return url.replace(/([^:]\/)\/+/g, '$1')
}

export function parseShard(value: number) {
  return Number(parseUnits(value.toString(), 8))
}
