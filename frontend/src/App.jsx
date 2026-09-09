import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Login from './Login'
import Layout from './Layout'
import Home from './Home'
import AlunosLista from './AlunosLista'
import AlunoForm from './AlunoForm'
import AlunoVisualizar from './AlunoVisualizar'
import Treinos from './Treinos'
import TreinoHorario from './TreinoHorario'
import MensalidadesMeses from './MensalidadesMeses'
import MensalidadeDetalhe from './MensalidadeDetalhe'
import EscolherHorario from './EscolherHorario'

function App() {
  const [session, setSession] = useState(null)
  const [carregandoSessao, setCarregandoSessao] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setCarregandoSessao(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (carregandoSessao) {
    return null
  }

  return (
    <Routes>
      <Route path="/escolher-horario" element={<EscolherHorario />} />
      <Route
        path="/*"
        element={
          session ? (
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/alunos" element={<AlunosLista />} />
                <Route path="/alunos/novo" element={<AlunoForm />} />
                <Route path="/alunos/:id" element={<AlunoVisualizar />} />
                <Route path="/alunos/:id/editar" element={<AlunoForm />} />
                <Route path="/treinos" element={<Treinos />} />
                <Route path="/treinos/:dia" element={<TreinoHorario />} />
                <Route path="/mensalidades" element={<MensalidadesMeses />} />
                <Route path="/mensalidades/:mes" element={<MensalidadeDetalhe />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Layout>
          ) : (
            <Login />
          )
        }
      />
    </Routes>
  )
}

export default App