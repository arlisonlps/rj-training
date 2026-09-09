import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { supabase } from './supabaseClient'

const dias = [
  { label: 'Terça', valor: 'terca' },
  { label: 'Quarta', valor: 'quarta' },
  { label: 'Quinta', valor: 'quinta' },
]

const horarios = ['06h', '07h', '17h', '18h']

function EscolherHorario() {
  const [cpf, setCpf] = useState('')
  const [selecoes, setSelecoes] = useState([{ dia: 'terca', horario: '06h' }])
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  function adicionarSelecao() {
    setSelecoes([...selecoes, { dia: 'terca', horario: '06h' }])
  }

  function removerSelecao(index) {
    setSelecoes(selecoes.filter((_, i) => i !== index))
  }

  function atualizarSelecao(index, campo, valor) {
    const novas = [...selecoes]
    novas[index][campo] = valor
    setSelecoes(novas)
  }

  async function enviar(e) {
    e.preventDefault()
    setMensagem('')
    setErro('')
    setEnviando(true)

    for (const selecao of selecoes) {
      const { error } = await supabase.rpc('escolher_horario_treino', {
        p_cpf: cpf,
        p_dia: selecao.dia,
        p_horario: selecao.horario,
      })

      if (error) {
        setErro(error.message)
        setEnviando(false)
        return
      }
    }

    setMensagem('Todos os horários foram registrados com sucesso!')
    setEnviando(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-campo-dark tracking-tight">RJ Training</h1>
          <p className="text-sm text-ink/60 mt-1">Escolha seus dias e horários de treino</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-8">
          <form onSubmit={enviar} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-ink/60">
              CPF
              <input
                type="text"
                placeholder="Somente números"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="px-4 py-2.5 rounded-lg border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo"
                required
              />
            </label>

            <div className="flex flex-col gap-3">
              {selecoes.map((selecao, index) => (
                <div key={index} className="flex items-center gap-2">
                  <select
                    value={selecao.dia}
                    onChange={(e) => atualizarSelecao(index, 'dia', e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-lg border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo"
                  >
                    {dias.map((d) => (
                      <option key={d.valor} value={d.valor}>{d.label}</option>
                    ))}
                  </select>
                  <select
                    value={selecao.horario}
                    onChange={(e) => atualizarSelecao(index, 'horario', e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-lg border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo"
                  >
                    {horarios.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  {selecoes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removerSelecao(index)}
                      className="p-2 rounded-lg text-brick hover:bg-brick-light shrink-0"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={adicionarSelecao}
              className="flex items-center justify-center gap-1.5 text-campo text-sm font-semibold py-2 border border-dashed border-campo/40 rounded-lg hover:bg-campo-light transition-colors"
            >
              <Plus size={14} />
              Adicionar outro dia/horário
            </button>

            <button
              type="submit"
              disabled={enviando}
              className="bg-campo text-white font-semibold text-sm rounded-lg py-2.5 hover:bg-campo-dark transition-colors disabled:opacity-60"
            >
              {enviando ? 'Enviando...' : 'Confirmar'}
            </button>

            {mensagem && <p className="text-campo-dark text-sm font-medium">{mensagem}</p>}
            {erro && <p className="text-brick text-sm">{erro}</p>}
          </form>
        </div>
      </div>
    </div>
  )
}

export default EscolherHorario