// Application constants for Shreem POS
// Contains all constant values used throughout the application

const APP_CONFIG = {
  // Application metadata
  APP_NAME: 'Shreem POS',
  APP_VERSION: '1.0.0',
  APP_DESCRIPTION: 'Point of Sale and Inventory Management System',
  
  // Database configuration
  DATABASE: {
    LOCAL_DB_NAME: 'shreem_pos.db',
    LOCAL_DB_PATH: './data/shreem_pos.db',
    BACKUP_PATH: './backups/',
    SYNC_INTERVAL: 30000, // 30 seconds
    BATCH_SIZE: 100,
    MAX_RETRIES: 3
  },
  
  // API configuration
  API: {
    BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
    TIMEOUT: 10000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000
  },
  
  // Authentication
  AUTH: {
    TOKEN_KEY: 'shreem_pos_token',
    USER_KEY: 'shreem_pos_user',
    SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 hours
    REFRESH_THRESHOLD: 5 * 60 * 1000 // 5 minutes
  },
  
  // Pagination
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    PAGE_SIZES: [10, 20, 50, 100]
  },
  
  // File uploads
  UPLOAD: {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'text/plain'],
    UPLOAD_PATH: './uploads/'
  },
  
  // Currency and formatting
  CURRENCY: {
    DEFAULT_CURRENCY: 'USD',
    DECIMAL_PLACES: 2,
    THOUSAND_SEPARATOR: ',',
    DECIMAL_SEPARATOR: '.'
  },
  
  // Business rules
  BUSINESS: {
    TAX_RATE: 0.08, // 8%
    SERVICE_CHARGE: 0.10, // 10%
    MIN_ORDER_AMOUNT: 1.00,
    MAX_DISCOUNT_PERCENTAGE: 100,
    LOW_STOCK_THRESHOLD: 10,
    OUT_OF_STOCK_THRESHOLD: 0
  },
  
  // Inventory
  INVENTORY: {
    AUTO_REORDER_ENABLED: true,
    REORDER_POINT_MULTIPLIER: 1.5,
    EXPIRY_WARNING_DAYS: 30,
    BATCH_TRACKING_ENABLED: true,
    SERIAL_TRACKING_ENABLED: false
  },
  
  // Reports
  REPORTS: {
    DEFAULT_DATE_RANGE: 30, // days
    MAX_DATE_RANGE: 365, // days
    EXPORT_FORMATS: ['pdf', 'excel', 'csv'],
    CHART_TYPES: ['bar', 'line', 'pie', 'doughnut']
  },
  
  // Notifications
  NOTIFICATIONS: {
    ENABLE_EMAIL: true,
    ENABLE_PUSH: true,
    ENABLE_SMS: false,
    BATCH_SIZE: 50,
    RETRY_ATTEMPTS: 3
  },
  
  // Security
  SECURITY: {
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_REQUIRE_UPPERCASE: true,
    PASSWORD_REQUIRE_LOWERCASE: true,
    PASSWORD_REQUIRE_NUMBERS: true,
    PASSWORD_REQUIRE_SPECIAL: false,
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000 // 15 minutes
  },
  
  // Performance
  PERFORMANCE: {
    CACHE_TTL: 5 * 60 * 1000, // 5 minutes
    DEBOUNCE_DELAY: 300, // milliseconds
    MAX_CONCURRENT_REQUESTS: 10,
    MEMORY_LIMIT: 512 * 1024 * 1024 // 512MB
  },
  
  // Logging
  LOGGING: {
    LEVEL: process.env.LOG_LEVEL || 'info',
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_FILES: 5,
    LOG_PATH: './logs/'
  },
  
  // Development
  DEVELOPMENT: {
    DEBUG_MODE: process.env.NODE_ENV === 'development',
    MOCK_API: process.env.MOCK_API === 'true',
    HOT_RELOAD: process.env.NODE_ENV === 'development',
    DEV_TOOLS: process.env.NODE_ENV === 'development'
  }
};

// Error codes
const ERROR_CODES = {
  // General errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  
  // Database errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  QUERY_FAILED: 'QUERY_FAILED',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
  
  // Business logic errors
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  INVALID_QUANTITY: 'INVALID_QUANTITY',
  INVALID_PRICE: 'INVALID_PRICE',
  DUPLICATE_RECORD: 'DUPLICATE_RECORD',
  RECORD_NOT_FOUND: 'RECORD_NOT_FOUND',
  
  // File errors
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  
  // Licensing errors
  LICENSE_INVALID: 'LICENSE_INVALID',
  LICENSE_EXPIRED: 'LICENSE_EXPIRED',
  LICENSE_REVOKED: 'LICENSE_REVOKED',
  FEATURE_NOT_ALLOWED: 'FEATURE_NOT_ALLOWED',
  MACHINE_MISMATCH: 'MACHINE_MISMATCH'
};

// Status codes
const STATUS_CODES = {
  // HTTP status codes
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  
  // Application status codes
  SUCCESS: 'SUCCESS',
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
};

// Entity types
const ENTITY_TYPES = {
  PRODUCT: 'product',
  CATEGORY: 'category',
  CUSTOMER: 'customer',
  SUPPLIER: 'supplier',
  ORDER: 'order',
  INVOICE: 'invoice',
  PAYMENT: 'payment',
  USER: 'user',
  ROLE: 'role',
  PERMISSION: 'permission'
};

// Permission levels
const PERMISSION_LEVELS = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  ADMIN: 'admin'
};

// Audit actions
const AUDIT_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LOGIN: 'login',
  LOGOUT: 'logout',
  VIEW: 'view',
  EXPORT: 'export',
  IMPORT: 'import'
};

module.exports = {
  APP_CONFIG,
  ERROR_CODES,
  STATUS_CODES,
  ENTITY_TYPES,
  PERMISSION_LEVELS,
  AUDIT_ACTIONS
};
