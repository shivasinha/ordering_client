import { configureDayjs } from './src/app/utils/dayjs-config';

// Configure dayjs plugins for tests
configureDayjs();

// Ignore specific console error messages 
const ignoredErrorMessagesTypes = [
   'css parsing'
];

//Fail test if contains warning or error
console.warn = message => {
  throw new Error(message);
};
console.error = message => {
  if (ignoredErrorMessagesTypes[0] === message.type) {
    return;
  }
  throw new Error(message);
};

/* global mocks for jsdom */
const mock = () => {
  let storage: { [key: string]: string } = {};
  return {
    getItem: (key: string) => (key in storage ? storage[key] : null),
    setItem: (key: string, value: string) => (storage[key] = value || ''),
    removeItem: (key: string) => delete storage[key],
    clear: () => (storage = {}),
  };
};

Object.defineProperty(window, 'localStorage', { value: mock() });
Object.defineProperty(window, 'sessionStorage', { value: mock() });
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ['-webkit-appearance'],
});

/* output shorter and more meaningful Zone error stack traces */
// Error.stackTraceLimit = 2;

// Track active timers for cleanup
const activeTimers = new Set<number>();

// Global cleanup for tests
global.afterEach(() => {
  // Clear all timers
  jest.clearAllTimers();
  
  // Clear any remaining active timers
  activeTimers.forEach(id => {
    try {
      clearTimeout(id);
      clearInterval(id);
    } catch (e) {
      // Ignore errors when clearing timers
    }
  });
  activeTimers.clear();
  
  // Use real timers for cleanup
  jest.useRealTimers();
  
  // Clear local/session storage after each test
  if (typeof window !== 'undefined') {
    window.localStorage.clear();
    window.sessionStorage.clear();
  }
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});

// Global setup to use fake timers for tests that need them
global.beforeEach(() => {
  // Only use fake timers if the test explicitly needs them
  // Tests can override this by calling jest.useRealTimers() in their beforeEach
});
