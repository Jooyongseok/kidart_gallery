// ============================================================
// KidArt Gallery — Proxy Server (No dependencies)
// ============================================================
// Usage: cd test && node server.js
// Open:  http://localhost:3000/story-test.html
// ============================================================
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

// 로컬 vLLM 서버로 프록시 (HTTP, Authorization 불필요)
function proxyToLocal(targetUrl, req, res) {
  let body = [];
  req.on('data', chunk => body.push(chunk));
  req.on('end', () => {
    const bodyBuf = Buffer.concat(body);
    const url = new URL(targetUrl);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        'Content-Length': bodyBuf.length,
      },
    };

    const proxy = http.request(options, (localRes) => {
      res.writeHead(localRes.statusCode, {
        'Content-Type': localRes.headers['content-type'] || 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      localRes.pipe(res);
    });
    proxy.on('error', (e) => {
      console.error('[local proxy error]', e.message);
      res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: 'vLLM 서버 연결 실패: ' + e.message + ' (run-vllm.sh 실행 확인)' }));
    });
    proxy.write(bodyBuf);
    proxy.end();
  });
}

// HuggingFace API로 프록시 (HTTPS, 이미지 생성용)
function proxyToHF(targetUrl, req, res) {
  let body = [];
  req.on('data', chunk => body.push(chunk));
  req.on('end', () => {
    const bodyBuf = Buffer.concat(body);
    const url = new URL(targetUrl);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        'Content-Length': bodyBuf.length,
      },
    };
    if (req.headers['authorization']) {
      options.headers['Authorization'] = req.headers['authorization'];
    }

    const proxy = https.request(options, (hfRes) => {
      res.writeHead(hfRes.statusCode, {
        'Content-Type': hfRes.headers['content-type'] || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
      });
      hfRes.pipe(res);
    });
    proxy.on('error', (e) => {
      console.error('[proxy error]', e.message);
      res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: 'Proxy error: ' + e.message }));
    });
    proxy.write(bodyBuf);
    proxy.end();
  });
}

const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    });
    return res.end();
  }

  // Proxy: VLM chat completions → 로컬 vLLM 서버
  if (req.method === 'POST' && req.url === '/api/hf-chat') {
    return proxyToLocal('http://localhost:8100/v1/chat/completions', req, res);
  }

  // Proxy: Image generation → 로컬 SDXL Turbo (img-server.py, 포트 8101)
  if (req.method === 'POST' && req.url === '/api/img-gen') {
    return proxyToLocal('http://localhost:8101/', req, res);
  }

  // Static file serving
  let filePath = path.join(__dirname, req.url === '/' ? 'story-test.html' : req.url.split('?')[0]);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not Found');
    }
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n  🎨 KidArt Gallery 테스트 서버`);
  console.log(`  ➜ http://localhost:${PORT}/story-test.html\n`);
});
