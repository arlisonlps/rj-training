import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { STATUS_CAMPEONATO } from '../../lib/campeonatoStatus'
import logo from '../../assets/logo.png'
import Loading from '../../components/Loading'
import Rodape from '../../components/Rodape'
import SeletorTema from '../../components/SeletorTema'
import ClassificacaoCampeonato from '../../components/campeonato/ClassificacaoCampeonato'
import RankingsCampeonato from '../../components/campeonato/RankingsCampeonato'
import JogosLeitura from '../../components/campeonato/JogosLeitura'

const ABAS = [
  { valor: 'jogos', rotulo: 'Jogos' },
  { valor: 'tabela', rotulo: 'Tabela' },
  { valor: 'chave', rotulo: 'Chave' },
  { valor: 'craques', rotulo: 'Craques' },
]

function CampeonatoPublico({ token }) {
  const [dados, setDados] = useState(null)
  const [estado, setEstado] = useState('carregando')
  const [aba, setAba] = useState('jogos')

  useEffect(() => {
    carregar()
  }, [token])

  async function carregar() {
    setEstado('carregando')
    const { data, error } = await supabase.rpc('campeonato_publico', { p_token: token })
    if (error) {
      console.error('Erro ao carregar campeonato público:', error)
      setEstado('erro')
      return
    }
    if (!data) {
      setEstado('invalido')
      return
    }
    setDados(data)
    setEstado('ok')
  }

  const cabecalho = (
    <div className="text-center mb-6">
      <img src={logo} alt="RJ Training" className="h-20 w-auto mx-auto" />
    </div>
  )

  return (
    <div className="min-h-screen bg-cream px-4 py-6">
      <SeletorTema className="fixed top-4 right-4 text-ink/70 hover:bg-hover" />
      <div className="max-w-3xl mx-auto">
        {cabecalho}

        {estado === 'carregando' && <Loading />}

        {estado === 'invalido' && (
          <div className="bg-surface border border-border rounded-2xl p-6 text-center">
            <h2 className="text-lg font-bold text-campo-dark mb-1">Link indisponível</h2>
            <p className="text-sm text-ink/60">Este link não existe ou foi desativado pelo professor.</p>
          </div>
        )}

        {estado === 'erro' && (
          <div className="bg-surface border border-border rounded-2xl p-6 text-center">
            <h2 className="text-lg font-bold text-campo-dark mb-1">Não foi possível carregar</h2>
            <p className="text-sm text-ink/60 mb-4">Verifique sua conexão e tente de novo.</p>
            <button type="button" onClick={carregar} className="bg-campo text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-campo-dark transition-colors">
              Tentar de novo
            </button>
          </div>
        )}

        {estado === 'ok' && (
          <div>
            <div className="mb-5">
              <h1 className="text-2xl font-bold text-campo-dark">{dados.campeonato.nome}</h1>
              {(() => {
                const status = STATUS_CAMPEONATO[dados.campeonato.status] || STATUS_CAMPEONATO.montando
                return <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mt-1 ${status.classe}`}>{status.rotulo}</span>
              })()}
            </div>

            <div className="flex rounded-lg border border-border bg-surface p-1 mb-5 overflow-x-auto max-w-full w-fit">
              {ABAS.map(({ valor, rotulo }) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setAba(valor)}
                  className={`px-4 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${aba === valor ? 'bg-campo text-white' : 'text-ink/60 hover:bg-hover'}`}
                >
                  {rotulo}
                </button>
              ))}
            </div>

            {aba === 'jogos' && <JogosLeitura tipo="grupos" jogos={dados.jogos} equipes={dados.equipes} grupos={dados.grupos} />}
            {aba === 'tabela' && (
              <ClassificacaoCampeonato campeonato={dados.campeonato} equipes={dados.equipes} grupos={dados.grupos} jogos={dados.jogos} />
            )}
            {aba === 'chave' && <JogosLeitura tipo="mata" jogos={dados.jogos} equipes={dados.equipes} grupos={dados.grupos} />}
            {aba === 'craques' && (
              <RankingsCampeonato
                campeonato={dados.campeonato}
                equipes={dados.equipes}
                jogos={dados.jogos}
                membros={dados.membros}
                eventos={dados.eventos}
              />
            )}
          </div>
        )}

        <Rodape className="mt-10 pt-6 border-t border-border" />
      </div>
    </div>
  )
}

export default CampeonatoPublico
