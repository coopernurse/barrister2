// API client for Barrister RPC calls

const PROXY_URL = '/api/proxy';

/**
 * Discover IDL from an endpoint using barrister-idl method
 */
export async function discoverIDL(endpoint) {
    const request = {
        jsonrpc: '2.0',
        method: 'barrister-idl',
        id: 1
    };
    
    try {
        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Target-Endpoint': endpoint
            },
            body: JSON.stringify(request)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(`RPC error: ${data.error.message || 'Unknown error'}`);
        }
        
        if (!data.result) {
            throw new Error('No IDL result in response');
        }
        
        return data.result;
    } catch (error) {
        throw new Error(`Failed to discover IDL: ${error.message}`);
    }
}

/**
 * Make an RPC call to a method
 */
export async function callMethod(endpoint, interfaceName, methodName, params) {
    const method = `${interfaceName}.${methodName}`;
    const request = {
        jsonrpc: '2.0',
        method: method,
        params: params,
        id: Date.now() // Use timestamp as ID
    };
    
    try {
        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Target-Endpoint': endpoint
            },
            body: JSON.stringify(request)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        return data;
    } catch (error) {
        throw new Error(`RPC call failed: ${error.message}`);
    }
}

