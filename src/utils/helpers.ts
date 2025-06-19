import { AZURE_FUNCTIONS_KEY, AZURE_FUNCTIONS_URL } from '../config/azureFunctionsConfig';

/**
 * Helper function to construct Azure Function URLs with authentication
 * @param path - The function endpoint path (e.g., '/api/admin-collections')
 * @returns Complete URL with authentication code parameter
 */
export const getFunctionUrl = (path: string): string => {
    const url = new URL(path, AZURE_FUNCTIONS_URL);
    url.searchParams.append('code', AZURE_FUNCTIONS_KEY);
    return url.toString();
};

/**
 * Generic API request helper with error handling
 * @param url - The complete URL to fetch
 * @param options - Fetch options
 * @returns Promise with parsed JSON response
 */
export const apiRequest = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
};
