// src/runtime/db_worker.js
// Worker de execução síncrona/desacoplada para bancos de dados externos (MySQL, SQL Server, Firebird)
const process = require('process');

async function handleAction() {
  let rawInput = process.argv[2];
  if (!rawInput) {
    console.log(JSON.stringify({ success: false, error: 'No input payload provided' }));
    return;
  }

  if (rawInput.startsWith('base64:')) {
    rawInput = Buffer.from(rawInput.slice(7), 'base64').toString('utf-8');
  }

  let req;
  try {
    req = JSON.parse(rawInput);
  } catch (e) {
    console.log(JSON.stringify({ success: false, error: 'Invalid JSON payload: ' + e.message }));
    return;
  }

  const { action, driver, connStr, sql } = req;

  try {
    if (driver === 'mysql') {
      const mysql = require('mysql2/promise');
      let connection;
      if (connStr.startsWith('mysql://')) {
        connection = await mysql.createConnection(connStr);
      } else {
        // Parse key=value config (e.g. host=localhost;port=3306;user=root;password=...;database=teste)
        const opts = {};
        connStr.split(';').forEach(pair => {
          const [k, v] = pair.split('=');
          if (k && v) {
            const key = k.trim().toLowerCase();
            const val = v.trim();
            if (key === 'port') opts.port = parseInt(val, 10);
            else if (key === 'user' || key === 'username') opts.user = val;
            else if (key === 'password' || key === 'pass') opts.password = val;
            else if (key === 'database' || key === 'db') opts.database = val;
            else opts[key] = val;
          }
        });
        connection = await mysql.createConnection(opts);
      }

      if (action === 'test') {
        await connection.end();
        console.log(JSON.stringify({ success: true, message: 'MySQL connection successful' }));
        return;
      }

      if (action === 'query') {
        const [rows] = await connection.query(sql);
        await connection.end();
        console.log(JSON.stringify({ success: true, data: rows }));
        return;
      }

      if (action === 'exec') {
        const [result] = await connection.execute(sql);
        await connection.end();
        console.log(JSON.stringify({ success: true, affectedRows: result?.affectedRows || 0 }));
        return;
      }
    }

    if (driver === 'sqlserver' || driver === 'mssql') {
      const mssql = require('mssql');
      const pool = await mssql.connect(connStr);

      if (action === 'test') {
        await pool.close();
        console.log(JSON.stringify({ success: true, message: 'SQL Server connection successful' }));
        return;
      }

      if (action === 'query') {
        const result = await pool.request().query(sql);
        await pool.close();
        console.log(JSON.stringify({ success: true, data: result.recordset || [] }));
        return;
      }

      if (action === 'exec') {
        const result = await pool.request().query(sql);
        await pool.close();
        console.log(JSON.stringify({ success: true, rowsAffected: result.rowsAffected ? result.rowsAffected[0] : 0 }));
        return;
      }
    }

    if (driver === 'firebird' || driver === 'fb') {
      const firebird = require('node-firebird');
      
      // Parse Firebird connection string (e.g. localhost:3050:/path/to/db.fdb?user=SYSDBA&password=masterkey)
      let options = {
        host: '127.0.0.1',
        port: 3050,
        database: connStr,
        user: 'SYSDBA',
        password: 'masterkey',
        lowercase_keys: false,
        role: null,
        pageSize: 4096
      };

      if (connStr.includes('://')) {
        const url = new URL(connStr);
        options.host = url.hostname || '127.0.0.1';
        options.port = url.port ? parseInt(url.port, 10) : 3050;
        options.database = url.pathname;
        if (url.username) options.user = url.username;
        if (url.password) options.password = url.password;
      } else if (connStr.includes(';')) {
        connStr.split(';').forEach(pair => {
          const [k, v] = pair.split('=');
          if (k && v) {
            const key = k.trim().toLowerCase();
            const val = v.trim();
            if (key === 'host') options.host = val;
            else if (key === 'port') options.port = parseInt(val, 10);
            else if (key === 'database' || key === 'db') options.database = val;
            else if (key === 'user') options.user = val;
            else if (key === 'password' || key === 'pass') options.password = val;
          }
        });
      }

      const db = await new Promise((resolve, reject) => {
        firebird.attach(options, (err, dbInstance) => {
          if (err) return reject(err);
          resolve(dbInstance);
        });
      });

      if (action === 'test') {
        db.detach();
        console.log(JSON.stringify({ success: true, message: 'Firebird connection successful' }));
        return;
      }

      if (action === 'query') {
        const rows = await new Promise((resolve, reject) => {
          db.query(sql, [], (err, result) => {
            if (err) return reject(err);
            resolve(result);
          });
        });
        db.detach();
        console.log(JSON.stringify({ success: true, data: rows || [] }));
        return;
      }

      if (action === 'exec') {
        await new Promise((resolve, reject) => {
          db.execute(sql, [], (err, result) => {
            if (err) return reject(err);
            resolve(result);
          });
        });
        db.detach();
        console.log(JSON.stringify({ success: true, affectedRows: 1 }));
        return;
      }
    }

    console.log(JSON.stringify({ success: false, error: `Unsupported driver: ${driver}. Supported: sqlite, mysql, sqlserver, firebird.` }));
  } catch (err) {
    console.log(JSON.stringify({ success: false, error: err.message }));
  }
}

handleAction();
