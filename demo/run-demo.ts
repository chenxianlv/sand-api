/*
 * 推荐使用 `tsx --tsconfig demo/tsconfig.json demo/run-demo.ts` 运行该文件
 */
import http from 'node:http';

function readRawBody(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', chunk => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    req.on('error', reject);
  });
}

function parseJsonBody(raw: Buffer, contentType: string): Record<string, unknown> {
  if (raw.length === 0 || !contentType.includes('application/json')) {
    return {};
  }
  try {
    return JSON.parse(raw.toString('utf-8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function sendJson(res: http.ServerResponse, data: unknown, statusCode = 200) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  void (async () => {
    const method = req.method ?? 'GET';
    const url = new URL(req.url || '/', 'http://127.0.0.1:3001');
    const contentType = String(req.headers['content-type'] ?? '');
    const raw = await readRawBody(req);

    if (method === 'POST' && url.pathname.startsWith('/sampleService/query/')) {
      const body = parseJsonBody(raw, contentType);
      const sampleId = url.pathname.split('/').at(-1) ?? '';
      const sampleQuery = url.searchParams.get('sampleQuery') ?? '';
      const instanceName = String(req.headers['x-demo-instance'] ?? 'unknown');
      const fromCall = String(req.headers['x-from-call'] ?? '');
      return sendJson(res, {
        sampleResponse: `ok:${instanceName}:${sampleId}:${sampleQuery}:${String(body.sampleBody ?? '')}:${fromCall}`,
      });
    }

    if (method === 'POST' && url.pathname === '/sampleStorage/image') {
      res.statusCode = 200;
      res.end();
      return;
    }

    if (method === 'POST' && url.pathname === '/sampleService/form/submit') {
      res.statusCode = 200;
      res.end();
      return;
    }

    if (method === 'DELETE' && url.pathname === '/sampleService/user') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (method === 'POST' && url.pathname === '/sampleService/list') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (method === 'POST' && url.pathname === '/sampleService/user/register') {
      const body = parseJsonBody(raw, contentType);
      return sendJson(res, {
        receivedBody: body,
      });
    }

    res.statusCode = 404;
    res.end('Not Found');
  })().catch(error => {
    sendJson(
      res,
      {
        message: 'Mock server error',
        error: String(error),
      },
      500,
    );
  });
});

server.listen(3001, async () => {
  try {
    await import('./use');
  } finally {
    server.close();
  }
});
