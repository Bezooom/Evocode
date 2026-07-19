#!/usr/bin/env python3
"""
RAG Module for VKR — Retrieval-Augmented Generation for Literature Review.
Indexes PDF articles and retrieves relevant snippets during writing.

Usage:
    python rag_index.py init --dir literature/sources/ --db chromadb
    python rag_index.py search --query "цифровая трансформация менеджмента" --top-k 5
    python rag_index.py generate-context --chapter 01-theoretical-chapter.md

Requirements:
    pip install chromadb PyPDF2 tiktoken langchain-text-splitters
"""

import os
import sys
import json
import hashlib
import argparse
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict
from datetime import datetime

try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
except ImportError:
    print("ERROR: chromadb not installed. Run: pip install chromadb")
    sys.exit(1)

try:
    import PyPDF2
except ImportError:
    print("ERROR: PyPDF2 not installed. Run: pip install PyPDF2")
    sys.exit(1)


@dataclass
class DocumentChunk:
    """Represents a chunk of text from an indexed document."""

    chunk_id: str
    doc_id: str
    doc_title: str
    doc_author: str
    doc_year: int
    page_num: int
    text: str
    metadata: dict = field(default_factory=dict)


@dataclass
class SearchResult:
    """A search result from the RAG index."""

    chunk: DocumentChunk
    score: float
    formatted_ref: str  # Ready-to-use [N, с. X] reference


class VKRRAGIndex:
    """RAG index for VKR literature review."""

    CHUNK_SIZE = 500  # characters
    CHUNK_OVERLAP = 100  # characters

    def __init__(
        self, db_path: str = ".vkr_rag_db", collection_name: str = "vkr_sources"
    ):
        self.client = chromadb.PersistentClient(path=db_path)
        self.collection = self.client.get_or_create_collection(
            name=collection_name, metadata={"hnsw:space": "cosine"}
        )
        self._doc_registry = self._load_registry()

    def _load_registry(self) -> dict:
        """Load document registry from disk."""
        reg_path = Path(self.client.path) / "registry.json"
        if reg_path.exists():
            with open(reg_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}

    def _save_registry(self):
        """Save document registry to disk."""
        reg_path = Path(self.client.path) / "registry.json"
        with open(reg_path, "w", encoding="utf-8") as f:
            json.dump(self._doc_registry, f, ensure_ascii=False, indent=2)

    def extract_metadata(self, filepath: Path) -> dict:
        """Extract metadata from PDF file."""
        meta = {
            "filename": filepath.name,
            "file_size": filepath.stat().st_size,
            "indexed_at": datetime.now().isoformat(),
        }

        try:
            with open(filepath, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                meta["pages"] = len(reader.pages)

                # Try to extract title and author from first page
                first_page_text = reader.pages[0].extract_text() or ""
                if first_page_text:
                    lines = first_page_text.strip().split("\n")
                    if lines:
                        meta["title"] = lines[0].strip()[:200]
                    # Look for authors
                    for line in lines[:5]:
                        if "/" in line and len(line.split("/")) >= 2:
                            meta["authors"] = [a.strip() for a in line.split("/")]
                            break
        except Exception:
            meta["title"] = filepath.stem
            meta["authors"] = []

        return meta

    def chunk_text(self, text: str) -> List[str]:
        """Split text into overlapping chunks."""
        chunks = []
        start = 0
        text = text.strip()

        while start < len(text):
            end = start + self.CHUNK_SIZE
            chunk = text[start:end]

            # Try to break at sentence boundary
            if end < len(text):
                for delimiter in ["\n\n", "\n", ". ", ", ", "; ", "。"]:
                    last_pos = chunk.rfind(delimiter)
                    if last_pos > self.CHUNK_SIZE * 0.5:
                        chunk = chunk[: last_pos + len(delimiter)]
                        break

            chunks.append(chunk.strip())
            start = end - self.CHUNK_OVERLAP

        return chunks

    def add_document(self, filepath: Path, source_number: Optional[int] = None) -> str:
        """
        Add a PDF document to the index.

        Args:
            filepath: Path to the PDF file
            source_number: Manual source number for bibliography (auto-assigned if None)

        Returns:
            Document ID
        """
        filepath = Path(filepath)
        if not filepath.exists():
            raise FileNotFoundError(f"File not found: {filepath}")

        doc_id = hashlib.md5(filepath.name.encode()).hexdigest()
        file_hash = hashlib.md5(filepath.read_bytes()).hexdigest()

        # Check if already indexed
        if doc_id in self._doc_registry:
            old_hash = self._doc_registry[doc_id].get("file_hash")
            if old_hash == file_hash:
                print(f"Document already indexed: {filepath.name}")
                return doc_id

        print(f"Indexing: {filepath.name}...")

        # Extract metadata
        meta = self.extract_metadata(filepath)

        # Extract text from PDF
        try:
            with open(filepath, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                pages_text = []
                for page_num, page in enumerate(reader.pages):
                    text = page.extract_text() or ""
                    pages_text.append(text)
        except Exception as e:
            print(f"  Warning: Could not extract text from {filepath.name}: {e}")
            return doc_id

        # Store metadata
        self._doc_registry[doc_id] = {
            **meta,
            "file_hash": file_hash,
            "filepath": str(filepath),
            "source_number": source_number,
        }

        # Chunk and store
        for page_num, page_text in enumerate(pages_text):
            chunks = self.chunk_text(page_text)
            for i, chunk in enumerate(chunks):
                if not chunk.strip():
                    continue

                chunk_id = f"{doc_id}_p{page_num + 1}_c{i}"
                source_num = self._doc_registry[doc_id].get("source_number", "?")

                self.collection.add(
                    documents=[chunk],
                    metadatas=[
                        {
                            "doc_id": doc_id,
                            "doc_title": meta.get("title", ""),
                            "doc_author": ", ".join(
                                meta.get("authors", ["Неизвестно"])
                            ),
                            "doc_year": meta.get("year", 2024),
                            "page_num": page_num + 1,
                            "chunk_id": chunk_id,
                            "source_number": source_num,
                            "filename": filepath.name,
                        }
                    ],
                    ids=[chunk_id],
                )

        self._save_registry()
        print(
            f"  Indexed {len(pages_text)} pages, {sum(len(self.chunk_text(p)) for p in pages_text) // self.CHUNK_SIZE} chunks"
        )
        return doc_id

    def add_documents_from_dir(self, dirpath: str, source_start: int = 1) -> List[str]:
        """Add all PDFs from a directory."""
        dirpath = Path(dirpath)
        doc_ids = []
        source_num = source_start

        for pdf_file in sorted(dirpath.glob("*.pdf")):
            try:
                doc_id = self.add_document(pdf_file, source_number=source_num)
                doc_ids.append(doc_id)
                source_num += 1
            except Exception as e:
                print(f"  Error indexing {pdf_file.name}: {e}")

        return doc_ids

    def search(self, query: str, top_k: int = 5) -> List[SearchResult]:
        """
        Search for relevant text chunks.

        Args:
            query: Search query in Russian
            top_k: Number of results to return

        Returns:
            List of SearchResults with formatted references
        """
        results = self.collection.query(
            query_texts=[query],
            n_results=min(top_k, self.collection.count()),
            include=["documents", "metadatas", "distances"],
        )

        search_results = []
        for i in range(len(results["ids"][0])):
            score = 1 - results["distances"][0][i]
            meta = results["metadatas"][0][i]

            chunk = DocumentChunk(
                chunk_id=meta["chunk_id"],
                doc_id=meta["doc_id"],
                doc_title=meta.get("doc_title", ""),
                doc_author=meta.get("doc_author", ""),
                doc_year=meta.get("doc_year", 2024),
                page_num=meta.get("page_num", 0),
                text=results["documents"][0][i],
                metadata=meta,
            )

            source_num = meta.get("source_number", "?")
            formatted_ref = f"[{source_num}, с. {meta.get('page_num', '?')}]"

            search_results.append(
                SearchResult(
                    chunk=chunk,
                    score=score,
                    formatted_ref=formatted_ref,
                )
            )

        return sorted(search_results, key=lambda x: x.score, reverse=True)

    def generate_context(self, query: str, max_chars: int = 2000) -> str:
        """
        Generate context from search results, ready to include in writing.

        Args:
            query: Search query
            max_chars: Maximum characters in output

        Returns:
            Formatted context with citations
        """
        results = self.search(query, top_k=10)

        if not results:
            return "Недостаточно данных в источниках"

        context_parts = []
        total_chars = 0

        for r in results:
            chunk_text = r.chunk.text
            ref = r.formatted_ref

            part = f"{chunk_text} {ref}"
            if total_chars + len(part) > max_chars:
                # Truncate gracefully
                remaining = max_chars - total_chars
                if remaining > 50:
                    part = part[:remaining] + "..." + ref
                break

            context_parts.append(part)
            total_chars += len(part)

        return "\n\n".join(context_parts)

    def get_source_info(self, doc_id: str) -> dict:
        """Get full information about an indexed document."""
        return self._doc_registry.get(doc_id, {})

    def list_indexed(self) -> List[dict]:
        """List all indexed documents."""
        return list(self._doc_registry.values())

    def remove_document(self, doc_id: str):
        """Remove a document from the index."""
        # Get all chunk IDs for this document
        results = self.collection.get(
            where={"doc_id": doc_id},
            include=["metadatas"],
        )
        chunk_ids = [m["chunk_id"] for m in results.get("metadatas", [])]

        if chunk_ids:
            self.collection.delete(ids=chunk_ids)

        del self._doc_registry[doc_id]
        self._save_registry()


def main():
    parser = argparse.ArgumentParser(description="VKR RAG Index")
    subparsers = parser.add_subparsers(dest="command")

    # init + add
    add_parser = subparsers.add_parser("add", help="Add PDF documents")
    add_parser.add_argument("path", help="PDF file or directory")
    add_parser.add_argument("--db", default=".vkr_rag_db", help="ChromaDB path")
    add_parser.add_argument("--start", type=int, default=1, help="Source number start")

    # search
    search_parser = subparsers.add_parser("search", help="Search indexed documents")
    search_parser.add_argument("query", help="Search query")
    search_parser.add_argument("--top-k", type=int, default=5, help="Number of results")
    search_parser.add_argument("--db", default=".vkr_rag_db")

    # generate-context
    ctx_parser = subparsers.add_parser("context", help="Generate context for writing")
    ctx_parser.add_argument("query", help="Search query")
    ctx_parser.add_argument(
        "--max-chars", type=int, default=2000, help="Max output chars"
    )
    ctx_parser.add_argument("--db", default=".vkr_rag_db")

    # list
    subparsers.add_parser("list", help="List indexed documents")
    subparsers.add_argument("--db", default=".vkr_rag_db")

    args = parser.parse_args()

    if args.command == "add":
        rag = VKRRAGIndex(db_path=args.db)
        path = Path(args.path)

        if path.is_dir():
            doc_ids = rag.add_documents_from_dir(str(path), source_start=args.start)
            print(f"\nIndexed {len(doc_ids)} documents")
        elif path.is_file():
            doc_id = rag.add_document(path)
            print(f"\nIndexed: {path.name} (ID: {doc_id})")
        else:
            print(f"Error: {args.path} not found")

    elif args.command == "search":
        rag = VKRRAGIndex(db_path=args.db)
        results = rag.search(args.query, top_k=args.top_k)

        if not results:
            print("No results found")
            return

        print(f"\nResults for: {args.query}\n")
        for i, r in enumerate(results, 1):
            print(f"--- Result {i} (score: {r.score:.3f}) ---")
            print(f"  Source: {r.chunk.doc_title} ({r.chunk.doc_author})")
            print(f"  Reference: {r.formatted_ref}")
            print(f"  Text: {r.chunk.text[:200]}...")
            print()

    elif args.command == "context":
        rag = VKRRAGIndex(db_path=args.db)
        context = rag.generate_context(args.query, max_chars=args.max_chars)
        print(context)

    elif args.command == "list":
        rag = VKRRAGIndex(db_path=args.db)
        docs = rag.list_indexed()
        if not docs:
            print("No documents indexed")
            return
        print(f"\nIndexed documents: {len(docs)}\n")
        for i, doc in enumerate(docs, 1):
            print(f"{i}. {doc.get('title', 'Unknown')} ({doc.get('authors', ['?'])})")
            print(
                f"   Pages: {doc.get('pages', '?')} | Indexed: {doc.get('indexed_at', '?')}"
            )
            print()

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
