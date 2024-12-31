// src/utils/performance.ts
import * as Sentry from '@sentry/react-native';

export class Performance {
  static startTransaction(name: string, op: string) {
    return Sentry.startTransaction({
      name,
      op,
    });
  }

  static measureAsync(name: string, operation: () => Promise<any>) {
    const transaction = Performance.startTransaction(name, 'async');
    
    return operation()
      .then(result => {
        transaction.finish();
        return result;
      })
      .catch(error => {
        transaction.finish();
        throw error;
      });
  }
}

// Usage in components/hooks:
const fetchData = async () => {
  return Performance.measureAsync('fetchPosts', async () => {
    // Your existing fetch logic
  });
};
