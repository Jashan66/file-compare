import * as vscode from 'vscode';
import * as path from 'path';
import { execSync } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    'file-compare.compareWithBranch',
    async (uri?: vscode.Uri) => {

      // Get the file URI from explorer right-click or active editor
      let fileUri = uri;
      if (!fileUri) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showErrorMessage('No file selected or open.');
          return;
        }
        fileUri = editor.document.uri;
      }

      const filePath = fileUri.fsPath;
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);
      if (!workspaceFolder) {
        vscode.window.showErrorMessage('File is not inside a workspace folder.');
        return;
      }

      const repoRoot = workspaceFolder.uri.fsPath;
      const relativeFilePath = path.relative(repoRoot, filePath).replace(/\\/g, '/');

      // Get all branches
      let branches: string[];
      try {
        const raw = execSync('git branch -a', { cwd: repoRoot }).toString();
        branches = raw
          .split('\n')
          .map(b => b.replace(/^\*?\s+/, '').replace(/^remotes\//, '').trim())
          .filter(b => b && !b.includes('HEAD'));
        branches = [...new Set(branches)];
      } catch {
        vscode.window.showErrorMessage('Failed to list git branches. Is this a git repo?');
        return;
      }

      // Let user pick a branch
      const selectedBranch = await vscode.window.showQuickPick(branches, {
        placeHolder: 'Select a branch to compare against',
      });
      if (!selectedBranch) { return; }

      // Resolve path on target branch (.ts/.js fallback)
      const resolvedPath = resolveFileOnBranch(repoRoot, relativeFilePath, selectedBranch);
      if (!resolvedPath) {
        vscode.window.showErrorMessage(
          `"${relativeFilePath}" (or its .ts/.js equivalent) not found on branch "${selectedBranch}".`
        );
        return;
      }

      // Build git URI for the file on the target branch
      const gitUri = buildGitUri(fileUri, resolvedPath, selectedBranch, repoRoot);
      const title = `${path.basename(filePath)} (${selectedBranch}) ↔ (current)`;

      await vscode.commands.executeCommand('vscode.diff', gitUri, fileUri, title);
    }
  );

  context.subscriptions.push(disposable);
}

function resolveFileOnBranch(repoRoot: string, relativeFilePath: string, branch: string): string | null {
  // Exact match
  if (existsOnBranch(repoRoot, relativeFilePath, branch)) {
    return relativeFilePath;
  }

  // .ts/.js fallback
  const ext = path.extname(relativeFilePath);
  if (ext === '.ts' || ext === '.js') {
    const alt = relativeFilePath.slice(0, -ext.length) + (ext === '.ts' ? '.js' : '.ts');
    if (existsOnBranch(repoRoot, alt, branch)) { return alt; }
  }

  // Strip or add leading src/
  const stripped = relativeFilePath.startsWith('src/')
    ? relativeFilePath.slice(4)
    : 'src/' + relativeFilePath;

  if (existsOnBranch(repoRoot, stripped, branch)) { return stripped; }

  // .ts/.js fallback on stripped path too
  const strippedExt = path.extname(stripped);
  if (strippedExt === '.ts' || strippedExt === '.js') {
    const alt = stripped.slice(0, -strippedExt.length) + (strippedExt === '.ts' ? '.js' : '.ts');
    if (existsOnBranch(repoRoot, alt, branch)) { return alt; }
  }

  return null;
}

function existsOnBranch(repoRoot: string, relativeFilePath: string, branch: string): boolean {
  try {
    const { spawnSync } = require('child_process');
    const result = spawnSync('git', ['cat-file', '-e', `${branch}:${relativeFilePath}`], { cwd: repoRoot });
    return result.status === 0;
  } catch {
    return false;
  }
}

function buildGitUri(baseUri: vscode.Uri, relativeFilePath: string, branch: string, repoRoot: string): vscode.Uri {
  try {
    const gitExtension = vscode.extensions.getExtension('vscode.git');
    if (gitExtension?.isActive) {
      const git = gitExtension.exports.getAPI(1);
      const repo = git.repositories.find((r: any) => baseUri.fsPath.startsWith(r.rootUri.fsPath));
      if (repo) {
        return repo.toGitUri(vscode.Uri.file(path.join(repoRoot, relativeFilePath)), branch);
      }
    }
  } catch { /* fall through */ }

  return baseUri.with({
    scheme: 'git',
    path: path.join(repoRoot, relativeFilePath),
    query: JSON.stringify({ path: path.join(repoRoot, relativeFilePath), ref: branch }),
  });
}

export function deactivate() {}