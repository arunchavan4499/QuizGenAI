from rag.vector_store import VectorStore

vector_db = VectorStore()


def _chunk_document(text: str, chunk_size: int = 700, overlap: int = 120) -> list[str]:
    if not text.strip():
        return []

    chunks = []
    start = 0
    step = max(1, chunk_size - overlap)
    while start < len(text):
        chunks.append(text[start : start + chunk_size])
        start += step
    return chunks


def ingest_document(document_id: str, text: str) -> None:
    chunks = _chunk_document(text)
    if not chunks:
        raise ValueError("Document is empty after preprocessing.")
    vector_db.add(document_id, chunks)


def retrieve_context(document_id: str, query: str, k: int = 4) -> list[str]:
    return vector_db.search(document_id, query, k=k)


def build_context_for_quiz(document_id: str, text: str, query: str, k: int = 4) -> str:
    ingest_document(document_id=document_id, text=text)
    retrieved = retrieve_context(document_id=document_id, query=query, k=k)
    if not retrieved:
        raise ValueError("No relevant context could be retrieved from document.")
    return "\n\n".join(retrieved)