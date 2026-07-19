import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import * as fs from 'fs';
import * as path from 'path';

export interface CodeChunk {
  id: number;
  filePath: string;
  content: string;
  embedding: number[];
}

export class VectorIndex {
  private db: Database.Database;

  constructor(dbPath: string = '.evocode/index.db') {
    // Убедимся, что директория существует
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(dbPath);
    
    // Подгружаем расширение sqlite-vec
    sqliteVec.load(this.db);
    
    this.initDatabase();
  }

  private initDatabase() {
    // Создаем таблицу для метаданных
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS code_chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT NOT NULL,
        content TEXT NOT NULL
      );
    `);

    // Создаем виртуальную таблицу для векторов
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS vec_code_chunks USING vec0(
        id INTEGER PRIMARY KEY,
        embedding float[384]
      );
    `);
  }

  // Сохранение чанка с вектором
  insertChunk(filePath: string, content: string, embedding: number[]) {
    const insertMeta = this.db.prepare('INSERT INTO code_chunks (file_path, content) VALUES (?, ?)');
    const insertVec = this.db.prepare('INSERT INTO vec_code_chunks (id, embedding) VALUES (?, ?)');

    const transaction = this.db.transaction(() => {
      const result = insertMeta.run(filePath, content);
      const id = Number(result.lastInsertRowid);
      
      // sqlite-vec требует передачи массива в виде BLOB
      const float32Array = new Float32Array(embedding);
      const buffer = Buffer.from(float32Array.buffer);
      insertVec.run(BigInt(id), buffer);
      
      return Number(id);
    });

    return transaction();
  }

  // Поиск по кодовой базе (RAG)
  search(queryEmbedding: number[], limit: number = 5): CodeChunk[] {
    if (!queryEmbedding?.length || queryEmbedding.every((x) => x === 0)) {
      return [];
    }

    const float32Query = new Float32Array(queryEmbedding);
    const buffer = Buffer.from(float32Query.buffer);

    const stmt = this.db.prepare(`
      SELECT 
        c.id, 
        c.file_path as filePath, 
        c.content, 
        v.distance 
      FROM vec_code_chunks v
      JOIN code_chunks c ON c.id = v.id
      WHERE v.embedding MATCH ? AND k = ?
      ORDER BY v.distance ASC
    `);

    return stmt.all(buffer, limit) as CodeChunk[];
  }

  /** Удаление всех чанков файла (reindex) */
  deleteByFile(filePath: string): number {
    const ids = this.db
      .prepare('SELECT id FROM code_chunks WHERE file_path = ?')
      .all(filePath) as { id: number }[];

    const delMeta = this.db.prepare('DELETE FROM code_chunks WHERE file_path = ?');
    const delVec = this.db.prepare('DELETE FROM vec_code_chunks WHERE id = ?');

    const tx = this.db.transaction(() => {
      for (const row of ids) {
        delVec.run(BigInt(row.id));
      }
      const r = delMeta.run(filePath);
      return r.changes;
    });

    return tx();
  }

  close() {
    this.db.close();
  }
}

export const vectorIndex = new VectorIndex();
