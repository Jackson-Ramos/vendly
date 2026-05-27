import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Login.module.css'

function DashboardLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
      <rect width="20" height="20" rx="4" fill="#5e6ad2" />
      <rect x="3.5" y="3.5" width="5.5" height="5.5" rx="1.2" fill="white" />
      <rect x="11" y="3.5" width="5.5" height="5.5" rx="1.2" fill="white" />
      <rect x="3.5" y="11" width="13" height="5.5" rx="1.2" fill="white" fillOpacity="0.75" />
    </svg>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const navigate = useNavigate()

  function handleSubmit(e) {
    e.preventDefault()
    navigate('/relatorio')
  }

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <DashboardLogo />
          <span className={styles.brandName}>vendly</span>
        </div>

        <h1 className={styles.headline}>Bem-vindo de volta</h1>
        <p className={styles.subtitle}>Entre na sua conta para continuar.</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              className={`${styles.input} ${emailFocused ? styles.inputFocused : ''}`}
              placeholder="voce@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              autoComplete="email"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              className={`${styles.input} ${passwordFocused ? styles.inputFocused : ''}`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className={styles.btnPrimary}>
            Entrar
          </button>
        </form>

        <p className={styles.footer}>
          Não tem uma conta?{' '}
          <span className={styles.link}>Criar conta</span>
        </p>
      </div>
    </div>
  )
}
