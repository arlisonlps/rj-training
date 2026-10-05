import { useState } from 'react'
import { MapPin, Save, ClipboardList } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { paraInputDataHora, deInputDataHora } from '../../lib/data'

const campoBase =
  'px-3 py-2 rounded-lg border border-border-strong text-base focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo'

function JogoLinha({ jogo, nomeA, nomeB, aoSalvar, aoAbrirResultado }) {
  const [dataHora, setDataHora] = useState(paraInputDataHora(jogo.data_hora))
  const [local, setLocal] = useState(jogo.local || '')
  const [salvando, setSalvando] = useState(false)

  const alterado = dataHora !== paraInputDataHora(jogo.data_hora) || local !== (jogo.local || '')
  const temPlacar = jogo.gols_a !== null && jogo.gols_b !== null
  const semTimes = !jogo.equipe_a_id || !jogo.equipe_b_id

  async function salvar() {
    setSalvando(true)
    const { error } = await supabase
      .from('jogo')
      .update({ data_hora: deInputDataHora(dataHora), local: local.trim() || null })
      .eq('id', jogo.id)
    setSalvando(false)
    if (error) {
      alert('Erro ao salvar o jogo: ' + error.message)
      return
    }
    aoSalvar()
  }

  return (
    <li className="bg-surface border border-border rounded-xl px-4 py-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="font-semibold text-sm">
          {nomeA || 'A definir'}
          <span className="mx-2 font-bold text-campo-dark">{temPlacar ? `${jogo.gols_a} x ${jogo.gols_b}` : 'x'}</span>
          {nomeB || 'A definir'}
          {jogo.penaltis_a !== null && (
            <span className="ml-2 text-xs font-normal text-ink/50">({jogo.penaltis_a} x {jogo.penaltis_b} nos pênaltis)</span>
          )}
        </div>
        {jogo.encerrado && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sucesso-light text-sucesso shrink-0">ENCERRADO</span>
        )}
      </div>
      <div className="flex gap-2 flex-wrap items-center">
        <input
          type="datetime-local"
          className={`${campoBase} flex-1 min-w-44`}
          value={dataHora}
          onChange={(e) => setDataHora(e.target.value)}
          aria-label="Data e horário do jogo"
        />
        <div className="relative flex-1 min-w-36">
          <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
          <input
            className={`${campoBase} w-full pl-8`}
            placeholder="Local"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
          />
        </div>
        {alterado ? (
          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-1.5 bg-campo text-white text-xs font-semibold px-3 py-2.5 rounded-lg hover:bg-campo-dark transition-colors disabled:opacity-60"
          >
            <Save size={14} />
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        ) : semTimes ? (
          <span className="text-xs text-ink/50 px-2">Aguardando os times</span>
        ) : (
          <button
            type="button"
            onClick={aoAbrirResultado}
            className="flex items-center gap-1.5 bg-campo-light text-campo-dark text-xs font-semibold px-3 py-2.5 rounded-lg hover:brightness-95 transition-all"
          >
            <ClipboardList size={14} />
            {jogo.encerrado ? 'Ver / editar resultado' : 'Lançar resultado'}
          </button>
        )}
      </div>
    </li>
  )
}

export default JogoLinha
