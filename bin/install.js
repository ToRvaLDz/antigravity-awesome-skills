#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const REPO = 'https://github.com/sickn33/antigravity-awesome-skills.git';
const HOME = process.env.HOME || process.env.USERPROFILE || '';

function resolveDir(p) {
  if (!p) return null;
  const s = p.replace(/^~($|\/)/, HOME + '$1');
  return path.resolve(s);
}

function parseArgs() {
  const a = process.argv.slice(2);
  let pathArg = null;
  let versionArg = null;
  let tagArg = null;
  let bundleManage = false;
  let bundleInstall = false;
  let bundleEdit = false;
  let bundleEditAsNew = false;
  let linksManage = false;
  let completion = false;
  let completionShell = null;
  let cursor = false, claude = false, gemini = false, codex = false;
  const positional = [];

  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--help' || a[i] === '-h') return { help: true };
    if (a[i] === '--path' && a[i + 1]) { pathArg = a[++i]; continue; }
    if (a[i] === '--version' && a[i + 1]) { versionArg = a[++i]; continue; }
    if (a[i] === '--tag' && a[i + 1]) { tagArg = a[++i]; continue; }
    if (a[i] === '--bundle-manage') { bundleManage = true; continue; }
    if (a[i] === '--bundle-install') { bundleInstall = true; continue; }
    if (a[i] === '--bundle-edit') { bundleEdit = true; continue; }
    if (a[i] === '--bundle-edit-as-new') { bundleEditAsNew = true; continue; }
    if (a[i] === '--links-manage') { linksManage = true; continue; }
    if (a[i] === '--shell' && a[i + 1]) { completionShell = a[++i]; continue; }
    if (a[i] === '--cursor') { cursor = true; continue; }
    if (a[i] === '--claude') { claude = true; continue; }
    if (a[i] === '--gemini') { gemini = true; continue; }
    if (a[i] === '--codex') { codex = true; continue; }
    if (a[i] === 'install' && i === 0) continue;
    if (!a[i].startsWith('--')) {
      positional.push(a[i]);
    }
  }

  if (positional[0] === 'bundle') {
    if (positional[1] === 'manage') bundleManage = true;
    if (positional[1] === 'install') bundleInstall = true;
    if (positional[1] === 'edit') bundleEdit = true;
    if (positional[1] === 'edit-as-new') bundleEditAsNew = true;
  }
  if (positional[0] === 'links' && positional[1] === 'manage') {
    linksManage = true;
  }
  if (positional[0] === 'completion') {
    completion = true;
    if (positional[1]) completionShell = positional[1];
  }

  return {
    pathArg,
    versionArg,
    tagArg,
    bundleManage,
    bundleInstall,
    bundleEdit,
    bundleEditAsNew,
    linksManage,
    completion,
    completionShell,
    cursor,
    claude,
    gemini,
    codex,
    positional,
  };
}

function defaultDir(opts) {
  if (opts.pathArg) return resolveDir(opts.pathArg);
  if (opts.cursor) return path.join(HOME, '.cursor', 'skills');
  if (opts.claude) return path.join(HOME, '.claude', 'skills');
  if (opts.gemini) return path.join(HOME, '.gemini', 'skills');
  if (opts.codex) {
    const codexHome = process.env.CODEX_HOME;
    if (codexHome) return path.join(codexHome, 'skills');
    return path.join(HOME, '.codex', 'skills');
  }
  return path.join(HOME, '.agent', 'skills');
}

function printHelp() {
  console.log(`
antigravity-awesome-skills — installer

  npx antigravity-awesome-skills [install] [options]
  npx antigravity-awesome-skills bundle <manage|install|edit|edit-as-new> [options]
  npx antigravity-awesome-skills links manage [options]
  npx antigravity-awesome-skills completion <bash|zsh|fish>

  Clones the skills repo into your agent's skills directory.
  Completion command installs the script if missing and adds the "ags" alias.

Options:
  --cursor    Install to ~/.cursor/skills (Cursor)
  --claude    Install to ~/.claude/skills (Claude Code)
  --gemini    Install to ~/.gemini/skills (Gemini CLI)
  --codex     Install to ~/.codex/skills (Codex CLI)
  --path <dir> Install to <dir> (default: ~/.agent/skills)
  --version <ver>  After clone, checkout tag v<ver> (e.g. 4.6.0 -> v4.6.0)
  --tag <tag>      After clone, checkout this tag (e.g. v4.6.0)
  --shell <name>   Shell for completion command (bash, zsh, or fish)
  --bundle-manage  Graphical custom-bundle manager (create/edit/edit-as-new/delete)
  --bundle-install Pick a bundle + agent via UI and install symlinked skills in --path
  --bundle-edit    Edit an existing custom bundle in place
  --bundle-edit-as-new Edit an existing bundle and save as a new bundle
  --links-manage   Graphical skills symlink manager for a target agent in --path

Examples:
  npx antigravity-awesome-skills
  npx antigravity-awesome-skills --cursor
  npx antigravity-awesome-skills --version 4.6.0
  npx antigravity-awesome-skills --path ./my-skills
  npx antigravity-awesome-skills bundle manage
  npx antigravity-awesome-skills bundle install --path /home/myrepo
  npx antigravity-awesome-skills bundle edit
  npx antigravity-awesome-skills bundle edit-as-new
  npx antigravity-awesome-skills links manage --path /home/myrepo
  npx antigravity-awesome-skills completion bash
  npx antigravity-awesome-skills completion zsh
  npx antigravity-awesome-skills completion fish
  npx antigravity-awesome-skills --bundle-manage
  npx antigravity-awesome-skills --bundle-install --path /home/myrepo
  npx antigravity-awesome-skills --bundle-edit
  npx antigravity-awesome-skills --bundle-edit-as-new
  npx antigravity-awesome-skills --links-manage --path /home/myrepo
`);
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (r.status !== 0) process.exit(r.status == null ? 1 : r.status);
}

function buildCompletionScript(shellName) {
  const shell = String(shellName || '').toLowerCase();
  const command = 'antigravity-awesome-skills';
  const options = [
    '--help',
    '-h',
    '--path',
    '--version',
    '--tag',
    '--shell',
    '--cursor',
    '--claude',
    '--gemini',
    '--codex',
    '--bundle-manage',
    '--bundle-install',
    '--bundle-edit',
    '--bundle-edit-as-new',
    '--links-manage',
  ].join(' ');

  if (shell === 'bash') {
    return `# bash completion for ${command}
_${command.replace(/-/g, '_')}() {
  local cur prev words cword
  _init_completion || return

  local top="install bundle links completion ${options}"
  local bundle_sub="manage install edit edit-as-new"
  local links_sub="manage"
  local completion_sub="bash zsh"

  if [[ $cword -ge 2 ]]; then
    case "\${words[1]}" in
      bundle)
        COMPREPLY=( $(compgen -W "$bundle_sub --path --help -h" -- "$cur") )
        return
        ;;
      links)
        if [[ $cword -eq 2 ]]; then
          COMPREPLY=( $(compgen -W "$links_sub" -- "$cur") )
        else
          COMPREPLY=( $(compgen -W "--path --help -h" -- "$cur") )
        fi
        return
        ;;
      completion)
        COMPREPLY=( $(compgen -W "$completion_sub --help -h --shell" -- "$cur") )
        return
        ;;
    esac
  fi

  COMPREPLY=( $(compgen -W "$top" -- "$cur") )
}
complete -F _${command.replace(/-/g, '_')} ${command}`;
  }

  if (shell === 'zsh') {
    return `#compdef ${command}
_${command.replace(/-/g, '_')}() {
  local -a top_args
  top_args=(
    'install:install or update'
    'bundle:bundle commands'
    'links:links commands'
    'completion:print completion script'
    '--path[target path]:path:_files -/'
    '--version[version tag]'
    '--tag[git tag]'
    '--shell[shell name]:shell:(bash zsh fish)'
    '--cursor[target Cursor path]'
    '--claude[target Claude path]'
    '--gemini[target Gemini path]'
    '--codex[target Codex path]'
    '--bundle-manage[open bundle manager]'
    '--bundle-install[install bundle by UI]'
    '--bundle-edit[edit custom bundle]'
    '--bundle-edit-as-new[edit bundle as new]'
    '--links-manage[manage symlinked skills]'
    '--help[show help]'
    '-h[show help]'
  )

  if (( CURRENT == 2 )); then
    _describe 'command' top_args
    return
  fi

  case "$words[2]" in
    bundle)
      _arguments \
        '1:bundle command:(manage install edit edit-as-new)' \
        '*:args:->bundle_args'
      ;;
    links)
      _arguments \
        '1:links command:(manage)' \
        '--path[target path]:path:_files -/' \
        '--help[show help]' \
        '-h[show help]'
      ;;
    completion)
      _arguments \
        '1:shell:(bash zsh fish)' \
        '--shell[shell name]:shell:(bash zsh fish)' \
        '--help[show help]' \
        '-h[show help]'
      ;;
    *)
      _describe 'options' top_args
      ;;
  esac
}
compdef _${command.replace(/-/g, '_')} ${command}`;
  }

  if (shell === 'fish') {
    return `# fish completion for ${command}
complete -c ${command} -f

# Top-level commands
complete -c ${command} -n "__fish_use_subcommand" -a "install bundle links completion"

# Top-level options
complete -c ${command} -l help
complete -c ${command} -s h
complete -c ${command} -l path -r
complete -c ${command} -l version -r
complete -c ${command} -l tag -r
complete -c ${command} -l shell -r -a "bash zsh fish"
complete -c ${command} -l cursor
complete -c ${command} -l claude
complete -c ${command} -l gemini
complete -c ${command} -l codex
complete -c ${command} -l bundle-manage
complete -c ${command} -l bundle-install
complete -c ${command} -l bundle-edit
complete -c ${command} -l bundle-edit-as-new
complete -c ${command} -l links-manage

# bundle subcommands
complete -c ${command} -n "__fish_seen_subcommand_from bundle; and not __fish_seen_subcommand_from manage install edit edit-as-new" -a "manage install edit edit-as-new"

# links subcommands
complete -c ${command} -n "__fish_seen_subcommand_from links; and not __fish_seen_subcommand_from manage" -a "manage"

# completion subcommands
complete -c ${command} -n "__fish_seen_subcommand_from completion; and not __fish_seen_subcommand_from bash zsh fish" -a "bash zsh fish"
`;
  }

  return null;
}

function printCompletionScript(shellName) {
  const script = buildCompletionScript(shellName);
  if (script) {
    console.log(script);
    return;
  }

  console.error('Unsupported shell. Use: bash, zsh, or fish');
  process.exit(1);
}

function completionInstallConfig(shellName, repoRoot) {
  const shell = String(shellName || '').toLowerCase();
  if (!HOME) return null;
  const localBin = repoRoot ? path.join(repoRoot, 'bin', 'install.js') : null;
  const useLocal = localBin && fs.existsSync(localBin);
  const aliasCommand = useLocal
    ? `node "${localBin}"`
    : 'npx antigravity-awesome-skills';
  if (shell === 'bash') {
    return {
      shell,
      completionPath: path.join(HOME, '.bashrc.d', 'antigravity-awesome-skills.bash'),
      rcPath: path.join(HOME, '.bashrc'),
      aliasLine: `ags() { ${aliasCommand} "$@"; }`,
      completionAliasLine: 'complete -F _antigravity_awesome_skills ags',
    };
  }
  if (shell === 'zsh') {
    return {
      shell,
      completionPath: path.join(HOME, '.zsh', 'completion', '_antigravity_awesome_skills'),
      rcPath: path.join(HOME, '.zshrc'),
      aliasLine: `ags() { ${aliasCommand} "$@"; }`,
      completionAliasLine: 'compdef _antigravity_awesome_skills ags',
    };
  }
  if (shell === 'fish') {
    return {
      shell,
      completionPath: path.join(HOME, '.config', 'fish', 'completions', 'antigravity-awesome-skills.fish'),
      rcPath: path.join(HOME, '.config', 'fish', 'config.fish'),
      aliasLine: useLocal
        ? `alias ags "node ${localBin}"`
        : 'alias ags "npx antigravity-awesome-skills"',
      completionAliasLine: 'complete -c ags -w antigravity-awesome-skills',
    };
  }
  return null;
}

function fileHasAnyLine(filePath, patterns) {
  if (!fs.existsSync(filePath)) return false;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return patterns.some((pattern) => pattern.test(content));
  } catch (_) {
    return false;
  }
}

function upsertLine(filePath, line, patterns) {
  const hasExisting = fileHasAnyLine(filePath, patterns);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, `${line}\n`, { flag: 'a' });
    return true;
  }
  if (!hasExisting) {
    fs.writeFileSync(filePath, `\n${line}\n`, { flag: 'a' });
    return true;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let updated = content;
    for (const pattern of patterns) {
      updated = updated.replace(pattern, line);
    }
    if (updated !== content) {
      fs.writeFileSync(filePath, updated);
      return true;
    }
  } catch (_) {
    return false;
  }
  return false;
}

function installCompletionScript(shellName, repoRoot) {
  const config = completionInstallConfig(shellName, repoRoot);
  if (!config) {
    console.error('Unsupported shell. Use: bash, zsh, or fish');
    process.exit(1);
  }
  const script = buildCompletionScript(config.shell);
  if (!script) {
    console.error('Unsupported shell. Use: bash, zsh, or fish');
    process.exit(1);
  }

  let completionInstalled = false;
  if (fs.existsSync(config.completionPath)) {
    console.log(`ℹ️ Completion already present: ${config.completionPath}`);
  } else {
    const dir = path.dirname(config.completionPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(config.completionPath, `${script}\n`);
    completionInstalled = true;
    console.log(`✅ Completion installed: ${config.completionPath}`);
  }

  const aliasAdded = upsertLine(
    config.rcPath,
    config.aliasLine,
    [
      /^\s*alias\s+ags=.*$/gm,
      /^\s*ags\(\)\s*\{.*$/gm,
      /^\s*function\s+ags\b.*$/gm,
    ],
  );

  if (aliasAdded) {
    console.log(`✅ Alias added to ${config.rcPath}`);
  } else {
    console.log(`ℹ️ Alias already present in ${config.rcPath}`);
  }

  if (config.completionAliasLine) {
    const completionAliasAdded = upsertLine(
      config.rcPath,
      config.completionAliasLine,
      [
        /^\s*compdef\s+_antigravity_awesome_skills\s+ags\b.*$/gm,
        /^\s*complete\s+-F\s+_antigravity_awesome_skills\s+ags\b.*$/gm,
        /^\s*complete\s+-c\s+ags\s+-w\s+antigravity-awesome-skills\b.*$/gm,
      ],
    );
    if (completionAliasAdded) {
      console.log(`✅ Completion alias added to ${config.rcPath}`);
    } else {
      console.log(`ℹ️ Completion alias already present in ${config.rcPath}`);
    }
  }

  if (!completionInstalled) return;
}

function isRepoRoot(candidate) {
  if (!candidate) return false;
  const skillsDir = path.join(candidate, 'skills');
  return fs.existsSync(skillsDir) && fs.statSync(skillsDir).isDirectory();
}

function resolveRepoRoot() {
  const candidates = [
    process.cwd(),
    path.resolve(__dirname, '..'),
  ];
  for (const candidate of candidates) {
    if (isRepoRoot(candidate)) return candidate;
  }
  return null;
}

function listSkillRelPathsRecursive(skillsDir, baseDir = skillsDir, acc = []) {
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (!entry.isDirectory()) continue;
    const dirPath = path.join(baseDir, entry.name);
    const skillFile = path.join(dirPath, 'SKILL.md');
    const relPath = path.relative(skillsDir, dirPath);
    if (fs.existsSync(skillFile)) {
      acc.push(relPath);
    }
    listSkillRelPathsRecursive(skillsDir, dirPath, acc);
  }
  return acc.sort();
}

function readSkillDescriptionFromFile(skillFilePath) {
  if (!fs.existsSync(skillFilePath)) return 'No description available.';
  let content = '';
  try {
    content = fs.readFileSync(skillFilePath, 'utf8');
  } catch (_) {
    return 'No description available.';
  }
  if (!content) return 'No description available.';

  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const lines = fmMatch[1].split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^\s*description\s*:\s*(.*)\s*$/);
      if (!m) continue;
      const cleaned = m[1].trim().replace(/^['"]|['"]$/g, '').trim();
      if (cleaned) return cleaned;
    }
    content = content.slice(fmMatch[0].length).trim();
  }

  for (const line of content.split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean || clean.startsWith('#')) continue;
    return clean.slice(0, 200);
  }
  return 'No description available.';
}

function sanitizeBundleName(rawName) {
  return String(rawName || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function askQuestion(prompt) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function loadJsonIfExists(filePath, fallbackValue) {
  if (!fs.existsSync(filePath)) return fallbackValue;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return fallbackValue;
  }
}

function loadBundleData(repoRoot) {
  const bundledPath = path.join(repoRoot, 'data', 'bundles.json');
  const customPath = path.join(repoRoot, 'data', 'custom-bundles.json');
  const bundledRaw = loadJsonIfExists(bundledPath, { bundles: {} });
  const customRaw = loadJsonIfExists(customPath, { bundles: {} });

  const result = [];
  for (const [name, data] of Object.entries(bundledRaw.bundles || {})) {
    result.push({
      name,
      description: typeof data.description === 'string' ? data.description : '',
      skills: Array.isArray(data.skills) ? data.skills : [],
      source: 'default',
    });
  }
  for (const [name, data] of Object.entries(customRaw.bundles || {})) {
    result.push({
      name,
      description: typeof data.description === 'string' ? data.description : '',
      skills: Array.isArray(data.skills) ? data.skills : [],
      source: 'custom',
    });
  }
  return { bundles: result, customPath };
}

function saveCustomBundle(repoRoot, bundleName, description, selectedSkills) {
  const customPath = path.join(repoRoot, 'data', 'custom-bundles.json');
  const payload = loadJsonIfExists(customPath, { generatedAt: null, bundles: {} });
  if (!payload.bundles || typeof payload.bundles !== 'object') payload.bundles = {};

  payload.generatedAt = new Date().toISOString();
  payload.bundles[bundleName] = {
    description: description || `Custom bundle "${bundleName}"`,
    skills: [...selectedSkills].sort(),
  };

  const dataDir = path.dirname(customPath);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(customPath, `${JSON.stringify(payload, null, 2)}\n`);
  return customPath;
}

function deleteCustomBundle(repoRoot, bundleName) {
  const customPath = path.join(repoRoot, 'data', 'custom-bundles.json');
  const payload = loadJsonIfExists(customPath, { generatedAt: null, bundles: {} });
  if (!payload.bundles || typeof payload.bundles !== 'object') payload.bundles = {};
  if (!payload.bundles[bundleName]) return false;

  delete payload.bundles[bundleName];
  payload.generatedAt = new Date().toISOString();
  fs.writeFileSync(customPath, `${JSON.stringify(payload, null, 2)}\n`);
  return true;
}

function wrapText(text, width) {
  if (width <= 1) return [text];
  const words = text.split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= width) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

async function interactiveSelectList({
  title,
  subtitle,
  items,
  multi = true,
  initialSelected = [],
  getDescription = null,
  statusLabel = 'Selected',
}) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error('Interactive mode requires a TTY terminal.');
    process.exit(1);
  }
  if (!items.length) return { cancelled: false, selected: [] };

  const selectedSet = new Set(initialSelected);
  if (!multi && selectedSet.size === 0) selectedSet.add(items[0]);

  let cursor = 0;
  let top = 0;
  let done = false;
  let cancelled = false;

  const write = (s) => process.stdout.write(s);
  const clear = () => write('\x1b[2J\x1b[H');
  const hideCursor = () => write('\x1b[?25l');
  const showCursor = () => write('\x1b[?25h');

  function render() {
    const width = process.stdout.columns || 100;
    const height = process.stdout.rows || 30;
    const header = [
      title,
      subtitle,
      '',
    ];
    const footerLines = 6;
    const listStart = header.length;
    const visibleRows = Math.max(1, height - listStart - footerLines);

    if (cursor < top) top = cursor;
    if (cursor >= top + visibleRows) top = cursor - visibleRows + 1;

    clear();
    for (const line of header) write(`${line.slice(0, width - 1)}\n`);

    for (let i = top; i < Math.min(items.length, top + visibleRows); i++) {
      const item = items[i];
      const selected = selectedSet.has(item);
      const marker = multi ? (selected ? '[x]' : '[ ]') : (selected ? '(*)' : '( )');
      const line = `${marker} ${item}`;
      if (i === cursor) write(`\x1b[7m${line.slice(0, width - 1)}\x1b[0m\n`);
      else write(`${line.slice(0, width - 1)}\n`);
    }

    const selectedItem = items[cursor];
    const description = getDescription ? String(getDescription(selectedItem) || '') : '';
    const wrapped = description ? wrapText(description, Math.max(20, width - 14)) : [];
    write(`${'-'.repeat(Math.max(1, width - 1))}\n`);
    write(`Selected item: ${selectedItem}\n`);
    if (wrapped.length) {
      write(`Description: ${(wrapped[0] || '').slice(0, width - 14)}\n`);
      if (wrapped[1]) write(`             ${wrapped[1].slice(0, width - 14)}\n`);
    } else {
      write('Description: -\n');
    }
    write(`${statusLabel}: ${selectedSet.size}\n`);
  }

  await new Promise((resolve) => {
    const onData = (buf) => {
      const key = buf.toString('utf8');
      if (key === '\u0003' || key === 'q' || key === '\u001b') {
        cancelled = true;
        done = true;
      } else if (key === '\u001b[A' || key === 'k') {
        cursor = Math.max(0, cursor - 1);
      } else if (key === '\u001b[B' || key === 'j') {
        cursor = Math.min(items.length - 1, cursor + 1);
      } else if (key === ' ' && multi) {
        const item = items[cursor];
        if (selectedSet.has(item)) selectedSet.delete(item);
        else selectedSet.add(item);
      } else if ((key === ' ' || key === '\r') && !multi) {
        const item = items[cursor];
        selectedSet.clear();
        selectedSet.add(item);
        if (key === '\r') done = true;
      } else if (key === '\r' && multi) {
        done = true;
      }

      if (done) {
        process.stdin.off('data', onData);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        showCursor();
        clear();
        resolve();
        return;
      }

      render();
    };

    hideCursor();
    clear();
    render();
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', onData);
  });

  return {
    cancelled,
    selected: items.filter(item => selectedSet.has(item)),
  };
}

function resolveAgentSkillDir(projectRoot, agentName) {
  const map = {
    codex: path.join(projectRoot, '.codex', 'skills'),
    gemini: path.join(projectRoot, '.gemini', 'skills'),
    claude: path.join(projectRoot, '.claude', 'skills'),
  };
  return map[agentName] || null;
}

async function chooseAgentUi() {
  const agents = ['gemini', 'codex', 'claude'];
  const agentDescriptions = {
    gemini: 'Creates symlinks in <path>/.gemini/skills',
    codex: 'Creates symlinks in <path>/.codex/skills',
    claude: 'Creates symlinks in <path>/.claude/skills',
  };
  const agentPick = await interactiveSelectList({
    title: 'Choose target agent',
    subtitle: 'Select with Up/Down and Enter (q/Esc to cancel)',
    items: agents,
    multi: false,
    getDescription: (agent) => agentDescriptions[agent] || '',
    statusLabel: 'Agent selected',
  });

  if (agentPick.cancelled || !agentPick.selected.length) {
    return null;
  }
  return agentPick.selected[0];
}

function ensureSymlink(linkPath, targetPath) {
  let stat = null;
  try {
    stat = fs.lstatSync(linkPath);
  } catch (_) {
    stat = null;
  }
  if (stat) {
    if (stat.isSymbolicLink()) {
      const current = fs.readlinkSync(linkPath);
      const currentAbs = path.resolve(path.dirname(linkPath), current);
      if (currentAbs === targetPath) return { changed: false, skipped: false };
      fs.unlinkSync(linkPath);
    } else {
      return { changed: false, skipped: true };
    }
  }
  fs.symlinkSync(targetPath, linkPath, 'dir');
  return { changed: true, skipped: false };
}

async function createCustomBundleOnce(repoRoot, options = {}) {
  const {
    title = 'Create custom bundle',
    subtitle = 'Use Up/Down, Space to select skills, Enter to continue, q/Esc to cancel',
    initialSelected = [],
    namePrompt = 'Bundle name (e.g. my-web-bundle): ',
  } = options;

  const skillsDir = path.join(repoRoot, 'skills');
  const skillIds = listSkillRelPathsRecursive(skillsDir);
  if (!skillIds.length) {
    console.error('No skills found in repository.');
    return;
  }

  const descriptions = new Map(
    skillIds.map((id) => [id, readSkillDescriptionFromFile(path.join(skillsDir, id, 'SKILL.md'))]),
  );

  const pick = await interactiveSelectList({
    title,
    subtitle,
    items: skillIds,
    multi: true,
    initialSelected,
    getDescription: (id) => descriptions.get(id),
    statusLabel: 'Skills selected',
  });

  if (pick.cancelled) {
    console.log('ℹ️  Bundle creation cancelled.');
    return;
  }
  if (!pick.selected.length) {
    console.log('⚠️  No skills selected. Bundle not created.');
    return;
  }

  const inputName = await askQuestion(namePrompt);
  const bundleName = sanitizeBundleName(inputName);
  if (!bundleName) {
    console.log('❌ Invalid bundle name. Use letters, numbers, dashes.');
    return;
  }

  const inputDesc = await askQuestion('Bundle description (optional): ');
  const outFile = saveCustomBundle(repoRoot, bundleName, inputDesc.trim(), pick.selected);
  console.log(`✅ Created bundle "${bundleName}" with ${pick.selected.length} skills.`);
  console.log(`📦 Saved in ${outFile}`);
}

async function runBundleEditAsNewFlow(repoRoot) {
  const { bundles } = loadBundleData(repoRoot);
  if (!bundles.length) {
    console.log('ℹ️  No bundles available to edit.');
    return;
  }

  const bundleNames = bundles.map(bundle => bundle.name).sort();
  const bundleMap = new Map(bundles.map(bundle => [bundle.name, bundle]));
  const sourcePick = await interactiveSelectList({
    title: 'Edit bundle as new',
    subtitle: 'Select source bundle with Up/Down and Enter (q/Esc to cancel)',
    items: bundleNames,
    multi: false,
    getDescription: (name) => {
      const b = bundleMap.get(name);
      if (!b) return '';
      const sourceLabel = b.source === 'custom' ? 'custom' : 'default';
      return `${b.description} [${sourceLabel}] - ${b.skills.length} skills`;
    },
    statusLabel: 'Bundle selected',
  });

  if (sourcePick.cancelled || !sourcePick.selected.length) {
    console.log('ℹ️  Bundle edit cancelled.');
    return;
  }

  const sourceName = sourcePick.selected[0];
  const sourceBundle = bundleMap.get(sourceName);
  if (!sourceBundle) {
    console.log('⚠️  Source bundle not found.');
    return;
  }

  await createCustomBundleOnce(repoRoot, {
    title: `Edit bundle "${sourceName}" as new`,
    subtitle: 'Toggle skills and press Enter to continue (q/Esc to cancel)',
    initialSelected: sourceBundle.skills,
    namePrompt: `New bundle name (source: ${sourceName}): `,
  });
}

async function runBundleEditInPlaceFlow(repoRoot) {
  const { bundles } = loadBundleData(repoRoot);
  const customBundles = bundles.filter(bundle => bundle.source === 'custom');
  if (!customBundles.length) {
    console.log('ℹ️  No custom bundles available to edit in place.');
    return;
  }

  const customNames = customBundles.map(bundle => bundle.name).sort();
  const bundleMap = new Map(customBundles.map(bundle => [bundle.name, bundle]));
  const sourcePick = await interactiveSelectList({
    title: 'Edit bundle in place',
    subtitle: 'Select custom bundle with Up/Down and Enter (q/Esc to cancel)',
    items: customNames,
    multi: false,
    getDescription: (name) => {
      const b = bundleMap.get(name);
      return b ? `${b.description} - ${b.skills.length} skills` : '';
    },
    statusLabel: 'Bundle selected',
  });

  if (sourcePick.cancelled || !sourcePick.selected.length) {
    console.log('ℹ️  Bundle edit cancelled.');
    return;
  }

  const sourceName = sourcePick.selected[0];
  const sourceBundle = bundleMap.get(sourceName);
  if (!sourceBundle) {
    console.log('⚠️  Source bundle not found.');
    return;
  }

  const skillsDir = path.join(repoRoot, 'skills');
  const skillIds = listSkillRelPathsRecursive(skillsDir);
  const descriptions = new Map(
    skillIds.map((id) => [id, readSkillDescriptionFromFile(path.join(skillsDir, id, 'SKILL.md'))]),
  );
  const pick = await interactiveSelectList({
    title: `Edit bundle "${sourceName}"`,
    subtitle: 'Toggle skills and press Enter to save (q/Esc to cancel)',
    items: skillIds,
    multi: true,
    initialSelected: sourceBundle.skills,
    getDescription: (id) => descriptions.get(id),
    statusLabel: 'Skills selected',
  });

  if (pick.cancelled) {
    console.log('ℹ️  Bundle edit cancelled.');
    return;
  }
  if (!pick.selected.length) {
    console.log('⚠️  No skills selected. Bundle was not changed.');
    return;
  }

  const descInput = await askQuestion(`Bundle description (leave empty to keep current): `);
  const description = descInput.trim() ? descInput.trim() : sourceBundle.description;
  const outFile = saveCustomBundle(repoRoot, sourceName, description, pick.selected);
  console.log(`✅ Updated bundle "${sourceName}" with ${pick.selected.length} skills.`);
  console.log(`📦 Saved in ${outFile}`);
}

async function runBundleManageFlow(repoRoot) {
  while (true) {
    const menu = await interactiveSelectList({
      title: 'Bundle manager',
      subtitle: 'Select with Up/Down and Enter (q/Esc to exit)',
      items: ['create bundle', 'edit bundle', 'edit bundle as new', 'delete bundle', 'exit'],
      multi: false,
      getDescription: (item) => {
        if (item === 'create bundle') return 'Create a custom bundle from a deselected skill list.';
        if (item === 'edit bundle') return 'Modify an existing custom bundle in place.';
        if (item === 'edit bundle as new') return 'Load an existing bundle, adjust skills, and save as a new bundle.';
        if (item === 'delete bundle') return 'Delete one custom bundle from data/custom-bundles.json.';
        return 'Close bundle manager.';
      },
      statusLabel: 'Menu item selected',
    });

    if (menu.cancelled || !menu.selected.length || menu.selected[0] === 'exit') {
      console.log('ℹ️  Bundle manager closed.');
      return;
    }

    if (menu.selected[0] === 'create bundle') {
      await createCustomBundleOnce(repoRoot);
      continue;
    }

    if (menu.selected[0] === 'edit bundle') {
      await runBundleEditInPlaceFlow(repoRoot);
      continue;
    }

    if (menu.selected[0] === 'edit bundle as new') {
      await runBundleEditAsNewFlow(repoRoot);
      continue;
    }

    const { bundles } = loadBundleData(repoRoot);
    const customNames = bundles
      .filter(bundle => bundle.source === 'custom')
      .map(bundle => bundle.name)
      .sort();
    if (!customNames.length) {
      console.log('ℹ️  No custom bundles to delete.');
      continue;
    }

    const deletePick = await interactiveSelectList({
      title: 'Delete custom bundle',
      subtitle: 'Select bundle and press Enter (q/Esc to cancel)',
      items: customNames,
      multi: false,
      getDescription: (name) => {
        const b = bundles.find(item => item.name === name);
        return b ? `${b.description} - ${b.skills.length} skills` : '';
      },
      statusLabel: 'Bundle selected',
    });
    if (deletePick.cancelled || !deletePick.selected.length) {
      console.log('ℹ️  Delete cancelled.');
      continue;
    }

    const name = deletePick.selected[0];
    const removed = deleteCustomBundle(repoRoot, name);
    if (removed) console.log(`✅ Deleted custom bundle "${name}".`);
    else console.log(`⚠️  Bundle "${name}" not found.`);
  }
}

async function runBundleInstallFlow(repoRoot, projectRoot) {
  const { bundles } = loadBundleData(repoRoot);
  if (!bundles.length) {
    console.error('No bundles available. Create one with "bundle manage".');
    process.exit(1);
  }

  const bundleNames = bundles.map(bundle => bundle.name).sort();
  const bundleMap = new Map(bundles.map(bundle => [bundle.name, bundle]));
  const bundlePick = await interactiveSelectList({
    title: 'Install bundle',
    subtitle: 'Select a bundle with Up/Down and Enter (q/Esc to cancel)',
    items: bundleNames,
    multi: false,
    getDescription: (name) => {
      const b = bundleMap.get(name);
      if (!b) return '';
      const sourceLabel = b.source === 'custom' ? 'custom' : 'default';
      return `${b.description} [${sourceLabel}] - ${b.skills.length} skills`;
    },
    statusLabel: 'Bundle selected',
  });

  if (bundlePick.cancelled || !bundlePick.selected.length) {
    console.log('ℹ️  Bundle installation cancelled.');
    return;
  }
  const selectedBundle = bundleMap.get(bundlePick.selected[0]);
  if (!selectedBundle || !selectedBundle.skills.length) {
    console.log('❌ Selected bundle is empty.');
    return;
  }

  const agent = await chooseAgentUi();
  if (!agent) {
    console.log('ℹ️  Bundle installation cancelled.');
    return;
  }
  const targetSkillsDir = resolveAgentSkillDir(projectRoot, agent);
  if (!targetSkillsDir) {
    console.log('❌ Unsupported agent selected.');
    return;
  }

  const sourceSkillsDir = path.join(repoRoot, 'skills');
  fs.mkdirSync(targetSkillsDir, { recursive: true });

  let linked = 0;
  let skipped = 0;
  for (const skillId of selectedBundle.skills) {
    const source = path.join(sourceSkillsDir, skillId);
    if (!fs.existsSync(source)) {
      console.log(`⚠️  Missing source skill: ${skillId}`);
      skipped += 1;
      continue;
    }

    const destination = path.join(targetSkillsDir, skillId);
    fs.mkdirSync(path.dirname(destination), { recursive: true });

    let result;
    try {
      result = ensureSymlink(destination, source);
    } catch (err) {
      console.log(`⚠️  Failed linking ${skillId}: ${err.message}`);
      skipped += 1;
      continue;
    }
    if (result.skipped) {
      console.log(`⚠️  Exists and is not a symlink, skipped: ${destination}`);
      skipped += 1;
      continue;
    }
    if (result.changed) linked += 1;
  }

  console.log(`✅ Bundle "${selectedBundle.name}" installed for ${agent}.`);
  console.log(`📁 Target: ${targetSkillsDir}`);
  console.log(`📊 Symlinks created/updated: ${linked}, skipped: ${skipped}`);
}

function listLinkedSkillsFromSource(targetSkillsDir, sourceSkillsDir) {
  const linked = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
        continue;
      }
      if (!entry.isSymbolicLink()) continue;
      let resolved;
      try {
        const real = fs.readlinkSync(abs);
        resolved = path.resolve(path.dirname(abs), real);
      } catch (_) {
        continue;
      }
      if (!resolved.startsWith(sourceSkillsDir + path.sep)) continue;
      const rel = path.relative(sourceSkillsDir, resolved);
      linked.push(rel);
    }
  }
  walk(targetSkillsDir);
  return [...new Set(linked)].sort();
}

function removeEmptyParents(startDir, stopDir) {
  let current = path.resolve(startDir);
  const stop = path.resolve(stopDir);
  while (current.startsWith(stop) && current !== stop) {
    let entries = [];
    try {
      entries = fs.readdirSync(current);
    } catch (_) {
      return;
    }
    if (entries.length > 0) return;
    try {
      fs.rmdirSync(current);
    } catch (_) {
      return;
    }
    current = path.dirname(current);
  }
}

async function runLinksManageFlow(repoRoot, projectRoot) {
  const sourceSkillsDir = path.join(repoRoot, 'skills');
  const skillIds = listSkillRelPathsRecursive(sourceSkillsDir);
  if (!skillIds.length) {
    console.error('No skills found in repository.');
    process.exit(1);
  }

  const agent = await chooseAgentUi();
  if (!agent) {
    console.log('ℹ️  Symlink management cancelled.');
    return;
  }

  const targetSkillsDir = resolveAgentSkillDir(projectRoot, agent);
  if (!targetSkillsDir) {
    console.log('❌ Unsupported agent selected.');
    return;
  }
  fs.mkdirSync(targetSkillsDir, { recursive: true });

  const initialSelected = listLinkedSkillsFromSource(targetSkillsDir, sourceSkillsDir);
  const descriptions = new Map(
    skillIds.map((id) => [id, readSkillDescriptionFromFile(path.join(sourceSkillsDir, id, 'SKILL.md'))]),
  );
  const pick = await interactiveSelectList({
    title: 'Manage skill symlinks',
    subtitle: 'Use Up/Down, Space to toggle, Enter to apply, q/Esc to cancel',
    items: skillIds,
    multi: true,
    initialSelected,
    getDescription: (id) => descriptions.get(id),
    statusLabel: 'Skills selected',
  });
  if (pick.cancelled) {
    console.log('ℹ️  Symlink management cancelled.');
    return;
  }

  const selectedSet = new Set(pick.selected);
  const initialSet = new Set(initialSelected);
  const toAdd = skillIds.filter(id => selectedSet.has(id) && !initialSet.has(id));
  const toRemove = skillIds.filter(id => initialSet.has(id) && !selectedSet.has(id));

  let added = 0;
  let removed = 0;
  let skipped = 0;

  for (const skillId of toAdd) {
    const source = path.join(sourceSkillsDir, skillId);
    const destination = path.join(targetSkillsDir, skillId);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    try {
      const result = ensureSymlink(destination, source);
      if (result.skipped) skipped += 1;
      else if (result.changed) added += 1;
    } catch (err) {
      console.log(`⚠️  Failed linking ${skillId}: ${err.message}`);
      skipped += 1;
    }
  }

  for (const skillId of toRemove) {
    const destination = path.join(targetSkillsDir, skillId);
    let stat = null;
    try {
      stat = fs.lstatSync(destination);
    } catch (_) {
      stat = null;
    }
    if (!stat || !stat.isSymbolicLink()) continue;
    try {
      fs.unlinkSync(destination);
      removeEmptyParents(path.dirname(destination), targetSkillsDir);
      removed += 1;
    } catch (_) {
      skipped += 1;
    }
  }

  console.log(`✅ Symlink update completed for ${agent}.`);
  console.log(`📁 Target: ${targetSkillsDir}`);
  console.log(`📊 Added: ${added}, Removed: ${removed}, Skipped: ${skipped}`);
}

async function main() {
  const opts = parseArgs();
  const { tagArg, versionArg } = opts;
  const rawArgs = process.argv.slice(2);
  
  if (opts.help) {
    printHelp();
    return;
  }

  if (rawArgs.length === 0) {
    printHelp();
    return;
  }

  if (opts.completion) {
    const shell = (opts.completionShell || '').toLowerCase();
    if (!shell) {
      console.error('Specify shell: completion bash | completion zsh | completion fish');
      process.exit(1);
    }
    installCompletionScript(shell, resolveRepoRoot());
    return;
  }

  const repoRoot = resolveRepoRoot();
  const hasUiAction = opts.bundleManage || opts.bundleInstall || opts.bundleEdit || opts.bundleEditAsNew || opts.linksManage;
  if (hasUiAction) {
    if (!repoRoot) {
      console.error('Could not locate repository root with "skills/" directory.');
      process.exit(1);
    }

    if (opts.bundleManage) {
      await runBundleManageFlow(repoRoot);
    }

    if (opts.bundleInstall) {
      if (!opts.pathArg) {
        console.error('For --bundle-install pass project root via --path <project-dir>.');
        process.exit(1);
      }
      const projectRoot = resolveDir(opts.pathArg);
      if (!projectRoot) {
        console.error('Invalid --path value.');
        process.exit(1);
      }
      fs.mkdirSync(projectRoot, { recursive: true });
      await runBundleInstallFlow(repoRoot, projectRoot);
    }

    if (opts.bundleEdit) {
      await runBundleEditInPlaceFlow(repoRoot);
    }

    if (opts.bundleEditAsNew) {
      await runBundleEditAsNewFlow(repoRoot);
    }

    if (opts.linksManage) {
      if (!opts.pathArg) {
        console.error('For --links-manage pass project root via --path <project-dir>.');
        process.exit(1);
      }
      const projectRoot = resolveDir(opts.pathArg);
      if (!projectRoot) {
        console.error('Invalid --path value.');
        process.exit(1);
      }
      fs.mkdirSync(projectRoot, { recursive: true });
      await runLinksManageFlow(repoRoot, projectRoot);
    }
    return;
  }

  const target = defaultDir(opts);
  if (!target || !HOME) {
    console.error('Could not resolve home directory. Use --path <absolute-path>.');
    process.exit(1);
  }

  if (fs.existsSync(target)) {
    const gitDir = path.join(target, '.git');
    if (fs.existsSync(gitDir)) {
      console.log('Directory already exists and is a git repo. Updating…');
      process.chdir(target);
      run('git', ['pull']);
      return;
    }
    console.error(`Directory exists and is not a git repo: ${target}`);
    console.error('Remove it or use --path to choose another location.');
    process.exit(1);
  }

  const parent = path.dirname(target);
  if (!fs.existsSync(parent)) {
    try {
      fs.mkdirSync(parent, { recursive: true });
    } catch (e) {
      console.error(`Cannot create parent directory: ${parent}`, e.message);
      process.exit(1);
    }
  }

  if (process.platform === 'win32') {
    run('git', ['-c', 'core.symlinks=true', 'clone', REPO, target]);
  } else {
    run('git', ['clone', REPO, target]);
  }

  const ref = tagArg || (versionArg ? (versionArg.startsWith('v') ? versionArg : `v${versionArg}`) : null);
  if (ref) {
    console.log(`Checking out ${ref}…`);
    process.chdir(target);
    run('git', ['checkout', ref]);
  }

  console.log(`\nInstalled to ${target}`);
  console.log('Pick a bundle in docs/BUNDLES.md and use @skill-name in your AI assistant.');
}

main().catch((err) => {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
