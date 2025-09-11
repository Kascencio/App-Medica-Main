#!/usr/bin/env node

const http = require('http');

console.log('🧪 PROBANDO LOGS DE DEBUG DEL PROXY...\n');

function testEndpoint(method, path, description, body = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      
      res.on('end', () => {
        const status = res.statusCode;
        let result;
        
        if (status === 200 || status === 201) {
          result = '✅ EXITOSO';
        } else if (status === 401) {
          result = '🔒 AUTORIZACIÓN REQUERIDA';
        } else if (status === 400) {
          result = '⚠️ BAD REQUEST';
        } else if (status === 404) {
          result = '❌ NO ENCONTRADO';
        } else if (status === 500) {
          result = '💥 ERROR DEL SERVIDOR';
        } else {
          result = `📊 STATUS ${status}`;
        }
        
        resolve({ method, path, description, status, result, response: data.substring(0, 150) });
      });
    });

    req.on('error', (error) => {
      resolve({ method, path, description, status: 'ERROR', result: '❌ ERROR DE CONEXIÓN', response: error.message });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function runTests() {
  const endpoints = [
    // Probar con patientProfileId como string (debería mostrar el tipo en logs)
    { 
      method: 'POST', 
      path: '/api/medications', 
      description: 'Crear medicamento con patientProfileId como string',
      body: { 
        patientProfileId: 'cmff28z53000bjxvg0z4smal1', // string
        name: 'Paracetamol',
        dosage: '500mg',
        type: 'Oral',
        frequency: 'daily',
        startDate: '2024-01-01T00:00:00.000Z'
      }
    },
    // Probar con patientProfileId como número (debería mostrar el tipo en logs)
    { 
      method: 'POST', 
      path: '/api/medications', 
      description: 'Crear medicamento con patientProfileId como número',
      body: { 
        patientProfileId: 1, // número
        name: 'Ibuprofeno',
        dosage: '400mg',
        type: 'Oral',
        frequency: 'twice daily',
        startDate: '2024-01-01T00:00:00.000Z'
      }
    },
    // Probar PATCH con body vacío (debería mostrar logs de body vacío)
    { 
      method: 'PATCH', 
      path: '/api/notifications/1/read', 
      description: 'PATCH con body vacío (debería mostrar logs de debug)'
    },
    // Probar GET sin body (debería mostrar logs básicos)
    { 
      method: 'GET', 
      path: '/api/medications', 
      description: 'GET sin body (debería mostrar logs básicos)'
    }
  ];

  console.log('📍 Probando logs de debug del proxy...\n');
  console.log('🔍 Revisa los logs del servidor para ver:');
  console.log('   - [PROXY] Body content: ...');
  console.log('   - [PROXY] patientProfileId type: ...');
  console.log('   - [PROXY] patientProfileId value: ...');
  console.log('   - [PROXY] Sending body: ...');
  console.log('');
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint.method, endpoint.path, endpoint.description, endpoint.body);
    
    console.log(`${result.result} ${endpoint.method} ${endpoint.path}`);
    console.log(`   📝 ${endpoint.description}`);
    console.log(`   📊 Status: ${result.status}`);
    if (result.response) {
      console.log(`   📄 Respuesta: ${result.response}`);
    }
    console.log('');
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('🎯 Pruebas completadas!');
  console.log('\n📋 LOGS ESPERADOS EN EL SERVIDOR:');
  console.log('✅ [PROXY] POST medications -> http://72.60.30.129:3001/api/medications');
  console.log('✅ [PROXY] Body length: XXX chars');
  console.log('✅ [PROXY] Body content: {"patientProfileId":"cmff28z53000bjxvg0z4smal1",...}');
  console.log('✅ [PROXY] patientProfileId type: string');
  console.log('✅ [PROXY] patientProfileId value: cmff28z53000bjxvg0z4smal1');
  console.log('✅ [PROXY] Sending body: {"patientProfileId":"cmff28z53000bjxvg0z4smal1",...}');
  console.log('✅ [PROXY] Response status: 400 Bad Request');
}

runTests().catch(console.error);
