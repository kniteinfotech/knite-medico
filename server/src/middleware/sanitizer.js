/**
 * Input Sanitization Middleware for KNITE Medico SaaS
 * Sanitizes incoming body, query, and param string values to prevent XSS attacks and injection vectors.
 */

function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  
  // Strip null bytes
  let clean = str.replace(/\0/g, '');
  
  // Strip dangerous script tags and inline event handlers
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/javascript:/gi, '');
  clean = clean.replace(/onload=/gi, 'on_disabled=');
  clean = clean.replace(/onerror=/gi, 'on_disabled=');
  clean = clean.replace(/onclick=/gi, 'on_disabled=');
  
  return clean;
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function sanitizeInputs(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  next();
}

module.exports = {
  sanitizeString,
  sanitizeObject,
  sanitizeInputs
};
