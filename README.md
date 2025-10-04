# Prediction Market Frontend

A modern, mobile-responsive React frontend for a decentralized prediction market platform built with wagmi, viem, and Tailwind CSS.

## 🎥 Demo Video

Watch the application in action: [YouTube Demo](https://www.youtube.com/watch?v=icQ8vmw3ULM)

## 🚀 Features

### Core Functionality
- **Market Creation**: Create new prediction markets with custom questions and resolution dates
- **Trading Interface**: Buy YES/NO shares with real-time price updates
- **Portfolio Management**: View your positions, shares, and balance
- **Market Discovery**: Browse all available markets with detailed information
- **Real-time Data**: Live updates of market pools, prices, and user positions

### User Experience
- **Mobile Responsive**: Optimized for all device sizes
- **Wallet Integration**: Seamless connection with RainbowKit
- **Transaction Management**: Clear success/error feedback with detailed logging
- **Data Refresh**: Automatic and manual data refresh capabilities
- **Loading States**: Smooth loading indicators for all operations

## 🛠️ Technology Stack

- **Frontend Framework**: React 18
- **Styling**: Tailwind CSS
- **Blockchain Integration**: 
  - wagmi (React Hooks for Ethereum)
  - viem (TypeScript interface for Ethereum)
- **Wallet Connection**: RainbowKit
- **Routing**: React Router DOM
- **Notifications**: React Hot Toast
- **Icons**: Lucide React
- **Build Tool**: Vite

## 📱 User Interface

### Home Page
- **Market Grid**: Displays all available prediction markets
- **Market Cards**: Show market question, total volume, time remaining, and current prices
- **Connect Wallet**: Prominent wallet connection button in header
- **Real-time Updates**: Automatic refresh of market data
- **Responsive Design**: Adapts to mobile, tablet, and desktop screens

### Market Creation Page
- **Question Input**: Text area for market questions (32 character limit)
- **Resolution Time**: Date/time picker with quick selection buttons (1 hour, 1 day, 7 days, 30 days)
- **Liquidity Pools**: Required initial YES/NO pool amounts (minimum 0.01 PMT)
- **Fee Configuration**: Basis points fee setting (default 1%)
- **Fee Recipient**: Optional custom fee recipient address
- **Form Validation**: Real-time validation with helpful error messages

### Market Details Page
- **Market Information**: 
  - Question display with proper UTF-8 decoding
  - Resolution timestamp with countdown timer
  - Market status (Active/Cancelled/Resolved)
  - Total volume and pool sizes
- **Trading Interface**:
  - Amount input field for trade size
  - Buy YES/NO buttons with loading states
  - Token approval system with max allowance
  - Current allowance display
- **Position Tracking**:
  - YES/NO shares owned
  - Current balance in PMT tokens
  - Manual refresh button for data updates
- **Market Statistics**:
  - Current pool sizes and percentages
  - Fee information
  - Trading volume

## 🔧 Smart Contract Integration

### Contract Addresses (Sepolia Testnet)
- **Settlement Token**: `0x40E301b4b0bE1CdBC6FCed08DA1700e46C7414B6`
- **Market Factory**: `0x19553caEc97562935670Ce90d4310086d7300999`
- **Sample Market**: `0xa9b5FE7cd5877Ae86232bAa2f68AAc8a3e0a8257`

### Contract Functions
- **Market Factory**:
  - `createMarket()`: Deploy new prediction markets
  - `getMarkets()`: Retrieve all market addresses
- **Market Contract**:
  - `buyYes()`/`buyNo()`: Purchase prediction shares
  - `question`: Market question (bytes32)
  - `yesPool`/`noPool`: Current liquidity pools
  - `state`: Market status (0=Active, 1=Cancelled, 2=Resolved)
  - `resolveTimestamp`: Market resolution time
- **Settlement Token**:
  - `approve()`: Approve market contracts for token transfers
  - `allowance()`: Check approved token amounts
  - `balanceOf()`: Get user token balance

## 🎨 UI Components

### Navigation
- **Sidebar**: Collapsible navigation menu
- **Header**: Wallet connection and user balance display
- **Mobile Menu**: Hamburger menu for mobile devices

### Trading Interface
- **Position Cards**: Compact display of user holdings
- **Trade Buttons**: Styled YES/NO purchase buttons
- **Amount Input**: Numeric input with validation
- **Approval Flow**: Streamlined token approval process

### Market Cards
- **Question Display**: Truncated question text with full view on details page
- **Price Indicators**: Current YES/NO prices as percentages
- **Volume Display**: Total market volume in PMT
- **Status Badges**: Active/Resolved status indicators
- **Time Remaining**: Countdown to market resolution

## 🔄 Data Flow

### Real-time Updates
1. **Contract Events**: Listen for market creation and trading events
2. **State Management**: React hooks for local state management
3. **Data Refresh**: Automatic refresh after transactions
4. **Error Handling**: Graceful error handling with user feedback

### Transaction Flow
1. **User Action**: User initiates trade or market creation
2. **Wallet Interaction**: RainbowKit handles wallet connection
3. **Contract Call**: wagmi executes smart contract function
4. **Transaction Confirmation**: Wait for blockchain confirmation
5. **Data Refresh**: Update UI with latest contract state
6. **User Feedback**: Show success/error messages

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- MetaMask or compatible Web3 wallet
- Sepolia ETH for gas fees

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd front-end

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Setup
Create a `.env.local` file with:
```
VITE_APP_NETWORK=sepolia
VITE_APP_CHAIN_ID=11155111
```

### Building for Production
```bash
# Build the application
npm run build

# Preview the build
npm run preview
```

## 📱 Mobile Responsiveness

### Breakpoints
- **Mobile**: < 768px (Single column layout)
- **Tablet**: 768px - 1024px (Two column layout)
- **Desktop**: > 1024px (Three column layout)

### Mobile Features
- **Touch-friendly**: Large touch targets for trading buttons
- **Swipe Navigation**: Smooth transitions between pages
- **Collapsible Menu**: Space-efficient navigation
- **Responsive Typography**: Scalable text sizes

## 🔒 Security Features

### Wallet Security
- **RainbowKit Integration**: Secure wallet connection
- **Transaction Validation**: Client-side validation before blockchain calls
- **Error Boundaries**: Graceful error handling
- **Input Sanitization**: Protected against XSS attacks

### Smart Contract Safety
- **Allowance Management**: Controlled token approvals
- **Transaction Limits**: Reasonable transaction amounts
- **Error Recovery**: Automatic retry mechanisms

## 🎯 User Experience Features

### Accessibility
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: ARIA labels and semantic HTML
- **Color Contrast**: WCAG compliant color schemes
- **Focus Management**: Clear focus indicators

### Performance
- **Lazy Loading**: Code splitting for faster initial load
- **Optimized Images**: Compressed and responsive images
- **Efficient Rendering**: React optimization techniques
- **Caching**: Smart data caching strategies

## 🐛 Troubleshooting

### Common Issues
1. **Wallet Not Connecting**: Ensure MetaMask is installed and unlocked
2. **Transaction Failures**: Check Sepolia ETH balance for gas fees
3. **Data Not Loading**: Verify network connection and contract addresses
4. **Mobile Issues**: Clear browser cache and reload

### Debug Mode
Enable debug logging by opening browser console to see detailed transaction logs and error messages.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the demo video: [YouTube Demo](https://www.youtube.com/watch?v=icQ8vmw3ULM)
- Review the smart contract documentation

---

Built with ❤️ using React, wagmi, viem, and Tailwind CSS