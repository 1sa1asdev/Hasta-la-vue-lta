import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  schema: '../api/src/graphql/schema.js',
  documents: ['src/**/*.vue', 'src/**/*.ts', '!src/gql/**'],
  generates: {
    './src/gql/': {
      preset: 'client',
      presetConfig: { fragmentMasking: false },
      config: { useTypeImports: true },
    },
  },
}

export default config
