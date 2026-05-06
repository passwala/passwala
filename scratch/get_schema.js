import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const anonKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

async function getSchema() {
  console.log("Fetching PostgREST OpenAPI schema...");
  try {
    const response = await fetch(`${url}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch schema: ${response.status} ${response.statusText}`);
    }

    const schema = await response.json();
    console.log("Tables found in schema:", Object.keys(schema.definitions));
    
    // Print service_providers definition
    if (schema.definitions.service_providers) {
      console.log("\n--- Columns in service_providers ---");
      const props = schema.definitions.service_providers.properties;
      Object.keys(props).forEach(p => {
        console.log(`  ${p}: ${props[p].type} (${props[p].format || 'no format'})`);
      });
    } else {
      console.log("\nservice_providers definition not found!");
    }

    // Print vendors definition
    if (schema.definitions.vendors) {
      console.log("\n--- Columns in vendors ---");
      const props = schema.definitions.vendors.properties;
      Object.keys(props).forEach(p => {
        console.log(`  ${p}: ${props[p].type} (${props[p].format || 'no format'})`);
      });
    } else {
      console.log("\nvendors definition not found!");
    }

  } catch (error) {
    console.error("Error getting schema:", error);
  }
}

getSchema();
