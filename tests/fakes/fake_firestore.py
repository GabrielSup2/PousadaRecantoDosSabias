"""
Emulador do Firestore em memória, usado apenas nos testes.

Implementa a interface mínima utilizada pelos repositórios da aplicação:

    collection(name)
        .stream()
        .where(campo, op, valor)  # suporta == e != (os únicos usados no app)
        .limit(n)
        .document(id?)            # id auto-gerado se omitido
            .get() / .set() / .update() / .delete()

Os documentos devolvidos por get()/stream() são FakeDocumentSnapshot,
com os mesmos atributos usados pelos repositórios: .id, .exists, .to_dict().
"""
from uuid import uuid4


class FakeDocumentSnapshot:
    """Equivalente ao DocumentSnapshot do SDK oficial."""

    def __init__(self, doc_id: str, data: dict | None):
        self.id = doc_id
        self.exists = data is not None
        self._data = data or {}

    def to_dict(self) -> dict:
        return dict(self._data)


class FakeQuery:
    """Query encadeável: where() ==/!=, limit() e stream()."""

    def __init__(self, collection, filters=None, limit_count=None):
        self._collection = collection
        self._filters = filters or []
        self._limit_count = limit_count

    def where(self, field, op, value):
        return FakeQuery(self._collection, self._filters + [(field, op, value)], self._limit_count)

    def limit(self, count):
        return FakeQuery(self._collection, self._filters, count)

    def stream(self):
        results = []
        for doc_id, data in self._collection._docs.items():
            if self._matches(data):
                results.append(FakeDocumentSnapshot(doc_id, data))
        if self._limit_count is not None:
            results = results[: self._limit_count]
        return iter(results)

    def _matches(self, data) -> bool:
        for field, op, value in self._filters:
            current = data.get(field)
            if op == "==" and current != value:
                return False
            if op == "!=" and current == value:
                return False
        return True


class FakeDocumentReference:
    """Equivalente ao DocumentReference do SDK oficial."""

    def __init__(self, collection, doc_id: str):
        self._collection = collection
        self.id = doc_id

    def get(self) -> FakeDocumentSnapshot:
        return FakeDocumentSnapshot(self.id, self._collection._docs.get(self.id))

    def set(self, payload: dict) -> None:
        self._collection._docs[self.id] = dict(payload)

    def update(self, payload: dict) -> None:
        self._collection._docs[self.id].update(payload)

    def delete(self) -> None:
        self._collection._docs.pop(self.id, None)


class FakeCollection:
    """Equivalente a CollectionReference do SDK oficial."""

    def __init__(self, name: str):
        self.name = name
        self._docs: dict[str, dict] = {}

    def document(self, doc_id: str | None = None) -> FakeDocumentReference:
        return FakeDocumentReference(self, doc_id or uuid4().hex)

    def stream(self):
        return FakeQuery(self).stream()

    def where(self, field, op, value):
        return FakeQuery(self, [(field, op, value)])

    def limit(self, count):
        return FakeQuery(self, [], count)


class FakeFirestore:
    """Ponto de entrada: get_firestore_client() retorna uma instância desta classe."""

    def __init__(self):
        self._collections: dict[str, FakeCollection] = {}

    def collection(self, name: str) -> FakeCollection:
        if name not in self._collections:
            self._collections[name] = FakeCollection(name)
        return self._collections[name]

    def seed(self, collection_name: str, doc_id: str, data: dict) -> None:
        """Insere um documento diretamente (usado para preparar estado nos testes)."""
        self.collection(collection_name)._docs[doc_id] = dict(data)

    def reset(self) -> None:
        self._collections.clear()
