import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAdmin, getUserId } from '../services/session';
import { listRooms } from '../services/rooms';
import { listReservations, isCanceled, statusKey, STATUS_LABEL } from '../services/reservations';
import { getMe } from '../services/users';
import { formatDate } from '../utils/format';
import './rooms.css';
import './reservations.css';
import './dashboard.css';

// Data local de hoje em 'YYYY-MM-DD' (toISOString usaria UTC e viraria o dia à noite no Brasil)
function todayIso() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

const longDate = () => {
  const s = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export default function Dashboard() {
  const navigate = useNavigate();
  const admin = isAdmin();
  const userId = getUserId();

  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [me, setMe] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ok | error

  const goLogin = useCallback(() => navigate('/login?redirect=/dashboard', { replace: true }), [navigate]);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [roomList, resList, user] = await Promise.all([
        listRooms(admin),
        listReservations(),
        getMe().catch(() => null), // o nome é um detalhe: se falhar, a saudação vai sem nome
      ]);
      setRooms(roomList);
      setReservations(resList);
      setMe(user);
      setStatus('ok');
    } catch (err) {
      if (err.status === 401) return goLogin();
      setStatus('error');
    }
  }, [goLogin]);

  useEffect(() => {
    load();
  }, [load]);

  // Mesmas regras das outras telas: não-admin só vê quartos ativos e as próprias reservas
  const visibleRooms = useMemo(() => (admin ? rooms : rooms.filter((r) => r.active)), [rooms, admin]);
  const mine = useMemo(
    () =>
      reservations.filter(
        (r) => admin || r.ownerId == null || userId == null || String(r.ownerId) === String(userId)
      ),
    [reservations, admin, userId]
  );

  const today = todayIso();
  const roomName = useMemo(() => {
    const map = new Map(rooms.map((r) => [String(r.id), r.name]));
    return (id) => map.get(String(id)) ?? `Quarto ${id}`;
  }, [rooms]);

  const stats = useMemo(() => {
    const upcoming = mine.filter((r) => !isCanceled(r) && r.checkIn >= today);
    return {
      rooms: visibleRooms.length,
      activeRooms: visibleRooms.filter((r) => r.active).length,
      upcoming: upcoming.length,
      confirmed: mine.filter((r) => statusKey(r) === 'confirmed').length,
      canceled: mine.filter(isCanceled).length,
      next: [...upcoming].sort((a, b) => a.checkIn.localeCompare(b.checkIn)).slice(0, 5),
    };
  }, [mine, visibleRooms, today]);

  const firstName = me?.name?.trim().split(/\s+/)[0];

  const cards = [
    { label: 'Quartos', value: stats.rooms, note: 'cadastrados' },
    { label: 'Quartos ativos', value: stats.activeRooms, note: 'disponíveis para reservas' },
    { label: 'Reservas futuras', value: stats.upcoming, note: 'a partir de hoje' },
    { label: 'Confirmadas', value: stats.confirmed, note: 'no total' },
    { label: 'Canceladas', value: stats.canceled, note: 'no total' },
  ];

  return (
    <main className="rooms-page">
      <div className="rooms-wrap">
        <header className="dash-hero">
          <h1>{greeting()}{firstName ? `, ${firstName}` : ''}!</h1>
          <p>{longDate()}</p>
        </header>

        {status === 'loading' && (
          <div aria-busy="true" aria-label="Carregando painel">
            <div className="stats">
              {[1, 2, 3, 4, 5].map((i) => <div key={i} className="room-card skeleton" style={{ minHeight: 110 }} />)}
            </div>
            <div className="room-card skeleton" />
          </div>
        )}

        {status === 'error' && (
          <div className="state" role="alert">
            <p>Não foi possível carregar o painel.</p>
            <button className="btn btn-main" onClick={load}>Tentar de novo</button>
          </div>
        )}

        {status === 'ok' && (
          <>
            <section aria-label="Indicadores" className="stats">
              {cards.map((c) => (
                <div key={c.label} className="room-card stat">
                  <span className="stat-label">{c.label}</span>
                  <strong className="stat-value">{c.value}</strong>
                  <span className="stat-note">{c.note}</span>
                </div>
              ))}
            </section>

            <section className="dash-section" aria-labelledby="atalhos">
              <h2 id="atalhos">Atalhos</h2>
              <div className="shortcuts">
                <Link className="btn btn-main" to="/rooms">Ver quartos</Link>
                <Link className="btn btn-main" to="/reservations" state={{ newReservation: true }}>Nova reserva</Link>
                <Link className="btn btn-ghost" to="/reservations">Minhas reservas</Link>
              </div>
              {admin && (
                <>
                  <p className="shortcuts-label">Administração</p>
                  <div className="shortcuts">
                    <Link className="btn btn-ghost" to="/rooms">Gerenciar quartos</Link>
                    <Link className="btn btn-ghost" to="/reservations">Todas as reservas</Link>
                  </div>
                </>
              )}
            </section>

            <section className="dash-section" aria-labelledby="proximas">
              <div className="dash-section-head">
                <h2 id="proximas">Próximas reservas</h2>
                {stats.next.length > 0 && <Link to="/reservations">Ver todas</Link>}
              </div>

              {stats.next.length === 0 ? (
                <div className="state">
                  <p>Nenhuma reserva futura.</p>
                  <Link className="btn btn-main" to="/reservations" state={{ newReservation: true }}>Fazer uma reserva</Link>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="res-table" style={{ minWidth: 640 }}>
                    <thead>
                      <tr><th>Quarto</th><th>Hóspede</th><th>Entrada</th><th>Saída</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {stats.next.map((r) => (
                        <tr key={r.id}>
                          <td><Link to={`/rooms/${r.roomId}/reservations`}>{roomName(r.roomId)}</Link></td>
                          <td>{r.guestName}</td>
                          <td>{formatDate(r.checkIn)}</td>
                          <td>{formatDate(r.checkOut)}</td>
                          <td><span className="pill pill-on">{STATUS_LABEL[statusKey(r)] || r.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
