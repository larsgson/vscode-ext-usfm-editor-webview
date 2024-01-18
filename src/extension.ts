import { commands, ExtensionContext } from "vscode";
import { USFMEditorPanel } from "./panels/USFMEditorPanel";

export function activate(context: ExtensionContext) {
  // Create the show hello world command
  const showUSFMEditorCommand = commands.registerCommand("oce-usfm-editor.showUSFMEditor", () => {
    USFMEditorPanel.render(context.extensionUri,context);
  });

  // Add command to the extension context
  context.subscriptions.push(showUSFMEditorCommand);
}
