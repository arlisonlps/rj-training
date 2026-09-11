import { supabase } from './supabaseClient'

function AguardandoAprovacao({ tipo }) {
  async function sair() {
    await supabase.auth.signOut()
  }

  const mensagem =
    tipo === 'aluno'
      ? 'Seu cadastro está pendente de aprovação pela equipe RJ Training. Aguarde para fazer login!'
      : 'Erro ao cadastrar.'

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-campo-dark tracking-tight mb-6">RJ Training</h1>
        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-8">
          <p className="text-ink text-sm leading-relaxed">{mensagem}</p>
          <button
            onClick={sair}
            className="mt-6 text-sm text-ink/60 hover:text-ink underline"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  )
}

export default AguardandoAprovacao