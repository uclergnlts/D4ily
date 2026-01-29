import { defineConfig } from 'orval';

export default defineConfig({
  input: '../backend/src/openapi/openapi.yaml',
  output: './src/api/generated',
  client: 'axios',
  hooks: {
    afterGeneration: 'npm run format:api',
  },
  mode: 'split',
  schemas: {
    name: 'schemas',
    export: true,
  },
  definitions: {
    name: 'types',
    export: true,
  },
  operations: {
    name: 'services',
    export: true,
    mode: 'tags',
  },
  mock: {
    name: 'mock',
    enabled: false,
  },
  override: {
    mutator: (operation) => {
      // Add default headers to all requests
      operation.request = {
        ...operation.request,
        headers: {
          ...operation.request?.headers,
          'Content-Type': 'application/json',
        },
      };
      return operation;
    },
  },
  prettier: {
    printWidth: 100,
    tabWidth: 2,
    useTabs: false,
    semi: true,
    trailingComma: 'all',
  },
});
