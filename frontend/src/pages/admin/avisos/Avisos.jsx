import { useState, useEffect } from 'react'
import { Megaphone, Send, Ban, BellRing } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import { deInputDataHora, formatarDataHoraCurta } from '../../../lib/data'
import Loading from '../../../components/Loading'
import AvisoPush from './AvisoPush'

function formatarDataHora(dataHora) {
  const data = new Date(dataHora)
  const dia = String(data.getDate()).padStart(2, '0')
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const ano = data.getFullYear()
  const hora = String(data.getHours()).padStart(2, '0')
  const minuto = String(data.getMinutes()).padStart(2, '0')
  return `${dia}/${mes}/${ano} às ${hora}h${minuto}`
}

function Avisos() {
  const [avisoAtivo, setAvisoAtivo] = useState(null)
  const [mensagem, setMensagem] = useState('')
  const [validade, setValidade] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [publicando, setPublicando] = useState(false)
  const [desativando, setDesativando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    buscarAvisoAtivo()
  }, [])

  async function buscarAvisoAtivo() {
    setCarregando(true)
    const { data, error } = await supabase
      .from('aviso')
      .select('*')
      .eq('ativo', true)
      .or(`expira_em.is.null,expira_em.gt.${new Date().toISOString()}`)
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Erro ao buscar aviso:', error)
    }
    setAvisoAtivo(data || null)
    setCarregando(false)
  }

  async function publicarAviso(e) {
    e.preventDefault()
    if (!mensagem.trim()) return

    if (validade && new Date(validade) <= new Date()) {
      setErro('A validade precisa ser uma data e horário no futuro.')
      return
    }

    setPublicando(true)
    setErro('')

    const { error: erroSubstituir } = await supabase.from('aviso').update({ ativo: false }).eq('ativo', true)
    if (erroSubstituir) {
      setErro('Erro ao substituir aviso anterior: ' + erroSubstituir.message)
      setPublicando(false)
      return
    }

    const { error } = await supabase
      .from('aviso')
      .insert({ mensagem: mensagem.trim(), ativo: true, expira_em: deInputDataHora(validade) })

    setPublicando(false)

    if (error) {
      setErro('Erro ao publicar aviso: ' + error.message)
      return
    }

    setMensagem('')
    setValidade('')
    buscarAvisoAtivo()
  }

  async function desativarAviso() {
    if (!window.confirm('Desativar o aviso atual? Ele vai parar de aparecer para os alunos.')) return

    setDesativando(true)
    const { error } = await supabase.from('aviso').update({ ativo: false }).eq('id', avisoAtivo.id)
    setDesativando(false)

    if (error) {
      alert('Erro ao desativar aviso: ' + error.message)
      return
    }

    buscarAvisoAtivo()
  }

  if (carregando) return <Loading />

  return (
    <div>
      <h2 className="text-2xl font-bold text-campo-dark mb-6">Avisos</h2>

      <div className="mb-3">
        <h3 className="flex items-center gap-2 text-base font-bold text-campo-dark">
          <Megaphone size={18} />
          Aviso no app
        </h3>
        <p className="text-xs text-ink/50 mt-0.5">Aparece em destaque na tela inicial dos alunos.</p>
      </div>

      {avisoAtivo && (
        <div className="bg-campo-dark text-white rounded-2xl px-6 py-5 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2 opacity-80">
            <Megaphone size={16} />
            <span className="text-xs font-semibold uppercase tracking-wide">Aviso ativo agora</span>
          </div>
          <p className="text-sm font-medium mb-3">{avisoAtivo.mensagem}</p>
          <div className="flex items-center justify-between">
            <span className="text-[11px] opacity-70">
              Publicado em {formatarDataHora(avisoAtivo.criado_em)}
              {avisoAtivo.expira_em
                ? ` · some ${formatarDataHoraCurta(avisoAtivo.expira_em)}`
                : ' · fica até você desativar'}
            </span>
            <button
              type="button"
              onClick={desativarAviso}
              disabled={desativando}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <Ban size={14} />
              {desativando ? 'Desativando...' : 'Desativar'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-surface rounded-2xl shadow-sm border border-border p-6">
        <h3 className="text-sm font-bold text-campo-dark mb-4">
          {avisoAtivo ? 'Publicar novo aviso (substitui o atual)' : 'Publicar aviso'}
        </h3>

        <form onSubmit={publicarAviso} className="flex flex-col gap-3">
          <textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Ex: Não vai ter treino nesta quinta-feira, dia 25."
            className="px-3.5 py-2.5 rounded-lg border border-border-strong text-sm min-h-24 resize-y focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo"
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-ink/60" htmlFor="validade-aviso">
              Válido até (opcional)
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                id="validade-aviso"
                type="datetime-local"
                value={validade}
                onChange={(e) => setValidade(e.target.value)}
                className="px-3 py-2 rounded-lg border border-border-strong text-base focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo"
              />
              {validade && (
                <button type="button" onClick={() => setValidade('')} className="text-xs font-semibold text-ink/60 hover:underline">
                  Sem validade
                </button>
              )}
            </div>
            <p className="text-[11px] text-ink/50">
              {validade ? 'Depois desse horário o aviso some sozinho para os alunos.' : 'Sem data, o aviso fica até você desativar.'}
            </p>
          </div>

          <button
            type="submit"
            disabled={publicando || !mensagem.trim()}
            className="self-end flex items-center gap-2 bg-campo text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-campo-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
            {publicando ? 'Publicando...' : 'Publicar aviso'}
          </button>
          {erro && <p className="text-brick text-sm">{erro}</p>}
        </form>
      </div>

      <div className="mt-10 pt-8 border-t border-border">
        <div className="mb-3">
          <h3 className="flex items-center gap-2 text-base font-bold text-campo-dark">
            <BellRing size={18} />
            Notificação no celular
          </h3>
          <p className="text-xs text-ink/50 mt-0.5">
            Chega na tela do celular de quem ativou as notificações, mesmo com o app fechado.
          </p>
        </div>

        <AvisoPush />
      </div>
    </div>
  )
}

export default Avisos
