const assert = require('node:assert/strict');
const http = require('node:http');
const { after, before, test } = require('node:test');

const app = require('../src/app');

let server;
let baseUrl;

const request = (method, path) =>
  new Promise((resolve, reject) => {
    const req = http.request(`${baseUrl}${path}`, { method }, (res) => {
      let body = '';

      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          body,
          headers: res.headers,
          statusCode: res.statusCode
        });
      });
    });

    req.on('error', reject);
    req.end();
  });

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
});

test('GET /api/health returns HTTP 200', async () => {
  const response = await request('GET', '/api/health');

  assert.equal(response.statusCode, 200);
});

test('GET /api/health returns status ok', async () => {
  const response = await request('GET', '/api/health');

  assert.deepEqual(JSON.parse(response.body), { status: 'ok' });
});

test('HEAD /api/health returns HTTP 200', async () => {
  const response = await request('HEAD', '/api/health');

  assert.equal(response.statusCode, 200);
});

test('HEAD /api/health returns no response body', async () => {
  const response = await request('HEAD', '/api/health');

  assert.equal(response.body, '');
});
