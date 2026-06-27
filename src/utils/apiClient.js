/**
 * Passwala Resilient API Client
 * Features:
 * 1. Request Deduplication (prevents duplicate simultaneous in-flight requests)
 * 2. Transient Caching (caches GET requests with a short TTL to prevent redundant calls)
 * 3. Automatic Retry with Exponential Backoff (retries transient network/5xx errors)
 * 4. Standardized, Graceful Error Mapping
 */

const pendingRequests = new Map();
const getCache = new Map();

const DEFAULT_CACHE_TTL = 10000; // 10 seconds transient cache for GET requests

/**
 * Standard sleep utility for backoff delay
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Custom Resilient Fetch Wrapper
 */
export async function apiFetch(url, options = {}) {
  const method = options.method || 'GET';
  const isGet = method.toUpperCase() === 'GET';

  // Build unique key for the request to deduplicate and cache
  const requestKey = JSON.stringify({ url, method, body: options.body });

  // 1. Transient GET Caching
  if (isGet) {
    const cached = getCache.get(requestKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }
  }

  // 2. Request Deduplication
  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey);
  }

  // Define the core fetch logic with retry wrapper
  const fetchWithRetry = async (retriesRemaining = 3, delay = 1000) => {
    try {
      const res = await fetch(url, options);

      // Treat transient server errors (5xx) as eligible for retry
      if (!res.ok) {
        if (res.status >= 500 && retriesRemaining > 0) {
          console.warn(`⚠️ API error ${res.status}. Retrying in ${delay}ms... (${retriesRemaining} left)`);
          await sleep(delay);
          return fetchWithRetry(retriesRemaining - 1, delay * 2);
        }

        // Parse JSON error if available, else throw standard status message
        let errorData;
        try {
          errorData = await res.json();
        } catch (_) {
          // not JSON
        }
        throw new Error(errorData?.error || `Request failed with status ${res.status}`);
      }

      // Parse JSON response
      const data = await res.json();

      // 3. Populate GET Cache
      if (isGet) {
        getCache.set(requestKey, {
          data,
          expiresAt: Date.now() + DEFAULT_CACHE_TTL
        });
      }

      return data;
    } catch (err) {
      // Retry on network/connection errors
      if (retriesRemaining > 0 && !(err.message && (err.message.includes('401') || err.message.includes('403') || err.message.includes('404')))) {
        console.warn(`⚠️ Network error: ${err.message}. Retrying in ${delay}ms... (${retriesRemaining} left)`);
        await sleep(delay);
        return fetchWithRetry(retriesRemaining - 1, delay * 2);
      }
      throw err;
    }
  };

  // Launch the promise and store in pending requests map for deduplication
  const requestPromise = fetchWithRetry();
  pendingRequests.set(requestKey, requestPromise);

  try {
    const result = await requestPromise;
    return result;
  } finally {
    // Always clean up the pending request when resolved or rejected
    pendingRequests.delete(requestKey);
  }
}

/**
 * Clear the transient GET cache (useful on logout/refresh)
 */
export function clearApiCache() {
  getCache.clear();
}
