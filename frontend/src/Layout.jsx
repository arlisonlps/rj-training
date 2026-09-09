import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Users, CalendarDays, Wallet, LogOut } from 'lucide-react'
import { supabase } from './supabaseClient'

const itens = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/alunos', label: 'Alunos', icon: Users },
  { to: '/treinos', label: 'Horários de treino', icon: CalendarDays },
  { to: '/mensalidades', label: 'Mensalidades', icon: Wallet },
]

function Layout({ children }) {
  const navigate = useNavigate()

  async function sair() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-campo-dark text-white flex flex-col shrink-0">
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

      <main className="flex-1 px-10 py-10 max-w-5xl">{children}</main>
    </div>
  )
}

export default Layout