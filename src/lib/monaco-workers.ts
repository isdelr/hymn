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
 * - TypeScript/JavaScript: Full IntelliSense, type checking
 * - CSS/SCSS/LESS: Validation, color picker, autocomplete
 * - HTML/Handlebars/Razor: Tag completion, validation
 *
 * Languages using the default editor worker (syntax highlighting only):
 * - Java, Python, Go, Rust, C/C++, etc.
 *
 * Note: For full Java IntelliSense, you would need to integrate with
 * a Java Language Server (e.g., Eclipse JDT LS) via monaco-languageclient.
 */

import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

self.MonacoEnvironment = {
  getWorker(_: unknown, label: string) {
    // Languages with dedicated workers providing full IntelliSense
    if (label === 'json') {
      return new jsonWorker()
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker()
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker()
    }
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker()
    }
    // All other languages (java, python, go, rust, etc.) use the default
    // editor worker which provides syntax highlighting and basic editor features
    return new editorWorker()
  },
}

// Configure @monaco-editor/react loader to use local Monaco instance
// This prevents CDN loading attempts which fail in Electron due to CSP
loader.config({ monaco })
