/**
 * Type declaration for the runtime environment configuration.
 * This extends the Window interface to include the `environment` property
 * that is set by the customer-specific `assets/environment.js` file.
 *
 * The environment.js file is loaded via a <script> tag in index.html
 * before Angular bootstraps, making `window.environment` available globally.
 */
declare global {
  interface Window {
    environment?: {
      customerName?: string;
      locale?: string;
    };
  }
}

export {};
