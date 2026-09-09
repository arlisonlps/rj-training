import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Loading from './Loading'

function Home() {
  const [nome, setNome] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const nomeUsuario = data.user?.user_metadata?.nome || data.user?.email
      setNome(nomeUsuario)
      setCarregando(false)
    })
  }, [])

  if (carregando) return <Loading />

  return (
    <div>
      <h2 className="text-2xl font-bold text-campo-dark mb-2">Home</h2>
      <p className="text-ink/70">Olá {nome}, seja bem-vindo ao painel administrativo do RJ Training!</p>
    </div>
  )
}

export default Home