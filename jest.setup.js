// filepath: /home/atelo/projects/void_scanner/jest.setup.js
// Add React Testing Library's custom Jest matchers
require('@testing-library/jest-dom');

// Mock Next.js components and functions
jest.mock('next/image', () => ({
  __esModule: true,
  default: function Image(props) {
    // Returning a standard HTML img element
    return Object.assign(document.createElement('img'), {
      src: props.src,
      alt: props.alt || '',
      width: props.width || 100,
      height: props.height || 100,
    });
  },
}));

// Mock for Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    pathname: '/',
    query: {},
    asPath: '/',
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock for Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock for global fetch
global.fetch = jest.fn();

// Mock for URL.createObjectURL
if (typeof window !== 'undefined') {
  window.URL.createObjectURL = jest.fn(() => 'mock-url');
  window.URL.revokeObjectURL = jest.fn();
}

// Avoid React 18 "act" warnings
global.IS_REACT_ACT_ENVIRONMENT = true;

// Mock for console error during tests to keep output clean
const originalConsoleError = console.error;
console.error = (...args) => {
  // Filter out specific React errors that might occur during testing
  if (
    typeof args[0] === 'string' && (
      args[0].includes('Warning: ReactDOM.render is no longer supported') ||
      args[0].includes('Warning: An update to') ||
      args[0].includes('Warning: Each child in a list') ||
      args[0].includes('Warning: The current testing environment is not configured to support act') ||
      args[0].includes('act(...) is deprecated in favor of') ||
      args[0].includes('inside a test was not wrapped in act')
    )
  ) {
    return;
  }
  originalConsoleError(...args);
};