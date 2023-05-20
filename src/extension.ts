/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import axios from "axios";

export async function activate(context: vscode.ExtensionContext) {
  const indexName = await vscode.window.showInputBox({
    prompt: "Enter index name",
    value: "code"
  });

  let indexDisposable = vscode.commands.registerCommand(
    "extension.index",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage("No active text editor.");
        return;
      }

      const selection = editor.selection;
      if (selection.isEmpty) {
        vscode.window.showInformationMessage("No text selected.");
        return;
      }

      const selectedText = editor.document.getText(selection);

      const notes = await vscode.window.showInputBox({ prompt: "Enter notes" });
      if (!notes) {
        return;
      }
      // Call the index API
      callIndexAPI(selectedText, notes, indexName ? indexName : "code")
        .then(async () => {
          const newPosition = selection.end;
          const newSelection = new vscode.Selection(newPosition, newPosition);
          editor.selection = newSelection;
          vscode.window.showInformationMessage("Indexing successful.");
        })
        .catch((error) => {
          vscode.window.showErrorMessage(`Indexing failed: ${error.message}`);
        });
    }
  );

  let queryDisposable = vscode.commands.registerCommand(
    "extension.query",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage("No active text editor.");
        return;
      }
      const query = await vscode.window.showInputBox({ prompt: "Enter query" });
      // Call the query API
      if (!query) {
        return;
      }
      callQueryAPI(query, indexName ? indexName : "code")
        .then(async (response) => {
          const options = response.map((value) => ({
            detail: value.page_content,
            label: value.metadata.notes,
          }));

          const selectedOption = await vscode.window.showQuickPick(options, {
            placeHolder: "Select an option",
          });
          if (selectedOption) {
            await editor.edit((editBuilder) => {
              editBuilder.insert(
                editor.selection.active,
                selectedOption.detail
              );
            });
          }
        })
        .catch((error) => {
          vscode.window.showErrorMessage(`Query failed: ${error.message}`);
        });
    }
  );

  context.subscriptions.push(indexDisposable);
  context.subscriptions.push(queryDisposable);
}

function callIndexAPI(
  selectedText: string,
  notes: string,
  index_name: string
): Promise<void> {
  // Replace <INDEX_API_ENDPOINT> with the actual endpoint URL
  const endpoint = "http://0.0.0.0:8000/index";

  // Make a POST request to the API endpoint
  return axios.post(endpoint, {
    index_name,
    metadata: {
      notes,
      source: "SIFT",
    },
    raw: selectedText,
  });
}

async function callQueryAPI(
  query: string,
  index_name: string
): Promise<Array<Record<string, any>>> {
  // Replace <QUERY_API_ENDPOINT> with the actual endpoint URL
  const endpoint = "http://0.0.0.0:8000/query";

  // Make a GET request to the API endpoint
  const response = await axios.post(endpoint, {
    index_name,
    query,
  });
  return response.data;
}

export function deactivate() {}
