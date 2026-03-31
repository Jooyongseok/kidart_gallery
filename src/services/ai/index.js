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
    //
    // [현재] Mock (데모용):
    //   instance = new MockAIProvider(config);
    //
    // [백엔드 연동] FastAPI 멀티 에이전트 백엔드 (uvicorn main:app --port 8200):
    //   instance = new BackendAIProvider({ baseUrl: 'http://localhost:8200' });
    //
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
