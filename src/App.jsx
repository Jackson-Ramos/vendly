import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Home from './pages/Home'
import Vendas from './pages/Vendas'
import Relatorio from './pages/Relatorio/Relatorio'
import Fornecedores from './pages/Fornecedores/Fornecedores'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Home />}>
        <Route index element={<Navigate to="vendas" replace />} />
        <Route path="vendas" element={<Vendas />} />
        <Route path="relatorio" element={<Relatorio />} />
        <Route path="fornecedores" element={<Fornecedores />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
