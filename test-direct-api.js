// Test diretto API senza server web
import dotenv from 'dotenv';
dotenv.config();

import registerHandler from './api/register.js';

console.log('🧪 TEST DIRETTO API REGISTRAZIONE');
console.log('===============================');

// Mock request
const mockReq = {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: {
    email: 'test-diretto@mentalcommons.it',
    password: 'test123',
    name: 'Test Diretto User'
  }
};

// Mock response
const mockRes = {
  setHeader: () => {},
  status: (code) => ({
    json: (data) => {
      console.log(`HTTP ${code}:`);
      console.log(JSON.stringify(data, null, 2));
      process.exit(data.success ? 0 : 1);
    }
  }),
  json: (data) => {
    console.log('HTTP 200:');
    console.log(JSON.stringify(data, null, 2));
    process.exit(data.success ? 0 : 1);
  }
};

// Esegui test
console.log('📤 Payload:', JSON.stringify(mockReq.body, null, 2));
console.log('🚀 Eseguendo...\n');

registerHandler(mockReq, mockRes); 