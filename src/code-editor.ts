import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { createRef, Ref, ref } from "lit/directives/ref.js";

// -- Monaco Editor Imports --
import * as monaco from 'monaco-editor-core';

import styles from "monaco-editor-core/min/vs/editor/editor.main.css";
import editorWorker from "monaco-editor-core/esm/vs/editor/editor.worker?worker";
//import jsonWorker from "monaco-editor-core/esm / vs / language / json / json.worker ? worker";
//import cssWorker from "monaco-editor-core/esm/vs/language/css/css.worker?worker";
//import htmlWorker from "monaco-editor-core/esm/vs/language/html/html.worker?worker";
//import tsWorker from "monaco-editor-core/esm/vs/language/typescript/ts.worker?worker";

// @ts-ignore
self.MonacoEnvironment = {
  // @ts-ignore
  getWorker(_: any, label: string) {
    /*
        if (label === "json") {
          return new jsonWorker();
        }
        if (label === "css" || label === "scss" || label === "less") {
          return new cssWorker();
        }
        if (label === "html" || label === "handlebars" || label === "razor") {
          return new htmlWorker();
        }
        if (label === "typescript" || label === "javascript") {
          return new tsWorker();
        }
    */
    return new editorWorker();
  },
};

// @ts-ignore
import * as vscode from "vscode";

import {
  MonacoLanguageClient, MessageConnection, CloseAction, ErrorAction,
  MonacoServices, createConnection
} from '@codingame/monaco-languageclient';
// @ts-ignore
import { listen } from '@codingame/monaco-jsonrpc';
import normalizeUrl from 'normalize-url';
import ReconnectingWebSocket from 'reconnecting-websocket';


class MonacoLanguageClientBinding {

  registerLanguages() {
    if (!monaco) return;

    // register Monaco languages
    monaco.languages.register({
      id: 'json',
      extensions: ['.json', '.bowerrc', '.jshintrc', '.jscsrc', '.eslintrc', '.babelrc'],
      aliases: ['JSON', 'json'],
      mimetypes: ['application/json'],
    });
  }

  install() {
    if (!monaco) return;

    // install Monaco language client services
    MonacoServices.install(monaco);
  }

  create() {
    // create the web socket
    const url = this.createUrl('/sampleServer')
    // @ts-ignore
    const webSocket = this.createWebSocket(url);
    // listen when the web socket is opened
    /*
      listen({
        webSocket,
        onConnection: connection => {
          // create and start the language client
          const languageClient = this.createLanguageClient(connection);
          const disposable = languageClient.start();
          connection.onClose(() => disposable.dispose());
        }
      });
    */
  }

  createLanguageClient(connection: MessageConnection): MonacoLanguageClient {
    return new MonacoLanguageClient({
      name: "Sample Language Client",
      clientOptions: {
        // use a language id as a document selector
        documentSelector: ['json'],
        // disable the default error handler
        errorHandler: {
          error: () => ErrorAction.Continue,
          closed: () => CloseAction.DoNotRestart
        }
      },
      // create a language client connection from the JSON RPC connection on demand
      connectionProvider: {
        get: (errorHandler, closeHandler) => {
          return Promise.resolve(createConnection(connection, errorHandler, closeHandler))
        }
      }
    });
  }

  createUrl(path: string): string {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    return normalizeUrl(`${protocol}://${location.host}${location.pathname}${path}`);
  }

  createWebSocket(url: string): ReconnectingWebSocket {
    const socketOptions = {
      maxReconnectionDelay: 10000,
      minReconnectionDelay: 1000,
      reconnectionDelayGrowFactor: 1.3,
      connectionTimeout: 10000,
      maxRetries: Infinity,
      debug: false
    };
    return new ReconnectingWebSocket(url, [], socketOptions);
  }

}

@customElement('code-editor')
export class CodeEditor extends LitElement {
  private container: Ref<HTMLElement> = createRef();
  editor?: monaco.editor.IStandaloneCodeEditor;
  private monacoLanguageClientBinding: MonacoLanguageClientBinding = new MonacoLanguageClientBinding();

  @property({ type: Boolean, attribute: "readonly" }) readOnly?: boolean;
  @property() theme?: string;
  @property() language?: string;
  @property() code?: string;
  @property() useLanguageClient: boolean = false;

  static override styles = css`
    :host {
      --editor-width: 100%;
      --editor-height: 100vh;
    }
    main {
      width: var(--editor-width);
      height: var(--editor-height);
    }
  `;

  override render() {
    return html`
      <style>
        ${styles}
      </style>
      <main ${ref(this.container)}></main>
    `;
  }

  private getFile() {
    if (this.children.length > 0) return this.children[0];
    return null;
  }

  private getCode() {
    if (this.code) return this.code;
    const file = this.getFile();
    if (!file) return;
    return file.innerHTML.trim();
  }

  private getLang() {
    if (this.language) return this.language;
    const file = this.getFile();
    if (!file) return;
    const type = file.getAttribute("type")!;
    return type.split("/").pop()!;
  }

  private getTheme() {
    if (this.theme) return this.theme;
    if (this.isDark()) return "vs-dark";
    return "vs-light";
  }

  private isUseLanguageClient() {
    return this.useLanguageClient;
  }

  private isDark() {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  }

  setValue(value: string) {
    this.editor!.setValue(value);
  }

  getValue() {
    const value = this.editor!.getValue();
    return value;
  }

  setReadOnly(value: boolean) {
    this.readOnly = value;
    this.setOptions({ readOnly: value });
  }

  setOptions(value: monaco.editor.IStandaloneEditorConstructionOptions) {
    this.editor!.updateOptions(value);
  }

  firstUpdated() {
    this.editor = monaco.editor.create(this.container.value!, {
      value: this.getCode(),
      language: this.getLang(),
      theme: this.getTheme(),
      automaticLayout: true,
      readOnly: this.readOnly ?? false,
    });

    if (this.isUseLanguageClient()) {
      console.log('LC')
      this.monacoLanguageClientBinding.registerLanguages();
    }

    this.editor.getModel()!.onDidChangeContent(() => {
      this.dispatchEvent(new CustomEvent("change", { detail: {} }));
    });
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => {
        monaco.editor.setTheme(this.getTheme());
      });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "code-editor": CodeEditor;
  }
}
