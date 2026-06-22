import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import { motion, AnimatePresence } from 'framer-motion'
import { LoginCredentials, RegisterCredentials, AuthResult } from '../../../shared/types'

type View = 'login' | 'register' | 'initial'

interface LoginScreenProps {
  onAuthSuccess: (result: AuthResult) => void
  initialView?: View
}

function LoginScreen({ onAuthSuccess, initialView = 'initial' }: LoginScreenProps): React.JSX.Element {
  const [view, setView] = useState<View>(initialView)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const usernameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (view === 'login' && emailRef.current) emailRef.current.focus()
    if (view === 'register' && usernameRef.current) usernameRef.current.focus()
  }, [view])

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      setError('Completa todos los campos')
      return
    }
    setLoading(true)
    setError('')
    try {
      const credentials: LoginCredentials = { email: email.trim(), password }
      const result = await window.api.auth.login(credentials)
      if (result.success && result.user) {
        onAuthSuccess(result)
      } else {
        setError(result.error || 'Error al iniciar sesión')
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [email, password, onAuthSuccess])

  const handleRegister = useCallback(async () => {
    if (!email.trim() || !password.trim() || !username.trim()) {
      setError('Completa todos los campos')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setLoading(true)
    setError('')
    try {
      const credentials: RegisterCredentials = { email: email.trim(), password, username: username.trim() }
      const result = await window.api.auth.register(credentials)
      if (result.success && result.user) {
        onAuthSuccess(result)
      } else {
        setError(result.error || 'Error al registrarse')
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [email, password, username, onAuthSuccess])

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') action()
  }

  if (view === 'initial') {
    return (
      <motion.div
        className="login-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="login-container">
          <motion.div
            className="login-logo"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          >
            <Icon icon="mynaui:gamepad" width={64} />
            <h1>LaLa Hub</h1>
            <p className="login-subtitle">Tu centro de juegos</p>
          </motion.div>

          <motion.div
            className="login-buttons"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <button className="login-btn login-btn--primary" onClick={() => setView('login')}>
              <Icon icon="mynaui:arrow-right" />
              Iniciar Sesión
            </button>
            <button className="login-btn login-btn--secondary" onClick={() => setView('register')}>
              Crear Cuenta
            </button>
          </motion.div>

          <motion.p
            className="login-skip"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <button className="login-btn login-btn--ghost" onClick={() => onAuthSuccess({ success: true, user: undefined })}>
              Continuar sin cuenta →
            </button>
          </motion.p>
        </div>
      </motion.div>
    )
  }

  const isLogin = view === 'login'

  return (
    <motion.div
      className="login-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="login-container login-container--form">
        <button className="login-back" onClick={() => setView('initial')}>
          <Icon icon="mynaui:arrow-left" />
        </button>

        <div className="login-logo login-logo--small">
          <Icon icon="mynaui:gamepad" width={40} />
          <h2>{isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</h2>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              className="login-error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Icon icon="mynaui:alert-circle" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="login-form">
          {!isLogin && (
            <div className="login-field">
              <label>Nombre de usuario</label>
              <input
                ref={usernameRef}
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onKeyDown={e => handleKeyDown(e, handleRegister)}
                placeholder="Tu nombre"
                disabled={loading}
              />
            </div>
          )}

          <div className="login-field">
            <label>Email</label>
            <input
              ref={isLogin ? emailRef : undefined}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => handleKeyDown(e, isLogin ? handleLogin : handleRegister)}
              placeholder="tu@email.com"
              disabled={loading}
            />
          </div>

          <div className="login-field">
            <label>Contraseña</label>
            <div className="login-input-wrapper">
              <input
                ref={isLogin ? passwordRef : undefined}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => handleKeyDown(e, isLogin ? handleLogin : handleRegister)}
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                className="login-toggle-pw"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                <Icon icon={showPassword ? 'mynaui:eye-off' : 'mynaui:eye'} />
              </button>
            </div>
          </div>

          <button
            className="login-btn login-btn--primary login-btn--full"
            onClick={isLogin ? handleLogin : handleRegister}
            disabled={loading}
          >
            {loading ? (
              <span className="login-spinner" />
            ) : isLogin ? (
              'Iniciar Sesión'
            ) : (
              'Crear Cuenta'
            )}
          </button>
        </div>

        <p className="login-switch">
          {isLogin ? (
            <>¿No tienes cuenta? <button onClick={() => { setView('register'); setError('') }}>Regístrate</button></>
          ) : (
            <>¿Ya tienes cuenta? <button onClick={() => { setView('login'); setError('') }}>Inicia Sesión</button></>
          )}
        </p>
      </div>
    </motion.div>
  )
}

export default LoginScreen
