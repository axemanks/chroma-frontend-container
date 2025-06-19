import { apiRequest, getFunctionUrl } from '../utils/helpers';
import type {
    AdminStats,
    ApiResponse,
    Collection,
    Document,
    DocumentStats,
    FileUpload,
    PoisonQueueResponse,
    QueueListResponse,
    QueueStats,
    SearchQuery,
    SearchResult,
    UploadResult,
} from './models';

// Re-export types for convenience
export type {
    ChunkSearchResponse,
    Document,
    DocumentChunk,
    DocumentMetadata,
    DocumentStats,
    NormalizedSearchResult,
    PoisonQueueResponse,
    QueueListResponse,
    QueueStats,
    SearchResponse,
} from './models';

// Admin API functions
export const adminApi = {
    /**
     * Get all collections
     */
    getCollections: async (): Promise<Collection[]> => {
        const url = getFunctionUrl('/api/admin-collections');
        const response = await apiRequest<ApiResponse<Collection[]>>(url);
        return response.data || [];
    },

    /**
     * Get admin statistics (legacy - use getDocumentStats instead)
     */
    getStats: async (): Promise<AdminStats> => {
        const url = getFunctionUrl('/api/admin-performance');
        const response = await apiRequest<ApiResponse<AdminStats>>(url);
        return response.data!;
    },

    /**
     * Get document statistics for ChromaPage
     */
    getDocumentStats: async (tenant: string, days: number = 30): Promise<DocumentStats> => {
        const url = getFunctionUrl(`/api/admin-document-stats?tenant=${tenant}&days=${days}`);
        const response = await apiRequest<DocumentStats>(url);
        return response;
    },

    /**
     * Get queue statistics
     */
    getQueueStats: async (tenant: string): Promise<QueueStats> => {
        const url = getFunctionUrl(`/api/admin-queue-stats?tenant=${tenant}`);
        const response = await apiRequest<QueueStats>(url);
        return response;
    },

    /**
     * Get queue list with retry logic
     */
    getQueueList: async (tenant: string): Promise<QueueListResponse> => {
        const maxRetries = 3;
        const retryDelay = 1000;
        let retryCount = 0;

        const tryFetch = async (): Promise<QueueListResponse> => {
            try {
                const url = getFunctionUrl(`/document-queue-list?tenant=${tenant}`);
                const response = await fetch(url);

                if (response.status === 503 && retryCount < maxRetries) {
                    retryCount++;
                    await new Promise((resolve) => setTimeout(resolve, retryDelay));
                    return tryFetch();
                }

                if (!response.ok) {
                    throw new Error(`Failed to fetch queue list: ${response.status} ${response.statusText}`);
                }

                return await response.json();
            } catch (err) {
                if (retryCount >= maxRetries) {
                    throw err;
                }
                retryCount++;
                await new Promise((resolve) => setTimeout(resolve, retryDelay));
                return tryFetch();
            }
        };

        return tryFetch();
    },

    /**
     * Get documents with pagination
     */
    getDocuments: async (tenant: string, pageSize: number = 999): Promise<Document[]> => {
        let allItems: Document[] = [];
        let continuationToken: string | undefined = undefined;
        let first = true;

        do {
            const url = getFunctionUrl(
                `/api/admin-documents?tenant=${tenant}&pageSize=${pageSize}` +
                    (continuationToken ? `&continuationToken=${encodeURIComponent(continuationToken)}` : ''),
            );
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Failed to fetch documents');
            }

            const data = await response.json();
            const items =
                data.items && data.items.length > 0
                    ? data.items.map((doc: Document & { rowKey?: string }) => ({
                          ...doc,
                          documentId: doc.id || doc.documentId || doc.rowKey,
                      }))
                    : data.items || [];

            allItems = allItems.concat(items);
            continuationToken = data.continuationToken;

            // Defensive: break if no items and not first page (avoid infinite loop)
            if (!continuationToken || (items.length === 0 && !first)) break;
            first = false;
        } while (continuationToken);

        return allItems;
    },

    /**
     * Delete a collection
     */
    deleteCollection: async (database: string, collection: string): Promise<void> => {
        const url = getFunctionUrl('/file-delete');
        await apiRequest(url, {
            method: 'DELETE',
            body: JSON.stringify({
                type: 'collection',
                database,
                collection,
                tenant: 'blue-edge',
            }),
        });
    },

    /**
     * Delete a database
     */
    deleteDatabase: async (database: string): Promise<void> => {
        const url = getFunctionUrl('/file-delete');
        await apiRequest(url, {
            method: 'DELETE',
            body: JSON.stringify({
                type: 'database',
                database,
                tenant: 'blue-edge',
            }),
        });
    },
};

// Document API functions
export const documentApi = {
    /**
     * Search documents
     */
    search: async (query: SearchQuery): Promise<SearchResult[]> => {
        const url = getFunctionUrl('/api/document-search');
        const response = await apiRequest<ApiResponse<SearchResult[]>>(url, {
            method: 'POST',
            body: JSON.stringify(query),
        });
        return response.data || [];
    },

    /**
     * Enhanced search for ChromaPage with multiple search types
     */
    searchChroma: async (searchRequest: {
        tenant: string;
        database?: string;
        collection?: string;
        documentId?: string;
        fileName?: string;
        query?: string;
        tag?: string;
        label?: string;
        limit?: number;
    }): Promise<{
        success: boolean;
        results?: SearchResult[];
        chunks?: Array<{
            id: string;
            text: string;
            metadata?: Record<string, unknown>;
        }>;
        documentId?: string;
        totalChunks?: number;
        metadata?: Record<string, unknown>;
    }> => {
        const url = getFunctionUrl('/document-search');
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(searchRequest),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Search failed: ${response.status} - ${errorText}`);
        }

        return await response.json();
    },

    /**
     * Get document status
     */
    getStatus: async (documentId: string): Promise<Document> => {
        const url = getFunctionUrl(`/api/document-status?id=${encodeURIComponent(documentId)}`);
        const response = await apiRequest<ApiResponse<Document>>(url);
        return response.data!;
    },

    /**
     * Update document
     */
    update: async (documentId: string, updates: Partial<Document>): Promise<Document> => {
        const url = getFunctionUrl('/api/document-update');
        const response = await apiRequest<ApiResponse<Document>>(url, {
            method: 'POST',
            body: JSON.stringify({ id: documentId, ...updates }),
        });
        return response.data!;
    },

    /**
     * Update document with ChromaPage specific format
     */
    updateChroma: async (updateData: {
        documentId: string;
        tenant: string;
        database: string;
        collection: string;
        tags?: string[];
        labels?: string[];
        customMetadata?: Record<string, string>;
    }): Promise<{
        message?: string;
        success?: boolean;
        [key: string]: unknown;
    }> => {
        const url = getFunctionUrl('/document-update');
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Update failed: ${response.status} - ${errorText}`);
        }

        return await response.json();
    },

    /**
     * Delete a document
     */
    delete: async (documentId: string, tenant: string = 'blue-edge'): Promise<void> => {
        const url = getFunctionUrl('/file-delete');
        await apiRequest(url, {
            method: 'DELETE',
            body: JSON.stringify({
                documentId,
                tenant,
            }),
        });
    },

    /**
     * Get document chunks
     */
    getChunks: async (
        documentId: string,
        tenant: string,
        database: string,
        collection: string,
    ): Promise<{
        success: boolean;
        chunks?: Array<{
            id: string;
            text: string;
            metadata?: Record<string, unknown>;
        }>;
        documentId?: string;
        totalChunks?: number;
        metadata?: Record<string, unknown>;
    }> => {
        const maxRetries = 3;
        const retryDelay = 1000;
        let retryCount = 0;

        const tryFetch = async (): Promise<{
            success: boolean;
            chunks?: Array<{
                id: string;
                text: string;
                metadata?: Record<string, unknown>;
            }>;
            documentId?: string;
            totalChunks?: number;
            metadata?: Record<string, unknown>;
        }> => {
            const url = getFunctionUrl('/document-search');
            const searchRequest = {
                documentId: documentId,
                tenant: tenant,
                database: database,
                collection: collection,
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(searchRequest),
            });

            if (response.status === 500 || response.status === 503) {
                if (retryCount < maxRetries) {
                    retryCount++;
                    await new Promise((resolve) => setTimeout(resolve, retryDelay));
                    return tryFetch();
                }
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch chunks: ${response.status} - ${errorText}`);
            }

            return await response.json();
        };

        return tryFetch();
    },
};

// File API functions
export const fileApi = {
    /**
     * Upload file
     */
    upload: async (fileUpload: FileUpload): Promise<UploadResult> => {
        const formData = new FormData();
        formData.append('file', fileUpload.file);
        if (fileUpload.collection) {
            formData.append('collection', fileUpload.collection);
        }
        if (fileUpload.metadata) {
            formData.append('metadata', JSON.stringify(fileUpload.metadata));
        }

        const url = getFunctionUrl('/api/file-upload');
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        return result.data;
    },

    /**
     * Upload file with progress tracking for ChromaPage
     */
    uploadWithProgress: async (
        file: File,
        uploadData: {
            tenant: string;
            database: string;
            collection: string;
            tags?: string;
            labels?: string;
            customMetadata?: Record<string, string>;
            chunkStrategy?: string;
        },
        onProgress?: (percent: number) => void,
    ): Promise<void> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tenant', uploadData.tenant);
        formData.append('database', uploadData.database);
        formData.append('collection', uploadData.collection);

        if (uploadData.tags) formData.append('tags', uploadData.tags);
        if (uploadData.labels) formData.append('labels', uploadData.labels);
        if (uploadData.customMetadata && Object.keys(uploadData.customMetadata).length > 0) {
            formData.append('customMetadata', JSON.stringify(uploadData.customMetadata));
        }
        if (uploadData.chunkStrategy) formData.append('chunkStrategy', uploadData.chunkStrategy);

        return new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', getFunctionUrl('/file-upload'));

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable && onProgress) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    onProgress(percent);
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve();
                } else {
                    reject(new Error(`Upload failed for ${file.name}: ${xhr.statusText}`));
                }
            };

            xhr.onerror = () => {
                reject(new Error(`Upload failed for ${file.name}`));
            };

            xhr.send(formData);
        });
    },

    /**
     * Download file
     */
    download: async (fileId: string): Promise<Blob> => {
        const url = getFunctionUrl(`/api/file-download?id=${encodeURIComponent(fileId)}`);
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Download failed: ${response.status} ${response.statusText}`);
        }

        return response.blob();
    },

    /**
     * Delete file
     */
    delete: async (fileId: string): Promise<void> => {
        const url = getFunctionUrl('/api/file-delete');
        await apiRequest(url, {
            method: 'DELETE',
            body: JSON.stringify({ id: fileId }),
        });
    },
};

// Poison Queue API functions
export const poisonQueueApi = {
    /**
     * Get failed/poison queue items
     */
    getItems: async (maxDocuments: number = 10): Promise<PoisonQueueResponse> => {
        const url = getFunctionUrl('/api/failed-doc-recovery');
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: 'failed',
                tenant: 'blue-edge',
                maxDocuments,
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch poison queue: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    },

    /**
     * Retry a specific document
     */
    retryDocument: async (documentId: string): Promise<void> => {
        const url = getFunctionUrl('/poison-queue-retry');
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                documentId,
                tenant: 'blue-edge',
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to retry document: ${response.status} - ${errorText}`);
        }
    },

    /**
     * Recover failed items
     */
    recoverItems: async (): Promise<{ message: string }> => {
        const url = getFunctionUrl('/api/failed-doc-recovery');
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'recover',
                tenant: 'blue-edge',
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to recover items: ${response.status} - ${errorText}`);
        }

        return await response.json();
    },
};
