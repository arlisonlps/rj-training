import { useState, useEffect, useMemo } from 'react'
import { CalendarCheck, ChevronDown, Copy, Check } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import { hojeEmBelem } from '../../../domain/mensalidade'
import { calcularFrequenciaDoPeriodo } from '../../../domain/frequencia'
import { buscarPresencasDoPeriodo } from '../../../lib/frequenciaDados'
import Loading from '../../../components/Loading'

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const CORES_POSICAO = ['bg-amber-light text-amber', 'bg-gray-300 text-gray-700', 'bg-orange-200 text-orange-800']
const campoBase =
  'px-3 py-2 rounded-lg border border-border-strong bg-surface text-base focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo'

function valorDoMes({ ano, mes }) {
  return ano * 12 + (mes - 1)
}

function mesDoValor(valor) {
  return { ano: Math.floor(valor / 12), mes: (valor % 12) + 1 }
}

function rotuloDoMes({ ano, mes }) {
  return `${NOMES_MESES[mes - 1]} de ${ano}`
}

function rotuloDoDia(dataIso) {
  const [ano, mes, dia] = dataIso.split('-').map(Number)
  const data = new Date(ano, mes - 1, dia)
  return `${DIAS_CURTOS[data.getDay()]} ${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`
}

function agruparPorMes(dias) {
  const grupos = new Map()
  for (const dia of dias) {
    const chave = dia.data.slice(0, 7)
    if (!grupos.has(chave)) grupos.set(chave, [])
    grupos.get(chave).push(dia)
  }
  return [...grupos.entries()]
}

function SeletorDeMes({ rotulo, valor, anos, aoMudar }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-ink/60">{rotulo}</span>
      <div className="flex items-center gap-2">
        <select className={campoBase} value={valor.mes} onChange={(e) => aoMudar({ ...valor, mes: Number(e.target.value) })} aria-label={`${rotulo}: mês`}>
          {NOMES_MESES.map((nome, i) => (
            <option key={nome} value={i + 1}>{nome}</option>
          ))}
        </select>
        <select className={campoBase} value={valor.ano} onChange={(e) => aoMudar({ ...valor, ano: Number(e.target.value) })} aria-label={`${rotulo}: ano`}>
          {anos.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

function Frequencia() {
  const hoje = hojeEmBelem()
  const anoAtual = Number(hoje.slice(0, 4))
  const mesAtual = { ano: anoAtual, mes: Number(hoje.slice(5, 7)) }
  const [de, setDe] = useState(mesAtual)
  const [ate, setAte] = useState(mesAtual)
  const [ocultarAtrasados, setOcultarAtrasados] = useState(true)
  const [alunos, setAlunos] = useState([])
  const [idsAtrasados, setIdsAtrasados] = useState(new Set())
  const [registros, setRegistros] = useState([])
  const [carregandoBase, setCarregandoBase] = useState(true)
  const [carregandoPeriodo, setCarregandoPeriodo] = useState(true)
  const [erro, setErro] = useState('')
  const [tentativa, setTentativa] = useState(0)
  const [aberto, setAberto] = useState(null)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    let cancelado = false

    async function carregarBase() {
      const [alunosRes, atrasadosRes] = await Promise.all([
        supabase.from('aluno').select('id, nome').eq('ativo', true).order('nome'),
        supabase.from('mensalidade').select('aluno_id').neq('status', 'pago').lt('data_vencimento', hojeEmBelem()),
      ])
      if (cancelado) return

      const falha = alunosRes.error || atrasadosRes.error
      if (falha) {
        console.error('Erro ao carregar alunos:', falha)
        setErro('Não foi possível carregar a lista de alunos.')
      } else {
        setAlunos(alunosRes.data || [])
        setIdsAtrasados(new Set((atrasadosRes.data || []).map((m) => m.aluno_id)))
      }
      setCarregandoBase(false)
    }

    carregarBase()
    return () => {
      cancelado = true
    }
  }, [tentativa])

  useEffect(() => {
    let cancelado = false

    async function carregarPeriodo() {
      setCarregandoPeriodo(true)
      try {
        const dados = await buscarPresencasDoPeriodo(de, ate)
        if (cancelado) return
        setRegistros(dados)
        setErro('')
      } catch (e) {
        if (cancelado) return
        console.error('Erro ao carregar presenças:', e)
        setErro('Não foi possível carregar as presenças deste período.')
      }
      setCarregandoPeriodo(false)
    }

    carregarPeriodo()
    return () => {
      cancelado = true
    }
  }, [de, ate, tentativa])

  const { esperados, linhas } = useMemo(
    () => calcularFrequenciaDoPeriodo({ de, ate, hoje, alunos, registros }),
    [de, ate, hoje, alunos, registros]
  )

  const visiveis = linhas.filter((l) => !(ocultarAtrasados && idsAtrasados.has(l.alunoId)))
  const ocultos = linhas.length - visiveis.length
  const anos = [anoAtual, anoAtual - 1, anoAtual - 2]
  const periodoEmAndamento = valorDoMes(ate) >= valorDoMes(mesAtual) && valorDoMes(de) <= valorDoMes(mesAtual)
  const periodoDeUmMes = valorDoMes(de) === valorDoMes(ate)
  const tituloPeriodo = periodoDeUmMes ? rotuloDoMes(de) : `${rotuloDoMes(de)} a ${rotuloDoMes(ate)}`

  function mudarInicio(novo) {
    setDe(novo)
    if (valorDoMes(novo) > valorDoMes(ate)) setAte(novo)
    setAberto(null)
  }

  function mudarFim(novo) {
    setAte(novo)
    if (valorDoMes(novo) < valorDoMes(de)) setDe(novo)
    setAberto(null)
  }

  function aplicarAtalho(novoDe, novoAte) {
    setDe(novoDe)
    setAte(novoAte)
    setAberto(null)
  }

  const valorAtual = valorDoMes(mesAtual)
  const atalhos = [
    { rotulo: 'Mês atual', de: mesAtual, ate: mesAtual },
    { rotulo: 'Mês anterior', de: mesDoValor(valorAtual - 1), ate: mesDoValor(valorAtual - 1) },
    { rotulo: 'Último trimestre', de: mesDoValor(valorAtual - 3), ate: mesDoValor(valorAtual - 1) },
    { rotulo: `Ano de ${anoAtual}`, de: { ano: anoAtual, mes: 1 }, ate: { ano: anoAtual, mes: 12 } },
  ]
  const mesmoPeriodo = (a) => valorDoMes(a.de) === valorDoMes(de) && valorDoMes(a.ate) === valorDoMes(ate)

  async function copiarRanking() {
    const texto = [
      `Frequência de ${tituloPeriodo} (${esperados.length} treinos)`,
      ...visiveis.map((l, i) => `${i + 1}. ${l.nome} — ${l.percentual}% (${l.presentes}/${l.esperados})`),
    ].join('\n')

    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      alert(texto)
    }
  }

  if (carregandoBase) return <Loading />

  return (
    <div>
      <h2 className="text-2xl font-bold text-campo-dark mb-1">Frequência</h2>
      <p className="text-sm text-ink/60 mb-5">
        Presença nos treinos de terça, quarta e quinta. Veja qualquer mês ou um período maior, como trimestre ou ano.
      </p>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        {atalhos.map((atalho) => (
          <button
            key={atalho.rotulo}
            type="button"
            onClick={() => aplicarAtalho(atalho.de, atalho.ate)}
            className={`text-xs font-semibold rounded-full px-3 py-1.5 transition-colors ${mesmoPeriodo(atalho) ? 'bg-campo text-white' : 'bg-campo-light text-campo-dark hover:brightness-95'}`}
          >
            {atalho.rotulo}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-3 flex-wrap mb-3">
        <SeletorDeMes rotulo="De" valor={de} anos={anos} aoMudar={mudarInicio} />
        <SeletorDeMes rotulo="Até" valor={ate} anos={anos} aoMudar={mudarFim} />
      </div>

      <label className="flex items-center gap-2 text-sm text-ink/70 mb-4">
        <input type="checkbox" checked={ocultarAtrasados} onChange={(e) => setOcultarAtrasados(e.target.checked)} />
        Ocultar alunos com mensalidade atrasada
      </label>

      {erro && (
        <div className="bg-brick-light text-brick text-sm rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3">
          <span>{erro}</span>
          <button type="button" onClick={() => setTentativa((n) => n + 1)} className="text-xs font-semibold underline shrink-0">
            Tentar de novo
          </button>
        </div>
      )}

      {carregandoPeriodo ? (
        <Loading />
      ) : esperados.length === 0 ? (
        <p className="text-sm text-ink/50 py-6 text-center">Este período ainda não tem treinos para contar.</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 text-xs text-ink/60">
              <CalendarCheck size={14} className="text-campo shrink-0" />
              {esperados.length} {esperados.length === 1 ? 'treino considerado' : 'treinos considerados'}
              {periodoEmAndamento ? ' (até ontem)' : ''}
            </div>
            <button
              type="button"
              onClick={copiarRanking}
              className="flex items-center gap-1.5 bg-campo-light text-campo-dark text-xs font-semibold px-3 py-1.5 rounded-lg hover:brightness-95 transition-all shrink-0"
            >
              {copiado ? <Check size={13} /> : <Copy size={13} />}
              {copiado ? 'Copiado!' : 'Copiar ranking'}
            </button>
          </div>

          <ul className="space-y-2">
            {visiveis.map((linha, i) => {
              const expandido = aberto === linha.alunoId
              return (
                <li key={linha.alunoId} className="bg-surface border border-border rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setAberto(expandido ? null : linha.alunoId)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-hover transition-colors"
                    aria-expanded={expandido}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-bold shrink-0 ${CORES_POSICAO[i] || 'bg-hover text-ink/50'}`}>
                        {i + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-sm truncate">{linha.nome}</span>
                        <span className="block text-xs text-ink/50">
                          {linha.presentes} de {linha.esperados} treinos
                          {idsAtrasados.has(linha.alunoId) && <span className="ml-2 font-bold text-brick">MENSALIDADE ATRASADA</span>}
                        </span>
                      </span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-base font-bold text-campo-dark">{linha.percentual}%</span>
                      <ChevronDown size={16} className={`text-ink/40 transition-transform ${expandido ? 'rotate-180' : ''}`} />
                    </span>
                  </button>

                  {expandido && (
                    <div className="px-4 pb-4 pt-2 border-t border-border space-y-3">
                      {agruparPorMes(linha.dias).map(([chaveMes, dias]) => (
                        <div key={chaveMes}>
                          {!periodoDeUmMes && (
                            <div className="text-[11px] font-bold uppercase tracking-wide text-ink/50 mb-1.5">
                              {NOMES_MESES[Number(chaveMes.slice(5, 7)) - 1]} {chaveMes.slice(0, 4)} · {dias.filter((d) => d.presente).length}/{dias.length}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1.5">
                            {dias.map((dia) => (
                              <span
                                key={dia.data}
                                className={`text-[11px] font-semibold px-2 py-1 rounded-md ${dia.presente ? 'bg-sucesso-light text-sucesso' : 'bg-hover text-ink/40'}`}
                                title={dia.presente ? 'Presente' : 'Faltou'}
                              >
                                {rotuloDoDia(dia.data)}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
            {visiveis.length === 0 && <p className="text-sm text-ink/50 py-6 text-center">Nenhum aluno para mostrar.</p>}
          </ul>

          {ocultos > 0 && (
            <p className="text-xs text-ink/50 mt-3">
              {ocultos} {ocultos === 1 ? 'aluno oculto' : 'alunos ocultos'} por mensalidade atrasada. Desmarque a opção acima para ver todos.
            </p>
          )}
        </>
      )}
    </div>
  )
}

export default Frequencia
