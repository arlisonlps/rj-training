import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Login from './Login'
import Cadastro from './Cadastro'
import AguardandoAprovacao from './AguardandoAprovacao'
import Layout from './Layout'
import Home from './Home'
import AlunosLista from './AlunosLista'
import AlunoForm from './AlunoForm'
import AlunoVisualizar from './AlunoVisualizar'
import Treinos from './Treinos'
import TreinoHorario from './TreinoHorario'
import MensalidadesMeses from './MensalidadesMeses'
import MensalidadeDetalhe from './MensalidadeDetalhe'
import Loading from './Loading'
import { gerarMensalidadesDoMesAtual } from './mensalidade'
import Aprovacoes from './Aprovacoes'
import AlunoLayout from './AlunoLayout'
import AlunoHome from './AlunoHome'
import AlunoHorario from './AlunoHorario'
import AlunoMensalidade from './AlunoMensalidade'
import AlunoPeso from './AlunoPeso'

function extrairDadosPendentes(user) {
  const meta = user.user_metadata || {}
  if (meta.cpf && meta.nome_completo) {
    return {
      nome: meta.nome_completo,
      cpf: meta.cpf,
      whatsapp: meta.whatsapp,
      nascimento: meta.nascimento,
    }
  }

  const pendenteStr = localStorage.getItem('cadastro_pendente')
  if (pendenteStr) {
    const pendente = JSON.parse(pendenteStr)
    return {
      nome: pendente.nomeCompleto,
      cpf: pendente.cpf,
      whatsapp: pendente.whatsapp,
      nascimento: pendente.nascimento,
    }
  }

  return null
}

function App() {
  const [session, setSession] = useState(null)
  const [carregandoSessao, setCarregandoSessao] = useState(true)
  const [perfil, setPerfil] = useState(null)
  const [carregandoPerfil, setCarregandoPerfil] = useState(false)
  const [erroCadastro, setErroCadastro] = useState('')

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

  useEffect(() => {
    if (!session) {
      setPerfil(null)
      return
    }
    carregarPerfil()
  }, [session])

  useEffect(() => {
    if (perfil?.papel === 'admin') {
      gerarMensalidadesDoMesAtual()
    }
  }, [perfil])

  async function carregarPerfil() {
    setCarregandoPerfil(true)
    setErroCadastro('')

    const { data: perfilExistente } = await supabase
      .from('perfil_usuario')
      .select('papel, status')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (!perfilExistente) {
      const pendente = extrairDadosPendentes(session.user)

      if (pendente) {
        const { data: resultado, error } = await supabase.rpc('cadastrar_aluno_pendente', {
          p_nome: pendente.nome,
          p_cpf: pendente.cpf,
          p_whatsapp: pendente.whatsapp,
          p_nascimento: pendente.nascimento,
        })

        if (error) {
          setErroCadastro(error.message)
        } else if (resultado && resultado.startsWith('ERRO')) {
          setErroCadastro(resultado.replace('ERRO: ', ''))
        } else {
          localStorage.removeItem('cadastro_pendente')
        }

        const { data: perfilNovo } = await supabase
          .from('perfil_usuario')
          .select('papel, status')
          .eq('user_id', session.user.id)
          .maybeSingle()

        setPerfil(perfilNovo)
        setCarregandoPerfil(false)
        return
      }
    }

    setPerfil(perfilExistente)
    setCarregandoPerfil(false)
  }

  if (carregandoSessao || (session && carregandoPerfil)) {
    return <Loading />
  }

  // Não logado: só rotas públicas
  if (!session) {
    return (
      <Routes>
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="*" element={<Login />} />
      </Routes>
    )
  }

  // Logado, mas sem perfil aprovado ainda
  if (!perfil || perfil.status === 'pendente') {
    return (
      <Routes>
        <Route
          path="*"
          element={
            <AguardandoAprovacao
              tipo={perfil ? 'aluno' : 'sem-perfil'}
              erro={erroCadastro}
              onTentarNovamente={carregarPerfil}
            />
          }
        />
      </Routes>
    )
  }

  // Logado e aprovado, mas não é admin (painel do aluno ainda não existe)
  if (perfil.papel !== 'admin') {
    return (
      <Routes>
        <Route
          path="/*"
          element={
            <AlunoLayout>
              <Routes>
                <Route path="/" element={<AlunoHome />} />
                <Route path="/horario" element={<AlunoHorario />} />
                <Route path="/mensalidade" element={<AlunoMensalidade />} />
                <Route path="/peso" element={<AlunoPeso />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </AlunoLayout>
          }
        />
      </Routes>
    )
  }

  // Admin aprovado: painel completo
  return (
    <Routes>
      <Route
        path="/*"
        element={
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
              <Route path="/aprovacoes" element={<Aprovacoes />} />

            </Routes>
          </Layout>
        }
      />
    </Routes>
  )
}

export default App