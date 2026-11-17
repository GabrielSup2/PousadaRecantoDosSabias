import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { isAdmin, getUserId } from '../services/session';
import { listRooms } from '../services/rooms';
import {
  listReservations, cancelReservation, deleteReservation,
  isCanceled, statusKey, STATUS_LABEL, detailText,
} from '../services/reservations';
import ReservationForm from '../components/ReservationForm';
import Modal from '../components/Modal';
import { brl, formatDate, formatPhone, nightsBetween } from '../utils/format';
import './rooms.css';
import './reservations.css';

const normalize = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function MyReservations() {
  const navigate = useNavigate();
  const location = useLocation();
  const admin = isAdmin();
  const userId = getUserId();

  const [rooms, setRooms] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ok | error
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roomFilter, setRoomFilter] = useState('all');
  const [formState, setFormState] = useState(null); // null | { reservation: null | objeto }
  const [confirm, setConfirm] = useState(null); // null | { type: 'cancel' | 'delete', reservation }
  const [confirmError, setConfirmError] = useState('');
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState('');

  const goLogin = useCallback(() => navigate('/login?redirect=/reservations', { replace: true }), [navigate]);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setStatus('loading');
      try {
        const [list, roomList] = await Promise.all([listReservations(), listRooms(admin)]);
        setReservations(list);
        setRooms(roomList);
        setStatus('ok');
      } catch (err) {
        if (err.status === 401) return goLogin();
        setStatus('error');
      }
    },
    [goLogin]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Atalho "Nova reserva" do Dashboard: abre o formulário assim que a lista carregar
  useEffect(() => {
    if (status === 'ok' && location.state?.newReservation) {
      setFormState({ reservation: null });
      navigate('/reservations', { replace: true, state: null });
    }
  }, [status, location.state, navigate]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  // Admin vê tudo. Usuário vê só as próprias (o backend já deve filtrar; isto é uma segunda barreira na tela).
  const mine = useMemo(
    () =>
      reservations.filter(
        (r) => admin || r.ownerId == null || userId == null || String(r.ownerId) === String(userId)
      ),
    [reservations, admin, userId]
  );

  const roomById = useMemo(() => new Map(rooms.map((r) => [String(r.id), r])), [rooms]);
  const roomName = (id) => roomById.get(String(id))?.name ?? `Quarto ${id}`;

  // Opções dos filtros: só o que existe nas reservas carregadas
  const statusOptions = useMemo(() => [...new Set(mine.map(statusKey))], [mine]);
  const roomOptions = useMemo(
    () => [...new Set(mine.map((r) => String(r.roomId)))].map((id) => ({ id, name: roomName(id) })),
    [mine, roomById] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const visible = useMemo(() => {
    const q = normalize(search.trim());
    return mine
      .filter(
        (r) =>
          (statusFilter === 'all' || statusKey(r) === statusFilter) &&
          (roomFilter === 'all' || String(r.roomId) === roomFilter) &&
          normalize(r.guestName).includes(q)
      )
      .sort((a, b) => b.checkIn.localeCompare(a.checkIn));
  }, [mine, search, statusFilter, roomFilter]);

  const totalOf = (r) => {
    if (r.total != null) return r.total;
    const room = roomById.get(String(r.roomId));
    return room ? nightsBetween(r.checkIn, r.checkOut) * room.dailyRate : null;
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setRoomFilter('all');
  };

  const handleSaved = (message) => {
    setFormState(null);
    setNotice(message);
    load(true);
  };

  const openConfirm = (type, reservation) => {
    setConfirmError('');
    setConfirm({ type, reservation });
  };

  const runConfirm = async () => {
    const { type, reservation } = confirm;
    setWorking(true);
    setConfirmError('');
    try {
      if (type === 'cancel') await cancelReservation(reservation.id);
      else await deleteReservation(reservation.id);
      setConfirm(null);
      setNotice(type === 'cancel' ? 'Reserva cancelada.' : 'Reserva excluída.');
      load(true);
    } catch (err) {
      if (err.network) setConfirmError('Não foi possível conectar ao servidor. Tente de novo.');
      else if (err.status === 401) goLogin();
      else if (err.status === 403) setConfirmError('Você não tem permissão para fazer isso nesta reserva.');
      else if (err.status === 404) {
        setConfirm(null);
        setNotice('Esta reserva já não existe. Lista atualizada.');
        load(true);
      } else if (err.status === 400 || err.status === 409)
        setConfirmError(detailText(err.data) || 'Esta ação não é permitida para esta reserva.');
      else setConfirmError('Algo deu errado. Tente novamente em instantes.');
    } finally {
      setWorking(false);
    }
  };

  const hasActiveRooms = rooms.some((r) => r.active);
  const newButton = (label) => (
    <button
      className="btn btn-main"
      onClick={() => setFormState({ reservation: null })}
      disabled={!hasActiveRooms}
      title={hasActiveRooms ? undefined : 'Nenhum quarto ativo disponível'}
    >
      {label}
    </button>
  );

  return (
    <main className="rooms-page">
      <div className="rooms-wrap">
        <header className="rooms-head">
          <h1>{admin ? 'Todas as reservas' : 'Minhas reservas'}</h1>
          {status === 'ok' && newButton('Nova reserva')}
        </header>

        {notice && <div className="alert alert-ok" role="status">{notice}</div>}

        {status === 'ok' && mine.length > 0 && (
          <div className="filters">
            <div className="field">
              <label htmlFor="search">Buscar hóspede</label>
              <input id="search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome do hóspede" />
            </div>
            <div className="field">
              <label htmlFor="roomFilter">Quarto</label>
              <select id="roomFilter" value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)}>
                <option value="all">Todos</option>
                {roomOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="statusFilter">Status</label>
              <select id="statusFilter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">Todos</option>
                {statusOptions.map((s) => <option key={s} value={s}>{STATUS_LABEL[s] || s}</option>)}
              </select>
            </div>
          </div>
        )}

        {status === 'loading' && (
          <div aria-busy="true" aria-label="Carregando reservas">
            <div className="room-card skeleton" />
          </div>
        )}

        {status === 'error' && (
          <div className="state" role="alert">
            <p>Não foi possível carregar as reservas.</p>
            <button className="btn btn-main" onClick={() => load()}>Tentar de novo</button>
          </div>
        )}

        {status === 'ok' && mine.length === 0 && (
          <div className="state">
            <p>{admin ? 'Nenhuma reserva cadastrada.' : 'Você ainda não tem reservas.'}</p>
            {newButton('Fazer uma reserva')}
            <Link to="/rooms">Ver quartos</Link>
          </div>
        )}

        {status === 'ok' && mine.length > 0 && visible.length === 0 && (
          <div className="state">
            <p>Nenhuma reserva encontrada com esses filtros.</p>
            <button className="btn btn-ghost" onClick={clearFilters}>Limpar filtros</button>
          </div>
        )}

        {status === 'ok' && visible.length > 0 && (
          <div className="table-wrap">
            <table className="res-table">
              <thead>
                <tr>
                  <th>Quarto</th><th>Hóspede</th><th>Entrada</th><th>Saída</th>
                  <th>Hóspedes</th><th>Status</th><th className="num">Total</th>
                  <th><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => {
                  const canceled = isCanceled(r);
                  const total = totalOf(r);
                  return (
                    <tr key={r.id} className={canceled ? 'row-canceled' : undefined}>
                      <td><Link to={`/rooms/${r.roomId}/reservations`}>{roomName(r.roomId)}</Link></td>
                      <td>
                        {r.guestName}
                        {r.phone && <small className="sub-line">{formatPhone(r.phone)}</small>}
                      </td>
                      <td>{formatDate(r.checkIn)}</td>
                      <td>{formatDate(r.checkOut)}</td>
                      <td>{r.guests}</td>
                      <td>
                        <span className={`pill ${canceled ? 'pill-off' : 'pill-on'}`}>
                          {STATUS_LABEL[statusKey(r)] || r.status}
                        </span>
                      </td>
                      <td className="num">{total != null ? brl.format(total) : '—'}</td>
                      <td>
                        <div className="row-actions">
                          {!canceled && <button className="btn btn-ghost btn-sm" onClick={() => setFormState({ reservation: r })}>Editar</button>}
                          {!canceled && <button className="btn btn-ghost btn-sm" onClick={() => openConfirm('cancel', r)}>Cancelar</button>}
                          <button className="btn btn-danger btn-sm" onClick={() => openConfirm('delete', r)}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formState && (
        <ReservationForm
          rooms={rooms}
          reservation={formState.reservation}
          reservations={reservations}
          onSaved={handleSaved}
          onClose={() => setFormState(null)}
        />
      )}

      {confirm && (
        <Modal
          title={confirm.type === 'cancel' ? 'Cancelar reserva?' : 'Excluir reserva?'}
          onClose={() => !working && setConfirm(null)}
        >
          <p className="confirm-text">
            {confirm.type === 'cancel' ? (
              <>A reserva de <strong>{confirm.reservation.guestName}</strong> no {roomName(confirm.reservation.roomId)} ({formatDate(confirm.reservation.checkIn)} a {formatDate(confirm.reservation.checkOut)}) será cancelada e as datas ficam livres.</>
            ) : (
              <>Você vai excluir a reserva de <strong>{confirm.reservation.guestName}</strong>. Essa ação não pode ser desfeita.</>
            )}
          </p>
          {confirmError && <div className="alert alert-error" role="alert">{confirmError}</div>}
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setConfirm(null)} disabled={working}>Voltar</button>
            <button className="btn btn-danger-solid" onClick={runConfirm} disabled={working}>
              {working ? 'Aguarde…' : confirm.type === 'cancel' ? 'Cancelar reserva' : 'Excluir reserva'}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
