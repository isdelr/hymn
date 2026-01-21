/**
 * Monaco Editor Web Worker Configuration for Vite
 *
 * This file sets up Monaco Editor's web workers using Vite's native worker support.
 * Workers are loaded as ES modules using the ?worker query parameter.
 *
 * Must be imported before any Monaco Editor component is mounted.
 *
 * Supported languages with dedicated workers:
 * - JSON: Full validation and schema support
 *
 * Languages using the default editor worker (syntax highlighting only):
 * - Java, text files, and all other languages
 */

import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'

self.MonacoEnvironment = {
  getWorker(_: unknown, label: string) {
    // JSON has a dedicated worker for validation and schema support
    if (label === 'json') {
      return new jsonWorker()
    }
    // All other languages (java, text, etc.) use the default editor worker
    // which provides syntax highlighting and basic editor features
    return new editorWorker()
  },
}

// Configure @monaco-editor/react loader to use local Monaco instance
// This prevents CDN loading attempts which fail in Electron due to CSP
loader.config({ monaco })
