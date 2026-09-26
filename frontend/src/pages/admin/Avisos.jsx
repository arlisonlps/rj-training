import { useState, useEffect } from 'react'
import { Megaphone, Send, Ban, MessageCircle, BellRing } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../../components/Loading'
import AvisoWhatsapp from './AvisoWhatsapp'
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

    setPublicando(true)
    setErro('')

    if (avisoAtivo) {
      const { error } = await supabase.from('aviso').update({ ativo: false }).eq('id', avisoAtivo.id)
      if (error) {
        setErro('Erro ao substituir aviso anterior: ' + error.message)
        setPublicando(false)
        return
      }
    }

    const { error } = await supabase.from('aviso').insert({ mensagem: mensagem.trim(), ativo: true })

    setPublicando(false)

    if (error) {
      setErro('Erro ao publicar aviso: ' + error.message)
      return
    }

    setMensagem('')
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
            <span className="text-[11px] opacity-70">Publicado em {formatarDataHora(avisoAtivo.criado_em)}</span>
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
            <MessageCircle size={18} />
            Aviso para WhatsApp
          </h3>
          <p className="text-xs text-ink/50 mt-0.5">Envia a mensagem para todos os alunos ativos, um por vez.</p>
        </div>

        <AvisoWhatsapp />
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
