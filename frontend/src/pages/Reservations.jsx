import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isAdmin, getUserId } from '../services/session';
import { getRoom } from '../services/rooms';
import {
  listRoomReservations, cancelReservation, deleteReservation,
  isCanceled, STATUS_LABEL, detailText,
} from '../services/reservations';
import ReservationForm from '../components/ReservationForm';
import Modal from '../components/Modal';
import { brl, formatDate, formatPhone, nightsBetween } from '../utils/format';
import './rooms.css';
import './reservations.css';

export default function Reservations() {
  const { id } = useParams();
  const navigate = useNavigate();
  const admin = isAdmin();
  const userId = getUserId();

  const [room, setRoom] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ok | error | notfound
  const [formState, setFormState] = useState(null); // null | { reservation: null | objeto }
  const [confirm, setConfirm] = useState(null); // null | { type: 'cancel' | 'delete', reservation }
  const [confirmError, setConfirmError] = useState('');
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState('');

  const goLogin = useCallback(
    () => navigate(`/login?redirect=/rooms/${id}/reservations`, { replace: true }),
    [navigate, id]
  );

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setStatus('loading');
      try {
        const [r, list] = await Promise.all([getRoom(id), listRoomReservations(id)]);
        setRoom(r);
        setReservations(list);
        setStatus('ok');
      } catch (err) {
        if (err.status === 401) return goLogin();
        setStatus(err.status === 404 ? 'notfound' : 'error');
      }
    },
    [id, goLogin]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  // Mais recentes primeiro (datas ISO ordenam como texto)
  const sorted = useMemo(
    () => [...reservations].sort((a, b) => b.checkIn.localeCompare(a.checkIn)),
    [reservations]
  );

  // Dono ou admin. O backend continua sendo quem decide de verdade.
  const canManage = (r) =>
    admin || (userId != null && r.ownerId != null && String(r.ownerId) === String(userId));

  const totalOf = (r) => r.total ?? nightsBetween(r.checkIn, r.checkOut) * room.dailyRate;

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

  const back = <Link className="btn btn-ghost" to="/rooms">← Voltar para quartos</Link>;

  if (status === 'loading')
    return (
      <main className="rooms-page">
        <div className="rooms-wrap" aria-busy="true" aria-label="Carregando reservas">
          <div className="room-card skeleton" />
        </div>
      </main>
    );

  if (status === 'notfound' || status === 'error')
    return (
      <main className="rooms-page">
        <div className="rooms-wrap">
          <div className="state" role="alert">
            <p>{status === 'notfound' ? 'Quarto não encontrado.' : 'Não foi possível carregar as reservas.'}</p>
            {status === 'error' && <button className="btn btn-main" onClick={() => load()}>Tentar de novo</button>}
            {back}
          </div>
        </div>
      </main>
    );

  return (
    <main className="rooms-page">
      <div className="rooms-wrap">
        <header className="res-header">
          <div>
            <h1>{room.name}</h1>
            <p className="res-meta">
              <span>Até {room.capacity} {room.capacity === 1 ? 'hóspede' : 'hóspedes'}</span>
              <span>{brl.format(room.dailyRate)} / diária</span>
              <span className={`pill ${room.active ? 'pill-on' : 'pill-off'}`}>{room.active ? 'Ativo' : 'Inativo'}</span>
            </p>
          </div>
          <div className="res-header-actions">
            {back}
            <button
              className="btn btn-main"
              onClick={() => setFormState({ reservation: null })}
              disabled={!room.active}
              title={room.active ? undefined : 'Este quarto está inativo'}
            >
              Nova reserva
            </button>
          </div>
        </header>

        {notice && <div className="alert alert-ok" role="status">{notice}</div>}

        {sorted.length === 0 ? (
          <div className="state">
            <p>Nenhuma reserva para este quarto.</p>
            {room.active && (
              <button className="btn btn-main" onClick={() => setFormState({ reservation: null })}>
                Fazer a primeira reserva
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="res-table">
              <thead>
                <tr>
                  <th>Hóspede</th><th>Telefone</th><th>Hóspedes</th><th>Entrada</th>
                  <th>Saída</th><th>Status</th><th className="num">Total</th><th><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => {
                  const canceled = isCanceled(r);
                  return (
                    <tr key={r.id} className={canceled ? 'row-canceled' : undefined}>
                      <td>{r.guestName}</td>
                      <td>{formatPhone(r.phone)}</td>
                      <td>{r.guests}</td>
                      <td>{formatDate(r.checkIn)}</td>
                      <td>{formatDate(r.checkOut)}</td>
                      <td>
                        <span className={`pill ${canceled ? 'pill-off' : 'pill-on'}`}>
                          {STATUS_LABEL[String(r.status).toLowerCase()] || r.status}
                        </span>
                      </td>
                      <td className="num">{brl.format(totalOf(r))}</td>
                      <td>
                        {canManage(r) && (
                          <div className="row-actions">
                            {!canceled && <button className="btn btn-ghost btn-sm" onClick={() => setFormState({ reservation: r })}>Editar</button>}
                            {!canceled && <button className="btn btn-ghost btn-sm" onClick={() => openConfirm('cancel', r)}>Cancelar</button>}
                            <button className="btn btn-danger btn-sm" onClick={() => openConfirm('delete', r)}>Excluir</button>
                          </div>
                        )}
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
          room={room}
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
              <>A reserva de <strong>{confirm.reservation.guestName}</strong> ({formatDate(confirm.reservation.checkIn)} a {formatDate(confirm.reservation.checkOut)}) será cancelada e as datas ficam livres.</>
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
