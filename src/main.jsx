import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { RouterProvider } from 'react-router'
import { router } from './router.jsx'
import { AuthProvider } from './context/AuthProvider.jsx'
import { isConfigured } from './lib/supabaseClient.js'

// main.jsx is the browser entry point. It connects React to the #root element
// in index.html and wraps the whole routed app with shared providers.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isConfigured ? <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider> : <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}><h1>App setup needed</h1><p>The app connection has not been configured. Set the Supabase URL and publishable key, then restart or rebuild the app.</p></main>}
  </StrictMode>,
)
