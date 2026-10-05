import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Janela from '../../components/Janela'

const campoBase =
  'px-3.5 py-2.5 rounded-lg border border-border-strong text-base focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo'

function NovoTimeModal({ campeonatoId, aoFechar, aoCriar }) {
  const [nome, setNome] = useState('')
  const [cor, setCor] = useState('#8B1D1F')
  const [salvando, setSalvando] = useState(false)

  async function criar(e) {
    e.preventDefault()
    if (!nome.trim()) return

    setSalvando(true)
    const { error } = await supabase.from('equipe').insert({ campeonato_id: campeonatoId, nome: nome.trim(), cor })
    setSalvando(false)

    if (error) {
      alert(error.code === '23505' ? 'Já existe um time com esse nome neste campeonato.' : 'Erro ao criar time: ' + error.message)
      return
    }
    aoCriar()
  }

  return (
    <Janela titulo="Cadastrar time" aoFechar={aoFechar}>
      <form onSubmit={criar} className="flex flex-col gap-3">
        <input className={campoBase} placeholder="Nome do time" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus required />
        <label className="flex items-center gap-3 text-xs font-semibold text-ink/60">
          Cor do time
          <input
            type="color"
            value={cor}
            onChange={(e) => setCor(e.target.value)}
            className="w-11 h-11 rounded-lg border border-border-strong bg-surface p-1 cursor-pointer"
          />
        </label>
        <button
          type="submit"
          disabled={salvando || !nome.trim()}
          className="w-full bg-campo text-white text-sm font-semibold rounded-lg py-2.5 hover:bg-campo-dark transition-colors disabled:opacity-50"
        >
          {salvando ? 'Criando...' : 'Criar time'}
        </button>
      </form>
    </Janela>
  )
}

export default NovoTimeModal
