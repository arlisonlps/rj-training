import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function AlunoHome() {
  const [aluno, setAluno] = useState(null)

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    const { data: userData } = await supabase.auth.getUser()
    const { data: perfil } = await supabase
      .from('perfil_usuario')
      .select('aluno_id')
      .eq('user_id', userData.user.id)
      .single()

    if (perfil?.aluno_id) {
      const { data } = await supabase.from('aluno').select('*').eq('id', perfil.aluno_id).single()
      setAluno(data)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-campo-dark mb-2">Olá, {aluno?.nome || '...'}!</h2>
      <p className="text-ink/70">Bem-vindo ao seu painel do RJ Training.</p>
    </div>
  )
}

export default AlunoHome