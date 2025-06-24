// ================================================================
// MENTAL COMMONS - SECURITY PENETRATION TEST
// ================================================================
// Versione: 1.0.0 - SECURITY HARDENING SPRINT 2 - COMPLETO
// Descrizione: Test di penetrazione per verificare le misure di sicurezza

const axios = require('axios');
const { validatePassword } = require('./password-policy.js');
const { validateAndSanitize, registerSchema } = require('./validation.js');
const { debug, info, warn, error } = require('../logger.js');

// ================================================================
// CONFIGURAZIONE TEST
// ================================================================

const TEST_CONFIG = {
  baseUrl: process.env.NODE_ENV === 'production' 
    ? 'https://mental-commons.vercel.app/api' 
    : 'http://localhost:3000/api',
  
  timeout: 10000,
  retries: 3
};

const SECURITY_TESTS = {
  passed: 0,
  failed: 0,
  results: []
};

// ================================================================
// UTILITÀ TEST
// ================================================================

function logTestResult(testName, passed, details) {
  const result = {
    test: testName,
    passed: passed,
    timestamp: new Date().toISOString(),
    details: details
  };
  
  SECURITY_TESTS.results.push(result);
  
  if (passed) {
    SECURITY_TESTS.passed++;
    info(`✅ PASS: ${testName}`);
  } else {
    SECURITY_TESTS.failed++;
    error(`❌ FAIL: ${testName} - ${details}`);
  }
}

async function makeRequest(method, endpoint, data = {}, headers = {}) {
  try {
    const response = await axios({
      method,
      url: `${TEST_CONFIG.baseUrl}${endpoint}`,
      data,
      headers,
      timeout: TEST_CONFIG.timeout,
      validateStatus: () => true // Non lanciare errori per status codes
    });
    
    return response;
  } catch (err) {
    return {
      status: 500,
      data: { error: err.message }
    };
  }
}

// ================================================================
// TEST PASSWORD POLICY
// ================================================================

async function testPasswordPolicy() {
  info('🔐 Testing Password Policy...');
  
  const weakPasswords = [
    'password',
    '123456',
    'qwerty',
    'abc123',
    'short',
    'NoSpecialChars123',
    'NOLOWERCASE123!',
    'nouppercase123!',
    'NoNumbers!@#',
    'aaaaaaaaaaa1A!',  // Caratteri consecutivi
  ];
  
  const strongPassword = 'SecureP@ssw0rd2024!';
  
  // Test password deboli
  for (const weakPassword of weakPasswords) {
    const result = await validatePassword(weakPassword);
    const passed = !result.valid;
    logTestResult(`Password Policy - Weak password rejected: ${weakPassword.substring(0, 10)}...`, passed, 
      passed ? 'Correctly rejected' : `Incorrectly accepted with score ${result.score}%`);
  }
  
  // Test password forte
  const strongResult = await validatePassword(strongPassword);
  logTestResult('Password Policy - Strong password accepted', strongResult.valid, 
    strongResult.valid ? `Accepted with score ${strongResult.score}%` : 'Strong password incorrectly rejected');
  
  // Test HaveIBeenPwned (se disponibile)
  try {
    const breachResult = await validatePassword('password123');
    const passed = !breachResult.valid;
    logTestResult('Password Policy - Breach detection', passed, 
      passed ? 'Compromised password correctly detected' : 'Breach detection not working');
  } catch (err) {
    logTestResult('Password Policy - Breach detection', false, `Error: ${err.message}`);
  }
}

// ================================================================
// TEST INPUT VALIDATION
// ================================================================

async function testInputValidation() {
  info('🛡️ Testing Input Validation...');
  
  const maliciousInputs = [
    // XSS
    '<script>alert("xss")</script>',
    'javascript:alert("xss")',
    '<iframe src="evil.com"></iframe>',
    
    // SQL Injection
    "'; DROP TABLE users; --",
    "' OR 1=1 --",
    "UNION SELECT * FROM users",
    
    // Command Injection
    '; rm -rf /',
    '| cat /etc/passwd',
    '`whoami`',
    
    // Path Traversal
    '../../../etc/passwd',
    '..\\..\\windows\\system32',
    
    // NoSQL Injection
    '{"$ne": null}',
    '{"$gt": ""}',
  ];
  
  // Test registrazione con input malevoli
  for (const maliciousInput of maliciousInputs) {
    const testData = {
      email: `test${Math.random()}@example.com`,
      password: 'ValidPassword123!',
      name: maliciousInput,
      surname: 'Test'
    };
    
    const response = await makeRequest('POST', '/register', testData);
    const passed = response.status === 400;
    
    logTestResult(`Input Validation - Malicious input rejected: ${maliciousInput.substring(0, 20)}...`, 
      passed, passed ? 'Correctly rejected' : `Status: ${response.status}`);
  }
  
  // Test validazione email
  const invalidEmails = [
    'invalid-email',
    '@domain.com',
    'test@',
    'test..test@domain.com',
    'test@domain',
    'test@.com'
  ];
  
  for (const invalidEmail of invalidEmails) {
    const testData = {
      email: invalidEmail,
      password: 'ValidPassword123!',
      name: 'Test',
      surname: 'User'
    };
    
    const response = await makeRequest('POST', '/register', testData);
    const passed = response.status === 400;
    
    logTestResult(`Input Validation - Invalid email rejected: ${invalidEmail}`, 
      passed, passed ? 'Correctly rejected' : `Status: ${response.status}`);
  }
}

// ================================================================
// TEST SESSION MANAGEMENT
// ================================================================

async function testSessionManagement() {
  info('🍪 Testing Session Management...');
  
  // Test registrazione per ottenere un token valido
  const testUser = {
    email: `testuser${Date.now()}@example.com`,
    password: 'SecureP@ssw0rd2024!',
    name: 'Test',
    surname: 'User'
  };
  
  const registerResponse = await makeRequest('POST', '/register', testUser);
  
  if (registerResponse.status !== 201) {
    logTestResult('Session Management - User registration', false, 
      `Failed to register test user: ${registerResponse.status}`);
    return;
  }
  
  logTestResult('Session Management - User registration', true, 'Test user registered successfully');
  
  // Test login e ottenimento cookie sicuro
  const loginResponse = await makeRequest('POST', '/login', {
    email: testUser.email,
    password: testUser.password
  });
  
  const loginPassed = loginResponse.status === 200;
  logTestResult('Session Management - Login successful', loginPassed, 
    loginPassed ? 'Login successful' : `Login failed: ${loginResponse.status}`);
  
  if (!loginPassed) return;
  
  // Verifica header di sicurezza
  const securityHeaders = {
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'deny',
    'x-xss-protection': '1; mode=block',
    'referrer-policy': 'strict-origin-when-cross-origin'
  };
  
  for (const [header, expectedValue] of Object.entries(securityHeaders)) {
    const actualValue = loginResponse.headers[header];
    const passed = actualValue && actualValue.toLowerCase() === expectedValue.toLowerCase();
    
    logTestResult(`Session Management - Security header: ${header}`, passed, 
      passed ? 'Header present and correct' : `Expected: ${expectedValue}, Got: ${actualValue}`);
  }
  
  // Test token non valido
  const invalidTokenResponse = await makeRequest('GET', '/ucmes', {}, {
    'Authorization': 'Bearer invalid-token-here'
  });
  
  const invalidTokenPassed = invalidTokenResponse.status === 401;
  logTestResult('Session Management - Invalid token rejected', invalidTokenPassed, 
    invalidTokenPassed ? 'Invalid token correctly rejected' : 'Invalid token accepted');
  
  // Test richiesta senza token
  const noTokenResponse = await makeRequest('GET', '/ucmes');
  const noTokenPassed = noTokenResponse.status === 401;
  
  logTestResult('Session Management - No token rejected', noTokenPassed, 
    noTokenPassed ? 'Request without token correctly rejected' : 'Request without token accepted');
}

// ================================================================
// TEST ERROR HANDLING
// ================================================================

async function testErrorHandling() {
  info('⚠️ Testing Error Handling...');
  
  // Test errore 404
  const notFoundResponse = await makeRequest('GET', '/nonexistent-endpoint');
  const notFoundPassed = notFoundResponse.status === 404;
  
  logTestResult('Error Handling - 404 for non-existent endpoint', notFoundPassed, 
    notFoundPassed ? 'Correct 404 response' : `Got status: ${notFoundResponse.status}`);
  
  // Test errore 405 per metodo non consentito
  const methodResponse = await makeRequest('DELETE', '/register');
  const methodPassed = methodResponse.status === 405;
  
  logTestResult('Error Handling - 405 for wrong method', methodPassed, 
    methodPassed ? 'Correct 405 response' : `Got status: ${methodResponse.status}`);
  
  // Verifica formato standardizzato delle risposte di errore
  const errorResponse = await makeRequest('POST', '/register', {});
  
  if (errorResponse.status >= 400) {
    const hasStandardFormat = 
      errorResponse.data.success === false &&
      errorResponse.data.error &&
      errorResponse.data.error.message &&
      errorResponse.data.error.code &&
      errorResponse.data.error.timestamp;
    
    logTestResult('Error Handling - Standardized error format', hasStandardFormat, 
      hasStandardFormat ? 'Error format is standardized' : 'Error format not standardized');
    
    // Verifica che non ci siano stack trace in produzione
    const hasStackTrace = errorResponse.data.error.stack;
    const noStackInProd = process.env.NODE_ENV !== 'production' || !hasStackTrace;
    
    logTestResult('Error Handling - No stack trace in production', noStackInProd, 
      noStackInProd ? 'No stack trace leaked' : 'Stack trace leaked in production');
  }
}

// ================================================================
// TEST RATE LIMITING
// ================================================================

async function testRateLimit() {
  info('🚦 Testing Rate Limiting...');
  
  const testEmail = `ratetest${Date.now()}@example.com`;
  let rateLimitHit = false;
  
  // Invia molte richieste rapidamente
  for (let i = 0; i < 20; i++) {
    const response = await makeRequest('POST', '/register', {
      email: `${testEmail}${i}`,
      password: 'test',
      name: 'Test',
      surname: 'User'
    });
    
    if (response.status === 429) {
      rateLimitHit = true;
      break;
    }
    
    // Piccola pausa per evitare sovraccarico
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  logTestResult('Rate Limiting - Rate limit enforced', rateLimitHit, 
    rateLimitHit ? 'Rate limit correctly triggered' : 'Rate limit not triggered');
}

// ================================================================
// FUNZIONE PRINCIPALE TEST
// ================================================================

async function runSecurityTests() {
  info('🔒 ============================================');
  info('🔒 SECURITY PENETRATION TEST STARTING');
  info('🔒 ============================================');
  
  const startTime = Date.now();
  
  try {
    // Esegui tutti i test
    await testPasswordPolicy();
    await testInputValidation();
    await testSessionManagement();
    await testErrorHandling();
    await testRateLimit();
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // Calcola risultati finali
    const totalTests = SECURITY_TESTS.passed + SECURITY_TESTS.failed;
    const successRate = totalTests > 0 ? (SECURITY_TESTS.passed / totalTests * 100).toFixed(2) : 0;
    
    info('🔒 ============================================');
    info('🔒 SECURITY PENETRATION TEST COMPLETED');
    info('🔒 ============================================');
    info(`📊 Total Tests: ${totalTests}`);
    info(`✅ Passed: ${SECURITY_TESTS.passed}`);
    info(`❌ Failed: ${SECURITY_TESTS.failed}`);
    info(`📈 Success Rate: ${successRate}%`);
    info(`⏱️ Duration: ${duration}s`);
    
    if (SECURITY_TESTS.failed === 0) {
      info('🎉 ALL SECURITY TESTS PASSED! System is secure.');
    } else {
      warn(`⚠️ ${SECURITY_TESTS.failed} security tests failed. Review required.`);
    }
    
    return {
      success: SECURITY_TESTS.failed === 0,
      results: SECURITY_TESTS.results,
      summary: {
        total: totalTests,
        passed: SECURITY_TESTS.passed,
        failed: SECURITY_TESTS.failed,
        successRate: parseFloat(successRate),
        duration: duration
      }
    };
    
  } catch (err) {
    error('❌ Security test execution failed:', err);
    return {
      success: false,
      error: err.message
    };
  }
}

// ================================================================
// EXPORT
// ================================================================

module.exports = {
  runSecurityTests,
  testPasswordPolicy,
  testInputValidation,
  testSessionManagement,
  testErrorHandling,
  testRateLimit
}; 