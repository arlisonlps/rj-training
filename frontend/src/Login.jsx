import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabaseClient'

function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function entrarComGoogle() {
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  async function entrarComEmail(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    if (error) {
      setErro('Email ou senha inválidos')
    }
    setCarregando(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-campo-dark tracking-tight">RJ Training</h1>
          <p className="text-sm text-ink/60 mt-1">Painel administrativo</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-8">
          <form onSubmit={entrarComEmail} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-4 py-2.5 rounded-lg border border-black/10 text-base focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo"
              required
            />
            <input
              type="password"
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="px-4 py-2.5 rounded-lg border border-black/10 text-base focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo"
              required
            />
            {erro && <p className="text-brick text-sm">{erro}</p>}
            <button
              type="submit"
              disabled={carregando}
              className="bg-campo text-white font-semibold text-sm rounded-lg py-2.5 hover:bg-campo-dark transition-colors disabled:opacity-60"
            >
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px bg-black/10 flex-1" />
            <span className="text-xs text-ink/40">ou</span>
            <div className="h-px bg-black/10 flex-1" />
          </div>

          <button
            onClick={entrarComGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white border border-black/10 text-ink font-semibold text-sm rounded-lg py-3 hover:bg-black/5 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.7 34.6 27 35.5 24 35.5c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.6 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.9 36.4 44 31 44 24c0-1.3-.1-2.7-.4-3.5z" />
            </svg>
            Entrar com Google
          </button>

          <p className="text-center text-sm text-ink/60 mt-6">
            Não tem conta?{' '}
            <Link to="/cadastro" className="text-campo-dark font-semibold hover:underline">
              Criar uma conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login