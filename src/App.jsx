import { useState } from 'react'
import Login from './pages/Login'
import Home from './pages/Home'

export default function App() {
  const [page, setPage] = useState('login')

  if (page === 'home') {
    return <Home onLogout={() => setPage('login')} />
  }

  return <Login onLogin={() => setPage('home')} />
}
