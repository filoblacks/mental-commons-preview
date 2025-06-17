// ================================================================
// SERVER SVILUPPO - MENTAL COMMONS
// ================================================================
// Server Node.js semplice per testare le API senza Vercel

// ⚠️ IMPORTANTE: CARICA VARIABILI D'AMBIENTE PRIMA DI TUTTI GLI IMPORT
import dotenv from 'dotenv';
dotenv.config();

// Verifica che le variabili siano caricate PRIMA degli import
console.log('🔧 ENV CHECK - URL:', process.env.SUPABASE_URL ? '✅ PRESENTE' : '❌ MANCANTE');
console.log('🔧 ENV CHECK - KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ PRESENTE' : '❌ MANCANTE');

import { createServer } from 'http';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import delle API (DOPO che le env sono caricate)
import registerHandler from './api/register.js';
import loginHandler from './api/login.js';
import ucmeHandler from './api/ucme.js';
import pingHandler from './api/ping.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 3000;

// Simulatore di req/res per le API Vercel
function createApiContext(req, res, handler) {
  // Crea un adattatore per emulare l'API di Vercel
  const vercelRes = {
    status: (code) => {
      res.statusCode = code;
      return vercelRes;
    },
    json: (data) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    },
    end: (data) => {
      res.end(data);
    },
    setHeader: (key, value) => {
      res.setHeader(key, value);
    }
  };
  
  // Parse del body per POST requests
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        req.body = body ? JSON.parse(body) : {};
      } catch {
        req.body = {};
      }
      handler(req, vercelRes);
    });
  } else {
    req.body = {};
    handler(req, vercelRes);
  }
}

const server = createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Route API
  if (req.url === '/api/register') {
    createApiContext(req, res, registerHandler);
  } else if (req.url === '/api/login') {
    createApiContext(req, res, loginHandler);
  } else if (req.url === '/api/ucme') {
    createApiContext(req, res, ucmeHandler);
  } else if (req.url === '/api/ping') {
    createApiContext(req, res, pingHandler);
  } else if (req.url === '/') {
    // Serve test page
    try {
      const testPage = readFileSync(join(__dirname, 'test-rls-validation.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(testPage);
    } catch (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Test page not found');
    }
  } else if (req.url === '/debug') {
    // Serve debug page
    try {
      const debugPage = readFileSync(join(__dirname, 'test-debug-api-calls.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(debugPage);
    } catch (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Debug page not found');
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log('🚀 ================================');
  console.log('🚀 MENTAL COMMONS DEV SERVER');
  console.log('🚀 ================================');
  console.log(`🌐 Server running on: http://localhost:${PORT}`);
  console.log(`🔧 Test page: http://localhost:${PORT}/`);
  console.log(`🔍 Debug page: http://localhost:${PORT}/debug`);
  console.log(`📡 API endpoints:`);
  console.log(`   - POST /api/register`);
  console.log(`   - POST /api/login`);
  console.log(`   - POST /api/ucme`);
  console.log(`   - GET  /api/ping`);
  console.log('🚀 ================================');
});

// Gestione graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping server...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
}); 