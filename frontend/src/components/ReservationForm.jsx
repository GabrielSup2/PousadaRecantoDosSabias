import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Modal from './Modal';
import {
  createReservation, updateReservation, isCanceled, FORM_FIELD, detailText,
} from '../services/reservations';
import { fieldErrorsFrom422 } from '../utils/formErrors';
import { brl, digits, formatPhone, formatDate, nightsBetween } from '../utils/format';

// Dois usos:
//  • room = quarto fixo (página do quarto)
//  • rooms = lista para escolher o quarto (página "Minhas reservas", só ao criar)
// reservation = null para nova · reservations = reservas já carregadas (para checar sobreposição)
export default function ReservationForm({
  room: fixedRoom = null, rooms = [], reservation = null, reservations, onSaved, onClose,
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const editing = !!reservation;
  const canPickRoom = !fixedRoom && !editing;

  const [roomId, setRoomId] = useState(fixedRoom?.id ?? reservation?.roomId ?? '');
  const room = fixedRoom ?? rooms.find((r) => String(r.id) === String(roomId)) ?? null;

  const [form, setForm] = useState({
    guestName: reservation?.guestName ?? '',
    phone: formatPhone(reservation?.phone ?? ''),
    guests: reservation?.guests ?? 1,
    checkIn: reservation?.checkIn ?? '',
    checkOut: reservation?.checkOut ?? '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const nights = nightsBetween(form.checkIn, form.checkOut);
  const total = nights > 0 ? nights * (room?.dailyRate ?? 0) : 0;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: name === 'phone' ? formatPhone(value) : value }));
    setErrors((er) => ({
      ...er,
      [name]: undefined,
      ...(name.startsWith('check') ? { checkIn: undefined, checkOut: undefined } : {}),
    }));
    setFormError('');
  };

  const handleRoom = (e) => {
    setRoomId(e.target.value);
    setErrors((er) => ({ ...er, room: undefined, guests: undefined, checkIn: undefined }));
    setFormError('');
  };

  const validate = () => {
    const er = {};
    if (!room) er.room = 'Escolha o quarto.';
    if (!form.guestName.trim()) er.guestName = 'Informe o nome do hóspede.';

    const len = digits(form.phone).length;
    if (!len) er.phone = 'Informe o telefone.';
    else if (len < 10 || len > 11) er.phone = 'O telefone deve ter 10 ou 11 dígitos (com DDD).';

    const g = Number(form.guests);
    if (form.guests === '') er.guests = 'Informe a quantidade de hóspedes.';
    else if (!Number.isInteger(g) || g < 1) er.guests = 'Informe ao menos 1 hóspede.';
    else if (room && g > room.capacity)
      er.guests = `Este quarto comporta no máximo ${room.capacity} ${room.capacity === 1 ? 'hóspede' : 'hóspedes'}.`;

    if (!form.checkIn) er.checkIn = 'Informe a data de entrada.';
    if (!form.checkOut) er.checkOut = 'Informe a data de saída.';
    if (form.checkIn && form.checkOut) {
      if (form.checkOut <= form.checkIn) er.checkOut = 'A saída deve ser depois da entrada.';
      else if (room) {
        // Datas ISO comparam bem como texto. A saída de uma reserva pode ser a entrada de outra.
        const clash = reservations.find(
          (r) =>
            String(r.roomId) === String(room.id) && r.id !== reservation?.id && !isCanceled(r) &&
            form.checkIn < r.checkOut && form.checkOut > r.checkIn
        );
        if (clash) er.checkIn = `Já existe reserva de ${formatDate(clash.checkIn)} a ${formatDate(clash.checkOut)} neste quarto.`;
      }
    }
    return er;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const er = validate();
    setErrors(er);
    if (Object.keys(er).length) return;

    setSaving(true);
    setFormError('');
    try {
      if (editing) await updateReservation(reservation.id, form, room.id);
      else await createReservation(form, room.id);
      onSaved(editing ? 'Reserva atualizada.' : 'Reserva criada.');
    } catch (err) {
      if (err.network) setFormError('Não foi possível conectar ao servidor. Tente de novo.');
      else if (err.status === 401) navigate(`/login?redirect=${pathname}`, { replace: true });
      else if (err.status === 403) setFormError('Você não tem permissão para fazer isso.');
      else if (err.status === 404) setFormError('Quarto ou reserva não encontrado. Feche e atualize a página.');
      else if (err.status === 409) setErrors({ checkIn: 'Este quarto já está reservado em parte desse período.' });
      else if (err.status === 400) setFormError(detailText(err.data) || 'A reserva não atende às regras do sistema.');
      else if (err.status === 422) {
        const raw = fieldErrorsFrom422(err.data);
        const mapped = {};
        for (const [k, v] of Object.entries(raw)) mapped[FORM_FIELD[k] || k] = v;
        if (Object.keys(mapped).length) setErrors(mapped);
        else setFormError('Dados inválidos. Confira os campos.');
      } else setFormError('Algo deu errado. Tente novamente em instantes.');
    } finally {
      setSaving(false);
    }
  };

  const err = (id) => (errors[id] ? <span id={`${id}-err`} className="field-error">{errors[id]}</span> : null);
  const aria = (id) => ({ 'aria-invalid': !!errors[id], 'aria-describedby': errors[id] ? `${id}-err` : undefined });

  return (
    <Modal title={editing ? 'Editar reserva' : 'Nova reserva'} onClose={onClose}>
      {formError && <div className="alert alert-error" role="alert">{formError}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="room">Quarto</label>
          {canPickRoom ? (
            <select id="room" value={roomId} onChange={handleRoom} {...aria('room')}>
              <option value="">Selecione…</option>
              {rooms.filter((r) => r.active).map((r) => (
                <option key={r.id} value={r.id}>{r.name} · até {r.capacity} · {brl.format(r.dailyRate)}</option>
              ))}
            </select>
          ) : (
            <input
              id="room" readOnly
              value={room ? `${room.name} · até ${room.capacity} hóspedes · ${brl.format(room.dailyRate)}/diária` : 'Quarto indisponível'}
            />
          )}
          {err('room')}
        </div>

        <div className="field">
          <label htmlFor="guestName">Nome do hóspede</label>
          <input id="guestName" name="guestName" value={form.guestName} onChange={handleChange} autoComplete="name" {...aria('guestName')} />
          {err('guestName')}
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="phone">Telefone</label>
            <input id="phone" name="phone" type="tel" inputMode="numeric" placeholder="(85) 99999-9999" value={form.phone} onChange={handleChange} {...aria('phone')} />
            {err('phone')}
          </div>
          <div className="field">
            <label htmlFor="guests">Hóspedes</label>
            <input id="guests" name="guests" type="number" min="1" max={room?.capacity} step="1" value={form.guests} onChange={handleChange} {...aria('guests')} />
            {err('guests')}
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="checkIn">Entrada</label>
            <input id="checkIn" name="checkIn" type="date" value={form.checkIn} onChange={handleChange} {...aria('checkIn')} />
            {err('checkIn')}
          </div>
          <div className="field">
            <label htmlFor="checkOut">Saída</label>
            <input id="checkOut" name="checkOut" type="date" min={form.checkIn || undefined} value={form.checkOut} onChange={handleChange} {...aria('checkOut')} />
            {err('checkOut')}
          </div>
        </div>

        <div className="summary" aria-live="polite">
          {nights > 0 && room ? (
            <>
              <span>{nights} {nights === 1 ? 'noite' : 'noites'} × {brl.format(room.dailyRate)}</span>
              <strong>{brl.format(total)}</strong>
            </>
          ) : (
            <span>Escolha o quarto e as datas para ver o total.</span>
          )}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="submit" className="btn btn-main" disabled={saving}>
            {saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar reserva'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
