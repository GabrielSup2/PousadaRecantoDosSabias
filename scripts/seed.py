"""Popula o Firestore com os dados iniciais da pousada.

Uso, a partir da raiz do projeto:

    python scripts/seed.py

O script é idempotente: usuário e quartos já existentes são ignorados.
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.repositories.room_repository import RoomRepository
from app.repositories.user_repository import UserRepository
from app.schemas.room import RoomCreate
from app.schemas.user import UserCreate

ADMIN_EMAIL = os.getenv("SEED_ADMIN_EMAIL", "admin@pousadarecanto.com")
ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD", "Recanto@2026")
ADMIN_NAME = os.getenv("SEED_ADMIN_NAME", "Administrador da Pousada")

ROOMS = (
    {
        "name": "Quarto 101",
        "description": "Cama de casal, ar-condicionado, TV e banheiro privativo.",
        "capacity": 2,
        "daily_rate": 180.0,
    },
    {
        "name": "Quarto 102",
        "description": "Cama de casal, varanda e vista para o jardim.",
        "capacity": 2,
        "daily_rate": 180.0,
    },
    {
        "name": "Quarto 103",
        "description": "Cama de casal e cama de solteiro, ideal para casal com criança.",
        "capacity": 3,
        "daily_rate": 220.0,
    },
    {
        "name": "Quarto 104",
        "description": "Uma cama de casal e duas de solteiro, com varanda e frigobar.",
        "capacity": 4,
        "daily_rate": 290.0,
    },
    {
        "name": "Quarto 105",
        "description": "Uma cama de casal e duas de solteiro, com varanda.",
        "capacity": 4,
        "daily_rate": 290.0,
    },
    {
        "name": "Suíte 106",
        "description": "Cama king, banheira, varanda com rede e vista para o jardim.",
        "capacity": 2,
        "daily_rate": 420.0,
    },
    {
        "name": "Suíte 107",
        "description": "Cama king, sala de estar, banheira e varanda.",
        "capacity": 3,
        "daily_rate": 480.0,
    },
    {
        "name": "Quarto 108",
        "description": "Quarto acessível, com cama de casal e banheiro adaptado.",
        "capacity": 2,
        "daily_rate": 200.0,
    },
)


def seed_admin(user_repo: UserRepository | None = None) -> bool:
    repo = user_repo or UserRepository()
    if repo.get_by_email(ADMIN_EMAIL):
        print(f"[seed] admin {ADMIN_EMAIL} já existe; nada a fazer")
        return False

    repo.create_user(
        UserCreate(
            email=ADMIN_EMAIL,
            password=ADMIN_PASSWORD,
            full_name=ADMIN_NAME,
        ),
        role="admin",
    )
    print(f"[seed] admin criado: {ADMIN_EMAIL}")
    return True


def seed_rooms(room_repo: RoomRepository | None = None) -> int:
    repo = room_repo or RoomRepository()
    existing_names = {room.name for room in repo.get_all()}
    created = 0

    for room in ROOMS:
        if room["name"] in existing_names:
            print(f"[seed] {room['name']} já existe; pulando")
            continue

        repo.create(RoomCreate(**room))
        created += 1
        print(f"[seed] quarto criado: {room['name']}")

    print(f"[seed] quartos criados: {created}")
    return created


def main() -> None:
    print("[seed] iniciando...")
    seed_admin()
    seed_rooms()
    print("[seed] concluído")


if __name__ == "__main__":
    main()
