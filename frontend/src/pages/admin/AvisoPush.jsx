import { useState } from 'react'
import { BellRing } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import AtivarNotificacoes from '../../components/AtivarNotificacoes'

function AvisoPush() {
  const [titulo, setTitulo] = useState('RJ Training')
  const [corpo, setCorpo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState('')
  const [erro, setErro] = useState('')

  async function enviar(e) {
    e.preventDefault()
    if (!corpo.trim()) return
    if (!window.confirm('Enviar esta notificação agora para todos os aparelhos inscritos?')) return

    setEnviando(true)
    setResultado('')
    setErro('')

    const { data, error } = await supabase.functions.invoke('enviar-push', {
      body: { titulo: titulo.trim() || 'RJ Training', corpo: corpo.trim() },
    })

    setEnviando(false)

    if (error) {
      console.error('Erro ao chamar enviar-push:', error)
      let mensagem = `${error.name}: ${error.message}`
      if (error.context instanceof Response) {
        const texto = await error.context.text()
        let detalhe = texto
        try {
          const json = JSON.parse(texto)
          detalhe = json.erro || json.message || json.msg || texto
        } catch {
          // resposta que não é JSON: mostra o texto cru
        }
        mensagem = `Erro ${error.context.status}: ${detalhe || error.message}`
      } else if (error.name === 'FunctionsFetchError') {
        mensagem +=
          ' (a função não respondeu: pode não estar publicada com o nome enviar-push, ou falhou ao iniciar. Veja os Logs dela no Supabase.)'
      }
      setErro(mensagem)
      return
    }

    const removidos = data.removidos ? ` ${data.removidos} aparelho(s) antigos foram removidos.` : ''
    setResultado(`Enviada para ${data.enviados} de ${data.total} aparelho(s).${removidos}`)
    setCorpo('')
  }

  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-border p-6">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <AtivarNotificacoes />
        <span className="text-[11px] text-ink/40">
          Ative neste aparelho para também receber as notificações que você enviar.
        </span>
      </div>

      <form onSubmit={enviar} className="flex flex-col gap-3">
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título"
          className="px-3.5 py-2.5 rounded-lg border border-border-strong text-sm focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo"
        />
        <textarea
          value={corpo}
          onChange={(e) => setCorpo(e.target.value)}
          placeholder="Ex: Bom dia, pessoal! Bora agendar os treinos da semana."
          className="px-3.5 py-2.5 rounded-lg border border-border-strong text-sm min-h-20 resize-y focus:outline-none focus:ring-2 focus:ring-campo/30 focus:border-campo"
          required
        />
        <button
          type="submit"
          disabled={enviando || !corpo.trim()}
          className="self-end flex items-center gap-2 bg-campo text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-campo-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <BellRing size={16} />
          {enviando ? 'Enviando...' : 'Enviar notificação agora'}
        </button>
        {resultado && <p className="text-sucesso text-sm">{resultado}</p>}
        {erro && <p className="text-brick text-sm">{erro}</p>}
      </form>
    </div>
  )
}

export default AvisoPush
