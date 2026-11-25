import { Link } from 'react-router-dom'

import './NotFoundPage.css'

export default function NotFoundPage() {
  return (
    <main className="not-found-page" aria-labelledby="titulo-404">
      <div className="not-found-card">
        <span className="not-found-code" aria-hidden="true">404</span>
        <div className="not-found-content">
          <h1 id="titulo-404">Página não encontrada</h1>
          <p>O endereço que você tentou abrir não existe ou foi movido.</p>

          <div className="not-found-actions">
            <Link className="btn btn-main" to="/">Voltar para o início</Link>
            <Link className="btn btn-ghost" to="/login">Ir para o login</Link>
          </div>
        </div>
      </div>
    </main>
  )
}
