import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Remove whatever a test rendered, so tests can't affect each other
afterEach(cleanup);