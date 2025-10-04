import { parseEther, formatEther, formatUnits, hexToString, trim } from 'viem'
import { CONTRACT_ADDRESSES, SEPOLIA_CHAIN_ID, SAMPLE_MARKET_ADDRESS } from '../config/contracts'
import SettlementTokenABI from '../abis/SettlementToken.json'
import MarketFactoryABI from '../abis/MarketFactory.json'
import MarketABI from '../abis/Market.json'

export const getContractConfig = (chainId) => {
  return {
    address: CONTRACT_ADDRESSES[chainId]?.marketFactory,
    abi: MarketFactoryABI,
  }
}

export const getSettlementTokenConfig = (chainId) => {
  return {
    address: CONTRACT_ADDRESSES[chainId]?.settlementToken,
    abi: SettlementTokenABI,
  }
}

export const getMarketConfig = (address) => {
  return {
    address,
    abi: MarketABI,
  }
}

export const getAllMarkets = async (publicClient) => {
  try {
    if (!publicClient) {
      throw new Error('Public client not available')
    }

    // Get the market factory config
    const factoryConfig = getContractConfig(SEPOLIA_CHAIN_ID)
    
    // Call the getMarkets() function to get all market addresses
    const marketAddresses = await publicClient.readContract({
      ...factoryConfig,
      functionName: 'getMarkets'
    })

    console.log('Fetched market addresses from factory:', marketAddresses)
    return marketAddresses
  } catch (error) {
    console.error('Error fetching market addresses:', error)
    return []
  }
}

export const getMarketDetails = async (marketAddress, publicClient) => {
  try {
    console.log('Fetching market details for:', marketAddress)

    if (!publicClient) {
      throw new Error('Public client not available')
    }

    const marketConfig = getMarketConfig(marketAddress)

    // Fetch all market details using publicClient.readContract
    const [
      questionHash,
      resolveTimestamp,
      state,
      outcome,
      yesPool,
      noPool,
      feeBps,
      feeRecipient,
      settlementToken,
      totalYesPositions,
      totalNoPositions,
    ] = await Promise.all([
      publicClient.readContract({ ...marketConfig, functionName: 'question' }),
      publicClient.readContract({ ...marketConfig, functionName: 'resolveTimestamp' }),
      publicClient.readContract({ ...marketConfig, functionName: 'state' }),
      publicClient.readContract({ ...marketConfig, functionName: 'resolutionOutcome' }),
      publicClient.readContract({ ...marketConfig, functionName: 'yesPool' }),
      publicClient.readContract({ ...marketConfig, functionName: 'noPool' }),
      publicClient.readContract({ ...marketConfig, functionName: 'feeBps' }),
      publicClient.readContract({ ...marketConfig, functionName: 'feeRecipient' }),
      publicClient.readContract({ ...marketConfig, functionName: 'settlementToken' }),
      publicClient.readContract({ ...marketConfig, functionName: 'totalYesPositions' }),
      publicClient.readContract({ ...marketConfig, functionName: 'totalNoPositions' }),
    ])

    // Convert bytes32 question to string
    console.log('Raw question hash from contract:', questionHash)
    
    let question
    try {
      // Try using viem's hexToString with trim to remove padding
      const trimmedHex = trim(questionHash)
      question = hexToString(trimmedHex)
      console.log('Decoded question with viem:', question)
      
      // Clean up any null bytes or padding characters
      question = question.replace(/\0/g, '').trim()
      
      // If the decoded question is empty or looks like garbage, use fallback
      if (!question || question.length < 3 || question.includes('\uFFFD') || /^[0-9a-f]+$/i.test(question)) {
        console.log('Question appears to be hashed or corrupted, using fallback')
        question = `Market Question (${marketAddress.slice(0, 8)}...)`
      } else if (question.length > 50) {
        // If question is very long, it might have been truncated
        console.log('Question might have been truncated during encoding')
      }
    } catch (error) {
      console.error('Error decoding question with viem:', error)
      question = `Market Question (${marketAddress.slice(0, 8)}...)`
    }

    // Calculate total volume (sum of pools)
    const totalVolume = yesPool + noPool

    const marketData = {
      address: marketAddress,
      settlementToken: settlementToken,
      question: question,
      creator: "N/A", // Creator info not available in Market contract
      resolveTimestamp: Number(resolveTimestamp),
      resolved: state === 2, // Assuming state 2 means resolved (0=Active, 1=Cancelled, 2=Resolved)
      outcome: outcome,
      totalVolume: formatEther(totalVolume),
      yesPool: formatEther(yesPool),
      noPool: formatEther(noPool),
      feeBps: Number(feeBps),
      feeRecipient: feeRecipient,
      admin: "N/A", // Admin role info would need additional contract calls
      totalYesPositions: formatEther(totalYesPositions),
      totalNoPositions: formatEther(totalNoPositions),
    }

    console.log('Market data fetched from contract:', marketData)
    return marketData
  } catch (error) {
    console.error('Error fetching market details:', error)
    throw error
  }
}


export const getUserAllowance = async (userAddress, spenderAddress, publicClient) => {
  try {
    if (!userAddress || !spenderAddress || !publicClient) return '0'

    const settlementTokenConfig = getSettlementTokenConfig(SEPOLIA_CHAIN_ID)
    const allowance = await publicClient.readContract({
      ...settlementTokenConfig,
      functionName: 'allowance',
      args: [userAddress, spenderAddress],
    })
    return formatEther(allowance)
  } catch (error) {
    console.error('Error fetching user allowance:', error)
    return '0'
  }
}

export const getUserMarketShares = async (userAddress, marketAddress, publicClient) => {
  try {
    if (!userAddress || !marketAddress || !publicClient) return { yesShares: '0', noShares: '0' }

    const marketConfig = getMarketConfig(marketAddress)
    const [yesShares, noShares] = await Promise.all([
      publicClient.readContract({ ...marketConfig, functionName: 'yesPositions', args: [userAddress] }),
      publicClient.readContract({ ...marketConfig, functionName: 'noPositions', args: [userAddress] }),
    ])
    return { yesShares: formatEther(yesShares), noShares: formatEther(noShares) }
  } catch (error) {
    console.error('Error fetching user market shares:', error)
    return { yesShares: '0', noShares: '0' }
  }
}

export const calculateTradeAmount = (poolAmount, tradeAmount, isYes) => {
  try {
    const pool = parseFloat(poolAmount)
    const trade = parseFloat(tradeAmount)
    
    if (pool <= 0 || trade <= 0) return '0'
    
    // CPMM formula: x * y = k
    // For buying YES: newYesPool = pool + trade, newNoPool = pool * pool / newYesPool
    // Shares received = newNoPool - pool (for YES shares)
    const newPool = pool + trade
    const otherPool = (pool * pool) / newPool
    const shares = Math.abs(otherPool - pool)
    
    return shares.toFixed(6)
  } catch (error) {
    console.error('Error calculating trade amount:', error)
    return '0'
  }
}

export const getMarketPrice = (yesPool, noPool) => {
  try {
    const yes = parseFloat(yesPool)
    const no = parseFloat(noPool)
    const total = yes + no
    
    if (total === 0) return { yesPrice: 0.5, noPrice: 0.5 }
    
    return {
      yesPrice: no / total,
      noPrice: yes / total
    }
  } catch (error) {
    console.error('Error calculating market price:', error)
    return { yesPrice: 0.5, noPrice: 0.5 }
  }
}

export const getSettlementTokenSymbol = () => {
  return "PMT"
}

export const getSettlementTokenName = () => {
  return "Prediction Market Token"
}
