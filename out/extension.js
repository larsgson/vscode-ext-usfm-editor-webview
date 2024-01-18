"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const vscode_1 = require("vscode");
const USFMEditorPanel_1 = require("./panels/USFMEditorPanel");
function activate(context) {
    // Create the show hello world command
    const showUSFMEditorCommand = vscode_1.commands.registerCommand("oce-usfm-editor.showUSFMEditor", () => {
        USFMEditorPanel_1.USFMEditorPanel.render(context.extensionUri, context);
    });
    // Add command to the extension context
    context.subscriptions.push(showUSFMEditorCommand);
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map