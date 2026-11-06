import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import './LandingPage.css'

const ROOMS = [
  {
    key: 'standard',
    label: 'Standard',
    name: 'Quarto Standard',
    description: 'Cama de casal, ar-condicionado, TV e banheiro privativo.',
    meta: 'Até 2 hóspedes · 18 m²',
    price: 180,
    photoClass: 'p1',
  },
  {
    key: 'familia',
    label: 'Família',
    name: 'Quarto Família',
    description: 'Uma cama de casal e duas de solteiro, com varanda e frigobar.',
    meta: 'Até 4 hóspedes · 28 m²',
    price: 290,
    photoClass: 'p2',
  },
  {
    key: 'suite',
    label: 'Suíte',
    name: 'Suíte Master',
    description: 'Cama king, banheira, varanda com rede e vista para o jardim.',
    meta: 'Até 2 hóspedes · 35 m²',
    price: 420,
    photoClass: 'p3',
  },
]

const toISODate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const addDays = (isoDate, days) => {
  const date = new Date(`${isoDate}T00:00:00`)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

export default function LandingPage() {
  const navigate = useNavigate()
  const today = useMemo(() => toISODate(new Date()), [])
  const [checkIn, setCheckIn] = useState(today)
  const [checkOut, setCheckOut] = useState(addDays(today, 2))
  const [guests, setGuests] = useState('2')

  const minCheckOut = addDays(checkIn, 1)

  const handleCheckInChange = (event) => {
    const value = event.target.value
    setCheckIn(value)
    if (checkOut <= value) setCheckOut(addDays(value, 1))
  }

  const handleCheckOutChange = (event) => {
    const value = event.target.value
    setCheckOut(value <= checkIn ? addDays(checkIn, 1) : value)
  }

  const handleSearch = (event) => {
    event.preventDefault()
    const params = new URLSearchParams({
      entrada: checkIn,
      saida: checkOut,
      hospedes: guests,
    })
    navigate(`/login?${params.toString()}`)
  }

  return (
    <div className="landing-page">
      <header>
        <div className="wrap bar">
          <Link className="brand" to="/">
            <span className="badge">RS</span>
            <span>
              Pousada Recanto
              <br />
              dos Sábias
            </span>
          </Link>

          <nav>
            <a className="hide-m" href="#quartos">Quartos</a>
            <a className="hide-m" href="#comodidades">Comodidades</a>
            <a className="hide-m" href="#como-reservar">Como reservar</a>
            <Link to="/login">Entrar</Link>
            <Link className="btn btn-ghost" to="/register">Cadastre-se</Link>
          </nav>
        </div>
      </header>

      <main id="topo">
        <div className="hero">
          <div className="wrap">
            <h1>Descanse com calma no Recanto dos Sábias</h1>
            <p>Escolha as datas, veja os quartos disponíveis e reserve em poucos minutos.</p>
          </div>
        </div>

        <div className="search wrap">
          <form onSubmit={handleSearch}>
            <div>
              <label htmlFor="entrada">Entrada</label>
              <input
                id="entrada"
                type="date"
                min={today}
                value={checkIn}
                onChange={handleCheckInChange}
                required
              />
            </div>

            <div>
              <label htmlFor="saida">Saída</label>
              <input
                id="saida"
                type="date"
                min={minCheckOut}
                value={checkOut}
                onChange={handleCheckOutChange}
                required
              />
            </div>

            <div>
              <label htmlFor="hospedes">Hóspedes</label>
              <select id="hospedes" value={guests} onChange={(event) => setGuests(event.target.value)}>
                <option value="1">1 hóspede</option>
                <option value="2">2 hóspedes</option>
                <option value="3">3 hóspedes</option>
                <option value="4">4 hóspedes</option>
              </select>
            </div>

            <button className="btn btn-main" type="submit">Ver quartos disponíveis</button>
          </form>
        </div>

        <section id="quartos">
          <div className="wrap">
            <h2>Nossos quartos</h2>
            <p className="sub">
              Três opções para cada tipo de viagem. Você só precisa entrar na sua conta na hora de confirmar a reserva.
            </p>

            <div className="rooms">
              {ROOMS.map((room) => (
                <article className="room" key={room.key}>
                  <div className={`photo ${room.photoClass}`}>{room.label}</div>
                  <div className="room-body">
                    <h3>{room.name}</h3>
                    <p>{room.description}</p>
                    <span className="meta">{room.meta}</span>
                    <div className="price">a partir de <strong>R$ {room.price}</strong> / noite</div>
                    <Link className="btn btn-main" to={`/login?quarto=${room.key}`}>Reservar</Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="comodidades">
          <div className="wrap">
            <h2>O que está incluso</h2>
            <p className="sub">Sem taxas escondidas: tudo isso já vem com a diária.</p>
            <ul className="perks">
              <li><b>Café da manhã</b><span>Servido das 7h às 10h.</span></li>
              <li><b>Wi-Fi em toda a pousada</b><span>Rápido o bastante para trabalhar.</span></li>
              <li><b>Piscina e jardim</b><span>Abertos das 8h às 22h.</span></li>
              <li><b>Estacionamento</b><span>Gratuito, dentro da pousada.</span></li>
            </ul>
          </div>
        </section>

        <section id="como-reservar">
          <div className="wrap">
            <h2>Como reservar</h2>
            <p className="sub">Do primeiro clique à confirmação, são três passos.</p>
            <ol className="steps">
              <li><b>Escolha as datas</b><p>Informe entrada, saída e quantos hóspedes vão.</p></li>
              <li><b>Selecione o quarto</b><p>Veja o preço total da estadia antes de decidir.</p></li>
              <li><b>Entre e confirme</b><p>Faça login ou crie sua conta e finalize a reserva.</p></li>
            </ol>
          </div>
        </section>

        <div className="cta">
          <div className="wrap">
            <h2>Já tem uma reserva?</h2>
            <p>Entre na sua conta para ver, alterar ou cancelar.</p>
            <Link className="btn btn-main" to="/login">Entrar na minha conta</Link>
          </div>
        </div>
      </main>

      <footer>
        <div className="wrap">
          © {new Date().getFullYear()} Pousada Recanto dos Sábias · Sistema de reservas
        </div>
      </footer>
    </div>
  )
}
