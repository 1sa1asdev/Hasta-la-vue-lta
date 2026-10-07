import { globalIgnores } from 'eslint/config'
import globals from 'globals'
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import pluginVitest from '@vitest/eslint-plugin'
import skipFormatting from 'eslint-config-prettier/flat'
import {
  configureVueProject,
  defineConfigWithVueTs,
  vueTsConfigs,
} from '@vue/eslint-config-typescript'

configureVueProject({
  scriptLangs: ['ts', 'js'],
})
export default defineConfigWithVueTs([
  {
    name: 'app/files-to-lint',
    files: ['**/*.{vue,js,ts,mjs,jsx}'],
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  ...vueTsConfigs.recommended,
  {
    ...pluginVitest.configs.recommended,
    files: ['src/**/*.test.{js,ts}'],
  },

  skipFormatting,
])
