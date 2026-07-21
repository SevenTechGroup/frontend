import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

if (!URL.createObjectURL) {
  URL.createObjectURL = () => 'blob:sahel-signal-test-image';
}

if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = () => undefined;
}
