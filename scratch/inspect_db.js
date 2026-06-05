const url = 'https://cfeeqgokzkzblddefhxn.supabase.co/rest/v1/posts?select=*';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmZWVxZ29remt6YmxkZGVmaHhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTM1NTIsImV4cCI6MjA5NjA4OTU1Mn0.vzeLfLLeOajdsUaE__jvs_VoxzbvmX0j7p3GVAa26lI';

async function run() {
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    console.log('Status:', res.status);
    const json = await res.json();
    console.log('First post:', json[0]);
    
    // Also fetch the Swagger OpenAPI documentation of the schema
    const swaggerRes = await fetch('https://cfeeqgokzkzblddefhxn.supabase.co/rest/v1/', {
      headers: {
        'apikey': key
      }
    });
    const swagger = await swaggerRes.json();
    console.log('Swagger keys:', Object.keys(swagger));
    if (swagger.definitions) {
      console.log('Tables in schema:', Object.keys(swagger.definitions));
      console.log('Posts properties:', swagger.definitions.posts.properties);
    } else {
      console.log('Swagger response:', swagger);
    }
  } catch (err) {
    console.error(err);
  }
}

run();
