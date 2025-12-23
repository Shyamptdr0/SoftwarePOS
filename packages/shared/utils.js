// Utility functions for Shreem POS

// String utilities
const stringUtils = {
  capitalize: (str) => str.charAt(0).toUpperCase() + str.slice(1),
  truncate: (str, length) => str.length > length ? str.substring(0, length) + '...' : str,
  slugify: (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
  formatCurrency: (amount, currency = 'USD') => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount)
};

// Number utilities
const numberUtils = {
  round: (num, decimals = 2) => Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals),
  format: (num) => num.toLocaleString(),
  isNumber: (value) => !isNaN(parseFloat(value)) && isFinite(value),
  clamp: (num, min, max) => Math.min(Math.max(num, min), max)
};

// Date utilities
const dateUtils = {
  format: (date, format = 'YYYY-MM-DD') => {
    const d = new Date(date);
    return format
      .replace('YYYY', d.getFullYear())
      .replace('MM', String(d.getMonth() + 1).padStart(2, '0'))
      .replace('DD', String(d.getDate()).padStart(2, '0'));
  },
  addDays: (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },
  isToday: (date) => {
    const today = new Date();
    const checkDate = new Date(date);
    return checkDate.toDateString() === today.toDateString();
  }
};

// Array utilities
const arrayUtils = {
  unique: (arr) => [...new Set(arr)],
  groupBy: (arr, key) => arr.reduce((groups, item) => {
    const group = item[key];
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {}),
  sortBy: (arr, key, direction = 'asc') => [...arr].sort((a, b) => {
    if (direction === 'desc') return b[key] > a[key] ? 1 : -1;
    return a[key] > b[key] ? 1 : -1;
  })
};

// Object utilities
const objectUtils = {
  deepClone: (obj) => JSON.parse(JSON.stringify(obj)),
  omit: (obj, keys) => Object.keys(obj).filter(key => !keys.includes(key)).reduce((result, key) => {
    result[key] = obj[key];
    return result;
  }, {}),
  pick: (obj, keys) => keys.reduce((result, key) => {
    if (obj[key] !== undefined) result[key] = obj[key];
    return result;
  }, {})
};

// Validation utilities
const validationUtils = {
  email: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  phone: (phone) => /^\+?[\d\s-()]+$/.test(phone),
  required: (value) => value !== null && value !== undefined && value !== '',
  minLength: (value, min) => value && value.length >= min,
  maxLength: (value, max) => value && value.length <= max
};

// Error utilities
const errorUtils = {
  createError: (message, code = 'UNKNOWN') => {
    const error = new Error(message);
    error.code = code;
    return error;
  },
  isError: (obj) => obj instanceof Error,
  getErrorMessage: (error) => error.message || 'An unknown error occurred'
};

module.exports = {
  string: stringUtils,
  number: numberUtils,
  date: dateUtils,
  array: arrayUtils,
  object: objectUtils,
  validation: validationUtils,
  error: errorUtils
};
