import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAccount, useReadContract, usePublicClient } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { TrendingUp, Clock, DollarSign, Users, RefreshCw } from 'lucide-react'
import { getMarketDetails, getSettlementTokenSymbol } from '../utils/contractUtils'
import { CONTRACT_ADDRESSES, SEPOLIA_CHAIN_ID } from '../config/contracts'
import SettlementTokenABI from '../abis/SettlementToken.json'

const HomePage = ({ markets, loading, onRefresh }) => {
  const { address, isConnected, chainId } = useAccount()
  const publicClient = usePublicClient()
  const [marketDetails, setMarketDetails] = useState([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const tokenSymbol = getSettlementTokenSymbol()

  // Use wagmi's useReadContract hook for balance
  const { data: balanceData, refetch: refetchBalance } = useReadContract({
    address: CONTRACT_ADDRESSES[SEPOLIA_CHAIN_ID]?.settlementToken,
    abi: SettlementTokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: SEPOLIA_CHAIN_ID,
    query: {
      enabled: !!address && isConnected,
    }
  })

  const userBalance = balanceData ? (parseFloat(balanceData.toString()) / 1e18).toFixed(4) : '0'

  useEffect(() => {
    const loadMarketDetails = async () => {
      if (!markets.length) return
      
      setLoadingDetails(true)
      try {
        // Fetch details for each market address
        const detailsPromises = markets.map(async (marketAddress) => {
          try {
            const details = await getMarketDetails(marketAddress, publicClient)
            return details
          } catch (error) {
            console.error(`Error loading market ${marketAddress}:`, error)
            return null
          }
        })
        
        const marketDetails = await Promise.all(detailsPromises)
        // Filter out null results (failed fetches)
        const validMarkets = marketDetails.filter(market => market !== null)
        setMarketDetails(validMarkets)
      } catch (error) {
        console.error('Error loading market details:', error)
      } finally {
        setLoadingDetails(false)
      }
    }

    loadMarketDetails()
  }, [markets])


  const formatTimeRemaining = (timestamp) => {
    const now = Math.floor(Date.now() / 1000)
    const remaining = timestamp - now
    
    if (remaining <= 0) return 'Expired'
    
    const days = Math.floor(remaining / 86400)
    const hours = Math.floor((remaining % 86400) / 3600)
    const minutes = Math.floor((remaining % 3600) / 60)
    
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const getMarketStatus = (market) => {
    if (market.resolved) {
      return market.outcome ? 'YES' : 'NO'
    }
    
    const now = Math.floor(Date.now() / 1000)
    if (market.resolveTimestamp <= now) {
      return 'Pending Resolution'
    }
    
    return 'Active'
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'YES':
        return 'bg-green-100 text-green-800'
      case 'NO':
        return 'bg-red-100 text-red-800'
      case 'Active':
        return 'bg-blue-100 text-blue-800'
      case 'Pending Resolution':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Prediction Markets</h1>
            <p className="mt-2 text-gray-600">
              Trade on the outcome of future events
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">Your Balance</p>
              <p className="text-lg font-semibold text-gray-900">
                {isConnected ? `${parseFloat(userBalance).toFixed(4)} ${tokenSymbol}` : 'Not Connected'}
              </p>
            </div>
            <button
              onClick={() => {
                onRefresh()
                refetchBalance()
              }}
              disabled={loading || loadingDetails || !isConnected}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${(loading || loadingDetails) ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <ConnectButton />
          </div>
        </div>
      </div>

      {/* Markets Grid */}
      {loading || loadingDetails ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="flex justify-between">
                <div className="h-8 bg-gray-200 rounded w-16"></div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      ) : marketDetails.length === 0 ? (
        <div className="text-center py-12">
          <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No markets found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create your first prediction market to get started.
          </p>
          <div className="mt-6">
            <Link
              to="/create"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Create Market
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {marketDetails.map((market) => {
            const status = getMarketStatus(market)
            const timeRemaining = formatTimeRemaining(market.resolveTimestamp)
            
            return (
              <Link
                key={market.address}
                to={`/market/${market.address}`}
                className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                      {market.question || 'Unknown Question'}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                      {status}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-2" />
                      {timeRemaining}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-gray-500">
                        <DollarSign className="h-4 w-4 mr-1" />
                        Volume
                      </div>
                      <span className="font-medium text-gray-900">
                        {parseFloat(market.totalVolume).toFixed(2)} {tokenSymbol}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-gray-500">
                        <Users className="h-4 w-4 mr-1" />
                        YES Pool
                      </div>
                      <span className="font-medium text-green-600">
                        {parseFloat(market.yesPool).toFixed(2)} {tokenSymbol}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-gray-500">
                        <Users className="h-4 w-4 mr-1" />
                        NO Pool
                      </div>
                      <span className="font-medium text-red-600">
                        {parseFloat(market.noPool).toFixed(2)} {tokenSymbol}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-end text-xs text-gray-500">
                      <span>Fee: {market.feeBps / 100}%</span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default HomePage
