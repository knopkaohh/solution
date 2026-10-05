import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { LockKeyhole } from 'lucide-react'

const SESSION_KEY = 'personal-90-unlocked'
const PASSWORD_HASH = '63dd59d59671db0beca3e7b5c5cbec7a8cfdfb3ebe5a36939d89141ee7876541'

async function hash(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function PasswordGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === 'yes')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setChecking(true)
    const valid = await hash(password) === PASSWORD_HASH
    setChecking(false)
    if (!valid) {
      setError('Неверный пароль')
      setPassword('')
      return
    }
    sessionStorage.setItem(SESSION_KEY, 'yes')
    setUnlocked(true)
  }

  if (unlocked) return children

  return (
    <main className="password-screen">
      <form className="password-card" onSubmit={submit}>
        <span className="password-icon"><LockKeyhole /></span>
        <span className="eyebrow">ПЕРСОНАЛЬНЫЕ 90</span>
        <h1>Закрытый доступ</h1>
        <p>Введите пароль, чтобы открыть личную систему.</p>
        <label className="field">
          <span>Пароль</span>
          <input
            autoFocus
            autoComplete="current-password"
            inputMode="numeric"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setError('')
            }}
          />
        </label>
        {error && <div className="password-error">{error}</div>}
        <button className="primary" disabled={!password || checking} type="submit">
          {checking ? 'Проверяем…' : 'Открыть приложение'}
        </button>
      </form>
    </main>
  )
}
