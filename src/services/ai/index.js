// ============================================================
// AI Service Factory
// ============================================================
// To swap AI providers:
// 1. Create a new provider class extending AIServiceProvider
// 2. Import it here
// 3. Change the provider in getAIService()
// ============================================================

import { MockAIProvider } from './mock-provider.js';
import { BackendAIProvider } from './backend-provider.js';

let instance = null;

const PROVIDER_KEY = 'kidart_provider';

export function isBackendMode() {
  return localStorage.getItem(PROVIDER_KEY) === 'backend';
}

export function setProviderMode(mode) {
  localStorage.setItem(PROVIDER_KEY, mode);
  resetAIService();
}

/**
 * Get the AI service instance (singleton)
 * @param {object} config - Optional configuration
 * @returns {AIServiceProvider}
 */
export function getAIService(config = {}) {
  if (!instance) {
    if (isBackendMode()) {
      instance = new BackendAIProvider({ baseUrl: 'http://localhost:8200' });
    } else {
      instance = new MockAIProvider(config);
    }
  }
  return instance;
}

/**
 * Reset the AI service (useful for switching providers at runtime)
 */
export function resetAIService() {
  instance = null;
}
