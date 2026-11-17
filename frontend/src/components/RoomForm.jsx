import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import { createRoom, updateRoom, FORM_FIELD } from '../services/rooms';
import { fieldErrorsFrom422 } from '../utils/formErrors';

// room = null → novo quarto; room = objeto → edição
export default function RoomForm({ room, onSaved, onClose }) {
  const navigate = useNavigate();
  const editing = !!room;

  const [form, setForm] = useState({
    name: room?.name ?? '',
    description: room?.description ?? '',
    capacity: room?.capacity ?? '',
    dailyRate: room?.dailyRate ?? '',
    active: room?.active ?? true,
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
    setFormError('');
  };

  const validate = () => {
    const er = {};
    const name = form.name.trim();
    if (!name) er.name = 'Informe o nome do quarto.';
    else if (name.length < 2) er.name = 'O nome precisa ter pelo menos 2 caracteres.';
    else if (name.length > 60) er.name = 'O nome pode ter no máximo 60 caracteres.';

    const cap = Number(form.capacity);
    if (form.capacity === '') er.capacity = 'Informe a capacidade.';
    else if (!Number.isInteger(cap) || cap <= 0) er.capacity = 'A capacidade deve ser um número inteiro maior que 0.';

    const rate = Number(form.dailyRate);
    if (form.dailyRate === '') er.dailyRate = 'Informe o valor da diária.';
    else if (!(rate > 0)) er.dailyRate = 'O valor da diária deve ser maior que 0.';
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
      if (editing) await updateRoom(room.id, form);
      else await createRoom(form);
      onSaved(editing ? 'Quarto atualizado.' : 'Quarto criado.');
    } catch (err) {
      if (err.network) setFormError('Não foi possível conectar ao servidor. Tente de novo.');
      else if (err.status === 401) navigate('/login?redirect=/rooms', { replace: true });
      else if (err.status === 403) setFormError('Você não tem permissão para fazer isso.');
      else if (err.status === 404) setFormError('Este quarto não existe mais. Feche e atualize a lista.');
      else if (err.status === 409)
        setFormError(typeof err.data?.detail === 'string' ? err.data.detail : 'Já existe um quarto com esse nome.');
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

  const err = (id) =>
    errors[id] ? (
      <span id={`${id}-err`} className="field-error">{errors[id]}</span>
    ) : null;

  const aria = (id) => ({ 'aria-invalid': !!errors[id], 'aria-describedby': errors[id] ? `${id}-err` : undefined });

  return (
    <Modal title={editing ? 'Editar quarto' : 'Novo quarto'} onClose={onClose}>
      {formError && <div className="alert alert-error" role="alert">{formError}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="name">Nome</label>
          <input id="name" name="name" value={form.name} onChange={handleChange} maxLength={80} autoFocus {...aria('name')} />
          {err('name')}
        </div>

        <div className="field">
          <label htmlFor="description">Descrição</label>
          <textarea id="description" name="description" rows={3} value={form.description} onChange={handleChange} />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="capacity">Capacidade (hóspedes)</label>
            <input id="capacity" name="capacity" type="number" min="1" step="1" value={form.capacity} onChange={handleChange} {...aria('capacity')} />
            {err('capacity')}
          </div>
          <div className="field">
            <label htmlFor="dailyRate">Diária (R$)</label>
            <input id="dailyRate" name="dailyRate" type="number" min="0.01" step="0.01" value={form.dailyRate} onChange={handleChange} {...aria('dailyRate')} />
            {err('dailyRate')}
          </div>
        </div>

        <label className="check">
          <input type="checkbox" name="active" checked={form.active} onChange={handleChange} />
          Quarto ativo (disponível para reservas)
        </label>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="submit" className="btn btn-main" disabled={saving}>
            {saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar quarto'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
