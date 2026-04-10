# Branch File Compare

Compare any file in your workspace against the same file on another Git branch — directly in VS Code's native diff editor.

## Features

- **Right-click** any file in the Explorer → *Compare File with Branch*
- **Command Palette** (`Cmd+Shift+P`) → *File Compare: Compare File with Branch*
- Native VS Code diff view — no popups, no webviews
- Automatic `.ts` ↔ `.js` fallback if the file was renamed between branches
- Configurable path prefix fallbacks for repos that restructured folders (e.g. added `src/`)
- Works in remote environments (Docker, SSH, WSL)

## Usage

1. Right-click a file in the Explorer or open it and use the command palette
2. Pick a branch from the dropdown
3. The diff opens instantly — target branch on the left, your current file on the right

## Extension Settings

`file-compare.pathPrefixFallbacks` — array of path prefixes to strip or add when a file isn't found on the target branch.

Default: `["src"]`

Example: if your current branch has `src/actions/show.ts` but the target branch has `actions/show.ts`, the extension will find it automatically.

To customize, add this to your `settings.json`:
```json
"file-compare.pathPrefixFallbacks": ["src", "app"]
```

## Requirements

- Git must be installed and available in your PATH
- The folder open in VS Code must be a Git repository

## Release Notes

See [CHANGELOG.md](CHANGELOG.md).