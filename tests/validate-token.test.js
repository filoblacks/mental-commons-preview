import test from 'node:test';
import assert from 'node:assert';
import { createHmac } from 'node:crypto';

const TEST_SECRET = 'test-secret';
process.env.JWT_SECRET = TEST_SECRET;

function generateJWT(userId, email) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    userId,
    email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
  };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const data = `${headerB64}.${payloadB64}`;
  const signature = createHmac('sha256', TEST_SECRET)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

function verifyJWT(token) {
  try {
    const [headerB64, payloadB64, sig] = token.split('.');
    const data = `${headerB64}.${payloadB64}`;
    const expectedSig = createHmac('sha256', TEST_SECRET)
      .update(data)
      .digest('base64url');
    if (sig !== expectedSig) return null;
    return JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
  } catch {
    return null;
  }
}

function createMockRes() {
  return {
    statusCode: 0,
    headers: {},
    jsonBody: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, value) {
      this.headers[key] = value;
    },
    json(obj) {
      this.jsonBody = obj;
      return this;
    },
    end() {}
  };
}

test('validate-token success', async () => {
  const { default: handler } = await import('../api/validate-token.js');
  const token = generateJWT('1', 'user@example.com');
  const req = { method: 'POST', headers: {}, body: { token } };
  const res = createMockRes();
  await handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.jsonBody.valid, true);
});

test('validate-token failure', async () => {
  const { default: handler } = await import('../api/validate-token.js');
  const invalidToken = 'invalid.token.signature';
  const req = { method: 'POST', headers: {}, body: { token: invalidToken } };
  const res = createMockRes();
  await handler(req, res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.jsonBody.valid, false);
});
