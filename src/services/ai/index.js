// ============================================================
// AI Service Factory
// ============================================================
// To swap AI providers:
// 1. Create a new provider class extending AIServiceProvider
// 2. Import it here
// 3. Change the provider in getAIService()
// ============================================================

import { MockAIProvider } from './mock-provider.js';
// Future: import { OpenAIProvider } from './openai-provider.js';
// Future: import { StabilityProvider } from './stability-provider.js';

let instance = null;

/**
 * Get the AI service instance (singleton)
 * @param {object} config - Optional configuration
 * @returns {AIServiceProvider}
 */
export function getAIService(config = {}) {
  if (!instance) {
    // =============================================
    // CHANGE PROVIDER HERE to swap AI service:
    // instance = new OpenAIProvider({ apiKey: '...' });
    // =============================================
    instance = new MockAIProvider(config);
  }
  return instance;
}

/**
 * Reset the AI service (useful for switching providers at runtime)
 */
export function resetAIService() {
  instance = null;
}
