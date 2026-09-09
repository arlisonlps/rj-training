import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Users, CalendarDays, Wallet, LogOut } from 'lucide-react'
import { supabase } from './supabaseClient'

const itens = [
  { to: '/', label: 'Home', labelCurto: 'Home', icon: Home, end: true },
  { to: '/alunos', label: 'Alunos', labelCurto: 'Alunos', icon: Users },
  { to: '/treinos', label: 'Horários de treino', labelCurto: 'Treinos', icon: CalendarDays },
  { to: '/mensalidades', label: 'Mensalidades', labelCurto: 'Mensal.', icon: Wallet },
]

function Layout({ children }) {
  const navigate = useNavigate()

  async function sair() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Barra superior - só no celular */}
      <div className="md:hidden flex items-center justify-between bg-campo-dark text-white px-4 py-3 sticky top-0 z-20">
        <h1 className="text-base font-bold tracking-tight">RJ Training</h1>
        <button onClick={sair} className="p-2 rounded-lg hover:bg-white/10">
          <LogOut size={18} />
        </button>
      </div>

      {/* Sidebar - só no desktop */}
      <aside className="hidden md:flex w-64 bg-campo-dark text-white flex-col shrink-0">
        <div className="px-6 py-6">
          <h1 className="text-lg font-bold tracking-tight">RJ Training</h1>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {itens.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? 'bg-campo text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={18} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pb-6">
          <button
            onClick={sair}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut size={18} strokeWidth={2} />
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 px-4 py-6 md:px-10 md:py-10 max-w-5xl pb-24 md:pb-10">{children}</main>

      {/* Barra inferior - só no celular */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-black/10 flex justify-around py-2 z-20">
        {itens.map(({ to, labelCurto, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-semibold ${isActive ? 'text-campo' : 'text-ink/50'
              }`
            }
          >
            <Icon size={20} strokeWidth={2} />
            {labelCurto}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default Layout