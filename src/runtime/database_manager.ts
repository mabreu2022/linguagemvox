// src/runtime/database_manager.ts
// Gerenciador universal de conexões a bancos de dados para o runtime Vox:
// Suporte nativo e integrado a SQLite, MySQL, Microsoft SQL Server e Firebird.

import * as path from 'path';
import * as cp from 'child_process';

export interface DatabaseConnection {
  id: number;
  driver: 'sqlite' | 'mysql' | 'sqlserver' | 'firebird';
  connStr: string;
  sqliteDb?: any;
}

export class DatabaseManager {
  private static nextId = 1;
  private connections = new Map<number, DatabaseConnection>();
  private workerPath: string;

  constructor() {
    this.workerPath = path.resolve(__dirname, 'db_worker.js');
  }

  public connect(rawDriver: string, connStr: string): number {
    const driver = this.normalizeDriver(rawDriver);
    const id = DatabaseManager.nextId++;

    if (driver === 'sqlite') {
      try {
        const { DatabaseSync } = require('node:sqlite');
        const db = new DatabaseSync(String(connStr));
        this.connections.set(id, { id, driver, connStr, sqliteDb: db });
        return id;
      } catch (err: any) {
        throw new Error(`[SQLite Error] Failed to open '${connStr}': ${err.message}`);
      }
    }

    if (driver === 'mysql' || driver === 'sqlserver' || driver === 'firebird') {
      // Test or validate connection via worker
      const res = this.invokeWorker({
        action: 'test',
        driver,
        connStr,
      });

      // If connection fails due to network/auth, we throw a clear database error
      if (!res.success) {
        throw new Error(`[${driver.toUpperCase()} Error] Connection failed: ${res.error}`);
      }

      this.connections.set(id, { id, driver, connStr });
      return id;
    }

    throw new Error(`[Database Error] Unsupported driver '${rawDriver}'. Supported drivers: sqlite, mysql, sqlserver (mssql), firebird (fb).`);
  }

  public query(handle: number, sql: string): Array<Map<string, any>> {
    const conn = this.getConnection(handle);

    if (conn.driver === 'sqlite') {
      try {
        const stmt = conn.sqliteDb.prepare(sql);
        const rows = stmt.all();
        return rows.map((row: any) => {
          const map = new Map<string, any>();
          for (const [k, v] of Object.entries(row)) {
            map.set(k, v);
          }
          return map;
        });
      } catch (err: any) {
        throw new Error(`[SQLite Error] Query failed: ${err.message}`);
      }
    }

    // Remote databases via worker
    const res = this.invokeWorker({
      action: 'query',
      driver: conn.driver,
      connStr: conn.connStr,
      sql,
    });

    if (!res.success) {
      throw new Error(`[${conn.driver.toUpperCase()} Error] Query failed: ${res.error}`);
    }

    const rows = Array.isArray(res.data) ? res.data : [];
    return rows.map((row: any) => {
      const map = new Map<string, any>();
      for (const [k, v] of Object.entries(row)) {
        map.set(k, v);
      }
      return map;
    });
  }

  public exec(handle: number, sql: string): boolean {
    const conn = this.getConnection(handle);

    if (conn.driver === 'sqlite') {
      try {
        conn.sqliteDb.exec(sql);
        return true;
      } catch (err: any) {
        throw new Error(`[SQLite Error] Execution failed: ${err.message}`);
      }
    }

    const res = this.invokeWorker({
      action: 'exec',
      driver: conn.driver,
      connStr: conn.connStr,
      sql,
    });

    if (!res.success) {
      throw new Error(`[${conn.driver.toUpperCase()} Error] Execution failed: ${res.error}`);
    }

    return true;
  }

  public close(handle: number): boolean {
    const conn = this.connections.get(handle);
    if (!conn) return false;

    if (conn.driver === 'sqlite' && conn.sqliteDb) {
      try {
        conn.sqliteDb.close();
      } catch {
        // Ignored
      }
    }

    this.connections.delete(handle);
    return true;
  }

  private getConnection(handle: number): DatabaseConnection {
    const conn = this.connections.get(Number(handle));
    if (!conn) {
      throw new Error(`[Database Error] Invalid or closed database handle: ${handle}`);
    }
    return conn;
  }

  private normalizeDriver(driver: string): 'sqlite' | 'mysql' | 'sqlserver' | 'firebird' {
    const d = driver.trim().toLowerCase();
    if (d === 'sqlite' || d === 'sqlite3') return 'sqlite';
    if (d === 'mysql' || d === 'mariadb') return 'mysql';
    if (d === 'sqlserver' || d === 'mssql' || d === 'tsql') return 'sqlserver';
    if (d === 'firebird' || d === 'fb' || d === 'interbase') return 'firebird';
    throw new Error(`Unknown database driver '${driver}'. Choose from: 'sqlite', 'mysql', 'sqlserver', 'firebird'.`);
  }

  private invokeWorker(payload: any): { success: boolean; data?: any; error?: string } {
    try {
      const jsonStr = JSON.stringify(payload);
      const b64 = 'base64:' + Buffer.from(jsonStr).toString('base64');
      const stdout = cp.execFileSync(process.execPath, [this.workerPath, b64], {
        encoding: 'utf-8',
        timeout: 10000,
        windowsHide: true,
      });

      return JSON.parse(stdout.trim());
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
