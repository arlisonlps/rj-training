import { supabase } from '../../lib/supabaseClient'
import logo from '../../assets/logo.png'
import SeletorTema from '../../components/SeletorTema'

function AguardandoAprovacao({ tipo, erro, onTentarNovamente }) {
  async function sair() {
    await supabase.auth.signOut()
  }

  const mensagem =
    tipo === 'aluno'
      ? 'Seu cadastro está pendente de aprovação pela equipe RJ Training. Aguarde para fazer login!'
      : erro
        ? `Não foi possível finalizar seu cadastro: ${erro}`
        : 'Erro ao cadastrar.'

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <SeletorTema className="fixed top-4 right-4" />
      <div className="w-full max-w-sm text-center">
        <img src={logo} alt="RJ Training" className="h-28 w-auto mx-auto mb-6" />
        <div className="bg-surface rounded-2xl shadow-sm border border-border p-8">
          <p className="text-ink text-sm leading-relaxed">{mensagem}</p>
          <div className="flex flex-col items-center gap-2 mt-6">
            {erro && onTentarNovamente && (
              <button
                onClick={onTentarNovamente}
                className="text-sm font-semibold text-campo-dark hover:underline"
              >
                Tentar novamente
              </button>
            )}
            <button onClick={sair} className="text-sm text-ink/60 hover:text-ink underline">
              Sair
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AguardandoAprovacao
