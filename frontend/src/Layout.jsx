import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Users, CalendarDays, Wallet, UserCheck, LogOut } from 'lucide-react'
import { supabase } from './supabaseClient'
import logo from './assets/logo.png'
import SeletorTema from './SeletorTema'

const itens = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/alunos', label: 'Alunos', icon: Users },
  { to: '/treinos', label: 'Treinos', icon: CalendarDays },
  { to: '/mensalidades', label: 'Mensal.', icon: Wallet },
  { to: '/aprovacoes', label: 'Aprovar', icon: UserCheck },
]

function Layout({ children }) {
  const navigate = useNavigate()

  async function sair() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-center justify-between bg-campo-dark text-white px-4 md:px-8 py-3 sticky top-0 z-20">
        <img src={logo} alt="RJ Training" className="h-10 w-auto" />
        <div className="flex items-center gap-2">
          <SeletorTema />
          <button onClick={sair} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 text-sm font-medium">
            <LogOut size={18} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 md:px-10 md:py-10 pb-24">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border-strong z-20">
        <div className="max-w-md mx-auto flex justify-around py-2">
          {itens.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-4 py-1 text-[11px] font-semibold ${isActive ? 'text-campo' : 'text-ink/50'
                }`
              }
            >
              <Icon size={20} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

export default Layout