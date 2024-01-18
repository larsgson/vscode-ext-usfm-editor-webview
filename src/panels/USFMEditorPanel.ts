import { Disposable, Webview, WebviewPanel, window, Uri, ViewColumn, ExtensionContext } from "vscode";
import * as fs from 'fs';
import * as path from 'path-extra';
import * as util from 'util';
import { getUri } from "../utilities/getUri";
import { getNonce } from "../utilities/getNonce";

const EXT_UNIQUE_ID = 'OCE-Usfm-Editor-V1-q34urfadjk';

/**
 * This class manages the state and behavior of USFMEditor webview panels.
 *
 * It contains all the data and methods for:
 *
 * - Creating and rendering USFMEditor webview panels
 * - Properly cleaning up and disposing of webview resources when the panel is closed
 * - Setting the HTML (and by proxy CSS/JavaScript) content of the webview panel
 * - Setting message listeners so data can be passed between the webview and extension
 */
export class USFMEditorPanel {
  public static currentPanel: USFMEditorPanel | undefined;
  private readonly _panel: WebviewPanel;
  private _disposables: Disposable[] = [];
  private static _context: ExtensionContext;

  /**
   * The USFMEditorPanel class private constructor (called only from the render method).
   *
   * @param panel A reference to the webview panel
   * @param extensionUri The URI of the directory containing the extension
   */
  private constructor(panel: WebviewPanel, extensionUri: Uri) {
    this._panel = panel;

    // Set an event listener to listen for when the panel is disposed (i.e. when the user closes
    // the panel or when the panel is closed programmatically)
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Set the HTML content for the webview panel
    this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri);

    // Set an event listener to listen for messages passed from the webview context
    this._setWebviewMessageListener(this._panel.webview);
  }

  /**
   * Renders the current webview panel if it exists otherwise a new webview panel
   * will be created and displayed.
   *
   * @param extensionUri The URI of the directory containing the extension.
   * @param context - current extension context
   */
  public static render(extensionUri: Uri, context: ExtensionContext) {
    USFMEditorPanel._context = context;
    if (USFMEditorPanel.currentPanel) {
      // If the webview panel already exists reveal it
      USFMEditorPanel.currentPanel._panel.reveal(ViewColumn.One);
    } else {
      // If a webview panel does not already exist create and show a new one
      const panel = window.createWebviewPanel(
        // Panel view type
        "showUSFMEditor",
        // Panel title
        "OCE USFM Editor",
        // The editor column the panel should be displayed in
        ViewColumn.One,
        // Extra panel configurations
        {
          // Enable JavaScript in the webview
          enableScripts: true,
          // Restrict the webview to only load resources from the `out` and `webview-ui/build` directories
          localResourceRoots: [Uri.joinPath(extensionUri, "out"), Uri.joinPath(extensionUri, "webview-ui/build")],
        }
      );

      USFMEditorPanel.currentPanel = new USFMEditorPanel(panel, extensionUri);
    }
  }

  /**
   * Cleans up and disposes of webview resources when the webview panel is closed.
   */
  public dispose() {
    USFMEditorPanel.currentPanel = undefined;

    // Dispose of the current webview panel
    this._panel.dispose();

    // Dispose of all disposables (i.e. commands) for the current webview panel
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  private _getGlobalKey(key:string):string|undefined {
    if (USFMEditorPanel._context && key) {
      try {
        const value = USFMEditorPanel._context.globalState.get(key);
        if (typeof value === 'string') {
          return value.toString();
        }
      } catch (e) {
        console.warn(`_getGlobalKey() failure reading ${key}`, e);
      }
    }
    return undefined;
  }

  private _setGlobalKey(key:string, value:string):boolean {
    if (USFMEditorPanel._context && key) {
      try {
        USFMEditorPanel._context.globalState.update(key, value);
        return true;
      } catch (e) {
        console.warn(`_setGlobalKey() failure ${key}`, e);
      }
    }
    return false;
  }

  /**
   * Defines and returns the HTML that should be rendered within the webview panel.
   *
   * @remarks This is also the place where references to the React webview build files
   * are created and inserted into the webview HTML.
   *
   * @param webview A reference to the extension webview
   * @param extensionUri The URI of the directory containing the extension
   * @returns A template string literal containing the HTML that should be
   * rendered within the webview panel
   */
  private _getWebviewContent(webview: Webview, extensionUri: Uri) {
    // The CSS file from the React build output
    const stylesUri = getUri(webview, extensionUri, ["webview-ui", "build", "assets", "index.css"]);
    // The JS file from the React build output
    const scriptUri = getUri(webview, extensionUri, ["webview-ui", "build", "assets", "index.js"]);

    const nonce = getNonce();

    // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
<!--          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">-->
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
          <title>OCE USFM Editor</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `;
  }

  private _navigateToAndReadFile(message:any) {
    let openDialog = async () => {
      const options = {
        canSelectMany: !!message?.canSelectMany,
        openLabel: message?.openLabel || 'Open USFM',
        filters: message?.filters || {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'All files': ['*']
        }
      };
      console.log('_navigateToAndReadFile - options:',options);

      const key = EXT_UNIQUE_ID;
      const initialFileUri:string = this._getGlobalKey(key) || "";
      let initialFolder = path.dirname(initialFileUri);

      if (initialFolder) {
        console.log(`initial folder: ${initialFolder}`);
        // @ts-ignore
        options['defaultUri'] = Uri.file(initialFolder);
        console.log(`options:`, options);
      }

      let contents:string|null = null;
      let fileUri = await window.showOpenDialog(options);
      let _fileUri:string|null = null;
      if (fileUri && fileUri[0]) {
        _fileUri = fileUri[0].fsPath;

        console.log('_navigateToAndReadFile - reading file :',_fileUri);
        let readFile = util.promisify(fs.readFile);

        let readContents = async (fileUri:string) => {
          if (fileUri) {
            let data = await readFile(fileUri, 'utf8');
            contents = data.toString();
          }
        };

        await readContents(_fileUri);
        
        if (contents) { // if we loaded data, update folder used
          this._setGlobalKey(key, _fileUri); 
        }
      }

      console.log('_navigateToAndReadFile -Selected folder: ' + _fileUri);
      this._panel.webview.postMessage({
        command: 'WEBVIEW_FILE_OPEN_RESULTS',
        results: { 
          message,
          filePath: _fileUri,
          contents,
        }
      });
    };

    openDialog();
  }

  private _navigateToAndSaveFile(message:any) {
    const panel = this._panel;
    const _fileUri:string = this._getGlobalKey(EXT_UNIQUE_ID) || "";

    fs.writeFile(_fileUri, message?.text || '', 'utf8', function(err) {
      if (err) {
        console.log('_navigateToAndSaveFile - An error occurred while writing the file.');
      } else {
        console.log('_navigateToAndSaveFile - File written successfully.');
      }

      // panel.webview.postMessage({
      //   command: 'WEBVIEW_FILE_SAVE_RESULTS',
      //   results: {
      //     message,
      //     filePath: _fileUri,
      //     success: !err,
      //   }
      // });
    });
  }

  /**
   * Sets up an event listener to listen for messages passed from the webview context and
   * executes code based on the message that is recieved.
   *
   * @param webview A reference to the extension webview
   * @param context A reference to the extension context
   */
  private _setWebviewMessageListener(webview: Webview) {
    webview.onDidReceiveMessage(
      (message: any) => {
        const command = message.command;
        const text = message.text;
        const filePath = message.filePath;

        switch (command) {
          case "save":
            // Code that should run in response to the save message command
            window.showInformationMessage('saving');
            this._navigateToAndSaveFile(message);
            return;
        
          case 'openFilePicker':
            // Code that should run in response to the save message command
            window.showInformationMessage('openFilePicker');
            console.log("openFilePicker", message);
            this._navigateToAndReadFile(message);
            return;
        }
      },
      undefined,
      this._disposables
    );
  }
}
