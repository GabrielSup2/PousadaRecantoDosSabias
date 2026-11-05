import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import useAuthStore from '../store/authStore'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/card/StatCard'
import AdminPanelCard from '../components/card/AdminPanelCard'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const firstName = user?.full_name?.split(' ')[0] || 'usuário'

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        title={`${greeting}, ${firstName}!`}
        subtitle={format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Quartos" value="—" color="active" />
        <StatCard label="Reservas" value="—" color="total" />
        <StatCard label="Hóspedes" value="—" color="confirmed" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="font-semibold text-slate-800 mb-2">Estrutura inicial pronta</h2>
          <p className="text-sm text-slate-600">
            Autenticação, usuários e configuração já estão funcionando. Os módulos de
            quartos e reservas serão adicionados nas próximas fases.
          </p>
        </div>

        <AdminPanelCard user={user} stats={{ total: 0, confirmed: 0 }} isAdmin={isAdmin} />
      </div>
    </div>
  )
}
