const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function test() {
  try {
    const res = await fetch('http://localhost:3004/api/events/search?category=All&query=&page=1&pageSize=12&showType=all', {
      headers: {
        'Origin': 'http://localhost:3001'
      }
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Success:', data.success);
    console.log('Events Count:', data.events?.length);
  } catch (err) {
    console.error('Fetch Error:', err);
  }
}

test();
