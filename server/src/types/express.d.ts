/**
 * Express type extensions
 * Extends Express Request interface to include custom properties
 */

declare namespace Express {
  interface Request {
    fraudIncident?: any;
  }
}
