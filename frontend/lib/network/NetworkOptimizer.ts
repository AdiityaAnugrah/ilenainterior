/**
 * NetworkOptimizer - Network request optimization and management
 * 
 * Features:
 * - Request deduplication (prevent duplicate concurrent requests)
 * - Retry logic with exponential backoff (max 3 retries, delays: 1s, 2s, 4s)
 * - Offline queue management (queue requests when offline, replay when online)
 * - Request status tracking and callbacks
 * - Network status monitoring
 */

export interface NetworkConfig {
  enableDeduplication: boolean;
  enableRetry: boolean;
  enableOfflineQueue: boolean;
  maxRetries: number;
  retryDelays: number[]; // in milliseconds
  timeout: number; // in milliseconds
}

export interface QueuedRequest {
  id: string;
  url: string;
  options: RequestInit;
  timestamp: number;
  retryCount: number;
  callbacks?: {
    onSuccess?: (response: Response) => void;
    onError?: (error: Error) => void;
    onRetry?: (attempt: number) => void;
  };
}

export interface RequestStatus {
  pending: number;
  completed: number;
  failed: number;
  queued: number;
}

const DEFAULT_CONFIG: NetworkConfig = {
  enableDeduplication: true,
  enableRetry: true,
  enableOfflineQueue: true,
  maxRetries: 3,
  retryDelays: [1000, 2000, 4000], // 1s, 2s, 4s
  timeout: 30000, // 30 seconds
};

export class NetworkOptimizer {
  private config: NetworkConfig;
  private pendingRequests: Map<string, Promise<Response>>;
  private offlineQueue: QueuedRequest[];
  private requestStatus: RequestStatus;
  private isOnlineStatus: boolean;
  private onlineListener: (() => void) | null;
  private offlineListener: (() => void) | null;

  constructor(config?: Partial<NetworkConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.pendingRequests = new Map();
    this.offlineQueue = [];
    this.requestStatus = {
      pending: 0,
      completed: 0,
      failed: 0,
      queued: 0,
    };
    this.isOnlineStatus = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.onlineListener = null;
    this.offlineListener = null;

    // Setup network status listeners
    this.setupNetworkListeners();
  }

  // ==================== Request Optimization ====================

  /**
   * Optimized fetch with deduplication, retry, and offline queue
   * @param url - Request URL
   * @param options - Fetch options
   * @returns Promise<Response>
   */
  async fetch(url: string, options?: RequestInit): Promise<Response> {
    // Check if offline and queue is enabled
    if (!this.isOnline() && this.config.enableOfflineQueue) {
      return this.queueOfflineRequest(url, options);
    }

    // Request deduplication
    if (this.config.enableDeduplication) {
      return this.deduplicateRequest(url, () => this.executeFetch(url, options));
    }

    return this.executeFetch(url, options);
  }

  /**
   * Execute fetch with retry logic
   * @param url - Request URL
   * @param options - Fetch options
   * @returns Promise<Response>
   * @private
   */
  private async executeFetch(url: string, options?: RequestInit): Promise<Response> {
    if (this.config.enableRetry) {
      return this.fetchWithRetry(url, options, 0);
    }

    return this.fetchWithTimeout(url, options);
  }

  /**
   * Fetch with timeout
   * @param url - Request URL
   * @param options - Fetch options
   * @returns Promise<Response>
   * @private
   */
  private async fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      this.requestStatus.pending++;
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      this.requestStatus.pending--;
      this.requestStatus.completed++;

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      this.requestStatus.pending--;
      this.requestStatus.failed++;
      throw error;
    }
  }

  // ==================== Request Deduplication ====================

  /**
   * Deduplicate concurrent requests to the same URL
   * @param url - Request URL
   * @param fetcher - Function that returns fetch promise
   * @returns Promise<Response>
   * @private
   */
  private deduplicateRequest(
    url: string,
    fetcher: () => Promise<Response>
  ): Promise<Response> {
    // Check if request is already pending
    const pendingRequest = this.pendingRequests.get(url);
    if (pendingRequest) {
      console.log(`[NetworkOptimizer] Deduplicating request to: ${url}`);
      return pendingRequest;
    }

    // Create new request
    const requestPromise = fetcher()
      .then((response) => {
        // Remove from pending requests
        this.pendingRequests.delete(url);
        return response;
      })
      .catch((error) => {
        // Remove from pending requests
        this.pendingRequests.delete(url);
        throw error;
      });

    // Store pending request
    this.pendingRequests.set(url, requestPromise);

    return requestPromise;
  }

  // ==================== Retry Logic ====================

  /**
   * Fetch with exponential backoff retry
   * @param url - Request URL
   * @param options - Fetch options
   * @param attempt - Current retry attempt
   * @returns Promise<Response>
   * @private
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit | undefined,
    attempt: number
  ): Promise<Response> {
    try {
      const response = await this.fetchWithTimeout(url, options);

      // Check if response is ok (status 200-299)
      if (!response.ok && attempt < this.config.maxRetries) {
        // Retry on server errors (5xx) or specific client errors
        if (response.status >= 500 || response.status === 408 || response.status === 429) {
          console.warn(
            `[NetworkOptimizer] Request failed with status ${response.status}, retrying... (attempt ${attempt + 1}/${this.config.maxRetries})`
          );
          return this.retryRequest(url, options, attempt);
        }
      }

      return response;
    } catch (error) {
      // Retry on network errors
      if (attempt < this.config.maxRetries) {
        console.warn(
          `[NetworkOptimizer] Request failed with error, retrying... (attempt ${attempt + 1}/${this.config.maxRetries})`,
          error
        );
        return this.retryRequest(url, options, attempt);
      }

      throw error;
    }
  }

  /**
   * Retry request with exponential backoff
   * @param url - Request URL
   * @param options - Fetch options
   * @param attempt - Current retry attempt
   * @returns Promise<Response>
   * @private
   */
  private async retryRequest(
    url: string,
    options: RequestInit | undefined,
    attempt: number
  ): Promise<Response> {
    // Get delay for this attempt (use last delay if attempt exceeds array length)
    const delay =
      this.config.retryDelays[attempt] ||
      this.config.retryDelays[this.config.retryDelays.length - 1];

    // Wait before retrying
    await this.sleep(delay);

    // Retry
    return this.fetchWithRetry(url, options, attempt + 1);
  }

  /**
   * Sleep for specified milliseconds
   * @param ms - Milliseconds to sleep
   * @returns Promise<void>
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ==================== Offline Queue Management ====================

  /**
   * Queue request when offline
   * @param url - Request URL
   * @param options - Fetch options
   * @returns Promise<Response>
   */
  queueOfflineRequest(url: string, options?: RequestInit): Promise<Response> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id: this.generateRequestId(),
        url,
        options: options || {},
        timestamp: Date.now(),
        retryCount: 0,
        callbacks: {
          onSuccess: (response) => resolve(response),
          onError: (error) => reject(error),
        },
      };

      this.offlineQueue.push(queuedRequest);
      this.requestStatus.queued++;

      console.log(
        `[NetworkOptimizer] Request queued for offline: ${url} (queue size: ${this.offlineQueue.length})`
      );
    });
  }

  /**
   * Sync offline queue when back online
   * @returns Promise<void>
   */
  async syncOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) {
      return;
    }

    console.log(
      `[NetworkOptimizer] Syncing offline queue (${this.offlineQueue.length} requests)...`
    );

    // Process queue in order
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const queuedRequest of queue) {
      try {
        const response = await this.executeFetch(queuedRequest.url, queuedRequest.options);
        this.requestStatus.queued--;

        if (queuedRequest.callbacks?.onSuccess) {
          queuedRequest.callbacks.onSuccess(response);
        }
      } catch (error) {
        this.requestStatus.queued--;

        // Re-queue if still offline or retry limit not reached
        if (!this.isOnline() || queuedRequest.retryCount < this.config.maxRetries) {
          queuedRequest.retryCount++;
          this.offlineQueue.push(queuedRequest);
          this.requestStatus.queued++;
        } else {
          // Failed permanently
          if (queuedRequest.callbacks?.onError) {
            queuedRequest.callbacks.onError(error as Error);
          }
        }
      }
    }

    console.log(
      `[NetworkOptimizer] Offline queue sync complete. Remaining: ${this.offlineQueue.length}`
    );
  }

  /**
   * Clear offline queue
   */
  clearOfflineQueue(): void {
    this.offlineQueue = [];
    this.requestStatus.queued = 0;
  }

  /**
   * Get offline queue size
   * @returns Number of queued requests
   */
  getOfflineQueueSize(): number {
    return this.offlineQueue.length;
  }

  /**
   * Get offline queue
   * @returns Array of queued requests
   */
  getOfflineQueue(): QueuedRequest[] {
    return [...this.offlineQueue];
  }

  // ==================== Network Status ====================

  /**
   * Setup network status listeners
   * @private
   */
  private setupNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    this.onlineListener = () => {
      console.log('[NetworkOptimizer] Network status: ONLINE');
      this.isOnlineStatus = true;
      this.syncOfflineQueue();
    };

    this.offlineListener = () => {
      console.log('[NetworkOptimizer] Network status: OFFLINE');
      this.isOnlineStatus = false;
    };

    window.addEventListener('online', this.onlineListener);
    window.addEventListener('offline', this.offlineListener);
  }

  /**
   * Remove network status listeners
   * @private
   */
  private removeNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    if (this.onlineListener) {
      window.removeEventListener('online', this.onlineListener);
      this.onlineListener = null;
    }

    if (this.offlineListener) {
      window.removeEventListener('offline', this.offlineListener);
      this.offlineListener = null;
    }
  }

  /**
   * Check if online
   * @returns True if online
   */
  isOnline(): boolean {
    return this.isOnlineStatus;
  }

  /**
   * Get connection type (if available)
   * @returns Connection type string
   */
  getConnectionType(): string {
    if (typeof navigator === 'undefined') return 'unknown';

    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (connection && connection.effectiveType) {
      return connection.effectiveType;
    }

    return 'unknown';
  }

  // ==================== Request Status ====================

  /**
   * Get request status
   * @returns Request status object
   */
  getRequestStatus(): RequestStatus {
    return { ...this.requestStatus };
  }

  /**
   * Reset request status
   */
  resetRequestStatus(): void {
    this.requestStatus = {
      pending: 0,
      completed: 0,
      failed: 0,
      queued: this.offlineQueue.length,
    };
  }

  // ==================== Utility Methods ====================

  /**
   * Generate unique request ID
   * @returns Unique ID string
   * @private
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get pending requests count
   * @returns Number of pending requests
   */
  getPendingRequestsCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Cancel all pending requests
   */
  cancelAllPendingRequests(): void {
    this.pendingRequests.clear();
  }

  /**
   * Get configuration
   * @returns Current configuration
   */
  getConfig(): NetworkConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<NetworkConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Destroy the network optimizer and cleanup resources
   */
  destroy(): void {
    this.removeNetworkListeners();
    this.cancelAllPendingRequests();
    this.clearOfflineQueue();
  }
}

// Export singleton instance for global use
let globalNetworkOptimizer: NetworkOptimizer | null = null;

/**
 * Get global NetworkOptimizer instance
 * @param config - Optional configuration
 * @returns NetworkOptimizer instance
 */
export function getGlobalNetworkOptimizer(
  config?: Partial<NetworkConfig>
): NetworkOptimizer {
  if (!globalNetworkOptimizer) {
    globalNetworkOptimizer = new NetworkOptimizer(config);
  }
  return globalNetworkOptimizer;
}

/**
 * Reset global NetworkOptimizer instance
 */
export function resetGlobalNetworkOptimizer(): void {
  if (globalNetworkOptimizer) {
    globalNetworkOptimizer.destroy();
    globalNetworkOptimizer = null;
  }
}
