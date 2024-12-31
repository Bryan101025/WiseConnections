// src/utils/memoryManager.ts
export class MemoryManager {
  private static listenerCount = 0;
  private static cleanupCallbacks: (() => void)[] = [];
  private static memoryWarningCallback?: () => void;

  static addCleanupCallback(callback: () => void) {
    this.cleanupCallbacks.push(callback);
  }

  static removeCleanupCallback(callback: () => void) {
    this.cleanupCallbacks = this.cleanupCallbacks.filter(cb => cb !== callback);
  }

  static incrementListeners() {
    this.listenerCount++;
    if (this.listenerCount > 10) {
      this.cleanup();
    }
  }

  static decrementListeners() {
    this.listenerCount--;
  }

  static cleanup() {
    this.cleanupCallbacks.forEach(callback => callback());
    this.listenerCount = 0;
  }

  static setMemoryWarningCallback(callback: () => void) {
    this.memoryWarningCallback = callback;
  }

  static handleMemoryWarning() {
    if (this.memoryWarningCallback) {
      this.memoryWarningCallback();
    }
    this.cleanup();
  }

  static reset() {
    this.listenerCount = 0;
    this.cleanupCallbacks = [];
    this.memoryWarningCallback = undefined;
  }
}
