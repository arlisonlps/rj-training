import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { POSICOES } from '../../lib/posicoes'
import logo from '../../assets/logo.png'
import SeletorTema from '../../components/SeletorTema'
import Rodape from '../../components/Rodape'

function Cadastro() {
  const [nomeCompleto, setNomeCompleto] = useState('')
  const [cpf, setCpf] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [nascimento, setNascimento] = useState('')
  const [posicao, setPosicao] = useState('')
  const [erro, setErro] = useState('')

  function dadosBasicosValidos() {
    if (!nomeCompleto || !cpf || !whatsapp || !nascimento || !posicao) {
      setErro('Preencha nome completo, CPF, WhatsApp, data de nascimento e posição.')
      return false
    }
    return true
  }

  function cadastrarComGoogle() {
    setErro('')
    if (!dadosBasicosValidos()) return

    localStorage.setItem(
      'cadastro_pendente',
      JSON.stringify({ nomeCompleto, cpf, whatsapp, nascimento, posicao })
    )
    supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4 py-10">
      <SeletorTema className="fixed top-4 right-4" />
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src={logo} alt="RJ Training" className="h-28 w-auto mx-auto" />
          <p className="text-sm text-ink/60 mt-1">Criar uma conta</p>
        </div>

        <div className="bg-surface rounded-2xl shadow-sm border border-border p-8">
          <div className="flex flex-col gap-3 mb-5">
            <input
              type="text"
              placeholder="Nome completo"
              value={nomeCompleto}
              onChange={(e) => setNomeCompleto(e.target.value)}
              className="px-4 py-2.5 rounded-lg border border-border-strong text-base focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo"
              required
            />
            <input
              type="text"
              placeholder="CPF (somente números)"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              className="px-4 py-2.5 rounded-lg border border-border-strong text-base focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo"
              required
            />
            <input
              type="text"
              placeholder="WhatsApp (ex: 5591999999999)"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="px-4 py-2.5 rounded-lg border border-border-strong text-base focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo"
              required
            />
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink/60">
              Data de nascimento
              <input
                type="date"
                value={nascimento}
                onChange={(e) => setNascimento(e.target.value)}
                className="px-4 py-2.5 rounded-lg border border-border-strong text-base focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo"
                required
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink/60">
              Posição
              <select
                value={posicao}
                onChange={(e) => setPosicao(e.target.value)}
                className="px-4 py-2.5 rounded-lg border border-border-strong text-base focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo"
                required
              >
                <option value="">Selecione a posição</option>
                {POSICOES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
          </div>

          {erro && <p className="text-brick text-sm mb-4">{erro}</p>}

          <button
            onClick={cadastrarComGoogle}
            className="w-full flex items-center justify-center gap-3 bg-surface border border-border-strong text-ink font-semibold text-sm rounded-lg py-3 hover:bg-hover transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.7 34.6 27 35.5 24 35.5c-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.6 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.9 36.4 44 31 44 24c0-1.3-.1-2.7-.4-3.5z" />
            </svg>
            Cadastrar com Google
          </button>

          <p className="text-center text-sm text-ink/60 mt-6">
            Já tem conta?{' '}
            <Link to="/login" className="text-campo-dark font-semibold hover:underline">
              Entrar
            </Link>
          </p>
        </div>

        <Rodape className="mt-6" />
      </div>
    </div>
  )
}

export default Cadastro
