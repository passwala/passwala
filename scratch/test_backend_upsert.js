const API_URL = 'http://localhost:3004';

async function testBackendUpsert() {
  const payload = {
    id: '4f8f065e-3f60-49c0-94c5-50cd50e40efa',
    city: 'Ahmedabad',
    area_name: 'Satellite',
    is_active: true
  };

  try {
    const response = await fetch(`${API_URL}/api/admin/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'service_areas', payload })
    });
    
    const text = await response.text();
    console.log("Response:", response.status, text);
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

testBackendUpsert();
