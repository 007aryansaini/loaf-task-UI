import { useState } from 'react'
import { useAccount, useWriteContract, usePublicClient, useWalletClient } from 'wagmi'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { parseEther, toHex } from 'viem'
import { CONTRACT_ADDRESSES, SEPOLIA_CHAIN_ID } from '../config/contracts'
import MarketFactoryABI from '../abis/MarketFactory.json'
import { getSettlementTokenSymbol } from '../utils/contractUtils'

const CreateMarket = ({ onMarketCreated }) => {
  const { address, isConnected, chainId } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient()
  const walletClient = useWalletClient()
  const navigate = useNavigate()
  const tokenSymbol = getSettlementTokenSymbol()
  
  const [formData, setFormData] = useState({
    question: '',
    resolveTimestamp: '',
    initYesPool: '100',
    initNoPool: '100',
    feeBps: '100',
    feeRecipient: ''
  })
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const calculateResolveTimestamp = (days, hours, minutes) => {
    const now = Math.floor(Date.now() / 1000)
    const totalSeconds = (days * 24 * 60 * 60) + (hours * 60 * 60) + (minutes * 60)
    return now + totalSeconds
  }

  const handleCreateMarket = async (e) => {
    e.preventDefault()
    
    if (!isConnected) {
      toast.error('Please connect your wallet')
      return
    }

    if (chainId !== SEPOLIA_CHAIN_ID) {
      toast.error('Please switch to Sepolia testnet')
      return
    }

    try {
      setLoading(true)

      const walletChainId = await walletClient?.data?.getChainId()
      if (walletChainId !== SEPOLIA_CHAIN_ID) {
        toast.error('Please switch to the correct chain (Sepolia)')
        return
      }

      // Convert question string to bytes32 (ensure it fits within 32 bytes)
      // First, encode as UTF-8 to get the byte length
      const questionBytes = new TextEncoder().encode(formData.question)
      
      let questionHash
      if (questionBytes.length <= 32) {
        // If question fits in 32 bytes, pad it with zeros
        const padded = new Uint8Array(32)
        padded.set(questionBytes)
        questionHash = toHex(padded)
      } else {
        // If question is too long, truncate it to fit
        const truncated = questionBytes.slice(0, 32)
        const padded = new Uint8Array(32)
        padded.set(truncated)
        questionHash = toHex(padded)
        console.warn('Question was truncated to fit in 32 bytes:', formData.question)
      }
      
      // Calculate resolve timestamp from form data
      let resolveTimestamp
      if (formData.resolveTimestamp) {
        // Convert datetime-local input to timestamp
        resolveTimestamp = Math.floor(new Date(formData.resolveTimestamp).getTime() / 1000)
      } else {
        // Fallback to 7 days from now
        resolveTimestamp = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
      }
      
      // Validate required fields
      if (!formData.initYesPool || !formData.initNoPool) {
        toast.error('Initial liquidity pools are required')
        return
      }
      
      // Parse amounts to wei
      const initYesPool = parseEther(formData.initYesPool)
      const initNoPool = parseEther(formData.initNoPool)
      
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES[SEPOLIA_CHAIN_ID].marketFactory,
        abi: MarketFactoryABI,
        functionName: 'createMarket',
        args: [
          questionHash,
          resolveTimestamp,
          initYesPool,
          initNoPool,
          parseInt(formData.feeBps),
          formData.feeRecipient || address
        ],
        chainId: SEPOLIA_CHAIN_ID
      })

      await publicClient?.waitForTransactionReceipt({ hash: hash })

      toast.success('Market created successfully!')
      
      // Refresh markets list
      if (onMarketCreated) {
        await onMarketCreated()
      }
      
      // Navigate to home
      navigate('/')
      
    } catch (error) {
      console.error('Create market error:', error)
      toast.error('Failed to create market')
    } finally {
      setLoading(false)
    }
  }

  const setQuickTime = (type) => {
    const now = Math.floor(Date.now() / 1000)
    let timestamp = now
    
    switch (type) {
      case '1hour':
        timestamp = now + (1 * 60 * 60)
        break
      case '1day':
        timestamp = now + (24 * 60 * 60)
        break
      case '7days':
        timestamp = now + (7 * 24 * 60 * 60)
        break
      case '30days':
        timestamp = now + (30 * 24 * 60 * 60)
        break
    }
    
    setFormData(prev => ({
      ...prev,
      resolveTimestamp: new Date(timestamp * 1000).toISOString().slice(0, 16)
    }))
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Plus className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Connect Your Wallet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Please connect your wallet to create a prediction market.
          </p>
        </div>
      </div>
    )
  }

  if (chainId !== SEPOLIA_CHAIN_ID) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Plus className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Wrong Network</h3>
          <p className="mt-1 text-sm text-gray-500">
            Please switch to Sepolia testnet to create markets.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link
          to="/"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Markets
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Create New Market</h1>
        <p className="mt-2 text-gray-600">
          Create a prediction market for any future event
        </p>
      </div>

      <form onSubmit={handleCreateMarket} className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="space-y-6">
            {/* Question */}
            <div>
              <label htmlFor="question" className="block text-sm font-medium text-gray-700">
                Market Question
              </label>
              <textarea
                id="question"
                name="question"
                rows={3}
                value={formData.question}
                onChange={handleInputChange}
                placeholder="e.g., Will Bitcoin reach $100,000 by December 31, 2024?"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
                maxLength={32}
              />
              <p className="mt-2 text-sm text-gray-500">
                Be specific and clear about what outcome you're predicting. Maximum 32 characters.
              </p>
              {formData.question.length > 32 && (
                <p className="mt-1 text-sm text-red-600">
                  Question is too long and will be truncated to 32 characters.
                </p>
              )}
            </div>

            {/* Resolution Time */}
            <div>
              <label htmlFor="resolveTimestamp" className="block text-sm font-medium text-gray-700">
                Resolution Time
              </label>
              <input
                type="datetime-local"
                id="resolveTimestamp"
                name="resolveTimestamp"
                value={formData.resolveTimestamp}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              />
              <div className="mt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setQuickTime('1hour')}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                >
                  1 Hour
                </button>
                <button
                  type="button"
                  onClick={() => setQuickTime('1day')}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                >
                  1 Day
                </button>
                <button
                  type="button"
                  onClick={() => setQuickTime('7days')}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                >
                  7 Days
                </button>
                <button
                  type="button"
                  onClick={() => setQuickTime('30days')}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                >
                  30 Days
                </button>
              </div>
            </div>

            {/* Initial Pools */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="initYesPool" className="block text-sm font-medium text-gray-700">
                  Initial YES Pool ({tokenSymbol})
                </label>
                <input
                  type="number"
                  id="initYesPool"
                  name="initYesPool"
                  step="0.01"
                  min="0.01"
                  value={formData.initYesPool}
                  onChange={handleInputChange}
                  placeholder="100.0"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
                <p className="mt-2 text-sm text-gray-500">
                  Required: Initial liquidity for YES side (minimum 0.01 {tokenSymbol})
                </p>
              </div>

              <div>
                <label htmlFor="initNoPool" className="block text-sm font-medium text-gray-700">
                  Initial NO Pool ({tokenSymbol})
                </label>
                <input
                  type="number"
                  id="initNoPool"
                  name="initNoPool"
                  step="0.01"
                  min="0.01"
                  value={formData.initNoPool}
                  onChange={handleInputChange}
                  placeholder="100.0"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
                <p className="mt-2 text-sm text-gray-500">
                  Required: Initial liquidity for NO side (minimum 0.01 {tokenSymbol})
                </p>
              </div>
            </div>

            {/* Fee Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="feeBps" className="block text-sm font-medium text-gray-700">
                  Fee (basis points)
                </label>
                <input
                  type="number"
                  id="feeBps"
                  name="feeBps"
                  min="0"
                  max="1000"
                  value={formData.feeBps}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Fee percentage: {(formData.feeBps / 100).toFixed(2)}%
                </p>
              </div>

              <div>
                <label htmlFor="feeRecipient" className="block text-sm font-medium text-gray-700">
                  Fee Recipient
                </label>
                <input
                  type="text"
                  id="feeRecipient"
                  name="feeRecipient"
                  value={formData.feeRecipient}
                  onChange={handleInputChange}
                  placeholder={address}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Leave empty to use your address
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin -ml-1 mr-3 h-5 w-5 text-white">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                </div>
                Creating Market...
              </>
            ) : (
              <>
                <Plus className="h-5 w-5 mr-2" />
                Create Market
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateMarket
