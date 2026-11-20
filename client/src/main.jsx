import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { FlyToCartProvider } from './context/FlyToCartContext'
import { SocketProvider } from './context/SocketContext'
import { ToastProvider } from './context/ToastContext'
import '@fontsource-variable/besley/wght.css'
import '@fontsource-variable/anek-kannada/standard.css'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* reducedMotion="user": people who turn on "reduce motion" on their phone get fades instead of movement */}
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <AuthProvider>
          <SocketProvider>
            <CartProvider>
              <FlyToCartProvider>
                <App />
              </FlyToCartProvider>
            </CartProvider>
          </SocketProvider>
        </AuthProvider>
      </ToastProvider>
    </MotionConfig>
  </StrictMode>,
)
