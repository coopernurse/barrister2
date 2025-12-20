// LocalStorage wrapper for endpoint management

const STORAGE_KEY = 'barrister_endpoints';

export function getEndpoints() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return [];
        const endpoints = JSON.parse(data);
        return endpoints.sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed));
    } catch (e) {
        console.error('Failed to read endpoints from storage:', e);
        return [];
    }
}

export function saveEndpoint(url) {
    try {
        const endpoints = getEndpoints();
        const existingIndex = endpoints.findIndex(e => e.url === url);
        
        const endpoint = {
            url: url,
            lastUsed: new Date().toISOString()
        };
        
        if (existingIndex >= 0) {
            endpoints[existingIndex] = endpoint;
        } else {
            endpoints.push(endpoint);
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(endpoints));
        return true;
    } catch (e) {
        console.error('Failed to save endpoint to storage:', e);
        return false;
    }
}

export function removeEndpoint(url) {
    try {
        const endpoints = getEndpoints();
        const filtered = endpoints.filter(e => e.url !== url);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        return true;
    } catch (e) {
        console.error('Failed to remove endpoint from storage:', e);
        return false;
    }
}

