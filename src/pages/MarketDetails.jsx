import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAccount, useWriteContract, usePublicClient, useWalletClient, useReadContract } from 'wagmi'
import toast from 'react-hot-toast'
import { ArrowLeft, TrendingUp, Clock, DollarSign, Users, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { parseEther } from 'viem'
import { getMarketDetails, getUserAllowance, getUserMarketShares, calculateTradeAmount, getMarketPrice, getSettlementTokenSymbol } from '../utils/contractUtils'
import { CONTRACT_ADDRESSES, SEPOLIA_CHAIN_ID } from '../config/contracts'
import MarketABI from '../abis/Market.json'
import SettlementTokenABI from '../abis/SettlementToken.json'

const MarketDetails = ({ markets }) => {
  const { address: marketAddress } = useParams()
  const { address, isConnected, chainId } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient()
  const walletClient = useWalletClient()
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
  
  const [market, setMarket] = useState(null)
  const [userShares, setUserShares] = useState({ yesShares: '0', noShares: '0' })
  const [allowance, setAllowance] = useState('0')
  const [loading, setLoading] = useState(true)
  const [trading, setTrading] = useState({ type: null, loading: false })
  const [tradeAmount, setTradeAmount] = useState('')
  const [approving, setApproving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefreshData = async () => {
    if (!marketAddress || !address || !publicClient) return
    
    setRefreshing(true)
    try {
      const [marketData, shares, marketAllowance] = await Promise.all([
        getMarketDetails(marketAddress, publicClient),
        getUserMarketShares(address, marketAddress, publicClient),
        getUserAllowance(address, marketAddress, publicClient)
      ])
      
      setMarket(marketData)
      setUserShares(shares)
      setAllowance(marketAllowance)
      refetchBalance()
      
      toast.success('Data refreshed successfully!')
    } catch (error) {
      console.error('Error refreshing data:', error)
      toast.error('Failed to refresh data')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const loadMarketData = async () => {
      if (!marketAddress) return
      
      setLoading(true)
      try {
        const marketData = await getMarketDetails(marketAddress, publicClient)
        setMarket(marketData)
        
        if (isConnected) {
          const [shares, marketAllowance] = await Promise.all([
            getUserMarketShares(address, marketAddress, publicClient),
            getUserAllowance(address, marketAddress, publicClient)
          ])
          
          console.log('Initial user shares from contract:', shares)
          console.log('Initial allowance from contract:', marketAllowance)
          
          setUserShares(shares)
          setAllowance(marketAllowance)
        }
      } catch (error) {
        console.error('Error loading market data:', error)
        toast.error('Failed to load market data')
      } finally {
        setLoading(false)
      }
    }

    loadMarketData()
  }, [marketAddress, address, isConnected])

  const handleTrade = async (type) => {
    if (!isConnected) {
      toast.error('Please connect your wallet')
      return
    }

    if (chainId !== SEPOLIA_CHAIN_ID) {
      toast.error('Please switch to Sepolia testnet')
      return
    }

    if (!tradeAmount || parseFloat(tradeAmount) <= 0) {
      toast.error('Please enter a valid trade amount')
      return
    }

    try {
      setTrading({ type, loading: true })

      const walletChainId = await walletClient?.data?.getChainId()
      if (walletChainId !== SEPOLIA_CHAIN_ID) {
        toast.error('Please switch to the correct chain (Sepolia)')
        return
      }

      // Check allowance first - fetch fresh data from contract
      const currentAllowance = await getUserAllowance(address, marketAddress, publicClient)
      const requiredAmount = parseFloat(tradeAmount)
      const allowanceAmount = parseFloat(currentAllowance)
      
      console.log('Current allowance from contract:', currentAllowance)
      console.log('Required amount:', requiredAmount)
      console.log('Allowance check:', allowanceAmount, '>=', requiredAmount)
      
      if (allowanceAmount < requiredAmount) {
        toast.error('Insufficient allowance. Please approve tokens first.')
        setTrading({ type: null, loading: false })
        return
      }

      const hash = await writeContractAsync({
        address: marketAddress,
        abi: MarketABI,
        functionName: type === 'yes' ? 'buyYes' : 'buyNo',
        args: [parseEther(tradeAmount)],
        chainId: SEPOLIA_CHAIN_ID
      })

      await publicClient?.waitForTransactionReceipt({ hash: hash })

      toast.success(`${type.toUpperCase()} trade successful! Refreshing data...`)
      
      // Small delay to ensure blockchain state has updated
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Refresh data - wrap in try-catch to prevent errors from affecting success message
      try {
        const [newMarketData, newShares, newAllowance] = await Promise.all([
          getMarketDetails(marketAddress, publicClient),
          getUserMarketShares(address, marketAddress, publicClient),
          getUserAllowance(address, marketAddress, publicClient)
        ])
        
        console.log('Refreshed market data:', newMarketData)
        console.log('Refreshed user shares:', newShares)
        console.log('Refreshed allowance:', newAllowance)
        
        setMarket(newMarketData)
        setUserShares(newShares)
        setAllowance(newAllowance)
        
        // Also refresh the balance using the hook's refetch
        refetchBalance()
        
        toast.success('Data refreshed successfully!')
      } catch (refreshError) {
        console.error('Error refreshing data after trade:', refreshError)
        // Don't show error to user since trade was successful
        // Just log it and continue
        toast.success('Trade completed! (Data refresh failed)')
      }
      
      setTradeAmount('')
      
    } catch (error) {
      console.error('Trade error:', error)
      console.error('Trade error details:', {
        message: error.message,
        code: error.code,
        data: error.data
      })
      toast.error(`Trade failed: ${error.message || 'Unknown error'}`)
    } finally {
      setTrading({ type: null, loading: false })
    }
  }

  const handleApprove = async () => {
    if (!isConnected) return

    try {
      setApproving(true)

      const walletChainId = await walletClient?.data?.getChainId()
      if (walletChainId !== SEPOLIA_CHAIN_ID) {
        toast.error('Please switch to the correct chain (Sepolia)')
        return
      }

      // Approve a large amount (max uint256) to avoid repeated approvals
      const maxApproval = '115792089237316195423570985008687907853269984665640564039457584007913129639935' // 2^256 - 1
      
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES[SEPOLIA_CHAIN_ID].settlementToken,
        abi: SettlementTokenABI,
        functionName: 'approve',
        args: [marketAddress, maxApproval],
        chainId: SEPOLIA_CHAIN_ID
      })

      await publicClient?.waitForTransactionReceipt({ hash: hash })

      toast.success('Approval successful!')
      
      // Small delay to ensure blockchain state has updated
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Refresh allowance - wrap in try-catch to prevent errors from affecting success message
      try {
        const newAllowance = await getUserAllowance(address, marketAddress, publicClient)
        setAllowance(newAllowance)
      } catch (refreshError) {
        console.error('Error refreshing allowance after approval:', refreshError)
        // Don't show error to user since approval was successful
        // Just log it and continue
      }
      
    } catch (error) {
      console.error('Approval error:', error)
      console.error('Approval error details:', {
        message: error.message,
        code: error.code,
        data: error.data
      })
      toast.error(`Approval failed: ${error.message || 'Unknown error'}`)
    } finally {
      setApproving(false)
    }
  }

  const formatTimeRemaining = (timestamp) => {
    const now = Math.floor(Date.now() / 1000)
    const remaining = timestamp - now
    
    if (remaining <= 0) return 'Expired'
    
    const days = Math.floor(remaining / 86400)
    const hours = Math.floor((remaining % 86400) / 3600)
    const minutes = Math.floor((remaining % 3600) / 60)
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const getMarketStatus = () => {
    if (!market) return 'Loading...'
    
    if (market.resolved) {
      return market.outcome ? 'Resolved: YES' : 'Resolved: NO'
    }
    
    const now = Math.floor(Date.now() / 1000)
    if (market.resolveTimestamp && market.resolveTimestamp <= now) {
      return 'Pending Resolution'
    }
    
    return 'Active'
  }

  const getStatusColor = (status) => {
    if (status.includes('YES')) return 'bg-green-100 text-green-800'
    if (status.includes('NO')) return 'bg-red-100 text-red-800'
    if (status === 'Active') return 'bg-blue-100 text-blue-800'
    return 'bg-yellow-100 text-yellow-800'
  }

  const prices = market && market.yesPool && market.noPool ? getMarketPrice(market.yesPool, market.noPool) : { yesPrice: 0.5, noPrice: 0.5 }

  // Debug log
  console.log('MarketDetails - market data:', market)
  console.log('MarketDetails - loading state:', loading)

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="space-y-3">
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!market) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Market not found</h3>
          <p className="mt-1 text-sm text-gray-500">
            The market you're looking for doesn't exist.
          </p>
          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Back to Markets
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link
          to="/"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Markets
        </Link>
        
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {market.question || 'Loading...'}
            </h1>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(getMarketStatus())}`}>
                {getMarketStatus()}
              </span>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {market.resolveTimestamp ? formatTimeRemaining(market.resolveTimestamp) : 'Loading...'}
              </div>
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 mr-1" />
                {market.totalVolume ? parseFloat(market.totalVolume).toFixed(2) : '0.00'} {tokenSymbol}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Market Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Market Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">YES Pool</h3>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-2xl font-bold text-green-600">
                    {market.yesPool ? parseFloat(market.yesPool).toFixed(2) : '0.00'} {tokenSymbol}
                  </span>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Price: {(prices.yesPrice * 100).toFixed(1)}%
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">NO Pool</h3>
                <div className="flex items-center">
                  <XCircle className="h-5 w-5 text-red-500 mr-2" />
                  <span className="text-2xl font-bold text-red-600">
                    {market.noPool ? parseFloat(market.noPool).toFixed(2) : '0.00'} {tokenSymbol}
                  </span>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Price: {(prices.noPrice * 100).toFixed(1)}%
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-sm">
                <div>
                  <span className="text-gray-500">Fee:</span>
                  <div className="font-medium text-gray-900">
                    {market.feeBps ? (market.feeBps / 100).toFixed(2) : '0.00'}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Your Position */}
          {isConnected && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Your Position</h2>
                <button
                  onClick={handleRefreshData}
                  disabled={refreshing}
                  className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">YES Shares</h3>
                  <div className="text-sm font-bold text-green-600">
                    {parseFloat(userShares.yesShares).toFixed(4)}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">NO Shares</h3>
                  <div className="text-sm font-bold text-red-600">
                    {parseFloat(userShares.noShares).toFixed(4)}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Balance</h3>
                  <div className="text-sm font-bold text-gray-900">
                    {balanceData ? (parseFloat(balanceData.toString()) / 1e18).toFixed(4) : '0.0000'} {tokenSymbol}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Trading Interface */}
        {isConnected && !market.resolved && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Trade</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="tradeAmount" className="block text-sm font-medium text-gray-700 mb-2">
                  Amount ({tokenSymbol})
                </label>
                <input
                  type="number"
                  id="tradeAmount"
                  step="0.01"
                  min="0"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={() => handleTrade('yes')}
                  disabled={trading.loading || !tradeAmount}
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {trading.loading && trading.type === 'yes' ? (
                    <div className="animate-spin -ml-1 mr-2 h-4 w-4 text-white">
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full"></div>
                    </div>
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Buy YES
                </button>
                
                <button
                  onClick={() => handleTrade('no')}
                  disabled={trading.loading || !tradeAmount}
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {trading.loading && trading.type === 'no' ? (
                    <div className="animate-spin -ml-1 mr-2 h-4 w-4 text-white">
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full"></div>
                    </div>
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Buy NO
                </button>
              </div>
              
              {tradeAmount && parseFloat(tradeAmount) > 0 && (
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {approving ? (
                    <div className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700">
                      <div className="w-3 h-3 border-2 border-gray-700 border-t-transparent rounded-full"></div>
                    </div>
                  ) : null}
                  Approve Tokens
                </button>
              )}
              
              <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                <p>Current allowance: {parseFloat(allowance).toFixed(4)} {tokenSymbol}</p>
                <p>Fee: {market.feeBps ? (market.feeBps / 100).toFixed(2) : '0.00'}%</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MarketDetails
