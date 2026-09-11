import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const DIAS = ['terca', 'quarta', 'quinta']
const LABELS = { terca: 'Terça', quarta: 'Quarta', quinta: 'Quinta' }
const HORARIOS = ['06h', '07h', '17h', '18h']

function AlunoHorario() {
  const [escolhas, setEscolhas] = useState({ terca: '', quarta: '', quinta: '' })
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    carregarHorarios()
  }, [])

  async function carregarHorarios() {
    const { data, error } = await supabase.rpc('meus_horarios')
    if (!error && data) {
      const novasEscolhas = { terca: '', quarta: '', quinta: '' }
      data.forEach((h) => {
        novasEscolhas[h.dia_semana] = h.horario
      })
      setEscolhas(novasEscolhas)
    }
    setCarregando(false)
  }

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    setMensagem('')

    if (!escolhas.terca || !escolhas.quarta || !escolhas.quinta) {
      setErro('Escolha um horário para os 3 dias (Terça, Quarta e Quinta).')
      return
    }

    for (const dia of DIAS) {
      const { data: resultado, error } = await supabase.rpc('escolher_meu_horario', {
        p_dia: dia,
        p_horario: escolhas[dia],
      })
      if (error || (resultado && resultado.startsWith('ERRO'))) {
        setErro(error?.message || resultado)
        return
      }
    }

    setMensagem('Horários salvos com sucesso!')
  }

  if (carregando) return null

  return (
    <div>
      <h2 className="text-2xl font-bold text-campo-dark mb-6">Meu horário de treino</h2>

      <form onSubmit={salvar} className="bg-white rounded-2xl shadow-sm border border-black/5 p-6 flex flex-col gap-4">
        {DIAS.map((dia) => (
          <label key={dia} className="flex flex-col gap-1.5 text-xs font-semibold text-ink/60">
            {LABELS[dia]}
            <select
              value={escolhas[dia]}
              onChange={(e) => setEscolhas({ ...escolhas, [dia]: e.target.value })}
              className="px-3.5 py-2.5 rounded-lg border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo"
            >
              <option value="">Selecione um horário</option>
              {HORARIOS.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </label>
        ))}

        {erro && <p className="text-brick text-sm">{erro}</p>}
        {mensagem && <p className="text-campo-dark text-sm">{mensagem}</p>}

        <button
          type="submit"
          className="bg-campo text-white font-semibold text-sm rounded-lg py-2.5 hover:bg-campo-dark transition-colors"
        >
          Salvar horários
        </button>
      </form>
    </div>
  )
}

export default AlunoHorario