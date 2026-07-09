import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { RouterProvider } from 'react-router'
import { router } from './router.jsx'
import { AuthProvider } from './context/AuthProvider.jsx'

// main.jsx is the browser entry point. It connects React to the #root element
// in index.html and wraps the whole routed app with shared providers.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
)
