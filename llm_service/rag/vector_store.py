import re


def _tokenize(text: str) -> set[str]:
    return {token for token in re.findall(r"[a-zA-Z0-9]+", text.lower()) if len(token) > 1}

class VectorStore:
    def __init__(self):
        self.docs_by_document: dict[str, list[str]] = {}

    def add(self, document_id: str, docs: list[str]):
        self.docs_by_document[document_id] = docs

    def search(self, document_id: str, query: str, k: int = 3) -> list[str]:
        docs = self.docs_by_document.get(document_id, [])
        if not docs:
            return []

        query_tokens = _tokenize(query)
        if not query_tokens:
            return docs[:k]

        ranked = []
        for idx, chunk in enumerate(docs):
            chunk_tokens = _tokenize(chunk)
            overlap = len(query_tokens & chunk_tokens)
            ranked.append((overlap, -idx, chunk))

        ranked.sort(reverse=True)
        best = [chunk for score, _, chunk in ranked if score > 0]
        if not best:
            return docs[:k]
        return best[:k]