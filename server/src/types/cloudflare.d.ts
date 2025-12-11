/**
 * Cloudflare Workers Type Definitions
 * These types are available in Cloudflare Workers runtime
 */

declare global {
  interface KVNamespace {
    get(key: string, options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<string | null>;
    get(key: string, type: 'text'): Promise<string | null>;
    get(key: string, type: 'json'): Promise<any>;
    get(key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>;
    get(key: string, type: 'stream'): Promise<ReadableStream | null>;
    put(key: string, value: string | ArrayBuffer | ArrayBufferView | ReadableStream, options?: { expirationTtl?: number; expiration?: number; metadata?: any }): Promise<void>;
    delete(key: string): Promise<void>;
    list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ keys: Array<{ name: string; expiration?: number; metadata?: any }>; list_complete: boolean; cursor?: string }>;
  }

  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    exec(query: string): Promise<D1Result>;
    batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  }

  interface D1PreparedStatement {
    bind(...values: any[]): D1PreparedStatement;
    first<T = unknown>(colName?: string): Promise<T | null>;
    run(): Promise<D1Result>;
    all<T = unknown>(): Promise<D1Result<T>>;
    raw<T = unknown>(): Promise<T[]>;
  }

  interface D1Result<T = unknown> {
    success: boolean;
    error?: string;
    meta: {
      duration: number;
      rows_read: number;
      rows_written: number;
      last_row_id: number;
      changed_db: boolean;
      changes: number;
      size_after: number;
      rows: T[];
    };
  }

  interface R2Bucket {
    head(key: string): Promise<R2Object | null>;
    get(key: string, options?: { onlyIf?: R2Conditional; range?: R2Range }): Promise<R2ObjectBody | null>;
    put(key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null | Blob, options?: R2PutOptions): Promise<R2Object>;
    delete(keys: string | string[]): Promise<void>;
    list(options?: R2ListOptions): Promise<R2Objects>;
    createMultipartUpload(key: string, options?: R2MultipartOptions): Promise<R2MultipartUpload>;
    resumeMultipartUpload(key: string, uploadId: string): R2MultipartUpload;
  }

  interface R2Object {
    key: string;
    version: string;
    size: number;
    etag: string;
    uploaded: Date;
    httpEtag: string;
    checksums: R2Checksums;
    httpMetadata?: R2HTTPMetadata;
    customMetadata?: Record<string, string>;
    range?: R2Range;
  }

  interface R2ObjectBody extends R2Object {
    body: ReadableStream;
    bodyUsed: boolean;
    arrayBuffer(): Promise<ArrayBuffer>;
    text(): Promise<string>;
    json<T = unknown>(): Promise<T>;
    blob(): Promise<Blob>;
  }

  interface R2Range {
    offset?: number;
    length?: number;
    suffix?: number;
  }

  interface R2Conditional {
    etagMatches?: string;
    etagDoesNotMatch?: string;
    uploadedBefore?: Date;
    uploadedAfter?: Date;
  }

  interface R2PutOptions {
    httpMetadata?: R2HTTPMetadata;
    customMetadata?: Record<string, string>;
    onlyIf?: R2Conditional;
  }

  interface R2HTTPMetadata {
    contentType?: string;
    contentLanguage?: string;
    contentDisposition?: string;
    contentEncoding?: string;
    cacheControl?: string;
    cacheExpiry?: Date;
  }

  interface R2Checksums {
    md5?: ArrayBuffer;
    sha1?: ArrayBuffer;
    sha256?: ArrayBuffer;
    sha384?: ArrayBuffer;
    sha512?: ArrayBuffer;
  }

  interface R2ListOptions {
    limit?: number;
    prefix?: string;
    cursor?: string;
    delimiter?: string;
    include?: ('httpMetadata' | 'customMetadata')[];
    startAfter?: string;
  }

  interface R2Objects {
    objects: R2Object[];
    truncated: boolean;
    cursor?: string;
    delimitedPrefixes: string[];
  }

  interface R2MultipartOptions extends R2PutOptions {
    httpMetadata?: R2HTTPMetadata;
    customMetadata?: Record<string, string>;
  }

  interface R2MultipartUpload {
    uploadPart(partNumber: number, value: ReadableStream | ArrayBuffer | ArrayBufferView): Promise<R2UploadedPart>;
    abort(): Promise<void>;
    complete(uploadedParts: R2UploadedPart[]): Promise<R2Object>;
  }

  interface R2UploadedPart {
    partNumber: number;
    etag: string;
  }

  interface ExecutionContext {
    waitUntil(promise: Promise<any>): void;
    passThroughOnException(): void;
  }

  interface CacheStorage {
    open(cacheName: string): Promise<Cache>;
    match(request: Request | string, options?: CacheQueryOptions): Promise<Response | undefined>;
    delete(cacheName: string): Promise<boolean>;
    has(cacheName: string): Promise<boolean>;
    keys(): Promise<string[]>;
  }

  interface Cache {
    match(request: Request | string, options?: CacheQueryOptions): Promise<Response | undefined>;
    matchAll(request?: Request | string, options?: CacheQueryOptions): Promise<Response[]>;
    add(request: Request | string): Promise<void>;
    addAll(requests: Request[] | string[]): Promise<void>;
    put(request: Request | string, response: Response): Promise<void>;
    delete(request: Request | string, options?: CacheQueryOptions): Promise<boolean>;
    keys(request?: Request | string, options?: CacheQueryOptions): Promise<ReadableStream<Request>>;
  }

  interface CacheQueryOptions {
    ignoreMethod?: boolean;
    ignoreSearch?: boolean;
    ignoreVary?: boolean;
  }

  type HeadersInit = Headers | string[][] | Record<string, string>;

  var caches: CacheStorage;
}

export {};
