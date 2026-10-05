import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { classificacaoGrupo } from '../../domain/campeonato'

function CampoDesempate({ equipe, aoSalvar }) {
  const [valor, setValor] = useState(equipe.desempate_manual ?? '')

  return (
    <input
      type="number"
      min="1"
      inputMode="numeric"
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      onBlur={() => aoSalvar(equipe.id, valor === '' ? null : Number(valor))}
      placeholder="ordem"
      aria-label={`Ordem do desempate de ${equipe.nome}`}
      className="w-16 px-2 py-1 rounded-md border border-border-strong text-base text-center focus:outline-none focus:ring-2 focus:ring-campo/30"
    />
  )
}

function TabelaGrupo({ grupo, linhas, classificados, editavel, aoSalvarDesempate }) {
  const haEmpate = linhas.some((l) => l.empateNaoResolvido)

  return (
    <section className="mb-6">
      <h3 className="text-base font-bold text-campo-dark mb-2">{grupo.nome}</h3>
      <div className="overflow-x-auto bg-surface border border-border rounded-xl">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-ink/50 border-b border-border">
              <th className="text-left font-semibold px-3 py-2 w-8">#</th>
              <th className="text-left font-semibold px-2 py-2">Time</th>
              <th className="font-semibold px-2 py-2">P</th>
              <th className="font-semibold px-2 py-2">J</th>
              <th className="font-semibold px-2 py-2">V</th>
              <th className="font-semibold px-2 py-2">E</th>
              <th className="font-semibold px-2 py-2">D</th>
              <th className="font-semibold px-2 py-2">SG</th>
              <th className="font-semibold px-2 py-2">GP</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr
                key={linha.equipeId}
                className={`border-b border-border last:border-b-0 ${linha.posicao <= classificados ? 'bg-campo-light/60' : ''}`}
              >
                <td className="px-3 py-2.5 font-bold text-campo-dark">{linha.posicao}</td>
                <td className="px-2 py-2.5">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: linha.cor || '#9CA3AF' }} />
                    <span className="font-semibold text-sm">{linha.nome}</span>
                    {linha.empateNaoResolvido && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-light text-amber">EMPATE</span>
                    )}
                    {editavel && linha.empateNaoResolvido && (
                      <CampoDesempate equipe={linha} aoSalvar={aoSalvarDesempate} />
                    )}
                  </span>
                </td>
                <td className="px-2 py-2.5 text-center font-bold">{linha.pontos}</td>
                <td className="px-2 py-2.5 text-center">{linha.jogos}</td>
                <td className="px-2 py-2.5 text-center">{linha.vitorias}</td>
                <td className="px-2 py-2.5 text-center">{linha.empates}</td>
                <td className="px-2 py-2.5 text-center">{linha.derrotas}</td>
                <td className="px-2 py-2.5 text-center">{linha.saldo > 0 ? `+${linha.saldo}` : linha.saldo}</td>
                <td className="px-2 py-2.5 text-center">{linha.golsPro}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-ink/50 mt-1.5">
        Os {classificados} primeiros avançam ao mata-mata. Desempate: pontos, confronto direto, saldo de gols e gols marcados.
      </p>
      {haEmpate && (
        <p className="text-[11px] text-amber font-medium mt-1">
          {editavel
            ? 'Há times empatados em tudo. Digite a ordem do desempate (1 = melhor) em cada um deles.'
            : 'Há times empatados em tudo. Aguarde o professor definir o desempate.'}
        </p>
      )}
    </section>
  )
}

function ClassificacaoCampeonato({ campeonato, equipes, grupos, jogos, editavel = false, aoMudar }) {
  async function salvarDesempate(equipeId, valor) {
    const { error } = await supabase.from('equipe').update({ desempate_manual: valor }).eq('id', equipeId)
    if (error) {
      alert('Erro ao salvar o desempate: ' + error.message)
      return
    }
    aoMudar?.()
  }

  const gruposOrdenados = [...grupos].sort((a, b) => a.nome.localeCompare(b.nome))
  const temJogos = jogos.some((j) => j.fase === 'grupo')

  if (!temJogos) {
    return <p className="text-sm text-ink/50 py-6 text-center">A classificação aparece depois que os jogos da fase de grupos forem gerados.</p>
  }

  return (
    <div>
      {gruposOrdenados.map((grupo) => {
        const doGrupo = equipes.filter((e) => e.grupo_id === grupo.id)
        if (doGrupo.length === 0) return null
        const porId = Object.fromEntries(doGrupo.map((e) => [e.id, e]))
        const linhas = classificacaoGrupo(doGrupo, jogos).map((linha) => ({
          ...linha,
          nome: porId[linha.equipeId].nome,
          cor: porId[linha.equipeId].cor,
          desempate_manual: porId[linha.equipeId].desempate_manual,
        }))

        return (
          <TabelaGrupo
            key={grupo.id}
            grupo={grupo}
            linhas={linhas}
            classificados={campeonato.classificados_por_grupo}
            editavel={editavel}
            aoSalvarDesempate={salvarDesempate}
          />
        )
      })}
    </div>
  )
}

export default ClassificacaoCampeonato
