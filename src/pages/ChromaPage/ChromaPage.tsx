/**
 * ChromaPage Component
 *
 * A comprehensive management interface for ChromaDB documents and search functionality.
 * Provides features for document management, search emulation, and queue monitoring.
 *
 * Key Features:
 * 1. Document Management
 *    - Upload new documents with metadata (tags, labels)
 *    - View and edit existing document metadata
 *    - View document chunks and their content
 *
 * 2. Search Emulation
 *    - Test semantic search queries
 *    - Retrieve specific documents by ID or filename
 *    - Apply tag and label filters
 *    - View detailed search results and metadata
 *
 * 3. Queue Monitoring
 *    - Real-time queue status updates
 *    - Processing status tracking
 *    - Document completion monitoring
 */

import {
  Breadcrumb,
  BreadcrumbDivider,
  BreadcrumbItem,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Dropdown,
  Input,
  Label,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Option,
  SpinButton,
  Spinner,
  Text,
  type SelectionEvents,
  type OptionOnSelectData,
} from "@fluentui/react-components";
import {
  AddRegular,
  ArrowSyncRegular,
  ArrowUp24Regular,
  CheckmarkRegular,
  CopyRegular,
  DeleteRegular,
  DocumentQueueMultipleRegular,
  DocumentRegular,
  FolderRegular,
  HomeRegular,
  MoreHorizontalRegular,
} from "@fluentui/react-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getFunctionUrl } from "../../config";
import { adminApi, documentApi, fileApi, poisonQueueApi } from "../../api/api";
import type {
  DocumentStats,
  QueueStats,
  QueueListResponse,
  Document,
  DocumentChunk,
  NormalizedSearchResult,
  DocumentMetadata,
  PoisonQueueResponse
} from "../../api/api";
import type { PoisonQueueItem } from "../../api/models";
import styles from "./ChromaPage.module.css";

/**
 * Turn a slug back into a “pretty” display name:
 *   - split on underscores
 *   - capitalize each word’s first letter
 *   - join with spaces
 *
 * Note: this cannot recover apostrophes, punctuation, or original casing,
 * but it does make “andys_collection_123” → “Andys Collection 123”.
 */
function decodeIndexToDisplayName(index: string): string {
  if (!index) return "";

  return index
    .split("_")
    .map((part) => {
      if (part.length === 0) return "";
      return part[0].toUpperCase() + part.slice(1);
    })
    .join(" ");
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes

// Utility to normalize database and collection names
const normalizeDbOrCollectionName = (input: string): string => {
  return input
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
};

// Utility to normalize database names (no underscores allowed)
const normalizeDatabaseName = (input: string): string => {
  return input
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
};

const ChromaPage = () => {
  // State for failed error dialog (move inside component)
  const [failedErrorDialogDocId, setFailedErrorDialogDocId] = useState<
    string | null
  >(null);
  // Add refs for previous values
  const prevStatsRef = useRef<DocumentStats | null>(null);
  const prevQueueStatsRef = useRef<QueueStats | null>(null);
  const prevQueueListRef = useRef<QueueListResponse | null>(null);
  const prevDocumentsRef = useRef<Document[]>([]);

  // Replace global loading state with section-specific loading states
  const [statsLoading, setStatsLoading] = useState(true);
  const [queueStatsLoading, setQueueStatsLoading] = useState(true);
  const [queueListLoading, setQueueListLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(true);

  // State for data
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [queueList, setQueueList] = useState<QueueListResponse | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  // Per-file progress state
  const [fileProgress, setFileProgress] = useState<{
    [fileName: string]: number;
  }>({});
  const tenant = "blue-edge";
  const [database, setDatabase] = useState("");
  const [collection, setCollection] = useState("");
  const [tags, setTags] = useState("");
  const [labels, setLabels] = useState("");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isQueueExpanded, setIsQueueExpanded] = useState(true);
  const [navPath, setNavPath] = useState<
    { type: "root" | "database" | "collection"; name: string }[]
  >([{ type: "root", name: "All" }]);
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    null
  );
  const [expandedTagsDocuments, setExpandedTagsDocuments] = useState<
    Set<string>
  >(new Set());
  const [expandedLabelsDocuments, setExpandedLabelsDocuments] = useState<
    Set<string>
  >(new Set());
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [documentToEdit, setDocumentToEdit] = useState<Document | null>(null);
  const [editTags, setEditTags] = useState("");
  const [editLabels, setEditLabels] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [isPollingSuspended, setIsPollingSuspended] = useState(false); // Changed to false to enable polling by default
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [metadataEntries, setMetadataEntries] = useState<
    { key: string; value: string }[]
  >([]);
  const [selectedDocumentForChunks, setSelectedDocumentForChunks] =
    useState<Document | null>(null);
  const [documentChunks, setDocumentChunks] = useState<DocumentChunk[]>([]);
  const [isChunksDialogOpen, setIsChunksDialogOpen] = useState(false);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [chunksError, setChunksError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(
    null
  );
  const [isDeleteCollectionDialogOpen, setIsDeleteCollectionDialogOpen] =
    useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<{
    database: string;
    collection: string;
  } | null>(null);
  const [isDeleteDatabaseDialogOpen, setIsDeleteDatabaseDialogOpen] =
    useState(false);
  const [databaseToDelete, setDatabaseToDelete] = useState<string | null>(null);

  // Status filter state for filtering documents by status
  const [statusFilter, setStatusFilter] = useState<
    "failed" | "chunking" | "completed" | null
  >(null);

  // Add new state variables for upload dialog
  const [isNewDatabase, setIsNewDatabase] = useState(false);
  const [isNewCollection, setIsNewCollection] = useState(false);

  // Add new state for upload dialog
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMetadataEntries, setUploadMetadataEntries] = useState<
    { key: string; value: string }[]
  >([{ key: "", value: "" }]);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Add new state variables for chunking options
  const [chunkStrategy, setChunkStrategy] = useState<string>("smart");

  // Search emulator state
  const [isSearchEmulatorOpen, setIsSearchEmulatorOpen] = useState(false);
  // Poison Queue state
  const [isPoisonQueueOpen, setIsPoisonQueueOpen] = useState(false);
  const [poisonQueueItems, setPoisonQueueItems] = useState<PoisonQueueItem[]>(
    []
  );
  const [poisonQueueSummary, setPoisonQueueSummary] = useState<
    PoisonQueueResponse["summary"] | null
  >(null);
  const [isLoadingPoisonQueue, setIsLoadingPoisonQueue] = useState(false);
  const [poisonQueueError, setPoisonQueueError] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [retryingDocuments, setRetryingDocuments] = useState<Set<string>>(
    new Set()
  );
  const [maxDocuments, setMaxDocuments] = useState(10);
  const [recoveryStatus, setRecoveryStatus] = useState<string | null>(null);

  // Fetch poison queue items
  const fetchPoisonQueueItems = useCallback(async () => {
    if (!isPoisonQueueOpen) return;
    console.log("Fetching poison queue items...");

    setIsLoadingPoisonQueue(true);
    setPoisonQueueError(null);

    try {
      const data = await poisonQueueApi.getItems(maxDocuments);
      setPoisonQueueItems(data.recoverableDocuments || []);
      setPoisonQueueSummary(data.summary);
    } catch (err) {
      // Only show error if it's not a 404 (which we handle as empty queue)
      if (!(err instanceof Error && err.message.includes("404"))) {
        setPoisonQueueError(
          err instanceof Error ? err.message : "Failed to fetch poison queue"
        );
      }
      setPoisonQueueItems([]);
      setPoisonQueueSummary(null);
    } finally {
      setIsLoadingPoisonQueue(false);
    }
  }, [isPoisonQueueOpen, maxDocuments]);

  // Load poison queue items when dialog opens
  useEffect(() => {
    if (isPoisonQueueOpen) {
      fetchPoisonQueueItems();
    }
  }, [isPoisonQueueOpen, fetchPoisonQueueItems]);

  // Handle individual document retry
  const handleRetryDocument = async (documentId: string) => {
    if (retryingDocuments.has(documentId)) return;

    setRetryingDocuments((prev) => new Set(prev).add(documentId));
    setPoisonQueueError(null);

    try {
      await poisonQueueApi.retryDocument(documentId);

      // Show success message
      setRecoveryStatus(`Successfully retried document: ${documentId}`);
      setTimeout(() => setRecoveryStatus(null), 3000);

      // Refresh the queue to reflect changes
      await fetchPoisonQueueItems();
    } catch (err) {
      setPoisonQueueError(
        `Failed to retry document ${documentId}: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setRetryingDocuments((prev) => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  };

  // Handle recovery of failed items
  const handleRecoverFailedItems = async () => {
    if (isRecovering) return;

    setIsRecovering(true);
    setPoisonQueueError(null);
    setRecoveryStatus(null);

    try {
      const result = await poisonQueueApi.recoverItems();
      setRecoveryStatus(result.message || "Recovery completed");

      // Refresh the queue
      await fetchPoisonQueueItems();

      // Show success message in the main UI as well
      setUpdateSuccess("Recovery completed successfully");
      setTimeout(() => setUpdateSuccess(null), 5000);
    } catch (err) {
      setPoisonQueueError(
        err instanceof Error ? err.message : "Failed to recover items"
      );
    } finally {
      setIsRecovering(false);
    }
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDatabase, setSearchDatabase] = useState("");
  const [searchCollection, setSearchCollection] = useState("");
  const [searchTag, setSearchTag] = useState("");
  const [searchLabel, setSearchLabel] = useState("");
  const [searchFileName, setSearchFileName] = useState("");
  const [searchDocumentId, setSearchDocumentId] = useState("");
  const [searchLimit, setSearchLimit] = useState(10);
  const [searchResults, setSearchResults] = useState<NormalizedSearchResult[]>([]);
  const [searchMetadata, setSearchMetadata] = useState<DocumentMetadata | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(
    new Set()
  );

  // Chunk display state
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set());

  // Refs for scroll management
  const searchSectionRef = useRef<HTMLDivElement>(null);
  const resultsSectionRef = useRef<HTMLDivElement>(null);

  // Add scroll helper function
  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Add these new functions to help manage the dropdowns
  const getAvailableDatabases = () => {
    if (!stats?.databaseStats) return [];
    return stats.databaseStats.map((db) => db.database);
  };

  // Get available collections for a specific database
  const getAvailableCollections = (selectedDb: string) => {
    if (!stats?.databaseStats) return [];
    const db = stats.databaseStats.find((db) => db.database === selectedDb);
    return db?.collections.map((col) => col.collection) || [];
  };

  /**
   * Validates search parameters and ensures required fields are filled
   * @returns boolean indicating if the search can proceed
   */
  const isValidSearch = () => {
    // Only validate if we're actually trying to perform a search
    if (!isSearchEmulatorOpen) {
      return true;
    }

    // Trim inputs for validation to avoid whitespace issues
    const trimmedDocumentId = searchDocumentId.trim();
    const trimmedFileName = searchFileName.trim();
    const trimmedQuery = searchQuery.trim();

    console.log("Validating search with:", {
      database: searchDatabase,
      collection: searchCollection,
      documentId: trimmedDocumentId,
      fileName: trimmedFileName,
      query: trimmedQuery,
      hasQuery: !!trimmedQuery,
      hasDocumentId: !!trimmedDocumentId,
      hasFileName: !!trimmedFileName,
    });

    // Require database and collection
    if (!searchDatabase || !searchCollection) {
      console.log("Missing database or collection");
      return false;
    }

    // At least one of document ID, filename, or query must be provided
    const isValid = !!(trimmedDocumentId || trimmedFileName || trimmedQuery);
    console.log("Search is valid:", isValid);
    return isValid;
  };

  /**
   * Handles database selection and resets collection when database changes
   */
  const handleDatabaseChange = (
    _event: SelectionEvents,
    data: OptionOnSelectData
  ) => {
    const newValue = data.optionValue || "";
    if (newValue !== searchDatabase) {
      setSearchDatabase(newValue);
      setSearchCollection(""); // Reset collection when database changes
    }
  };

  const handleCollectionChange = (
    _event: SelectionEvents,
    data: OptionOnSelectData
  ) => {
    setSearchCollection(data.optionValue || "");
  };

  // Update fetch functions to use section-specific loading states and previous value comparison
  const fetchStats = useCallback(async () => {
    try {
      const data = await adminApi.getDocumentStats(tenant, 30);

      // Compare with previous value before updating
      if (JSON.stringify(data) !== JSON.stringify(prevStatsRef.current)) {
        setStats(data);
        prevStatsRef.current = data;
      }
    } catch {
      setError("Failed to load document statistics");
    } finally {
      setStatsLoading(false);
    }
  }, [tenant]);

  const fetchQueueStats = useCallback(async () => {
    try {
      const data = await adminApi.getQueueStats(tenant);

      // Compare with previous value before updating
      if (JSON.stringify(data) !== JSON.stringify(prevQueueStatsRef.current)) {
        setQueueStats(data);
        prevQueueStatsRef.current = data;
      }
    } catch {
      setError("Failed to load queue statistics");
    } finally {
      setQueueStatsLoading(false);
    }
  }, [tenant]);

  const fetchQueueList = useCallback(async () => {
    try {
      const data = await adminApi.getQueueList(tenant);

      // Compare with previous value before updating
      if (JSON.stringify(data) !== JSON.stringify(prevQueueListRef.current)) {
        setQueueList(data);
        prevQueueListRef.current = data;
      }
      setError(null);
    } catch (err) {
      setError(
        `Failed to load queue list${err instanceof Error ? `: ${err.message}` : ""}`
      );
    } finally {
      setQueueListLoading(false);
    }
  }, [tenant]);

  // Fetch documents with pagination and continuation token
  const fetchDocuments = useCallback(async () => {
    setDocumentsLoading(true);
    try {
      const allItems = await adminApi.getDocuments(tenant, 999);

      // Compare with previous value before updating
      if (
        JSON.stringify(allItems) !== JSON.stringify(prevDocumentsRef.current)
      ) {
        setDocuments(allItems);
        prevDocumentsRef.current = allItems;
      }
    } catch {
      setError("Failed to load documents");
    } finally {
      setDocumentsLoading(false);
    }
  }, [tenant]);
  // Compute number of failed items based on current navigation (root, database, or collection)
  const failedCount = useMemo(() => {
    if (!documents) return 0;
    if (navPath.length === 1) {
      return documents.filter((doc) => doc.status === "failed").length;
    }
    if (navPath.length === 2 && selectedDatabase) {
      return documents.filter(
        (doc) => doc.database === selectedDatabase && doc.status === "failed"
      ).length;
    }
    if (navPath.length === 3 && selectedDatabase && selectedCollection) {
      return documents.filter(
        (doc) =>
          doc.database === selectedDatabase &&
          doc.collection === selectedCollection &&
          doc.status === "failed"
      ).length;
    }
    return 0;
  }, [documents, navPath, selectedDatabase, selectedCollection]);

  // Compute number of chunking items (only show at collection level)
  const chunkingCount = useMemo(() => {
    if (!documents) return 0;
    if (navPath.length === 3 && selectedDatabase && selectedCollection) {
      return documents.filter(
        (doc) =>
          doc.database === selectedDatabase &&
          doc.collection === selectedCollection &&
          doc.status === "chunking"
      ).length;
    }
    return 0;
  }, [documents, navPath, selectedDatabase, selectedCollection]);

  // Memoize computed values
  const filteredQueuedDocs = useMemo(
    () => queueList?.items.filter((doc) => doc.status === "queued") || [],
    [queueList?.items]
  );

  const filteredProcessingDocs = useMemo(
    () =>
      queueList?.items.filter(
        (doc) =>
          doc.status === "processing" ||
          doc.status === "chunking" ||
          doc.status === "embedding"
      ) || [],
    [queueList?.items]
  );

  const filteredCompletedDocs = useMemo(
    () =>
      documents
        .filter((doc) => doc.status === "completed" || doc.status === "failed")
        .sort((a, b) => {
          const timeA = new Date(
            a.completionTimestamp || a.uploadTimestamp
          ).getTime();
          const timeB = new Date(
            b.completionTimestamp || b.uploadTimestamp
          ).getTime();
          return timeB - timeA;
        })
        .slice(0, 10),
    [documents]
  );

  // Set up polling for updates
  useEffect(() => {
    // Create fetch functions that use the current tenant
    const fetchStatsWithLatestState = () => {
      if (!isPollingSuspended) {
        return fetchStats();
      }
      return Promise.resolve();
    };

    const fetchQueueStatsWithLatestState = () => {
      if (!isPollingSuspended) {
        return fetchQueueStats();
      }
      return Promise.resolve();
    };

    const fetchQueueListWithLatestState = () => {
      if (!isPollingSuspended) {
        return fetchQueueList();
      }
      return Promise.resolve();
    };

    const fetchDocumentsWithLatestState = () => {
      if (!isPollingSuspended) {
        return fetchDocuments();
      }
      return Promise.resolve();
    };

    // Initial fetch
    const fetchInitialData = async () => {
      // Always fetch initial data regardless of polling state
      await fetchStats();
      await fetchQueueStats();
      await fetchQueueList();
      await fetchDocuments();
    };

    fetchInitialData();

    // Set up intervals for polling with optimized frequencies
    let statsInterval: ReturnType<typeof setInterval> | null = null;
    let queueInterval: ReturnType<typeof setInterval> | null = null;
    let queueListInterval: ReturnType<typeof setInterval> | null = null;
    let docsInterval: ReturnType<typeof setInterval> | null = null;

    if (!isPollingSuspended) {
      // Stats and documents can be polled less frequently (30 seconds)
      statsInterval = setInterval(fetchStatsWithLatestState, 30000);
      docsInterval = setInterval(
        fetchDocumentsWithLatestState,
        30000
      );

      // Queue stats can be polled every 10 seconds
      queueInterval = setInterval(
        fetchQueueStatsWithLatestState,
        10000
      );

      // Queue list needs to be more frequent to catch processing status (5 seconds)
      queueListInterval = setInterval(
        fetchQueueListWithLatestState,
        5000
      );
    }

    // Clean up intervals on component unmount
    return () => {
      if (statsInterval) clearInterval(statsInterval);
      if (queueInterval) clearInterval(queueInterval);
      if (queueListInterval) clearInterval(queueListInterval);
      if (docsInterval) clearInterval(docsInterval);
    };
  }, [isPollingSuspended, fetchDocuments, fetchQueueList, fetchQueueStats, fetchStats]);

  // Add metadata helper functions for upload dialog
  const addUploadMetadataEntry = () => {
    setUploadMetadataEntries([
      ...uploadMetadataEntries,
      { key: "", value: "" },
    ]);
  };

  const removeUploadMetadataEntry = (index: number) => {
    const newEntries = [...uploadMetadataEntries];
    newEntries.splice(index, 1);
    setUploadMetadataEntries(newEntries);
  };

  const updateUploadMetadataEntry = (
    index: number,
    field: "key" | "value",
    value: string
  ) => {
    const newEntries = [...uploadMetadataEntries];
    newEntries[index][field] = value;
    setUploadMetadataEntries(newEntries);
  };

  // Add new state for total size
  const [totalSize, setTotalSize] = useState<number>(0);

  // Add new state for tracking oversized files
  const [oversizedFiles, setOversizedFiles] = useState<Set<string>>(new Set());

  // Update file selection handler to calculate total size
  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);
      setSelectedFiles(fileArray);
      // Calculate total size
      const total = fileArray.reduce((acc, file) => acc + file.size, 0);
      setTotalSize(total);
      // Check for oversized files
      const newOversized = new Set<string>();
      fileArray.forEach((file) => {
        if (file.size > MAX_FILE_SIZE) {
          newOversized.add(file.name);
        }
      });
      setOversizedFiles(newOversized);
    }
  };

  // Add file removal handler
  const handleFileRemove = (index: number) => {
    setSelectedFiles((prev) => {
      const newFiles = [...prev];
      newFiles.splice(index, 1);
      // Recalculate total size
      const newTotalSize = newFiles.reduce((acc, file) => acc + file.size, 0);
      setTotalSize(newTotalSize);
      // Recalculate oversized files
      const newOversizedFiles = new Set<string>();
      newFiles.forEach((file) => {
        if (file.size > MAX_FILE_SIZE) {
          newOversizedFiles.add(file.name);
        }
      });
      setOversizedFiles(newOversizedFiles);
      return newFiles;
    });
  };

  // Add helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  // Update handleFileUpload for per-file progress
  const handleFileUpload = async () => {
    if (!selectedFiles.length || !database || !collection) {
      setError("Please fill in all required fields");
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadProgress(0);
    setFileProgress({});

    try {
      // Create custom metadata object
      const customMetadata = uploadMetadataEntries.reduce(
        (obj, entry) => {
          if (entry.key.trim()) {
            obj[entry.key.trim()] = entry.value.trim();
          }
          return obj;
        },
        {} as Record<string, string>
      );

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        const uploadData = {
          tenant,
          database,
          collection,
          tags: tags || undefined,
          labels: labels || undefined,
          customMetadata: Object.keys(customMetadata).length > 0 ? customMetadata : undefined,
          chunkStrategy,
        };

        await fileApi.uploadWithProgress(
          file,
          uploadData,
          (percent) => {
            setFileProgress((prev) => ({
              ...prev,
              [file.name]: percent,
            }));
          }
        );

        setFileProgress((prev) => ({
          ...prev,
          [file.name]: 100,
        }));
        setUploadProgress(((i + 1) / selectedFiles.length) * 100);
      }

      setUploadSuccess(`Successfully uploaded ${selectedFiles.length} file(s)`);
      setTimeout(() => {
        setSelectedFiles([]);
        setTags("");
        setLabels("");
        setUploadMetadataEntries([{ key: "", value: "" }]);
        setIsNewDatabase(false);
        setIsNewCollection(false);
        setDatabase("");
        setCollection("");
        setChunkStrategy("smart");
        setIsUploadDialogOpen(false);
        setUploadSuccess(null);
        setFileProgress({});
        setUploadProgress(0);
        fetchDocuments();
        fetchQueueStats();
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  // Navigation helpers
  const navigateToRoot = () => {
    setNavPath([{ type: "root", name: "All" }]);
    setSelectedDatabase(null);
    setSelectedCollection(null);
  };

  const navigateToDatabase = (dbName: string) => {
    setNavPath([
      { type: "root", name: "All" },
      { type: "database", name: dbName },
    ]);
    setSelectedDatabase(dbName);
    setSelectedCollection(null);
  };

  const navigateToCollection = (dbName: string, colName: string) => {
    setNavPath([
      { type: "root", name: "All" },
      { type: "database", name: dbName },
      { type: "collection", name: colName },
    ]);
    setSelectedDatabase(dbName);
    setSelectedCollection(colName);
  };

  // Handle breadcrumb navigation
  const handleBreadcrumbClick = (index: number) => {
    if (index === 0) {
      navigateToRoot();
    } else if (index === 1 && navPath.length > 1) {
      navigateToDatabase(navPath[1].name);
    }
    // No need to handle collection click in breadcrumb as we're already there
  };

  // Helper functions for tags/labels expansion
  const toggleTagsExpansion = (documentId: string | undefined) => {
    if (!documentId) return;

    const newSet = new Set(expandedTagsDocuments);
    if (newSet.has(documentId)) {
      newSet.delete(documentId);
    } else {
      newSet.add(documentId);
    }
    setExpandedTagsDocuments(newSet);
  };

  const toggleLabelsExpansion = (documentId: string | undefined) => {
    if (!documentId) return;

    const newSet = new Set(expandedLabelsDocuments);
    if (newSet.has(documentId)) {
      newSet.delete(documentId);
    } else {
      newSet.add(documentId);
    }
    setExpandedLabelsDocuments(newSet);
  };

  // Function to normalize tags/labels from various formats
  const normalizeMetadata = (
    value: string | string[] | null | undefined
  ): string[] => {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === "string") {
      // Check if it's a JSON string array
      if (value.trim().startsWith("[") && value.trim().endsWith("]")) {
        try {
          return JSON.parse(value);
        } catch {
          // If parsing fails, treat as comma-separated
          console.warn("Failed to parse JSON string:", value);
        }
      }

      // Treat as comma-separated string
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  };

  // Function to format metadata for display
  const formatMetadataForDisplay = (
    value: string | string[] | null | undefined
  ): string[] => {
    return normalizeMetadata(value);
  };

  // Function to format metadata for editing
  const formatMetadataForEditing = (
    value: string | string[] | null | undefined
  ): string => {
    const normalized = normalizeMetadata(value);
    return normalized.join(", ");
  };

  // Function to open edit dialog
  const openEditDialog = (doc: Document) => {
    setDocumentToEdit(doc);

    // Format tags and labels for editing
    setEditTags(formatMetadataForEditing(doc.tags));
    setEditLabels(formatMetadataForEditing(doc.labels));

    // Parse customMetadata into key-value pairs for the editor
    let initialEntries: { key: string; value: string }[] = [];
    if (doc.customMetadata) {
      try {
        const metadata =
          typeof doc.customMetadata === "string"
            ? JSON.parse(doc.customMetadata)
            : doc.customMetadata;

        initialEntries = Object.entries(metadata).map(([key, value]) => ({
          key,
          value:
            typeof value === "object" ? JSON.stringify(value) : String(value),
        }));
      } catch {
        console.error("Failed to parse custom metadata");
        initialEntries = [];
      }
    }

    // If no entries, add an empty one to start
    if (initialEntries.length === 0) {
      initialEntries.push({ key: "", value: "" });
    }

    setMetadataEntries(initialEntries);

    setIsEditDialogOpen(true);
  };

  // Add helper functions for the metadata editor
  const addMetadataEntry = () => {
    setMetadataEntries([...metadataEntries, { key: "", value: "" }]);
  };

  const removeMetadataEntry = (index: number) => {
    const newEntries = [...metadataEntries];
    newEntries.splice(index, 1);
    setMetadataEntries(newEntries);
  };

  const updateMetadataEntry = (
    index: number,
    field: "key" | "value",
    value: string
  ) => {
    const newEntries = [...metadataEntries];
    newEntries[index][field] = value;
    setMetadataEntries(newEntries);
  };

  // Update submitMetadataUpdate to use the new metadata entries
  const submitMetadataUpdate = async () => {
    if (!documentToEdit) return;

    // Split tags and labels into arrays for the API
    const tagArray = normalizeMetadata(editTags);
    const labelArray = normalizeMetadata(editLabels);

    // Convert metadata entries to object
    const customMetadata = metadataEntries.reduce(
      (obj, entry) => {
        if (entry.key.trim()) {
          obj[entry.key.trim()] = entry.value.trim();
        }
        return obj;
      },
      {} as Record<string, string>
    );

    // Apply optimistic update - update the document in the local state
    const updatedDocuments = documents.map((doc) => {
      if (doc.documentId === documentToEdit.documentId) {
        return {
          ...doc,
          tags: tagArray,
          labels: labelArray,
          customMetadata,
        };
      }
      return doc;
    });

    // Update local state immediately
    setDocuments(updatedDocuments);

    // Close the dialog
    setIsEditDialogOpen(false);

    try {
      const updateData = {
        documentId: documentToEdit.documentId || "",
        tenant: tenant,
        database: documentToEdit.database || "development",
        collection: documentToEdit.collection || "technical",
        tags: tagArray,
        labels: labelArray,
        customMetadata,
      };

      const responseData = await documentApi.updateChroma(updateData);

      if (!responseData.success) {
        const errorMessage = responseData.message || "Unknown error";
        throw new Error(`Update failed: ${errorMessage}`);
      }

      // Show success notification
      setUpdateSuccess(`${documentToEdit.fileName} updated successfully`);

      // Hide success notification after 3 seconds
      setTimeout(() => setUpdateSuccess(null), 3000);

      // Refresh documents to ensure consistency
      await fetchDocuments();
    } catch (err: unknown) {
      console.error("❌ Error in metadata update:", err);
      setError(`Failed to update document metadata: ${err instanceof Error ? err.message : "Unknown error"}`);

      // Revert optimistic update on error
      await fetchDocuments();
    }
  };

  // Add a function to copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Fetch document chunks function
  const fetchDocumentChunks = async (
    documentId: string,
    database: string,
    collection: string
  ) => {
    setIsLoadingChunks(true);
    setChunksError(null);

    try {
      console.log("Fetching document chunks with request:", {
        documentId,
        tenant,
        database,
        collection,
      });

      const data = await documentApi.getChunks(documentId, tenant, database, collection);
      console.log("Document chunks response data:", data);

      if (data.success && data.chunks) {
        setDocumentChunks(data.chunks);
        if (data.totalChunks === 0 || data.chunks.length === 0) {
          setChunksError("No chunks found for this document");
        }
      } else {
        setDocumentChunks([]);
        setChunksError("No chunks found for this document");
      }
    } catch (error) {
      console.error("Document chunks error:", error);
      setChunksError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    } finally {
      setIsLoadingChunks(false);
    }
  };

  const openChunksDialog = (doc: Document) => {
    if (!doc.database || !doc.collection) {
      setChunksError("Document database or collection information is missing");
      return;
    }

    setSelectedDocumentForChunks(doc);
    setDocumentChunks([]);
    setChunksError(null);
    setIsChunksDialogOpen(true);

    if (doc.documentId) {
      fetchDocumentChunks(doc.documentId, doc.database, doc.collection);
    } else {
      setChunksError("Document ID not available");
    }
  };

  // Render document explorer content based on navigation state
  const renderExplorerContent = () => {
    if (documentsLoading) {
      return (
        <div className={styles.loadingContainer}>
          <Spinner size="medium" label="Loading document data..." />
        </div>
      );
    }

    if (!stats) {
      return <div className={styles.loading}>Loading...</div>;
    }

    // Root level - show databases
    if (navPath.length === 1) {
      return (
        <div className={styles.explorerGrid}>
          {stats.databaseStats.map((db) => {
            // Count failed docs in this database
            const failedInDb = documents.filter(
              (doc) => doc.database === db.database && doc.status === "failed"
            ).length;
            return (
              <div
                key={db.database}
                className={styles.explorerItem}
                style={
                  failedInDb > 0
                    ? { border: "2px solid #d32f2f", position: "relative" }
                    : undefined
                }
              >
                <div
                  className={styles.explorerItemContent}
                  onClick={() => navigateToDatabase(db.database)}
                >
                  <div className={styles.explorerItemIcon}>
                    <FolderRegular />
                  </div>
                  <div className={styles.explorerItemInfo}>
                    <div className={styles.explorerItemName}>{db.database}</div>
                    <div className={styles.explorerItemMeta}>
                      {db.documentCount} documents
                      {failedInDb > 0 && (
                        <span
                          style={{
                            color: "#d32f2f",
                            marginLeft: 8,
                            fontWeight: 600,
                          }}
                        >
                          {failedInDb} failed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className={styles.explorerItemActions}>
                  <Menu>
                    <MenuTrigger>
                      <Button
                        appearance="subtle"
                        icon={<MoreHorizontalRegular />}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </MenuTrigger>
                    <MenuPopover>
                      <MenuList>
                        <MenuItem
                          icon={<DeleteRegular />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDatabaseToDelete(db.database);
                            setIsDeleteDatabaseDialogOpen(true);
                          }}
                        >
                          Delete Database
                        </MenuItem>
                      </MenuList>
                    </MenuPopover>
                  </Menu>
                </div>
              </div>
            );
          })}
        </div>
      );
    } // Database level - show collections
    if (navPath.length === 2 && selectedDatabase) {
      const db = stats.databaseStats.find(
        (db) => db.database === selectedDatabase
      );
      if (!db) return <div>Database not found</div>;

      return (
        <div className={styles.explorerGridCollections}>
          {db.collections.map((col) => {
            // Count failed docs in this collection
            const failedInCol = documents.filter(
              (doc) =>
                doc.database === selectedDatabase &&
                doc.collection === col.collection &&
                doc.status === "failed"
            ).length;
            return (
              <div
                key={col.collection}
                className={styles.explorerItem}
                style={
                  failedInCol > 0
                    ? { border: "2px solid #d32f2f", position: "relative" }
                    : undefined
                }
              >
                <div
                  className={styles.explorerItemContent}
                  onClick={() =>
                    navigateToCollection(selectedDatabase, col.collection)
                  }
                >
                  <div className={styles.explorerItemIcon}>
                    <FolderRegular />
                  </div>
                  <div className={styles.explorerItemInfo}>
                    <div className={styles.explorerItemName}>
                      {decodeIndexToDisplayName(col.collection)}
                    </div>
                    <div className={styles.explorerItemMeta}>
                      {col.documentCount} documents, {col.totalChunks} chunks
                      {failedInCol > 0 && (
                        <span
                          style={{
                            color: "#d32f2f",
                            marginLeft: 8,
                            fontWeight: 600,
                          }}
                        >
                          {failedInCol} failed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  className={styles.deleteCollectionButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCollectionToDelete({
                      database: selectedDatabase,
                      collection: col.collection,
                    });
                    setIsDeleteCollectionDialogOpen(true);
                  }}
                  title="Delete Collection"
                  aria-label="Delete Collection"
                >
                  <DeleteRegular />
                </button>
              </div>
            );
          })}
        </div>
      );
    } // Collection level - show documents
    if (navPath.length === 3 && selectedDatabase && selectedCollection) {
      let filteredDocs = documents.filter(
        (doc) =>
          doc.database === selectedDatabase &&
          doc.collection === selectedCollection
      );

      // Apply status filter if set
      if (statusFilter) {
        filteredDocs = filteredDocs.filter(
          (doc) => doc.status === statusFilter
        );
      }

      if (documentsLoading) {
        return (
          <div className={styles.loadingContainer}>
            <Spinner size="medium" label="Loading documents..." />
          </div>
        );
      }

      if (filteredDocs.length === 0) {
        return (
          <div className={styles.emptyState}>
            No documents found in this collection
          </div>
        );
      }

      return (
        <div className={styles.documentList}>
          {filteredDocs.map((doc) => {
            // Process tags and labels using our helper functions
            const tags = formatMetadataForDisplay(doc.tags);
            const labels = formatMetadataForDisplay(doc.labels);

            // Determine whether to show all or limited tags/labels
            const isTagsExpanded = doc.documentId
              ? expandedTagsDocuments.has(doc.documentId)
              : false;
            const isLabelsExpanded = doc.documentId
              ? expandedLabelsDocuments.has(doc.documentId)
              : false;

            // Limit display unless expanded
            const displayTags = isTagsExpanded ? tags : tags.slice(0, 8);
            const displayLabels = isLabelsExpanded
              ? labels
              : labels.slice(0, 8);

            // Determine if the document is completed and get processing time
            const isCompleted = doc.status === "completed";
            const processingTimeMs = doc.processingTimeMs;

            return (
              <div key={getDocumentKey(doc)} className={styles.documentCard}>
                {/* Document name by itself at the top */}
                <div className={styles.documentName}>{doc.fileName}</div>

                {/* Row for ID and status tag */}
                <div className={styles.documentCardActions}>
                  <button
                    className={styles.infoButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      const idToUse = getDocumentId(doc);
                      copyToClipboard(idToUse);
                    }}
                    title="Copy Document ID"
                    aria-label="Copy Document ID"
                  >
                    <span className={styles.idDisplay}>
                      ID:{" "}
                      {getDocumentId(doc)
                        ? getDocumentId(doc).substring(0, 8)
                        : "N/A"}
                      {copiedId === getDocumentId(doc) ? (
                        <CheckmarkRegular className={styles.copyIcon} />
                      ) : (
                        <CopyRegular className={styles.copyIcon} />
                      )}
                    </span>
                  </button>
                  <button
                    className={styles.deleteButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDocumentToDelete(doc);
                      setIsDeleteDialogOpen(true);
                    }}
                    title="Delete Document"
                    aria-label="Delete Document"
                  >
                    <DeleteRegular />
                  </button>
                  <span
                    className={`${styles.statusBadge} ${
                      styles[
                        `status${doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}`
                      ]
                    }`}
                  >
                    {doc.status === "failed" && doc.errorMessage ? (
                      <span
                        style={{ cursor: "pointer" }}
                        tabIndex={0}
                        role="button"
                        aria-label="View error details"
                        onClick={() =>
                          setFailedErrorDialogDocId(getDocumentId(doc))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ")
                            setFailedErrorDialogDocId(getDocumentId(doc));
                        }}
                      >
                        Failed
                      </span>
                    ) : (
                      doc.status.charAt(0).toUpperCase() + doc.status.slice(1)
                    )}
                  </span>
                  {/* Failed error dialog */}
                  <Dialog
                    open={!!failedErrorDialogDocId}
                    onOpenChange={(_, { open }) => {
                      if (!open) setFailedErrorDialogDocId(null);
                    }}
                    modalType="non-modal"
                  >
                    <DialogSurface>
                      <DialogBody>
                        <DialogTitle>
                          <div className={styles.dialogTitleContent}>
                            <span>Document Error Details</span>
                            <Button
                              appearance="subtle"
                              onClick={() => setFailedErrorDialogDocId(null)}
                              className={styles.closeButton}
                              aria-label="Close error dialog"
                            >
                              <span
                                style={{ fontSize: "24px", lineHeight: "24px" }}
                              >
                                ×
                              </span>
                            </Button>
                          </div>
                        </DialogTitle>
                        <DialogContent>
                          <div style={{ color: "#d13438", marginBottom: 12 }}>
                            {(() => {
                              const doc = documents.find(
                                (d) =>
                                  getDocumentId(d) === failedErrorDialogDocId
                              );
                              return doc?.errorMessage || "Unknown error.";
                            })()}
                          </div>
                        </DialogContent>
                      </DialogBody>
                    </DialogSurface>
                  </Dialog>
                </div>

                {/* Document metadata below */}
                <div className={styles.documentMeta}>
                  <div className={styles.documentMetaRow}>
                    <span className={styles.documentMetaLabel}>Uploaded:</span>
                    <span className={styles.documentMetaValue}>
                      {doc.uploadTimestamp
                        ? new Date(doc.uploadTimestamp).toLocaleString()
                        : "-"}
                    </span>
                    <br />
                    {isCompleted && typeof processingTimeMs === "number" && (
                      <span
                        className={styles.documentMetaDuration}
                        title="Processing duration"
                      >
                        Processed in {Math.round(processingTimeMs / 1000)}s
                      </span>
                    )}
                  </div>
                  <div className={styles.documentMetaRow}>
                    <button
                      className={styles.chunksButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        openChunksDialog(doc);
                      }}
                    >
                      View Chunks: {doc.chunkCount}
                    </button>
                  </div>
                </div>

                {/* Edit button below metadata */}
                <div className={styles.editButtonContainer}>
                  <button
                    className={styles.editButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDialog(doc);
                    }}
                    aria-label="Edit document metadata"
                  >
                    Edit Metadata
                  </button>
                </div>

                {/* Tags Section */}
                {tags.length > 0 && (
                  <div className={styles.documentMetaSection}>
                    <div className={styles.metaLabel}>Tags:</div>
                    <div className={styles.documentTags}>
                      {displayTags.map((tag, index) => (
                        <span
                          key={`${doc.documentId || index}-tag-${index}`}
                          className={styles.tag}
                        >
                          {tag}
                        </span>
                      ))}
                      {tags.length > 8 && !isTagsExpanded && (
                        <button
                          className={styles.showMoreButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTagsExpansion(doc.documentId);
                          }}
                        >
                          +{tags.length - 8} more
                        </button>
                      )}
                      {isTagsExpanded && tags.length > 8 && (
                        <button
                          className={styles.showMoreButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTagsExpansion(doc.documentId);
                          }}
                        >
                          Show less
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Labels Section */}
                {labels.length > 0 && (
                  <div className={styles.documentMetaSection}>
                    <div className={styles.metaLabel}>Labels:</div>
                    <div className={styles.documentLabels}>
                      {displayLabels.map((label, index) => (
                        <span
                          key={`${doc.documentId || index}-label-${index}`}
                          className={styles.label}
                        >
                          {label}
                        </span>
                      ))}
                      {labels.length > 8 && !isLabelsExpanded && (
                        <button
                          className={styles.showMoreButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLabelsExpansion(doc.documentId);
                          }}
                        >
                          +{labels.length - 8} more
                        </button>
                      )}
                      {isLabelsExpanded && labels.length > 8 && (
                        <button
                          className={styles.showMoreButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLabelsExpansion(doc.documentId);
                          }}
                        >
                          Show less
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Custom Metadata Section */}
                {doc.customMetadata &&
                  (() => {
                    // For string metadata, check if it has content after parsing
                    if (typeof doc.customMetadata === "string") {
                      try {
                        const parsed = JSON.parse(doc.customMetadata as string);
                        // If empty object or not an object, don't show anything
                        if (
                          !parsed ||
                          typeof parsed !== "object" ||
                          Object.keys(parsed).length === 0
                        ) {
                          return null;
                        }
                      } catch {
                        // If can't parse as JSON, don't show section
                        return null;
                      }
                    }
                    // For object metadata, check if it has keys
                    else if (
                      typeof doc.customMetadata === "object" &&
                      Object.keys(doc.customMetadata).length === 0
                    ) {
                      return null;
                    }

                    // If we got here, there's metadata to display
                    return (
                      <div className={styles.documentMetaSection}>
                        <div className={styles.metaLabel}>Custom Metadata:</div>
                        <div className={styles.documentCustomMetadata}>
                          {typeof doc.customMetadata === "string"
                            ? // Try to parse string as JSON object
                              (() => {
                                try {
                                  const parsed = JSON.parse(
                                    doc.customMetadata as string
                                  );
                                  return Object.entries(parsed).map(
                                    ([key, value], index) => (
                                      <div
                                        key={`${doc.documentId || index}-meta-${key}`}
                                        className={styles.customMetadataItem}
                                      >
                                        <span
                                          className={styles.customMetadataKey}
                                        >
                                          {key}:
                                        </span>
                                        <span
                                          className={styles.customMetadataValue}
                                        >
                                          {typeof value === "object"
                                            ? JSON.stringify(value)
                                            : String(value)}
                                        </span>
                                      </div>
                                    )
                                  );
                                } catch {
                                  // If parsing fails, display the raw string
                                  return (
                                    <div className={styles.customMetadataItem}>
                                      {String(doc.customMetadata)}
                                    </div>
                                  );
                                }
                              })()
                            : // Handle as object
                              Object.entries(doc.customMetadata).map(
                                ([key, value], index) => (
                                  <div
                                    key={`${doc.documentId || index}-meta-${key}`}
                                    className={styles.customMetadataItem}
                                  >
                                    <span className={styles.customMetadataKey}>
                                      {key}:
                                    </span>
                                    <span
                                      className={styles.customMetadataValue}
                                    >
                                      {typeof value === "object"
                                        ? JSON.stringify(value)
                                        : String(value)}
                                    </span>
                                  </div>
                                )
                              )}
                        </div>
                      </div>
                    );
                  })()}
              </div>
            );
          })}
        </div>
      );
    }

    return <div className={styles.loading}>Loading...</div>;
  };

  // Add toggle function for chunks
  const toggleChunkExpansion = (index: number) => {
    const newSet = new Set(expandedChunks);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setExpandedChunks(newSet);
  };

  // Update renderChunksDialog
  const renderChunksDialog = () => {
    return (
      <Dialog
        open={isChunksDialogOpen}
        onOpenChange={(_e, data) => {
          setIsChunksDialogOpen(data.open);
          if (!data.open) {
            setExpandedChunks(new Set());
          }
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>
              <div className={styles.dialogTitleContent}>
                <span>{selectedDocumentForChunks?.fileName} Chunks</span>
                <Button
                  appearance="subtle"
                  onClick={() => setIsChunksDialogOpen(false)}
                  className={styles.closeButton}
                >
                  <span style={{ fontSize: "24px", lineHeight: "24px" }}>
                    ×
                  </span>
                </Button>
              </div>
            </DialogTitle>
            <DialogContent>
              {isLoadingChunks ? (
                <div className={styles.loadingContainer}>
                  <Spinner size="medium" label="Loading document chunks..." />
                </div>
              ) : chunksError ? (
                <div className={styles.errorMessage}>Error: {chunksError}</div>
              ) : (
                <>
                  <div className={styles.chunksSummary}>
                    <div>
                      <strong>Document ID:</strong>{" "}
                      {selectedDocumentForChunks?.documentId || "N/A"}
                    </div>
                    <div>
                      <strong>Total Chunks:</strong> {documentChunks.length}
                    </div>
                  </div>

                  {documentChunks.length > 0 ? (
                    <div className={styles.chunksList}>
                      {documentChunks.map((chunk, index) => {
                        const isExpanded = expandedChunks.has(index);
                        const charCount = chunk.text ? chunk.text.length : 0;
                        return (
                          <div key={index} className={styles.chunkItem}>
                            <div
                              className={styles.chunkHeader}
                              onClick={() => toggleChunkExpansion(index)}
                            >
                              <div className={styles.chunkNumber}>
                                <span>{isExpanded ? "▼" : "▶"}</span>
                                Chunk #{index + 1}
                              </div>
                              <div className={styles.chunkMetadata}>
                                <div>Characters: {charCount}</div>
                                {chunk.metadata && (
                                  <>
                                    <div>
                                      Index: {chunk.metadata.chunkIndex as number}
                                    </div>
                                    <div>
                                      Segment: {chunk.metadata.segmentIndex as number}
                                    </div>
                                    {chunk.metadata.timestamp && (
                                      <div>
                                        {new Date(
                                          chunk.metadata.timestamp as string | number | Date
                                        ).toLocaleString()}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            {isExpanded && (
                              <>
                                {/* Display tags if available */}
                                {chunk.metadata?.tags && (
                                  <div className={styles.chunkTagsContainer}>
                                    <div className={styles.chunkTagsLabel}>
                                      Tags:
                                    </div>
                                    <div className={styles.chunkTags}>
                                      {formatMetadataForDisplay(
                                        chunk.metadata.tags as string | string[]
                                      ).map((tag, i) => (
                                        <span
                                          key={`tag-${i}`}
                                          className={styles.tag}
                                        >
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Display labels if available */}
                                {chunk.metadata?.labels && (
                                  <div className={styles.chunkLabelsContainer}>
                                    <div className={styles.chunkLabelsLabel}>
                                      Labels:
                                    </div>
                                    <div className={styles.chunkLabels}>
                                      {formatMetadataForDisplay(
                                        chunk.metadata.labels as string | string[]
                                      ).map((label, i) => (
                                        <span
                                          key={`label-${i}`}
                                          className={styles.label}
                                        >
                                          {label}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className={styles.chunkContent}>
                                  {chunk.text || "No content available"}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={styles.noResults}>
                      No chunks found for this document
                    </div>
                  )}
                </>
              )}
            </DialogContent>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    );
  };

  // Add toggle function for expanding/collapsing results
  const toggleResultExpansion = (id: string) => {
    setExpandedResults((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Add a helper function to reset search state
  const resetSearchState = () => {
    console.log("Resetting all search state");
    setSearchQuery("");
    setSearchDatabase("");
    setSearchCollection("");
    setSearchTag("");
    setSearchLabel("");
    setSearchFileName("");
    setSearchDocumentId("");
    setSearchLimit(10);
    setSearchResults([]);
    setSearchMetadata(null);
    setSearchError(null);
    setExpandedResults(new Set());
  };

  /**
   * Performs the search operation and manages results display
   * Handles both semantic search and document retrieval modes
   */
  const emulateSearch = async () => {
    setIsSearching(true);
    setSearchError(null);

    try {
      // Create the base request
      const searchRequest = {
        tenant: "blue-edge",
        database: searchDatabase,
        collection: searchCollection,
        documentId: undefined as string | undefined,
        fileName: undefined as string | undefined,
        query: undefined as string | undefined,
        tag: undefined as string | undefined,
        label: undefined as string | undefined,
        limit: searchLimit,
      };

      // Clear any previous results
      setSearchResults([]);
      setSearchMetadata(null);

      // Log what type of search we're doing for debugging
      if (searchDocumentId && searchDocumentId.trim() !== "") {
        console.log("Performing DOCUMENT ID search:", searchDocumentId.trim());
        searchRequest.documentId = searchDocumentId.trim();
      } else if (searchFileName && searchFileName.trim() !== "") {
        console.log("Performing FILENAME search:", searchFileName.trim());
        searchRequest.fileName = searchFileName.trim();
      } else {
        console.log("Performing QUERY search with filters");
        // Only add query if it's provided
        if (searchQuery && searchQuery.trim() !== "") {
          searchRequest.query = searchQuery.trim();
        }
        // Add filters if provided
        if (searchTag && searchTag.trim() !== "") {
          searchRequest.tag = searchTag.trim();
        }
        if (searchLabel && searchLabel.trim() !== "") {
          searchRequest.label = searchLabel.trim();
        }
      }

      console.log("Search request being sent:", searchRequest);

      const responseData = await documentApi.searchChroma(searchRequest);
      console.log("Search response received:", responseData);

      if (responseData.success) {
        // Handle both regular search results and document chunks
        if (responseData.results) {
          // Regular search results - normalize to expected format
          const normalizedResults = responseData.results.map((result, index) => ({
            id: result.id || `result-${index}`,
            text: result.content || result.text || "No content available",
            metadata: result.metadata,
          }));
          setSearchResults(normalizedResults);
        } else if (responseData.chunks) {
          // Document retrieval results - map chunks to the expected format
          console.log(
            `Found ${responseData.chunks.length} chunks for document ID ${searchDocumentId}`
          );

          // Normalize chunk format to match what the UI expects from search results
          const normalizedChunks = responseData.chunks.map(
            (chunk, index: number) => ({
              id: chunk.id || `chunk-${index}`,
              text: chunk.text || "No content available",
              metadata: {
                ...chunk.metadata,
                // If fileName is missing in metadata, add it from the response metadata
                fileName:
                  (chunk.metadata?.fileName as string) ||
                  (responseData.metadata?.fileName as string) ||
                  "Document Chunk",
                documentId: responseData.documentId || searchDocumentId,
              } as DocumentMetadata,
            })
          );

          setSearchResults(normalizedChunks);
        } else {
          // No results found
          setSearchResults([]);
          console.log("No results or chunks found in response");
        }

        setSearchMetadata(responseData.metadata || null);

        // Scroll to results after they're loaded
        setTimeout(() => {
          if (
            (responseData.results && responseData.results.length > 0) ||
            responseData.metadata
          ) {
            const resultsElement = resultsSectionRef.current;
            if (resultsElement) {
              const container = resultsElement.closest(
                `.${styles.searchDialogContent}`
              );
              if (container) {
                container.scrollTo({
                  top: resultsElement.offsetTop - 20,
                  behavior: "smooth",
                });
              }
            }
          }
        }, 100);
      } else {
        setSearchError("Search failed to return results");
      }
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    } finally {
      setIsSearching(false);
    }
  };

  // Update renderSearchEmulator to use CSS classes for the search form
  const renderSearchEmulator = () => {
    return (
      <Dialog
        open={isSearchEmulatorOpen}
        onOpenChange={(_, { open }) => {
          console.log("Dialog onOpenChange triggered, open:", open);
          setIsSearchEmulatorOpen(open);

          // Reset all search state when closing the dialog
          if (!open) {
            console.log("Clearing search state from onOpenChange");
            resetSearchState();
          }
        }}
      >
        <DialogSurface style={{ maxWidth: "950px", width: "90vw" }}>
          <DialogBody>
            <DialogTitle>
              <div className={styles.dialogTitleContent}>
                <span>Emulate Search</span>
                <Button
                  appearance="subtle"
                  onClick={() => {
                    // Reset all search state when closing
                    resetSearchState();

                    // Close the dialog
                    setIsSearchEmulatorOpen(false);
                  }}
                  className={styles.closeButton}
                >
                  <span style={{ fontSize: "24px", lineHeight: "24px" }}>
                    ×
                  </span>
                </Button>
              </div>
            </DialogTitle>
            <DialogContent>
              <div className={styles.searchDialog}>
                <div className={styles.searchDialogContent}>
                  {/* Description of the Search Emulator */}
                  <div className={styles.emulatorIntro}>
                    <p>
                      This component uses the same search functionality as the
                      AI, allowing you to test and preview how different search
                      parameters affect the results. You can experiment with
                      various settings and see the exact responses without
                      impacting the live system.
                    </p>
                  </div>

                  {/* Search Section */}
                  <div ref={searchSectionRef} className={styles.searchForm}>
                    <div className={styles.sectionGroup}>
                      <h4 className={styles.sectionHeader}>
                        Database & Collection
                      </h4>
                      <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                          <Label htmlFor="searchDatabase" required>
                            Database
                          </Label>
                          <Dropdown
                            id="searchDatabase"
                            value={searchDatabase}
                            selectedOptions={
                              searchDatabase ? [searchDatabase] : []
                            }
                            onOptionSelect={handleDatabaseChange}
                            placeholder="Select database"
                          >
                            {getAvailableDatabases().map((db) => (
                              <Option key={db} value={db}>
                                {db}
                              </Option>
                            ))}
                          </Dropdown>
                        </div>
                        <div className={styles.formGroup}>
                          <Label htmlFor="searchCollection" required>
                            Collection
                          </Label>
                          <Dropdown
                            id="searchCollection"
                            value={searchCollection}
                            selectedOptions={
                              searchCollection ? [searchCollection] : []
                            }
                            onOptionSelect={handleCollectionChange}
                            placeholder="Select collection"
                            disabled={!searchDatabase}
                          >
                            {getAvailableCollections(searchDatabase).map(
                              (col) => (
                                <Option key={col} value={col}>
                                  {col}
                                </Option>
                              )
                            )}
                          </Dropdown>
                        </div>
                      </div>
                    </div>

                    <div className={styles.sectionGroup}>
                      <div className={styles.searchTypeRow}>
                        {/* Left side - Search Query */}
                        <div className={styles.searchColumn}>
                          <h4 className={styles.sectionHeader}>
                            Semantic Search
                          </h4>
                          <div className={styles.formGroup}>
                            <Label
                              htmlFor="searchQuery"
                              required={!searchDocumentId && !searchFileName}
                            >
                              Search Query
                            </Label>
                            <Input
                              id="searchQuery"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Enter search query"
                            />
                          </div>
                        </div>

                        {/* Center - OR separator */}
                        <div className={styles.orSeparator}>
                          <div className={styles.verticalLine} />
                          <div className={styles.orLabel}>OR</div>
                          <div className={styles.verticalLine} />
                        </div>

                        {/* Right side - Document Retrieval */}
                        <div className={styles.searchColumn}>
                          <h4 className={styles.sectionHeader}>
                            Document Retrieval
                          </h4>
                          <div className={styles.retrievalDescription}>
                            <p>
                              Use either a document ID or the filename to
                              retrieve the whole document with all its chunks.
                            </p>
                          </div>
                          <div
                            className={`${styles.formGroup} ${styles.formRowSpacing}`}
                          >
                            <Label htmlFor="searchDocumentId">
                              Document ID
                            </Label>
                            <Input
                              id="searchDocumentId"
                              value={searchDocumentId}
                              onChange={(e) =>
                                setSearchDocumentId(e.target.value.trim())
                              }
                              placeholder="Enter document ID"
                            />
                          </div>

                          <div className={styles.formGroup}>
                            <Label htmlFor="searchFileName">File Name</Label>
                            <Input
                              id="searchFileName"
                              value={searchFileName}
                              onChange={(e) =>
                                setSearchFileName(e.target.value.trim())
                              }
                              placeholder="Enter file name"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Filters Section */}
                    <div className={styles.sectionGroup}>
                      <h4 className={styles.sectionHeader}>
                        Additional Filters
                      </h4>
                      <div
                        className={styles.filtersRow}
                        style={{
                          display: "flex",
                          flexWrap: "nowrap",
                          gap: "1rem",
                          justifyContent: "space-between",
                        }}
                      >
                        <div className={styles.formGroup} style={{ flex: "1" }}>
                          <Label htmlFor="searchTag">Tag Filter</Label>
                          <Input
                            id="searchTag"
                            value={searchTag}
                            onChange={(e) => setSearchTag(e.target.value)}
                            placeholder="Enter tag to filter by"
                          />
                        </div>
                        <div className={styles.formGroup} style={{ flex: "1" }}>
                          <Label htmlFor="searchLabel">Label Filter</Label>
                          <Input
                            id="searchLabel"
                            value={searchLabel}
                            onChange={(e) => setSearchLabel(e.target.value)}
                            placeholder="Enter label to filter by"
                          />
                        </div>
                        <div
                          className={`${styles.formGroup} ${styles.formWidthLimit}`}
                          style={{ flex: "0 0 150px" }}
                        >
                          <Label htmlFor="searchLimit">Result Limit</Label>
                          <SpinButton
                            value={searchLimit}
                            min={1}
                            max={100}
                            onChange={(_e, data) => {
                              if (typeof data.value === "number") {
                                setSearchLimit(data.value);
                              }
                            }}
                            step={1}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Results Section */}
                  {(searchResults.length > 0 ||
                    searchMetadata ||
                    searchError) && (
                    <div ref={resultsSectionRef}>
                      {searchError && (
                        <div className={styles.errorMessage}>
                          Error: {searchError}
                        </div>
                      )}

                      {(searchResults.length > 0 || searchMetadata) && (
                        <div className={styles.resultsContainer}>
                          <div className={styles.resultsHeader}>
                            <h2>Search Results</h2>
                            <Button
                              appearance="subtle"
                              icon={<ArrowUp24Regular />}
                              onClick={() => scrollToSection(searchSectionRef)}
                            >
                              Back to Search
                            </Button>
                          </div>

                          {searchMetadata && (
                            <div className={styles.searchMetadata}>
                              <h3>Search Metadata</h3>
                              <p className={styles.metadataDescription}>
                                This shows the exact query that was sent to
                                Chroma, including any filters and parameters
                                that were applied.
                              </p>
                              <pre>
                                {JSON.stringify(searchMetadata, null, 2)}
                              </pre>
                            </div>
                          )}

                          {searchResults.length > 0 ? (
                            <div className={styles.searchResults}>
                              <h3>Results ({searchResults.length})</h3>
                              {searchResults.map((result, index) => {
                                const resultId = result.id || index.toString();
                                const isExpanded =
                                  expandedResults.has(resultId);
                                return (
                                  <div
                                    key={index}
                                    className={styles.searchResult}
                                  >
                                    <div
                                      className={styles.resultHeader}
                                      onClick={() =>
                                        toggleResultExpansion(resultId)
                                      }
                                      style={{ cursor: "pointer" }}
                                    >
                                      <h4>
                                        <span style={{ marginRight: "8px" }}>
                                          {isExpanded ? "▼" : "▶"}
                                        </span>
                                        {(result.metadata?.fileName as string) ||
                                          "Unknown Document"}
                                        {result.metadata?.chunkIndex !==
                                          undefined && (
                                          <span className={styles.chunkInfo}>
                                            - Chunk{" "}
                                            {(result.metadata.chunkIndex as number) + 1}
                                            {result.metadata.segmentIndex !==
                                              undefined &&
                                              ` (Segment ${(result.metadata.segmentIndex as number) + 1})`}
                                          </span>
                                        )}
                                      </h4>
                                    </div>

                                    {isExpanded && (
                                      <>
                                        <div className={styles.resultMetadata}>
                                          <h5>Metadata</h5>
                                          <pre>
                                            {JSON.stringify(
                                              result.metadata,
                                              null,
                                              2
                                            )}
                                          </pre>
                                        </div>
                                        <div className={styles.resultText}>
                                          <h5>Content</h5>
                                          <pre>{result.text}</pre>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className={styles.noResults}>
                              <p>No results found for your search criteria.</p>
                              <p>Try adjusting your search terms or filters.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Sticky Bottom Bar */}
                <div className={styles.stickyBottomBar}>
                  <div className={styles.searchButtonContainer}>
                    <Button
                      appearance="primary"
                      onClick={() => {
                        // Clear previous results before starting new search
                        setSearchResults([]);
                        setSearchMetadata(null);
                        setSearchError(null);
                        emulateSearch();
                      }}
                      disabled={isSearching || !isValidSearch()}
                    >
                      {isSearching ? "Searching..." : "Search"}
                    </Button>
                  </div>
                  {(searchResults.length > 0 || searchMetadata) && (
                    <div className={styles.backToTopContainer}>
                      <Button
                        appearance="subtle"
                        icon={<ArrowUp24Regular />}
                        onClick={() => {
                          const container = document.querySelector(
                            `.${styles.searchDialogContent}`
                          );
                          if (container) {
                            container.scrollTo({
                              top: 0,
                              behavior: "smooth",
                            });
                          }
                        }}
                      >
                        Back to Top
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    );
  };

  // Add delete handler function
  const handleDeleteDocument = async () => {
    if (!documentToDelete?.documentId) return;

    try {
      const url = getFunctionUrl(
        `/api/admin-documents?tenant=${tenant}&documentId=${documentToDelete.documentId}&action=delete`
      );
      const response = await fetch(url, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to delete document");
      }

      // Close dialog and refresh documents
      setIsDeleteDialogOpen(false);
      setDocumentToDelete(null);
      await fetchDocuments();
      setUpdateSuccess(`${documentToDelete.fileName} deleted successfully`);
      setTimeout(() => setUpdateSuccess(null), 3000);
    } catch (err) {
      setError(
        `Failed to delete document: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  };

  // Add collection delete handler
  const handleDeleteCollection = async () => {
    if (!collectionToDelete) {
      console.error("No collection to delete");
      return;
    }

    console.log("Deleting collection:", collectionToDelete);

    try {
      // Use the correct endpoint for collection deletion
      const url = getFunctionUrl(
        `/api/admin-collections?tenant=${tenant}&database=${collectionToDelete.database}&collection=${collectionToDelete.collection}`
      );
      console.log("Delete URL:", url);

      const response = await fetch(url, {
        method: "DELETE", // Use DELETE method instead of GET
      });
      console.log("Delete response status:", response.status);

      // Try to get the response text regardless of status
      const responseText = await response.text();
      console.log("Delete response text:", responseText);

      if (!response.ok) {
        console.error("Delete error response:", responseText);
        throw new Error(
          `Failed to delete collection: ${response.status} ${response.statusText}`
        );
      }

      // Try to parse the response as JSON if it's not empty
      let responseData;
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
        console.log("Delete response data:", responseData);
      } catch (parseError) {
        console.warn("Could not parse response as JSON:", parseError);
        responseData = {};
      }

      // Close dialog and refresh data
      setIsDeleteCollectionDialogOpen(false);
      setCollectionToDelete(null);
      await fetchStats();
      await fetchDocuments();
      setUpdateSuccess(
        `Collection ${collectionToDelete.collection} deleted successfully`
      );
      setTimeout(() => setUpdateSuccess(null), 3000);

      // Navigate back to database view
      navigateToDatabase(collectionToDelete.database);
    } catch (err) {
      console.error("Delete collection error:", err);
      setError(
        `Failed to delete collection: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  };

  // Add database delete handler
  const handleDeleteDatabase = async () => {
    if (!databaseToDelete) {
      console.error("No database to delete");
      return;
    }

    console.log("Deleting database:", databaseToDelete);

    try {
      // Use the correct endpoint for database deletion
      const url = getFunctionUrl(
        `/api/admin-collections?tenant=${tenant}&database=${databaseToDelete}`
      );
      console.log("Delete URL:", url);

      const response = await fetch(url, {
        method: "DELETE", // Use DELETE method
      });
      console.log("Delete response status:", response.status);

      // Try to get the response text regardless of status
      const responseText = await response.text();
      console.log("Delete response text:", responseText);

      if (!response.ok) {
        console.error("Delete error response:", responseText);
        throw new Error(
          `Failed to delete database: ${response.status} ${response.statusText}`
        );
      }

      // Try to parse the response as JSON if it's not empty
      let responseData;
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
        console.log("Delete response data:", responseData);
      } catch (parseError) {
        console.warn("Could not parse response as JSON:", parseError);
        responseData = {};
      }

      // Close dialog and refresh data
      setIsDeleteDatabaseDialogOpen(false);
      setDatabaseToDelete(null);
      await fetchStats();
      await fetchDocuments();
      setUpdateSuccess(`Database ${databaseToDelete} deleted successfully`);
      setTimeout(() => setUpdateSuccess(null), 3000);

      // Navigate back to root view
      navigateToRoot();
    } catch (err) {
      console.error("Delete database error:", err);
      setError(
        `Failed to delete database: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  };

  // Get document ID from various possible properties
  const getDocumentId = (doc: Document): string => {
    return doc.documentId || doc.rowKey || doc.id || doc._id || "";
  };

  // Generate a unique key for a document
  const getDocumentKey = (doc: Document): string => {
    const id = getDocumentId(doc);
    return id
      ? `doc-${id}`
      : `doc-${Math.random().toString(36).substring(2, 11)}`;
  };

  // Helper to reset upload dialog state
  const resetUploadDialogState = () => {
    setSelectedFiles([]);
    setOversizedFiles(new Set());
    setTotalSize(0);
    setTags("");
    setLabels("");
    setUploadMetadataEntries([{ key: "", value: "" }]);
    setIsNewDatabase(false);
    setIsNewCollection(false);
    setDatabase("");
    setCollection("");
    setUploadSuccess(null);
    setUploadProgress(0);
    setFileProgress({});
  };

  // Render Poison Queue dialog
  const renderPoisonQueueDialog = () => (
    <Dialog
      open={isPoisonQueueOpen}
      onOpenChange={(_, data) => setIsPoisonQueueOpen(data.open)}
    >
      <DialogSurface style={{ minWidth: "800px", maxWidth: "90vw" }}>
        <DialogBody>
          <DialogTitle>
            <div className={styles.dialogTitleContent}>
              <span>Poison Queue</span>
              <Button
                appearance="subtle"
                onClick={() => setIsPoisonQueueOpen(false)}
                className={styles.closeButton}
                aria-label="Close"
              >
                <span style={{ fontSize: "24px", lineHeight: "24px" }}>×</span>
              </Button>
            </div>
          </DialogTitle>
          <DialogContent>
            <div style={{ padding: "16px 0" }}>
              {/* Summary Section */}
              {poisonQueueSummary && (
                <div
                  style={{
                    marginBottom: "24px",
                    padding: "16px",
                    backgroundColor: "#f8f9fa",
                    borderRadius: "8px",
                    border: "1px solid #e9ecef",
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 12px 0",
                      color: "#333",
                      fontSize: "1.1rem",
                    }}
                  >
                    Recovery Summary
                  </h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "16px",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: "#0078d4" }}>
                        {poisonQueueSummary.totalDocuments}
                      </div>
                      <div style={{ fontSize: "0.9rem", color: "#666" }}>
                        Total Documents
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#107c10" }}>
                        {poisonQueueSummary.recoverableDocuments}
                      </div>
                      <div style={{ fontSize: "0.9rem", color: "#666" }}>
                        Recoverable
                      </div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#d13438" }}>
                        {poisonQueueSummary.nonRecoverableDocuments}
                      </div>
                      <div style={{ fontSize: "0.9rem", color: "#666" }}>
                        Non-recoverable
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: "12px",
                      fontSize: "0.9rem",
                      color: "#666",
                    }}
                  >
                    Status: {poisonQueueSummary.filters.status} | Tenant:{" "}
                    {poisonQueueSummary.filters.tenant} | Max Documents:{" "}
                    {poisonQueueSummary.filters.maxDocuments}
                  </div>
                </div>
              )}

              <div
                style={{
                  marginBottom: "16px",
                  display: "flex",
                  gap: "12px",
                  alignItems: "flex-end",
                }}
              >
                <div style={{ flex: 1, maxWidth: "200px" }}>
                  <Label htmlFor="maxDocuments">Max Messages to Recover</Label>
                  <Input
                    id="maxDocuments"
                    type="number"
                    min="1"
                    max="100"
                    value={maxDocuments.toString()}
                    onChange={(e) =>
                      setMaxDocuments(
                        Math.min(
                          100,
                          Math.max(1, parseInt(e.target.value) || 1)
                        )
                      )
                    }
                    style={{ width: "100%" }}
                  />
                </div>
                <Button
                  appearance="primary"
                  onClick={handleRecoverFailedItems}
                  disabled={isRecovering || poisonQueueItems.length === 0}
                  icon={
                    isRecovering ? (
                      <Spinner size="tiny" />
                    ) : (
                      <ArrowSyncRegular />
                    )
                  }
                >
                  {isRecovering ? "Recovering..." : "Recover Failed Items"}
                </Button>
              </div>

              {recoveryStatus && (
                <div
                  className={styles.success}
                  style={{ marginBottom: "16px" }}
                >
                  {recoveryStatus}
                </div>
              )}

              {poisonQueueError && (
                <div className={styles.error} style={{ marginBottom: "16px" }}>
                  {poisonQueueError}
                </div>
              )}

              {isLoadingPoisonQueue ? (
                <div style={{ textAlign: "center", padding: "32px" }}>
                  <Spinner label="Loading poison queue items..." />
                </div>
              ) : poisonQueueItems.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "32px",
                    color: "#666",
                    backgroundColor: "#f9f9f9",
                    borderRadius: "4px",
                    margin: "16px 0",
                  }}
                >
                  No items in poison queue
                </div>
              ) : (
                <div
                  style={{
                    maxHeight: "400px",
                    overflowY: "auto",
                    border: "1px solid #eaeaea",
                    borderRadius: "4px",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr
                        style={{
                          backgroundColor: "#f5f5f5",
                          position: "sticky",
                          top: 0,
                          zIndex: 1,
                        }}
                      >
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            borderBottom: "1px solid #e0e0e0",
                            fontWeight: 600,
                            color: "#333",
                          }}
                        >
                          Document
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            borderBottom: "1px solid #e0e0e0",
                            fontWeight: 600,
                            color: "#333",
                          }}
                        >
                          Error Message
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            borderBottom: "1px solid #e0e0e0",
                            fontWeight: 600,
                            color: "#333",
                            width: "180px",
                          }}
                        >
                          Upload Time
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "center",
                            borderBottom: "1px solid #e0e0e0",
                            fontWeight: 600,
                            color: "#333",
                            width: "100px",
                          }}
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {poisonQueueItems.map((item, index) => (
                        <tr
                          key={item.documentId}
                          style={{
                            backgroundColor:
                              index % 2 === 0 ? "#fff" : "#fafafa",
                            borderBottom: "1px solid #f0f0f0",
                          }}
                        >
                          <td
                            style={{
                              padding: "12px",
                              verticalAlign: "top",
                              borderBottom: "1px solid #f0f0f0",
                            }}
                          >
                            <div
                              style={{ fontWeight: 500, marginBottom: "4px" }}
                            >
                              {item.fileName || "Unknown Document"}
                            </div>
                            <div style={{ fontSize: "0.8em", color: "#666" }}>
                              <div>DB: {item.database}</div>
                              <div>Collection: {item.collection}</div>
                              <div>Status: {item.status}</div>
                              <div
                                style={{
                                  fontFamily: "monospace",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  maxWidth: "200px",
                                }}
                              >
                                ID: {item.documentId}
                              </div>
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "12px",
                              verticalAlign: "top",
                              borderBottom: "1px solid #f0f0f0",
                              maxWidth: "400px",
                              wordBreak: "break-word",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "0.85em",
                                color: "#d32f2f",
                                fontFamily: "monospace",
                                whiteSpace: "pre-wrap",
                                backgroundColor: "#fff5f5",
                                padding: "8px",
                                borderRadius: "4px",
                                maxHeight: "120px",
                                overflow: "auto",
                                border: "1px solid #ffebee",
                              }}
                            >
                              {item.errorMessage ||
                                "No error message available"}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "12px",
                              verticalAlign: "top",
                              borderBottom: "1px solid #f0f0f0",
                              fontSize: "0.9em",
                              color: "#666",
                            }}
                          >
                            {new Date(item.uploadTimestamp).toLocaleString()}
                            <div
                              style={{ marginTop: "4px", fontSize: "0.8em" }}
                            >
                              Tenant: {item.tenant}
                            </div>
                          </td>
                          <td
                            style={{
                              padding: "12px",
                              verticalAlign: "top",
                              borderBottom: "1px solid #f0f0f0",
                              textAlign: "center",
                            }}
                          >
                            <Button
                              size="small"
                              appearance="primary"
                              onClick={() =>
                                handleRetryDocument(item.documentId)
                              }
                              disabled={retryingDocuments.has(item.documentId)}
                              style={{ fontSize: "0.8rem" }}
                            >
                              {retryingDocuments.has(item.documentId)
                                ? "Retrying..."
                                : "Retry"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </DialogContent>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>ChromaDB Management</h1>
        <div className={styles.headerActionsContainer}>
          {/* Upload Document Dialog */}
          <Dialog
            open={isUploadDialogOpen}
            onOpenChange={(_e, data) => {
              if (!data.open) {
                resetUploadDialogState();
                // Refresh data
                fetchDocuments();
              }
              setIsUploadDialogOpen(data.open);
            }}
          >
            <DialogTrigger>
              <Button>Upload Document</Button>
            </DialogTrigger>
            <DialogSurface>
              <DialogBody>
                <DialogTitle>
                  <div className={styles.dialogTitleContent}>
                    <span>Upload Document</span>
                    <Button
                      appearance="subtle"
                      onClick={() => {
                        setIsUploadDialogOpen(false);
                        resetUploadDialogState();
                      }}
                      className={styles.closeButton}
                    >
                      <span style={{ fontSize: "24px", lineHeight: "24px" }}>
                        ×
                      </span>
                    </Button>
                  </div>
                </DialogTitle>
                <DialogContent>
                  <div className={styles.formGroup}>
                    {" "}
                    <Label htmlFor="database">Client Database</Label>
                    <div className={styles.formHint}>
                      Single word - lowercase letters and numbers only (no
                      underscores or spaces)
                    </div>
                    <div className={styles.databaseSelectionContainer}>
                      {!isNewDatabase ? (
                        <>
                          <Dropdown
                            id="database"
                            value={database}
                            selectedOptions={database ? [database] : []}
                            onOptionSelect={(_e, data) => {
                              setDatabase(data.selectedOptions[0] || "");
                              if (!isNewCollection) {
                                setCollection(""); // Reset collection when database changes
                              }
                            }}
                            placeholder="Select database"
                          >
                            {getAvailableDatabases().map((db) => (
                              <Option key={db} value={db}>
                                {db}
                              </Option>
                            ))}
                          </Dropdown>
                          <Button
                            appearance="secondary"
                            icon={<AddRegular />}
                            onClick={() => {
                              setIsNewDatabase(true);
                              setIsNewCollection(true); // Force new collection when creating new database
                            }}
                            className={styles.newEntryButton}
                          >
                            Add New
                          </Button>
                        </>
                      ) : (
                        <div className={styles.newEntryContainer}>
                          {" "}
                          <Input
                            id="database"
                            value={database}
                            onChange={(e) =>
                              setDatabase(normalizeDatabaseName(e.target.value))
                            }
                            placeholder="Enter new database name (auto-normalized)"
                          />
                          <Button
                            appearance="secondary"
                            icon={<ArrowSyncRegular />}
                            onClick={() => {
                              setIsNewDatabase(false);
                              setDatabase("");
                            }}
                            className={styles.selectExistingButton}
                          >
                            Select Existing
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    {" "}
                    <Label htmlFor="collection">Collection</Label>
                    <div className={styles.formHint}>
                      Use lowercase letters, numbers, and underscores only (no
                      spaces)
                    </div>
                    <div className={styles.collectionSelectionContainer}>
                      {!isNewCollection ? (
                        <>
                          <Dropdown
                            id="collection"
                            value={collection}
                            selectedOptions={collection ? [collection] : []}
                            onOptionSelect={(_e, data) =>
                              setCollection(data.selectedOptions[0] || "")
                            }
                            placeholder="Select collection"
                            disabled={!database || isNewDatabase}
                          >
                            {getAvailableCollections(database).map((col) => (
                              <Option key={col} value={col}>
                                {col}
                              </Option>
                            ))}
                          </Dropdown>
                          <Button
                            appearance="secondary"
                            icon={<AddRegular />}
                            onClick={() => setIsNewCollection(true)}
                            className={styles.newEntryButton}
                            disabled={!database}
                          >
                            Add New
                          </Button>
                        </>
                      ) : (
                        <div className={styles.newEntryContainer}>
                          {" "}
                          <Input
                            id="collection"
                            value={collection}
                            onChange={(e) =>
                              setCollection(
                                normalizeDbOrCollectionName(e.target.value)
                              )
                            }
                            placeholder="Enter new collection name (auto-normalized)"
                          />
                          {!isNewDatabase && (
                            <Button
                              appearance="secondary"
                              icon={<ArrowSyncRegular />}
                              onClick={() => setIsNewCollection(false)}
                              className={styles.selectExistingButton}
                            >
                              Select Existing
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="Enter tags"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <Label htmlFor="labels">Labels (comma-separated)</Label>
                    <Input
                      id="labels"
                      value={labels}
                      onChange={(e) => setLabels(e.target.value)}
                      placeholder="Enter labels"
                    />
                  </div>
                  <div className={styles.metadataEditor}>
                    <div className={styles.metadataHeaders}>
                      <span className={styles.metadataHeaderKey}>Key</span>
                      <span className={styles.metadataHeaderValue}>Value</span>
                      <span className={styles.metadataHeaderAction}></span>
                    </div>
                    {uploadMetadataEntries.map((entry, index) => (
                      <div key={index} className={styles.metadataEntry}>
                        <Input
                          className={styles.metadataKey}
                          value={entry.key}
                          onChange={(e) =>
                            updateUploadMetadataEntry(
                              index,
                              "key",
                              e.target.value
                            )
                          }
                          placeholder="Key"
                        />
                        <Input
                          className={styles.metadataValue}
                          value={entry.value}
                          onChange={(e) =>
                            updateUploadMetadataEntry(
                              index,
                              "value",
                              e.target.value
                            )
                          }
                          placeholder="Value"
                        />
                        <button
                          className={styles.removeMetadataButton}
                          onClick={() => removeUploadMetadataEntry(index)}
                          disabled={uploadMetadataEntries.length === 1}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      className={styles.addMetadataButton}
                      onClick={addUploadMetadataEntry}
                    >
                      + Add Metadata Entry
                    </button>
                  </div>{" "}
                  {/* Add Chunking Options Section */}
                  <div className={styles.formGroup}>
                    <Label>Chunking Options</Label>
                    <div className={styles.chunkingOptions}>
                      {/* <div className={styles.chunkingOption}>
                        <Label htmlFor="chunkSize">Chunk Size</Label>
                        <SpinButton
                          id="chunkSize"
                          value={chunkSize}
                          onChange={(_, data) => {
                            if (
                              data.value !== undefined &&
                              data.value !== null
                            ) {
                              const value = parseInt(String(data.value), 10);
                              if (!isNaN(value)) {
                                setChunkSize(value);
                              }
                            }
                          }}
                          min={100}
                          max={10000}
                          step={100}
                        />
                        <span className={styles.optionHint}>
                          Size of each chunk (default: 500)
                        </span>
                      </div> */}
                      {/* <div className={styles.chunkingOption}>
                        <Label htmlFor="chunkOverlap">Chunk Overlap</Label>
                        <SpinButton
                          id="chunkOverlap"
                          value={chunkOverlap}
                          onChange={(_, data) => {
                            if (
                              data.value !== undefined &&
                              data.value !== null
                            ) {
                              const value = parseInt(String(data.value), 10);
                              if (!isNaN(value)) {
                                setChunkOverlap(value);
                              }
                            }
                          }}
                          min={0}
                          max={1000}
                          step={10}
                        />
                        <span className={styles.optionHint}>
                          Overlap between chunks (default: 0)
                        </span>
                      </div> */}
                      <div className={styles.chunkingOption}>
                        <Label htmlFor="chunkStrategy">Chunk Strategy</Label>
                        <Dropdown
                          id="chunkStrategy"
                          value={chunkStrategy}
                          onOptionSelect={(_, data) =>
                            setChunkStrategy(data.optionValue as string)
                          }
                        >
                          <Option value="fixed">Fixed Size</Option>
                          <Option value="paragraph">Paragraph</Option>
                          <Option value="sentence">Sentence</Option>
                          <Option value="smart">Smart</Option>
                        </Dropdown>
                        <span className={styles.optionHint}>
                          Strategy for splitting text into chunks (default:
                          smart)
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <Label htmlFor="file">Files</Label>
                    <div className={styles.fileUploadContainer}>
                      <div className={styles.fileInputWrapper}>
                        <Button
                          appearance="secondary"
                          icon={<DocumentRegular />}
                          onClick={() =>
                            document.getElementById("fileInput")?.click()
                          }
                        >
                          Choose Files
                        </Button>
                        <input
                          type="file"
                          id="fileInput"
                          multiple
                          accept=".pdf"
                          onChange={handleFileSelection}
                          style={{ display: "none" }}
                        />
                      </div>
                      {selectedFiles.length > 0 && (
                        <div className={styles.selectedFiles}>
                          <div className={styles.selectedFilesHeader}>
                            <Label>
                              Selected Files ({selectedFiles.length})
                            </Label>
                            <div className={styles.selectedFilesInfo}>
                              <span>
                                Total Size: {formatFileSize(totalSize)}
                              </span>
                              <span>Types: PDF</span>
                            </div>
                          </div>
                          <div className={styles.fileList}>
                            {selectedFiles.map((file, index) => {
                              const isOversized = oversizedFiles.has(file.name);
                              return (
                                <div
                                  key={index}
                                  className={styles.fileItem}
                                  style={
                                    isOversized
                                      ? {
                                          border: "2px solid #d32f2f",
                                          background: "#fff5f5",
                                        }
                                      : undefined
                                  }
                                >
                                  <DocumentRegular />
                                  <div className={styles.fileItemInfo}>
                                    <span className={styles.fileName}>
                                      {file.name}
                                    </span>
                                    <span className={styles.fileSize}>
                                      {formatFileSize(file.size)}
                                    </span>
                                    <div
                                      className={styles.progressContainer}
                                      style={{ minWidth: 120 }}
                                    >
                                      <div className={styles.progressTrack}>
                                        <div
                                          className={styles.progressBar}
                                          style={{
                                            width: `${fileProgress[file.name] || 0}%`,
                                          }}
                                        />
                                      </div>
                                      <span style={{ fontSize: 12 }}>
                                        {fileProgress[file.name]
                                          ? `${fileProgress[file.name]}%`
                                          : "0%"}
                                      </span>
                                    </div>
                                    {isOversized && (
                                      <div
                                        style={{
                                          color: "#d32f2f",
                                          fontWeight: 600,
                                          marginTop: 4,
                                        }}
                                      >
                                        File is too large (max 100MB). Please
                                        delete this file.
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    className={styles.removeFileButton}
                                    onClick={() => handleFileRemove(index)}
                                    title="Remove file"
                                    disabled={isUploading}
                                  >
                                    <DeleteRegular />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {uploadProgress > 0 && (
                    <div className={styles.progressContainer}>
                      <div className={styles.progressTrack}>
                        <div
                          className={styles.progressBar}
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {uploadSuccess && (
                    <div className={styles.success}>{uploadSuccess}</div>
                  )}
                </DialogContent>
                <div className={styles.dialogActions}>
                  <Button
                    appearance="secondary"
                    onClick={() => {
                      setIsUploadDialogOpen(false);
                      resetUploadDialogState();
                    }}
                    disabled={isUploading}
                  >
                    Cancel
                  </Button>
                  <Button
                    appearance="primary"
                    onClick={handleFileUpload}
                    disabled={
                      !selectedFiles.length ||
                      !database ||
                      !collection ||
                      isUploading ||
                      oversizedFiles.size > 0
                    }
                    icon={isUploading ? <Spinner size="tiny" /> : undefined}
                  >
                    {isUploading ? "Uploading..." : "Upload"}
                  </Button>
                </div>
                {/* Show message that file is over size limit */}
                <div
                  className={styles.dialogActions}
                  style={{ justifyContent: "flex-start" }}
                >
                  {oversizedFiles.size > 0 && (
                    <Text style={{ color: "#d32f2f", fontWeight: 500 }}>
                      File too big
                    </Text>
                  )}
                </div>
              </DialogBody>
            </DialogSurface>
          </Dialog>
          <Button onClick={() => setIsSearchEmulatorOpen(true)}>
            Emulate Search
          </Button>
          <Button
            appearance="secondary"
            icon={<DocumentQueueMultipleRegular />}
            onClick={() => setIsPoisonQueueOpen(true)}
          >
            Poison Queue
          </Button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {updateSuccess && <div className={styles.success}>{updateSuccess}</div>}

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statCardTitle}>Total Documents</div>
          <div className={styles.statCardValue}>
            {statsLoading ? (
              <Spinner size="medium" label="Loading document data..." />
            ) : (
              stats?.totalDocuments || 0
            )}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardTitle}>Processing</div>
          <div className={styles.statCardValue}>
            {queueListLoading ? (
              <Spinner size="medium" label="Loading queue data..." />
            ) : (
              filteredProcessingDocs.length
            )}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardTitle}>Completed (Recent)</div>
          <div className={styles.statCardValue}>
            {queueStatsLoading ? (
              <Spinner size="medium" label="Loading queue data..." />
            ) : (
              queueStats?.recentlyCompleted || 0
            )}
          </div>
        </div>
      </div>

      {/* Main Layout with Sidebar */}
      <div className={styles.mainLayout}>
        {/* Main Content */}
        <div className={`${styles.mainContent} ${styles.mainContentContainer}`}>
          {/* Document Explorer */}
          <div
            className={`${styles.documentExplorer} ${styles.documentExplorerContainer}`}
          >
            <div
              className={`${styles.explorerHeader} ${styles.explorerHeaderSticky}`}
            >
              <h2 className={styles.sectionTitle}>Document Explorer</h2>

              {/* Breadcrumb Navigation */}
              <div
                className={styles.breadcrumbContainer}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                <Breadcrumb aria-label="Navigation" size="large">
                  {navPath.map((item, index) => (
                    <span key={`${item.type}-${item.name}`}>
                      {index > 0 && (
                        <BreadcrumbDivider key={`divider-${index}`} />
                      )}
                      <BreadcrumbItem
                        onClick={() => handleBreadcrumbClick(index)}
                      >
                        <span>
                          {index === 0 ? (
                            <HomeRegular />
                          ) : index === 1 ? (
                            <FolderRegular />
                          ) : (
                            <DocumentRegular />
                          )}{" "}
                          {item.type === "collection"
                            ? decodeIndexToDisplayName(item.name)
                            : item.name}
                        </span>
                      </BreadcrumbItem>
                    </span>
                  ))}{" "}
                </Breadcrumb>
                <div
                  style={{
                    marginLeft: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {" "}
                  {failedCount > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        background:
                          statusFilter === "failed" ? "#b71c1c" : "#ffeaea",
                        color: statusFilter === "failed" ? "#fff" : "#b71c1c",
                        border: "1px solid #b71c1c",
                        borderRadius: 16,
                        padding: "2px 12px",
                        fontWeight: 600,
                        fontSize: 14,
                        minWidth: 40,
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                      title={`Failed documents in this context: ${failedCount} (click to filter)`}
                      onClick={() =>
                        setStatusFilter(
                          statusFilter === "failed" ? null : "failed"
                        )
                      }
                    >
                      {failedCount} Failed
                    </div>
                  )}{" "}
                  {chunkingCount > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        background:
                          statusFilter === "chunking" ? "#7b1fa2" : "#f3e5f5",
                        color: statusFilter === "chunking" ? "#fff" : "#7b1fa2",
                        border: "1px solid #7b1fa2",
                        borderRadius: 16,
                        padding: "2px 12px",
                        fontWeight: 600,
                        fontSize: 14,
                        minWidth: 40,
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                      title={`Documents currently chunking in this collection: ${chunkingCount} (click to filter)`}
                      onClick={() =>
                        setStatusFilter(
                          statusFilter === "chunking" ? null : "chunking"
                        )
                      }
                    >
                      {chunkingCount} Chunking
                    </div>
                  )}{" "}
                  {failedCount === 0 &&
                    chunkingCount === 0 &&
                    navPath.length === 3 && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          background:
                            statusFilter === "completed"
                              ? "#2e7d32"
                              : "#e8f5e8",
                          color:
                            statusFilter === "completed" ? "#fff" : "#2e7d32",
                          border: "1px solid #2e7d32",
                          borderRadius: 16,
                          padding: "2px 8px",
                          fontWeight: 600,
                          fontSize: 14,
                          justifyContent: "center",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                        title="All documents in this collection are processed successfully (click to filter)"
                        onClick={() =>
                          setStatusFilter(
                            statusFilter === "completed" ? null : "completed"
                          )
                        }
                      >
                        <CheckmarkRegular style={{ fontSize: 16 }} />
                      </div>
                    )}
                  {/* Filter indicator and clear button */}
                  {statusFilter && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        background: "#f5f5f5",
                        color: "#666",
                        border: "1px solid #ccc",
                        borderRadius: 16,
                        padding: "2px 8px",
                        fontSize: 12,
                        marginLeft: "8px",
                        cursor: "pointer",
                      }}
                      title="Clear filter"
                      onClick={() => setStatusFilter(null)}
                    >
                      Filtered by: {statusFilter} ✕
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.explorerContent}>
              {renderExplorerContent()}
            </div>
          </div>
        </div>

        {/* Queue Sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h2>ChromaDB Documents</h2>
            <div className={styles.headerActions}>
              <div className={styles.pollingToggle}>
                <input
                  type="checkbox"
                  id="pollingToggle"
                  checked={!isPollingSuspended}
                  onChange={(e) => setIsPollingSuspended(!e.target.checked)}
                />
                <label htmlFor="pollingToggle">
                  {isPollingSuspended
                    ? "All Polling Paused"
                    : "All Polling Active"}
                </label>
              </div>
            </div>
          </div>

          {/* Queue Summary */}
          <div className={styles.queueSummary}>
            <div className={styles.queueMetric}>
              <span className={styles.metricLabel}>Processing:</span>
              <span className={styles.metricValue}>
                {queueListLoading ? (
                  <Spinner size="medium" label="Loading queue data..." />
                ) : (
                  filteredProcessingDocs.length
                )}
              </span>
            </div>
          </div>

          {/* Queue List */}
          <div className={styles.queueSection}>
            <div
              className={`${styles.sectionHeader} ${styles.clickableSectionHeader}`}
              onClick={() => setIsQueueExpanded(!isQueueExpanded)}
            >
              <span className={styles.expandIcon}>
                {isQueueExpanded ? "▼" : "▶"}
              </span>
              <h3 className={styles.subsectionTitle}>
                Queue (
                {queueListLoading ? (
                  <Spinner size="medium" label="Loading queue data..." />
                ) : (
                  filteredQueuedDocs.length
                )}
                )
                <span
                  style={{
                    fontWeight: 400,
                    fontSize: 13,
                    color: "#666",
                    marginLeft: 8,
                  }}
                >
                  In storage waiting to start
                </span>
              </h3>
            </div>
            {isQueueExpanded && (
              <ul className={styles.queueList}>
                {filteredQueuedDocs.map((doc) => (
                  <li key={doc.documentId} className={styles.queueItem}>
                    <div className={styles.queueItemInfo}>
                      <div className={styles.queueItemName}>{doc.fileName}</div>
                      <div className={styles.queueItemStatus}>
                        Queued: {new Date(doc.uploadTime).toLocaleString()}
                      </div>
                    </div>
                    <span
                      className={`${styles.statusBadge} ${styles.statusQueued}`}
                    >
                      Queued
                    </span>
                  </li>
                ))}
                {!filteredQueuedDocs.length && (
                  <li className={styles.queueItem}>
                    <div className={styles.queueItemInfo}>
                      <div className={styles.queueItemName}>Queue is empty</div>
                    </div>
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* Processing Documents */}
          <div className={styles.queueSection}>
            <div
              className={`${styles.sectionHeader} ${styles.clickableSectionHeader}`}
              onClick={() => setIsQueueExpanded(!isQueueExpanded)}
            >
              <span className={styles.expandIcon}>
                {isQueueExpanded ? "▼" : "▶"}
              </span>
              <h3 className={styles.subsectionTitle}>
                Processing (
                {queueListLoading ? (
                  <Spinner size="medium" label="Loading queue data..." />
                ) : (
                  filteredProcessingDocs.length
                )}
                )
                <span
                  style={{
                    fontWeight: 400,
                    fontSize: 13,
                    color: "#666",
                    marginLeft: 8,
                  }}
                >
                  Already started
                </span>
              </h3>
            </div>
            {isQueueExpanded && (
              <ul className={styles.queueList}>
                {filteredProcessingDocs.map((doc) => (
                  <li key={doc.documentId} className={styles.queueItem}>
                    <div className={styles.queueItemInfo}>
                      <div className={styles.queueItemName}>{doc.fileName}</div>
                      <div className={styles.queueItemStatus}>
                        Processing since:{" "}
                        {new Date(
                          doc.processingTime || doc.uploadTime
                        ).toLocaleString()}
                        {doc.estimatedCompletionTime && (
                          <span className={styles.processingTime}>
                            (Est. {doc.estimatedCompletionTime})
                          </span>
                        )}
                      </div>
                    </div>{" "}
                    <span
                      className={`${styles.statusBadge} ${styles[`status${doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}`]}`}
                    >
                      {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                    </span>
                  </li>
                ))}
                {!filteredProcessingDocs.length && (
                  <li className={styles.queueItem}>
                    <div className={styles.queueItemInfo}>
                      <div className={styles.queueItemName}>
                        No documents processing
                      </div>
                    </div>
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* Recent History */}
          <div className={styles.queueSection}>
            <div
              className={`${styles.sectionHeader} ${styles.clickableSectionHeader}`}
              onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
            >
              <span className={styles.expandIcon}>
                {isHistoryExpanded ? "▼" : "▶"}
              </span>
              <h3 className={styles.subsectionTitle}>
                Processed recently (
                {queueStatsLoading ? (
                  <Spinner size="medium" label="Loading queue data..." />
                ) : (
                  queueStats?.recentlyCompleted || 0
                )}
                )
              </h3>
            </div>
            {isHistoryExpanded && (
              <ul className={styles.queueList}>
                {filteredCompletedDocs.map((doc) => (
                  <li key={doc.documentId} className={styles.queueItem}>
                    <div className={styles.queueItemInfo}>
                      <div className={styles.queueItemName}>{doc.fileName}</div>
                      <div className={styles.queueItemStatus}>
                        {doc.status === "completed" ? (
                          <>
                            Completed:{" "}
                            {new Date(
                              doc.completionTimestamp!
                            ).toLocaleString()}
                            {doc.processingTimeMs && (
                              <span className={styles.processingTime}>
                                (Processed in{" "}
                                {Math.round(doc.processingTimeMs / 1000)}s)
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            Failed:{" "}
                            {new Date(
                              doc.completionTimestamp!
                            ).toLocaleString()}
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Add the edit dialog */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(_, { open }) => setIsEditDialogOpen(open)}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>
              <div className={styles.dialogTitleContent}>
                <span>Edit Document Metadata</span>
                <Button
                  appearance="subtle"
                  onClick={() => setIsEditDialogOpen(false)}
                  className={styles.closeButton}
                >
                  <span style={{ fontSize: "24px", lineHeight: "24px" }}>
                    ×
                  </span>
                </Button>
              </div>
            </DialogTitle>
            <DialogContent>
              <div className={styles.formGroup}>
                <Label htmlFor="editTags">Tags (comma-separated)</Label>
                <Input
                  id="editTags"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <Label htmlFor="editLabels">Labels (comma-separated)</Label>
                <Input
                  id="editLabels"
                  value={editLabels}
                  onChange={(e) => setEditLabels(e.target.value)}
                />
              </div>
              <div className={styles.metadataEditor}>
                <div className={styles.metadataHeaders}>
                  <span className={styles.metadataHeaderKey}>Key</span>
                  <span className={styles.metadataHeaderValue}>Value</span>
                  <span className={styles.metadataHeaderAction}></span>
                </div>
                {metadataEntries.map((entry, index) => (
                  <div key={index} className={styles.metadataEntry}>
                    <Input
                      className={styles.metadataKey}
                      value={entry.key}
                      onChange={(e) =>
                        updateMetadataEntry(index, "key", e.target.value)
                      }
                      placeholder="Key"
                    />
                    <Input
                      className={styles.metadataValue}
                      value={entry.value}
                      onChange={(e) =>
                        updateMetadataEntry(index, "value", e.target.value)
                      }
                      placeholder="Value"
                    />
                    <button
                      className={styles.removeMetadataButton}
                      onClick={() => removeMetadataEntry(index)}
                      disabled={metadataEntries.length === 1}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <div>
                  <button
                    className={styles.addMetadataButton}
                    onClick={addMetadataEntry}
                  >
                    + Add Metadata Entry
                  </button>
                </div>
              </div>
              <div className={styles.dialogActions}>
                <Button
                  appearance="primary"
                  onClick={submitMetadataUpdate}
                  disabled={!documentToEdit}
                >
                  Save Changes
                </Button>
              </div>
            </DialogContent>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Add the search emulator dialog */}
      {renderSearchEmulator()}

      {/* Add the chunks dialog */}
      {renderChunksDialog()}

      {/* Add the Poison Queue dialog */}
      {renderPoisonQueueDialog()}

      {/* Add delete confirmation dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(_, { open }) => setIsDeleteDialogOpen(open)}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>
              <div className={styles.dialogTitleContent}>
                <span>Delete Document</span>
                <Button
                  appearance="subtle"
                  onClick={() => setIsDeleteDialogOpen(false)}
                  className={styles.closeButton}
                >
                  <span style={{ fontSize: "24px", lineHeight: "24px" }}>
                    ×
                  </span>
                </Button>
              </div>
            </DialogTitle>
            <DialogContent>
              <p>
                Are you sure you want to delete "{documentToDelete?.fileName}"?
              </p>
              <p>This action cannot be undone.</p>
              <div className={styles.dialogActions}>
                <Button
                  appearance="secondary"
                  onClick={() => setIsDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button appearance="primary" onClick={handleDeleteDocument}>
                  Delete
                </Button>
              </div>
            </DialogContent>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Add collection delete confirmation dialog */}
      <Dialog
        open={isDeleteCollectionDialogOpen}
        onOpenChange={(_, { open }) => setIsDeleteCollectionDialogOpen(open)}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>
              <div className={styles.dialogTitleContent}>
                <span>Delete Collection</span>
                <Button
                  appearance="subtle"
                  onClick={() => setIsDeleteCollectionDialogOpen(false)}
                  className={styles.closeButton}
                >
                  <span style={{ fontSize: "24px", lineHeight: "24px" }}>
                    ×
                  </span>
                </Button>
              </div>
            </DialogTitle>
            <DialogContent>
              <p>
                Are you sure you want to delete the collection "
                {collectionToDelete?.collection}"?
              </p>
              <p>
                This will delete all documents in this collection. This action
                cannot be undone.
              </p>
              <div className={styles.dialogActions}>
                <Button
                  appearance="secondary"
                  onClick={() => setIsDeleteCollectionDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button appearance="primary" onClick={handleDeleteCollection}>
                  Delete Collection
                </Button>
              </div>
            </DialogContent>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Add database delete confirmation dialog */}
      <Dialog
        open={isDeleteDatabaseDialogOpen}
        onOpenChange={(_, { open }) => setIsDeleteDatabaseDialogOpen(open)}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>
              <div className={styles.dialogTitleContent}>
                <span>Delete Database</span>
                <Button
                  appearance="subtle"
                  onClick={() => setIsDeleteDatabaseDialogOpen(false)}
                  className={styles.closeButton}
                >
                  <span style={{ fontSize: "24px", lineHeight: "24px" }}>
                    ×
                  </span>
                </Button>
              </div>
            </DialogTitle>
            <DialogContent>
              <p>
                Are you sure you want to delete the database "{databaseToDelete}
                "?
              </p>
              <p>
                This will delete all collections and documents in this database.
                This action cannot be undone.
              </p>
              <div className={styles.dialogActions}>
                <Button
                  appearance="secondary"
                  onClick={() => setIsDeleteDatabaseDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button appearance="primary" onClick={handleDeleteDatabase}>
                  Delete Database
                </Button>
              </div>
            </DialogContent>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};

export default ChromaPage;
