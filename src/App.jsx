import { Routes, Route } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, usePublicClient } from 'wagmi'
import { useState, useEffect } from 'react'
import { Menu, X, TrendingUp, Plus, Home } from 'lucide-react'

import HomePage from './pages/HomePage'
import CreateMarket from './pages/CreateMarket'
import MarketDetails from './pages/MarketDetails'
import { getAllMarkets } from './utils/contractUtils'

function App() {
  const { address, isConnected, chainId } = useAccount()
  const publicClient = usePublicClient()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [markets, setMarkets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadMarkets = async () => {
      try {
        const allMarkets = await getAllMarkets(publicClient)
        setMarkets(allMarkets)
      } catch (error) {
        console.error('Error loading markets:', error)
      } finally {
        setLoading(false)
      }
    }

    if (isConnected && publicClient) {
      loadMarkets()
    } else {
      setLoading(false)
    }
  }, [isConnected, publicClient])

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Create Market', href: '/create', icon: Plus },
  ]

  const refreshMarkets = async () => {
    try {
      const allMarkets = await getAllMarkets(publicClient)
      setMarkets(allMarkets)
    } catch (error) {
      console.error('Error refreshing markets:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="h-0 flex-1 overflow-y-auto pt-5 pb-4">
            <div className="flex flex-shrink-0 items-center px-4">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Prediction Market</span>
            </div>
            <nav className="mt-5 space-y-1 px-2">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className="group flex items-center rounded-md px-2 py-2 text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  >
                    <Icon className="mr-4 h-6 w-6 flex-shrink-0 text-gray-400" />
                    {item.name}
                  </a>
                )
              })}
            </nav>
          </div>
          <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
            <ConnectButton />
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-white border-r border-gray-200">
          <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
            <div className="flex flex-shrink-0 items-center px-4">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Prediction Market</span>
            </div>
            <nav className="mt-5 flex-1 space-y-1 px-2">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className="group flex items-center rounded-md px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  >
                    <Icon className="mr-3 h-6 w-6 flex-shrink-0 text-gray-400" />
                    {item.name}
                  </a>
                )
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white shadow lg:hidden">
          <button
            type="button"
            className="border-r border-gray-200 px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex flex-1 justify-between px-4">
            <div className="flex flex-1 items-center">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              <span className="ml-2 text-lg font-semibold text-gray-900">Prediction Market</span>
            </div>

          </div>
        </div>

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage markets={markets} loading={loading} onRefresh={refreshMarkets} />} />
            <Route path="/create" element={<CreateMarket onMarketCreated={refreshMarkets} />} />
            <Route path="/market/:address" element={<MarketDetails markets={markets} />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default App
