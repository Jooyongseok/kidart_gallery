// ============================================================
// AI Service Provider — Interface (Abstract Base)
// ============================================================
// All AI providers must implement these methods.
// To switch AI providers, create a new class extending this
// and update the factory in index.js.
// ============================================================

export class AIServiceProvider {
  constructor(config = {}) {
    this.config = config;
    this.name = 'BaseProvider';
  }

  /**
   * Generate a fairy tale / story from an artwork image
   * @param {string} imageData - base64 image data or URL
   * @param {object} options - { language, style, length }
   * @returns {Promise<{ title: string, story: string, illustrations: string[] }>}
   */
  async generateStory(imageData, options = {}) {
    throw new Error('generateStory() must be implemented by provider');
  }

  /**
   * Generate animation frames from an artwork
   * @param {string} imageData - base64 image data or URL
   * @param {object} options - { style, duration, fps }
   * @returns {Promise<{ frames: string[], preview: string }>}
   */
  async generateAnimation(imageData, options = {}) {
    throw new Error('generateAnimation() must be implemented by provider');
  }

  /**
   * Convert 2D artwork to 3D model representation
   * @param {string} imageData - base64 image data or URL
   * @param {object} options - { format, quality }
   * @returns {Promise<{ modelData: object, preview: string, meshInfo: object }>}
   */
  async convert2Dto3D(imageData, options = {}) {
    throw new Error('convert2Dto3D() must be implemented by provider');
  }

  /**
   * Get provider info
   */
  getInfo() {
    return {
      name: this.name,
      capabilities: ['story', 'animation', '2d-to-3d']
    };
  }
}
