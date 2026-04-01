/**
 * MD Editor (Legacy) API Service
 * Centralized network request handler for backend (port 3001)
 */

const ApiService = (function () {
    const getBaseUrl = () => {
        const host = window.CONFIG?.HOST || window.location.hostname;
        const port = window.CONFIG?.PORTS?.UPLOAD || 3001;
        return `http://${host}:${port}`;
    };

    const request = async (endpoint, options = {}) => {
        const url = endpoint.startsWith('http') ? endpoint : `${getBaseUrl()}${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Accept': 'application/json',
            }
        };

        // Handle JSON body automatically
        if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
            options.headers = {
                ...options.headers,
                'Content-Type': 'application/json'
            };
            options.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP Error: ${response.status}`);
            }

            // For downloads or non-json, use blob/text if needed, but current API is primarily JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            return response;
        } catch (error) {
            console.error(`[ApiService Error] ${endpoint}:`, error);
            throw error;
        }
    };

    return {
        // GET MD file content
        getMd: (filename) => {
            const originalDir = window.CONFIG?.ORIGINAL_DIR || './';
            return request(`/get_md?filename=${encodeURIComponent(filename)}&directory=${encodeURIComponent(originalDir)}`);
        },

        // SAVE MD file
        saveMd: (data) => request('/save_md', {
            method: 'POST',
            body: data
        }),

        // UPLOAD Images/Videos
        uploadImage: (formData) => request('/upload_image', {
            method: 'POST',
            body: formData
        }),

        // List directory tree
        getDirectoryTree: (directory) => request(`/directory-tree?directory=${encodeURIComponent(directory)}`),

        // CREATE Folder
        createFolder: (formData) => request('/create_folder', {
            method: 'POST',
            body: formData
        }),

        // CLEAN HEXO Cache
        cleanHexo: () => request('/clean_hexo', {
            method: 'POST',
            body: new FormData() // Backend expects multipart for some reason in old logic
        }),

        // DOWNLOAD TGZ (Legacy feature)
        tgzDownload: (data) => request('/tgz_download', {
            method: 'POST',
            body: data
        }),

        // CHECK if file exists
        checkFileExists: (filename) => request('/api/check-file', {
            method: 'POST',
            body: { filename }
        }),

        // CUSTOM Request (for unexpected cases)
        custom: request
    };
})();

// Re-export globally for legacy scripts
window.apiService = ApiService;
