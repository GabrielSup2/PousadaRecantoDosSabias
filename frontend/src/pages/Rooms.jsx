import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { isAdmin } from '../services/session';
import { listRooms, deleteRoom } from '../services/rooms';
import RoomForm from '../components/RoomForm';
import Modal from '../components/Modal';
import './rooms.css';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const normalize = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function Rooms() {
  const navigate = useNavigate();
  const admin = isAdmin();

  const [rooms, setRooms] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ok | error
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | active | inactive
  const [formState, setFormState] = useState(null); // null | { room: null | objeto }
  const [toDelete, setToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState('');

  const goLogin = useCallback(() => navigate('/login?redirect=/rooms', { replace: true }), [navigate]);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setStatus('loading');
      try {
        setRooms(await listRooms(admin));
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

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  // Quem não é admin só vê quartos ativos
  const base = useMemo(() => (admin ? rooms : rooms.filter((r) => r.active)), [rooms, admin]);

  const visible = useMemo(() => {
    const q = normalize(search.trim());
    return base.filter(
      (r) =>
        (filter === 'all' || (filter === 'active') === r.active) && normalize(r.name).includes(q)
    );
  }, [base, search, filter]);

  const handleSaved = (message) => {
    setFormState(null);
    setNotice(message);
    load(true);
  };

  const openDelete = (room) => {
    setDeleteError('');
    setToDelete(room);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteRoom(toDelete.id);
      setRooms((rs) => rs.filter((r) => r.id !== toDelete.id));
      setToDelete(null);
      setNotice('Quarto excluído.');
    } catch (err) {
      if (err.network) setDeleteError('Não foi possível conectar ao servidor. Tente de novo.');
      else if (err.status === 401) goLogin();
      else if (err.status === 403) setDeleteError('Você não tem permissão para excluir quartos.');
      else if (err.status === 404) {
        setToDelete(null);
        setNotice('Este quarto já não existe. Lista atualizada.');
        load(true);
      } else if (err.status === 409)
        setDeleteError(
          'Este quarto tem reservas e não pode ser excluído. Se não quiser mais vendê-lo, edite e marque como inativo.'
        );
      else setDeleteError('Algo deu errado. Tente novamente em instantes.');
    } finally {
      setDeleting(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setFilter('all');
  };

  return (
    <main className="rooms-page">
      <div className="rooms-wrap">
        <header className="rooms-head">
          <h1>Quartos</h1>
          {admin && (
            <button className="btn btn-main" onClick={() => setFormState({ room: null })}>
              Novo quarto
            </button>
          )}
        </header>

        {notice && <div className="alert alert-ok" role="status">{notice}</div>}

        {status === 'ok' && base.length > 0 && (
          <div className="rooms-tools">
            <div className="field">
              <label htmlFor="search">Buscar por nome</label>
              <input id="search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ex.: Suíte" />
            </div>
            {admin && (
              <div className="field">
                <label htmlFor="filter">Status</label>
                <select id="filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
                  <option value="all">Todos</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                </select>
              </div>
            )}
          </div>
        )}

        {status === 'loading' && (
          <div className="rooms-grid" aria-busy="true" aria-label="Carregando quartos">
            {[1, 2, 3].map((i) => <div key={i} className="room-card skeleton" />)}
          </div>
        )}

        {status === 'error' && (
          <div className="state" role="alert">
            <p>Não foi possível carregar os quartos.</p>
            <button className="btn btn-main" onClick={() => load()}>Tentar de novo</button>
          </div>
        )}

        {status === 'ok' && base.length === 0 && (
          <div className="state">
            <p>Nenhum quarto cadastrado.</p>
            {admin && (
              <button className="btn btn-main" onClick={() => setFormState({ room: null })}>
                Cadastrar o primeiro quarto
              </button>
            )}
          </div>
        )}

        {status === 'ok' && base.length > 0 && visible.length === 0 && (
          <div className="state">
            <p>Nenhum quarto encontrado com esses filtros.</p>
            <button className="btn btn-ghost" onClick={clearFilters}>Limpar filtros</button>
          </div>
        )}

        {status === 'ok' && visible.length > 0 && (
          <ul className="rooms-grid">
            {visible.map((room) => (
              <li key={room.id} className="room-card">
                <div className="room-top">
                  <h2>{room.name}</h2>
                  <span className={`pill ${room.active ? 'pill-on' : 'pill-off'}`}>
                    {room.active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <p className="room-desc">{room.description || 'Sem descrição.'}</p>
                <p className="room-meta">Até {room.capacity} {room.capacity === 1 ? 'hóspede' : 'hóspedes'}</p>
                <p className="room-price"><strong>{brl.format(room.dailyRate)}</strong> / diária</p>

                <div className="room-actions">
                  <Link className="btn btn-main" to={`/rooms/${room.id}/reservations`}>Ver reservas</Link>
                  {admin && (
                    <>
                      <button className="btn btn-ghost" onClick={() => setFormState({ room })}>Editar</button>
                      <button className="btn btn-danger" onClick={() => openDelete(room)}>Excluir</button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {formState && (
        <RoomForm room={formState.room} onSaved={handleSaved} onClose={() => setFormState(null)} />
      )}

      {toDelete && (
        <Modal title="Excluir quarto?" onClose={() => !deleting && setToDelete(null)}>
          <p className="confirm-text">
            Você vai excluir <strong>{toDelete.name}</strong>. Essa ação não pode ser desfeita.
          </p>
          {deleteError && <div className="alert alert-error" role="alert">{deleteError}</div>}
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setToDelete(null)} disabled={deleting}>Cancelar</button>
            <button className="btn btn-danger-solid" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Excluindo…' : 'Excluir quarto'}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
