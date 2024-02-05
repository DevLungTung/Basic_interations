import { ethers } from 'ethers'
import { PROVIDER_URL } from '../settings'

export async function getTransaction(txHash: string) {
  const provider = new ethers.JsonRpcProvider(PROVIDER_URL)
  return await provider.getTransaction(txHash)
}
