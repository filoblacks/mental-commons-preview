// ================================================================
// MENTAL COMMONS - SECURITY AUDIT ENDPOINT
// ================================================================
// Versione: 3.0.0 - SECURITY HARDENING SPRINT 2 - COMPLETO
// Descrizione: Endpoint per eseguire audit di sicurezza completo

const { runSecurityTests } = require('./security-test.js');
const { 
  createSuccessResponse,
  createErrorResponse,
  asyncErrorHandler,
  correlationMiddleware,
  ValidationError
} = require('./error-handler.js');
const { debug, info, warn, error } = require('../logger.js');

export default asyncErrorHandler(async function handler(req, res) {
  // ================================================================
  // SECURITY HEADERS E CORS
  // ================================================================
  
  res.setHeader('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' ? 'https://mental-commons.vercel.app' : '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (req.method === 'OPTIONS') {
    debug('📝 CORS OPTIONS response sent');
    return res.status(200).end();
  }
  
  // ================================================================
  // METODO VALIDATION
  // ================================================================
  
  if (req.method !== 'GET') {
    throw new ValidationError(
      'Metodo non consentito. Utilizzare GET.',
      'METHOD_NOT_ALLOWED',
      { receivedMethod: req.method, expectedMethod: 'GET' }
    );
  }
  
  // ================================================================
  // CORRELATION ID E LOGGING
  // ================================================================
  
  correlationMiddleware(req, res, () => {});
  
  debug('🔒 ============================================');
  debug('🔒 SECURITY AUDIT ENDPOINT v3.0');
  debug('🔒 ============================================');
  debug('🔒 Correlation ID:', req.correlationId);
  debug('🔒 Timestamp:', new Date().toISOString());
  debug('🔒 Environment:', process.env.NODE_ENV);
  
  // ================================================================
  // RESTRIZIONI AMBIENTE
  // ================================================================
  
  // In produzione, limita l'accesso al security audit
  if (process.env.NODE_ENV === 'production') {
    const adminKey = req.query.admin_key;
    const expectedKey = process.env.ADMIN_SECURITY_KEY;
    
    if (!adminKey || !expectedKey || adminKey !== expectedKey) {
      warn('🚨 Unauthorized security audit attempt in production');
      throw new ValidationError(
        'Accesso non autorizzato',
        'UNAUTHORIZED_ACCESS',
        { environment: 'production' }
      );
    }
  }
  
  // ================================================================
  // ESECUZIONE SECURITY AUDIT
  // ================================================================
  
  info('🔍 Starting comprehensive security audit...');
  
  const auditStartTime = Date.now();
  const testResults = await runSecurityTests();
  const auditEndTime = Date.now();
  const totalDuration = (auditEndTime - auditStartTime) / 1000;
  
  // ================================================================
  // ANALISI RISULTATI E RACCOMANDAZIONI
  // ================================================================
  
  const recommendations = [];
  const criticalIssues = [];
  
  if (testResults.success) {
    recommendations.push('✅ Tutti i test di sicurezza sono passati');
    recommendations.push('🔒 Sistema conforme agli standard di sicurezza');
    recommendations.push('📊 Mantenere monitoraggio continuo');
  } else {
    for (const result of testResults.results) {
      if (!result.passed) {
        if (result.test.includes('Password Policy') || 
            result.test.includes('Input Validation') ||
            result.test.includes('Session Management')) {
          criticalIssues.push({
            test: result.test,
            severity: 'CRITICAL',
            details: result.details,
            timestamp: result.timestamp
          });
        }
        
        recommendations.push(`❌ ${result.test}: ${result.details}`);
      }
    }
    
    if (criticalIssues.length > 0) {
      recommendations.push('🚨 ATTENZIONE: Rilevati problemi di sicurezza critici');
      recommendations.push('🔧 Intervento immediato richiesto');
    }
  }
  
  // ================================================================
  // COMPLIANCE REPORT
  // ================================================================
  
  const complianceReport = {
    OWASP_Top10: {
      'A01_Broken_Access_Control': testResults.results.some(r => r.test.includes('Session Management') && r.passed) ? 'COMPLIANT' : 'NON_COMPLIANT',
      'A02_Cryptographic_Failures': testResults.results.some(r => r.test.includes('Password Policy') && r.passed) ? 'COMPLIANT' : 'NON_COMPLIANT',
      'A03_Injection': testResults.results.some(r => r.test.includes('Input Validation') && r.passed) ? 'COMPLIANT' : 'NON_COMPLIANT',
      'A05_Security_Misconfiguration': testResults.results.some(r => r.test.includes('Error Handling') && r.passed) ? 'COMPLIANT' : 'NON_COMPLIANT'
    },
    ISO27001: {
      'Access_Management': testResults.results.some(r => r.test.includes('Session Management') && r.passed) ? 'COMPLIANT' : 'NON_COMPLIANT',
      'Cryptography': testResults.results.some(r => r.test.includes('Password Policy') && r.passed) ? 'COMPLIANT' : 'NON_COMPLIANT',
      'System_Security': testResults.results.some(r => r.test.includes('Rate Limiting') && r.passed) ? 'COMPLIANT' : 'NON_COMPLIANT'
    }
  };
  
  // ================================================================
  // SECURITY SCORE CALCULATION
  // ================================================================
  
  const securityScore = testResults.summary ? testResults.summary.successRate : 0;
  let securityGrade = 'F';
  
  if (securityScore >= 95) securityGrade = 'A+';
  else if (securityScore >= 90) securityGrade = 'A';
  else if (securityScore >= 85) securityGrade = 'B+';
  else if (securityScore >= 80) securityGrade = 'B';
  else if (securityScore >= 75) securityGrade = 'C+';
  else if (securityScore >= 70) securityGrade = 'C';
  else if (securityScore >= 60) securityGrade = 'D';
  
  // ================================================================
  // RISPOSTA COMPLETA
  // ================================================================
  
  const responseData = createSuccessResponse(
    {
      auditResults: {
        status: testResults.success ? 'PASSED' : 'FAILED',
        securityScore: securityScore,
        securityGrade: securityGrade,
        summary: testResults.summary,
        testResults: testResults.results,
        criticalIssues: criticalIssues,
        recommendations: recommendations,
        complianceReport: complianceReport
      },
      systemInfo: {
        environment: process.env.NODE_ENV,
        auditTimestamp: new Date().toISOString(),
        auditDuration: totalDuration,
        correlationId: req.correlationId
      },
      securityHardening: {
        version: '3.0.0',
        sprintCompleted: 'SPRINT_2_SECURITY_HARDENING',
        featuresImplemented: [
          'Advanced Password Policy with HaveIBeenPwned',
          'Complete Input Validation and Sanitization',
          'Secure Session Management',
          'Uniform Error Handling'
        ],
        securityLevel: securityScore >= 90 ? 'HIGH' : securityScore >= 70 ? 'MEDIUM' : 'LOW'
      }
    },
    testResults.success ? 'Security audit completato con successo' : 'Security audit completato con avvisi',
    {
      correlationId: req.correlationId,
      auditType: 'comprehensive',
      securityHardeningComplete: testResults.success
    }
  );
  
  info(`🔒 Security audit completed - Score: ${securityScore}% (${securityGrade})`);
  info(`📊 Tests: ${testResults.summary?.total || 0} - Passed: ${testResults.summary?.passed || 0} - Failed: ${testResults.summary?.failed || 0}`);
  
  if (testResults.success) {
    info('🎉 ALL SECURITY REQUIREMENTS MET! SPRINT 2 COMPLETE!');
  } else {
    warn(`⚠️ Security issues detected: ${criticalIssues.length} critical`);
  }
  
  return res.status(testResults.success ? 200 : 206).json(responseData);
});

// ================================================================
// EXPORT CON MIDDLEWARE DI SICUREZZA
// ================================================================

// Il gestore degli errori viene applicato automaticamente da asyncErrorHandler 