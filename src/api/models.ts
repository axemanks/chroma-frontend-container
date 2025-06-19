// API Response Types
export interface ApiResponse<T = unknown> {
    data?: T;
    message?: string;
    success: boolean;
}

// Error Response Type
export interface ApiError {
    message: string;
    status: number;
    code?: string;
}

// Collection Types (based on your Chroma collections)
export interface Collection {
    id: string;
    name: string;
    metadata?: Record<string, unknown>;
    documents?: Document[];
}

// Enhanced metadata interface for better type safety
export interface DocumentMetadata {
    fileName?: string;
    documentId?: string;
    chunkIndex?: number;
    segmentIndex?: number;
    timestamp?: string | number | Date;
    tags?: string | string[];
    labels?: string | string[];
    [key: string]: unknown;
}

// Document Types - Updated to match ChromaPage expectations
export interface Document {
    documentId?: string;
    id?: string;
    _id?: string;
    rowKey?: string;
    fileName: string;
    content?: string;
    status: string;
    uploadTimestamp: string;
    processingTimestamp?: string;
    completionTimestamp?: string;
    collection: string;
    database: string;
    tenant: string;
    chunkCount: number;
    tags: string | string[];
    labels: string | string[];
    customMetadata?: Record<string, unknown> | string;
    syncedWithChroma: boolean;
    processingTimeMs?: number;
    chunks?: string;
    errorMessage?: string;
    metadata?: DocumentMetadata;
    embedding?: number[];
}

// Document chunk interface for detailed view
export interface DocumentChunk {
    id: string;
    text: string;
    metadata?: DocumentMetadata;
}

// Admin Types
export interface AdminStats {
    totalCollections: number;
    totalDocuments: number;
    lastUpdated: string;
}

// Document statistics interface for ChromaPage
export interface DocumentStats {
    totalDocuments: number;
    recentDocuments: number;
    statusCounts: Array<{ status: string; count: number }>;
    databaseStats: Array<{
        database: string;
        documentCount: number;
        collections: Array<{
            collection: string;
            documentCount: number;
            totalChunks: number;
        }>;
    }>;
    dailyUploads: Array<{ date: string; count: number }>;
    processingTimeAvg: number;
}

export interface QueueStats {
    queueDepth: number;
    processingCount: number;
    completedLastHour: number;
    averageProcessingTimeMs: number;
    estimatedCompletionTime: string;
    statusCounts: {
        queued: number;
        processing: number;
        completed: number;
        failed: number;
    };
    recentlyCompleted: number;
    pending?: number; // For backward compatibility
    processing?: number; // For backward compatibility
    completed?: number; // For backward compatibility
    failed?: number; // For backward compatibility
}

// Queue list response interface
export interface QueueListResponse {
    items: Array<{
        documentId: string;
        fileName: string;
        contentType: string;
        size: number;
        status: string;
        uploadTime: string;
        processingTime?: string;
        collection: string;
        database: string;
        tenant: string;
        tags: string[];
        labels: string[];
        estimatedCompletionTime?: string;
    }>;
    continuationToken?: string;
    summary: {
        totalItems: number;
        queuedCount: number;
        processingCount: number;
        timestamp: string;
    };
}

// Poison queue interfaces
export interface PoisonQueueItem {
    documentId: string;
    fileName: string;
    contentType: string;
    collection: string;
    database: string;
    status: string;
    errorMessage: string;
    uploadTimestamp: string;
    tenant: string;
}

export interface PoisonQueueResponse {
    message: string;
    summary: {
        totalDocuments: number;
        recoverableDocuments: number;
        nonRecoverableDocuments: number;
        filters: {
            status: string;
            tenant: string;
            maxDocuments: number;
        };
    };
    recoverableDocuments: PoisonQueueItem[];
}

// Search Types
export interface SearchQuery {
    query: string;
    collection?: string;
    limit?: number;
    metadata?: Record<string, unknown>;
}

export interface SearchResult {
    id: string;
    content: string;
    text?: string; // Some APIs return 'text' instead of 'content'
    score: number;
    metadata?: DocumentMetadata;
}

// Enhanced search response interfaces
export interface SearchResponse {
    results: SearchResult[];
    metadata?: DocumentMetadata;
}

export interface ChunkSearchResponse {
    chunks: DocumentChunk[];
    documentId?: string;
    metadata?: DocumentMetadata;
}

// Normalized search result for UI display
export interface NormalizedSearchResult {
    id: string;
    text: string;
    metadata?: DocumentMetadata;
}

// File Upload Types
export interface FileUpload {
    file: File;
    collection?: string;
    metadata?: Record<string, unknown>;
}

export interface UploadResult {
    fileId: string;
    status: 'uploaded' | 'processing' | 'completed' | 'failed';
    message?: string;
}
