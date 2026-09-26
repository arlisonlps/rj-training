import { useState, useEffect } from 'react'
import { MessageCircle, Check, RotateCcw } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

const CHAVE = 'rj-training-whatsapp-fila'

const CATEGORIAS = [
  { valor: 'todos', label: 'Todos os alunos' },
  { valor: 'atrasados', label: 'Atrasados' },
  { valor: 'vencendo', label: 'Vencendo' },
]

function lerFila() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE))
    return {
      mensagem: salvo?.mensagem || '',
      enviados: salvo?.enviados || [],
      categoria: salvo?.categoria || 'todos',
    }
  } catch {
    return { mensagem: '', enviados: [], categoria: 'todos' }
  }
}

function salvarFila(mensagem, enviados, categoria) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ mensagem, enviados, categoria }))
  } catch {
    // sem localStorage o progresso só vale enquanto a página estiver aberta
  }
}

function normalizarTelefone(telefone) {
  const digitos = String(telefone || '').replace(/\D/g, '')
  if (digitos.length === 10 || digitos.length === 11) return '55' + digitos
  return digitos.length >= 12 ? digitos : ''
}

function AvisoWhatsapp() {
  const [filaSalva] = useState(lerFila)
  const [mensagem, setMensagem] = useState(filaSalva.mensagem)
  const [enviados, setEnviados] = useState(filaSalva.enviados)
  const [categoria, setCategoria] = useState(filaSalva.categoria)
  const [alunos, setAlunos] = useState([])
  const [idsAtrasados, setIdsAtrasados] = useState(new Set())
  const [idsVencendo, setIdsVencendo] = useState(new Set())
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    buscarDados()
  }, [])

  async function buscarDados() {
    const hoje = new Date().toISOString().split('T')[0]
    const emCincoDias = new Date()
    emCincoDias.setDate(emCincoDias.getDate() + 5)
    const limite = emCincoDias.toISOString().split('T')[0]

    const [{ data: alunosData, error }, { data: mensalidades }] = await Promise.all([
      supabase.from('aluno').select('id, nome, telefone').eq('ativo', true).order('nome'),
      supabase.from('mensalidade').select('aluno_id, data_vencimento').neq('status', 'pago').lte('data_vencimento', limite),
    ])

    if (error) {
      console.error('Erro ao buscar alunos:', error)
    }

    const atrasados = new Set()
    const vencendo = new Set()
    for (const m of mensalidades || []) {
      if (m.data_vencimento < hoje) atrasados.add(m.aluno_id)
      else vencendo.add(m.aluno_id)
    }
    for (const id of atrasados) vencendo.delete(id)

    setAlunos(alunosData || [])
    setIdsAtrasados(atrasados)
    setIdsVencendo(vencendo)
    setCarregando(false)
  }

  function alunosDaCategoria(valor) {
    if (valor === 'atrasados') return alunos.filter((a) => idsAtrasados.has(a.id))
    if (valor === 'vencendo') return alunos.filter((a) => idsVencendo.has(a.id))
    return alunos
  }

  const doGrupo = alunosDaCategoria(categoria)
  const destinatarios = doGrupo
    .map((a) => ({ ...a, tel: normalizarTelefone(a.telefone) }))
    .filter((a) => a.tel)
  const semWhatsapp = doGrupo.filter((a) => !normalizarTelefone(a.telefone))

  const enviadosSet = new Set(enviados)
  const filaIniciada = enviados.length > 0
  const proximo = destinatarios.find((a) => !enviadosSet.has(a.id))
  const concluida = filaIniciada && !proximo
  const textoPronto = mensagem.trim().length > 0

  function abrirWhatsapp(aluno) {
    const url = `https://wa.me/${aluno.tel}?text=${encodeURIComponent(mensagem.trim())}`
    window.open(url, '_blank', 'noopener')

    if (enviadosSet.has(aluno.id)) return
    const novos = [...enviados, aluno.id]
    setEnviados(novos)
    salvarFila(mensagem.trim(), novos, categoria)
  }

  function reiniciar() {
    setEnviados([])
    salvarFila(mensagem, [], categoria)
  }

  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-border p-6">
      <label className="flex items-center gap-2 mb-3 text-xs font-semibold text-ink/60">
        Enviar para
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          disabled={filaIniciada}
          className="px-2.5 py-1.5 rounded-lg border border-border-strong text-xs focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {CATEGORIAS.map(({ valor, label }) => (
            <option key={valor} value={valor}>
              {carregando || valor === 'todos' ? label : `${label} (${alunosDaCategoria(valor).length})`}
            </option>
          ))}
        </select>
      </label>

      <textarea
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
        readOnly={filaIniciada}
        placeholder="Ex: Pessoal, vamos atentar na mensalidade."
        className="w-full px-3.5 py-2.5 rounded-lg border border-border-strong text-sm min-h-24 resize-y focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo read-only:opacity-70"
      />

      {carregando ? (
        <p className="text-xs text-ink/50 mt-3">Carregando alunos...</p>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3">
            <span className="text-xs text-ink/60">
              {filaIniciada
                ? `${enviados.length} de ${destinatarios.length} abertos no WhatsApp`
                : destinatarios.length === 0
                  ? 'Nenhum aluno com WhatsApp nesta categoria'
                  : `${destinatarios.length} aluno${destinatarios.length !== 1 ? 's' : ''} com WhatsApp`}
            </span>

            <div className="flex items-center gap-2">
              {filaIniciada && (
                <button
                  type="button"
                  onClick={reiniciar}
                  className="flex items-center gap-1.5 bg-hover text-ink/60 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-brick-light hover:text-brick transition-colors"
                >
                  <RotateCcw size={14} />
                  Nova mensagem
                </button>
              )}
              <button
                type="button"
                onClick={() => proximo && abrirWhatsapp(proximo)}
                disabled={!textoPronto || !proximo}
                className="flex items-center gap-1.5 bg-[#25D366] text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MessageCircle size={16} />
                {concluida
                  ? 'Fila concluída'
                  : filaIniciada
                    ? `Abrir próximo: ${proximo.nome.split(' ')[0]}`
                    : 'Enviar no WhatsApp'}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-ink/40 mt-2">
            O WhatsApp abre com a mensagem pronta para cada aluno; é só tocar em enviar e voltar aqui para abrir o próximo.
          </p>

          {filaIniciada && (
            <ul className="space-y-1.5 mt-4 pt-4 border-t border-border">
              {destinatarios.map((a) => {
                const aberto = enviadosSet.has(a.id)
                return (
                  <li key={a.id} className="flex items-center justify-between gap-2 bg-cream rounded-lg px-3 py-2">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {aberto && <Check size={14} className="text-sucesso shrink-0" />}
                      {a.nome}
                    </span>
                    <button
                      type="button"
                      onClick={() => abrirWhatsapp(a)}
                      className="text-xs font-semibold text-ink/60 hover:text-campo-dark hover:underline"
                    >
                      {aberto ? 'Abrir de novo' : 'Abrir'}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {semWhatsapp.length > 0 && (
            <p className="text-[11px] text-brick mt-3">
              Sem WhatsApp válido cadastrado: {semWhatsapp.map((a) => a.nome).join(', ')}.
            </p>
          )}
        </>
      )}
    </div>
  )
}

export default AvisoWhatsapp
