import http from 'http';

const ports = [3000, 3001, 3002, 5000];

async function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, (res) => {
      resolve({ port, status: res.statusCode, ok: true });
    });
    req.on('error', (err) => {
      resolve({ port, ok: false, error: err.message });
    });
    req.setTimeout(2000, () => {
      req.destroy();
      resolve({ port, ok: false, error: 'TIMEOUT' });
    });
  });
}

async function run() {
  const results = await Promise.all(ports.map(checkPort));
  console.log(JSON.stringify(results, null, 2));
}

run();
