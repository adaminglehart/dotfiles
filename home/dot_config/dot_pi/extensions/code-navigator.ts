/**
 * Code Navigator Extension
 *
 * Provides intelligent code analysis and navigation tools:
 * - Analyze project structure and identify key components
 * - Find related files (tests, interfaces, implementations)
 * - Trace imports and dependencies
 * - Summarize large files without overwhelming context
 * - Search by functionality rather than just names
 *
 * Designed to help autonomous agents understand codebases efficiently.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
  truncateHead,
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
  formatSize,
} from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { StringEnum } from "@mariozechner/pi-ai";
import { Text } from "@mariozechner/pi-tui";
import { readFile, stat } from "node:fs/promises";
import { join, relative, dirname, basename, extname } from "node:path";

interface ProjectStructure {
  name: string;
  type: 'go' | 'typescript' | 'rust' | 'gleam' | 'python' | 'mixed' | 'unknown';
  entryPoints: string[];
  mainDirectories: Array<{
    path: string;
    purpose: string;
    fileCount: number;
  }>;
  keyFiles: Array<{
    path: string;
    purpose: string;
    size: number;
  }>;
  buildSystem: string[];
}

interface FileSummary {
  path: string;
  language: string;
  lines: number;
  size: number;
  exports: string[];
  imports: string[];
  functions: string[];
  types: string[];
  purpose: string;
}

export default function (pi: ExtensionAPI) {
  
  pi.registerTool({
    name: "analyze_project",
    label: "Analyze Project",
    description: "Analyze the project structure to understand the codebase architecture and key components",
    parameters: Type.Object({
      path: Type.Optional(Type.String({ description: "Path to analyze (defaults to current directory)" })),
      depth: Type.Optional(Type.Number({ 
        description: "Maximum directory depth to analyze", 
        minimum: 1, 
        maximum: 5,
        default: 3 
      })),
    }),

    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const analyzePath = params.path || ctx.cwd;
      const maxDepth = params.depth || 3;

      onUpdate?.({ content: [{ type: "text", text: "Analyzing project structure..." }] });

      try {
        const structure = await analyzeProjectStructure(analyzePath, maxDepth, signal);
        
        let report = `# Project Analysis: ${structure.name}\n\n`;
        report += `**Type**: ${structure.type}\n`;
        report += `**Build Systems**: ${structure.buildSystem.join(', ') || 'None detected'}\n\n`;

        if (structure.entryPoints.length > 0) {
          report += `## Entry Points\n`;
          for (const entry of structure.entryPoints) {
            report += `- ${entry}\n`;
          }
          report += '\n';
        }

        report += `## Directory Structure\n`;
        for (const dir of structure.mainDirectories) {
          report += `- **${dir.path}** (${dir.fileCount} files) - ${dir.purpose}\n`;
        }
        report += '\n';

        if (structure.keyFiles.length > 0) {
          report += `## Key Files\n`;
          for (const file of structure.keyFiles) {
            const sizeStr = file.size > 1024 ? `${Math.round(file.size / 1024)}KB` : `${file.size}B`;
            report += `- **${file.path}** (${sizeStr}) - ${file.purpose}\n`;
          }
        }

        return {
          content: [{ type: "text", text: report }],
          details: { structure, analyzedPath: analyzePath },
        };

      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Failed to analyze project: ${error.message}` }],
          details: { error: error.message },
          isError: true,
        };
      }
    },

    renderCall(args, theme) {
      let text = theme.fg("toolTitle", theme.bold("analyze_project "));
      if (args.path) {
        text += theme.fg("muted", args.path);
      } else {
        text += theme.fg("dim", "current directory");
      }
      if (args.depth) {
        text += theme.fg("dim", ` (depth: ${args.depth})`);
      }
      return new Text(text, 0, 0);
    },
  });

  pi.registerTool({
    name: "find_related",
    label: "Find Related Files", 
    description: "Find files related to a given file (tests, interfaces, implementations, etc.)",
    parameters: Type.Object({
      file: Type.String({ description: "Path to the file to find related files for" }),
      types: Type.Optional(Type.Array(
        StringEnum(["test", "interface", "implementation", "config", "type_definition", "all"] as const),
        { description: "Types of related files to find (defaults to all)" }
      )),
    }),

    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      onUpdate?.({ content: [{ type: "text", text: "Finding related files..." }] });

      try {
        const related = await findRelatedFiles(params.file, ctx.cwd, params.types, signal);
        
        if (related.length === 0) {
          return {
            content: [{ type: "text", text: `No related files found for ${params.file}` }],
            details: { file: params.file, related: [] },
          };
        }

        let report = `# Related Files for ${params.file}\n\n`;
        
        const byType = related.reduce((acc, file) => {
          if (!acc[file.type]) acc[file.type] = [];
          acc[file.type].push(file);
          return acc;
        }, {} as Record<string, typeof related>);

        for (const [type, files] of Object.entries(byType)) {
          report += `## ${type.charAt(0).toUpperCase() + type.slice(1)} Files\n`;
          for (const file of files) {
            report += `- **${file.path}**`;
            if (file.reason) {
              report += ` - ${file.reason}`;
            }
            report += '\n';
          }
          report += '\n';
        }

        return {
          content: [{ type: "text", text: report }],
          details: { file: params.file, related },
        };

      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Failed to find related files: ${error.message}` }],
          details: { error: error.message },
          isError: true,
        };
      }
    },
  });

  pi.registerTool({
    name: "summarize_file",
    label: "Summarize File",
    description: "Generate a concise summary of a file's structure and purpose without reading the entire content",
    parameters: Type.Object({
      path: Type.String({ description: "Path to the file to summarize" }),
      detail_level: Type.Optional(StringEnum(["brief", "detailed", "full"] as const, {
        description: "Level of detail in summary (default: detailed)"
      })),
    }),

    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      onUpdate?.({ content: [{ type: "text", text: "Analyzing file..." }] });

      try {
        const summary = await summarizeFile(params.path, ctx.cwd, params.detail_level || "detailed", signal);
        
        let report = `# File Summary: ${summary.path}\n\n`;
        report += `**Language**: ${summary.language}\n`;
        report += `**Size**: ${summary.lines} lines (${formatSize(summary.size)})\n`;
        report += `**Purpose**: ${summary.purpose}\n\n`;

        if (summary.exports.length > 0) {
          report += `## Exports\n${summary.exports.map(e => `- ${e}`).join('\n')}\n\n`;
        }

        if (summary.functions.length > 0) {
          report += `## Functions\n${summary.functions.map(f => `- ${f}`).join('\n')}\n\n`;
        }

        if (summary.types.length > 0) {
          report += `## Types\n${summary.types.map(t => `- ${t}`).join('\n')}\n\n`;
        }

        if (summary.imports.length > 0 && summary.imports.length <= 10) {
          report += `## Key Imports\n${summary.imports.slice(0, 10).map(i => `- ${i}`).join('\n')}\n`;
        }

        return {
          content: [{ type: "text", text: report }],
          details: { summary },
        };

      } catch (error: any) {
        return {
          content: [{ type: "text", text: `Failed to summarize file: ${error.message}` }],
          details: { error: error.message },
          isError: true,
        };
      }
    },
  });

  // Helper functions

  async function analyzeProjectStructure(
    projectPath: string, 
    maxDepth: number, 
    signal?: AbortSignal
  ): Promise<ProjectStructure> {
    const name = basename(projectPath);
    const structure: ProjectStructure = {
      name,
      type: 'unknown',
      entryPoints: [],
      mainDirectories: [],
      keyFiles: [],
      buildSystem: [],
    };

    // Detect project type and build systems
    const { stdout: findOutput } = await pi.exec("find", [
      projectPath, 
      "-maxdepth", "3",
      "-type", "f",
      "-name", "*.go", "-o",
      "-name", "*.ts", "-o", 
      "-name", "*.js", "-o",
      "-name", "*.rs", "-o",
      "-name", "*.gleam", "-o",
      "-name", "*.py", "-o",
      "-name", "Cargo.toml", "-o",
      "-name", "package.json", "-o",
      "-name", "go.mod", "-o",
      "-name", "gleam.toml", "-o",
      "-name", "justfile", "-o",
      "-name", "Makefile", "-o",
      "-name", "Dockerfile", "-o",
      "-name", "requirements.txt"
    ], { signal });

    const files = findOutput.split('\n').filter(Boolean);
    
    // Determine project type
    const extensions = files.map(f => extname(f));
    if (extensions.some(e => e === '.go')) structure.type = 'go';
    else if (extensions.some(e => ['.ts', '.js'].includes(e))) structure.type = 'typescript';
    else if (extensions.some(e => e === '.rs')) structure.type = 'rust';
    else if (extensions.some(e => e === '.gleam')) structure.type = 'gleam';
    else if (extensions.some(e => e === '.py')) structure.type = 'python';
    else if (extensions.length > 1) structure.type = 'mixed';

    // Detect build systems
    if (files.some(f => basename(f) === 'Cargo.toml')) structure.buildSystem.push('Cargo');
    if (files.some(f => basename(f) === 'package.json')) structure.buildSystem.push('npm');
    if (files.some(f => basename(f) === 'go.mod')) structure.buildSystem.push('Go modules');
    if (files.some(f => basename(f) === 'gleam.toml')) structure.buildSystem.push('Gleam');
    if (files.some(f => basename(f) === 'justfile')) structure.buildSystem.push('just');
    if (files.some(f => basename(f) === 'Makefile')) structure.buildSystem.push('Make');
    if (files.some(f => basename(f) === 'Dockerfile')) structure.buildSystem.push('Docker');

    // Find entry points
    const potentialEntries = [
      'main.go', 'cmd/*/main.go', 
      'src/main.rs', 'main.rs',
      'src/main.ts', 'src/index.ts', 'index.ts',
      'src/main.py', 'main.py',
      'src/*.gleam'
    ];

    for (const pattern of potentialEntries) {
      const matching = files.filter(f => {
        const rel = relative(projectPath, f);
        return pattern.includes('*') ? 
          new RegExp(pattern.replace(/\*/g, '[^/]*')).test(rel) :
          rel.endsWith(pattern);
      });
      structure.entryPoints.push(...matching.map(f => relative(projectPath, f)));
    }

    // Analyze directory structure
    const { stdout: dirOutput } = await pi.exec("find", [
      projectPath,
      "-maxdepth", maxDepth.toString(),
      "-type", "d"
    ], { signal });

    const dirs = dirOutput.split('\n').filter(Boolean);
    for (const dir of dirs) {
      if (dir === projectPath) continue;
      
      const relDir = relative(projectPath, dir);
      const { stdout: fileCount } = await pi.exec("find", [dir, "-maxdepth", "1", "-type", "f"], { signal });
      const count = fileCount.split('\n').filter(Boolean).length;
      
      if (count > 0) {
        structure.mainDirectories.push({
          path: relDir,
          fileCount: count,
          purpose: guessDirPurpose(relDir)
        });
      }
    }

    // Identify key files
    const keyPatterns = [
      'README.md', 'README.rst', 'README.txt',
      'CHANGELOG.md', 'CHANGES.md',
      'LICENSE', 'LICENSE.md', 'LICENSE.txt',
      '.gitignore', '.dockerignore',
      'docker-compose.yml', 'docker-compose.yaml',
      'justfile', 'Makefile'
    ];

    for (const file of files) {
      const rel = relative(projectPath, file);
      const filename = basename(file);
      
      if (keyPatterns.includes(filename) || rel.includes('AGENTS.md') || rel.includes('TODO.md')) {
        try {
          const stats = await stat(file);
          structure.keyFiles.push({
            path: rel,
            size: stats.size,
            purpose: guessFilePurpose(filename, rel)
          });
        } catch {}
      }
    }

    return structure;
  }

  async function findRelatedFiles(
    targetFile: string,
    cwd: string,
    types?: string[],
    signal?: AbortSignal
  ): Promise<Array<{path: string, type: string, reason?: string}>> {
    const related: Array<{path: string, type: string, reason?: string}> = [];
    const targetPath = join(cwd, targetFile);
    const targetDir = dirname(targetPath);
    const targetName = basename(targetFile, extname(targetFile));
    const targetExt = extname(targetFile);

    // Find test files
    if (!types || types.includes('test') || types.includes('all')) {
      const testPatterns = [
        `${targetName}_test${targetExt}`,
        `${targetName}.test${targetExt}`,
        `${targetName}.spec${targetExt}`,
        `test_${targetName}${targetExt}`,
      ];

      for (const pattern of testPatterns) {
        const testPath = join(targetDir, pattern);
        try {
          await stat(testPath);
          related.push({
            path: relative(cwd, testPath),
            type: 'test',
            reason: 'naming convention match'
          });
        } catch {}
      }

      // Look in test directories
      const testDirs = ['test', 'tests', '__tests__', 'spec'];
      for (const testDir of testDirs) {
        const testDirPath = join(targetDir, testDir);
        try {
          const { stdout } = await pi.exec("find", [
            testDirPath, "-name", `*${targetName}*${targetExt}`, "-type", "f"
          ], { signal });
          
          for (const file of stdout.split('\n').filter(Boolean)) {
            related.push({
              path: relative(cwd, file),
              type: 'test',
              reason: 'in test directory'
            });
          }
        } catch {}
      }
    }

    // Find interface/type definition files
    if (!types || types.includes('interface') || types.includes('type_definition') || types.includes('all')) {
      const interfacePatterns = [
        `${targetName}.d${targetExt}`,
        `I${targetName}${targetExt}`,
        `${targetName}Interface${targetExt}`,
        `${targetName}Types${targetExt}`,
      ];

      for (const pattern of interfacePatterns) {
        const interfacePath = join(targetDir, pattern);
        try {
          await stat(interfacePath);
          related.push({
            path: relative(cwd, interfacePath),
            type: 'interface',
            reason: 'naming convention match'
          });
        } catch {}
      }
    }

    // Find config files
    if (!types || types.includes('config') || types.includes('all')) {
      const configPatterns = [
        `${targetName}.config.js`,
        `${targetName}.config.json`,
        `${targetName}.yml`,
        `${targetName}.yaml`,
      ];

      for (const pattern of configPatterns) {
        const configPath = join(targetDir, pattern);
        try {
          await stat(configPath);
          related.push({
            path: relative(cwd, configPath),
            type: 'config',
            reason: 'naming convention match'
          });
        } catch {}
      }
    }

    return related;
  }

  async function summarizeFile(
    filePath: string,
    cwd: string,
    detailLevel: string,
    signal?: AbortSignal
  ): Promise<FileSummary> {
    const fullPath = join(cwd, filePath);
    const content = await readFile(fullPath, 'utf-8');
    const stats = await stat(fullPath);
    const lines = content.split('\n');
    const language = getLanguageFromExtension(extname(filePath));

    const summary: FileSummary = {
      path: filePath,
      language,
      lines: lines.length,
      size: stats.size,
      exports: [],
      imports: [],
      functions: [],
      types: [],
      purpose: 'Unknown',
    };

    // Extract imports, exports, functions based on language
    switch (language) {
      case 'typescript':
      case 'javascript':
        extractTSInfo(content, summary);
        break;
      case 'go':
        extractGoInfo(content, summary);
        break;
      case 'rust':
        extractRustInfo(content, summary);
        break;
      case 'gleam':
        extractGleamInfo(content, summary);
        break;
      case 'python':
        extractPythonInfo(content, summary);
        break;
    }

    // Guess purpose from filename, path, and content
    summary.purpose = guessFilePurpose(basename(filePath), filePath, content);

    return summary;
  }

  function extractTSInfo(content: string, summary: FileSummary) {
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Imports
      if (trimmed.startsWith('import ') && !trimmed.startsWith('import type')) {
        const match = trimmed.match(/from ['"`]([^'"`]+)['"`]/);
        if (match) summary.imports.push(match[1]);
      }
      
      // Exports
      if (trimmed.startsWith('export ')) {
        if (trimmed.includes('function ')) {
          const match = trimmed.match(/function\s+(\w+)/);
          if (match) summary.exports.push(`function ${match[1]}`);
        } else if (trimmed.includes('class ')) {
          const match = trimmed.match(/class\s+(\w+)/);
          if (match) summary.exports.push(`class ${match[1]}`);
        } else if (trimmed.includes('const ') || trimmed.includes('let ')) {
          const match = trimmed.match(/(?:const|let)\s+(\w+)/);
          if (match) summary.exports.push(`const ${match[1]}`);
        }
      }
      
      // Functions
      if (trimmed.includes('function ') || trimmed.match(/^\s*\w+\s*\(/)) {
        const funcMatch = trimmed.match(/function\s+(\w+)/) || trimmed.match(/^(\w+)\s*\(/);
        if (funcMatch) summary.functions.push(funcMatch[1]);
      }
      
      // Types
      if (trimmed.startsWith('type ') || trimmed.startsWith('interface ')) {
        const match = trimmed.match(/(?:type|interface)\s+(\w+)/);
        if (match) summary.types.push(match[1]);
      }
    }
  }

  function extractGoInfo(content: string, summary: FileSummary) {
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Imports
      if (trimmed.startsWith('import ')) {
        const match = trimmed.match(/import\s+(['"`])([^'"`]+)\1/) || trimmed.match(/import\s+(\w+)\s+(['"`])([^'"`]+)\2/);
        if (match) summary.imports.push(match[match.length - 1]);
      }
      
      // Functions
      if (trimmed.startsWith('func ')) {
        const match = trimmed.match(/func\s+(\w+)/);
        if (match) summary.functions.push(match[1]);
      }
      
      // Types
      if (trimmed.startsWith('type ')) {
        const match = trimmed.match(/type\s+(\w+)/);
        if (match) summary.types.push(match[1]);
      }
    }
  }

  function extractRustInfo(content: string, summary: FileSummary) {
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Functions
      if (trimmed.startsWith('fn ') || trimmed.startsWith('pub fn ')) {
        const match = trimmed.match(/fn\s+(\w+)/);
        if (match) summary.functions.push(match[1]);
      }
      
      // Structs and enums
      if (trimmed.startsWith('struct ') || trimmed.startsWith('pub struct ') || 
          trimmed.startsWith('enum ') || trimmed.startsWith('pub enum ')) {
        const match = trimmed.match(/(?:struct|enum)\s+(\w+)/);
        if (match) summary.types.push(match[1]);
      }
    }
  }

  function extractGleamInfo(content: string, summary: FileSummary) {
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Imports
      if (trimmed.startsWith('import ')) {
        const match = trimmed.match(/import\s+([a-zA-Z_][a-zA-Z0-9_/]*)/);
        if (match) summary.imports.push(match[1]);
      }
      
      // Functions
      if (trimmed.startsWith('pub fn ') || trimmed.startsWith('fn ')) {
        const match = trimmed.match(/fn\s+(\w+)/);
        if (match) summary.functions.push(match[1]);
      }
      
      // Types
      if (trimmed.startsWith('pub type ') || trimmed.startsWith('type ')) {
        const match = trimmed.match(/type\s+(\w+)/);
        if (match) summary.types.push(match[1]);
      }
    }
  }

  function extractPythonInfo(content: string, summary: FileSummary) {
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Imports
      if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
        const importMatch = trimmed.match(/import\s+([a-zA-Z_][a-zA-Z0-9_\.]*)/);
        const fromMatch = trimmed.match(/from\s+([a-zA-Z_][a-zA-Z0-9_\.]*)/);
        if (importMatch) summary.imports.push(importMatch[1]);
        if (fromMatch) summary.imports.push(fromMatch[1]);
      }
      
      // Functions
      if (trimmed.startsWith('def ')) {
        const match = trimmed.match(/def\s+(\w+)/);
        if (match) summary.functions.push(match[1]);
      }
      
      // Classes
      if (trimmed.startsWith('class ')) {
        const match = trimmed.match(/class\s+(\w+)/);
        if (match) summary.types.push(match[1]);
      }
    }
  }

  function guessDirPurpose(dirPath: string): string {
    const dirName = basename(dirPath).toLowerCase();
    const pathParts = dirPath.split('/').map(p => p.toLowerCase());
    
    if (pathParts.includes('src') || pathParts.includes('source')) return 'source code';
    if (pathParts.includes('test') || pathParts.includes('tests')) return 'tests';
    if (pathParts.includes('doc') || pathParts.includes('docs')) return 'documentation';
    if (pathParts.includes('bin') || pathParts.includes('binary')) return 'binaries';
    if (pathParts.includes('lib') || pathParts.includes('library')) return 'libraries';
    if (pathParts.includes('cmd') || pathParts.includes('command')) return 'command-line tools';
    if (pathParts.includes('api') || pathParts.includes('web')) return 'web/API code';
    if (pathParts.includes('internal')) return 'internal/private code';
    if (pathParts.includes('pkg') || pathParts.includes('package')) return 'packages';
    if (pathParts.includes('config') || pathParts.includes('conf')) return 'configuration';
    if (pathParts.includes('static') || pathParts.includes('assets')) return 'static assets';
    if (pathParts.includes('migrations') || pathParts.includes('schema')) return 'database schema';
    
    return 'general purpose';
  }

  function guessFilePurpose(filename: string, path: string, content?: string): string {
    const lower = filename.toLowerCase();
    
    if (lower.includes('readme')) return 'project documentation';
    if (lower.includes('changelog') || lower.includes('changes')) return 'version history';
    if (lower.includes('license')) return 'license information';
    if (lower.includes('makefile') || lower.includes('justfile')) return 'build automation';
    if (lower.includes('dockerfile')) return 'container definition';
    if (lower.includes('docker-compose')) return 'container orchestration';
    if (lower.includes('.gitignore')) return 'git ignore rules';
    if (lower.includes('package.json')) return 'Node.js package configuration';
    if (lower.includes('cargo.toml')) return 'Rust package configuration';
    if (lower.includes('go.mod')) return 'Go module definition';
    if (lower.includes('gleam.toml')) return 'Gleam project configuration';
    if (lower.includes('agents.md')) return 'AI agent instructions';
    if (lower.includes('todo')) return 'task list';
    
    if (path.includes('/test/') || path.includes('_test.') || path.includes('.test.')) {
      return 'automated tests';
    }
    if (path.includes('/cmd/') || path.includes('/main.')) {
      return 'application entry point';
    }
    if (path.includes('/api/') || path.includes('/web/') || path.includes('/http/')) {
      return 'web API handler';
    }
    if (path.includes('/internal/') || path.includes('/src/')) {
      return 'core application logic';
    }
    
    // Basic content analysis if available
    if (content) {
      if (content.includes('func main(') || content.includes('function main') || content.includes('if __name__ == "__main__"')) {
        return 'application entry point';
      }
      if (content.includes('describe(') || content.includes('it(') || content.includes('test_')) {
        return 'automated tests';
      }
    }
    
    return 'source code';
  }

  function getLanguageFromExtension(ext: string): string {
    switch (ext.toLowerCase()) {
      case '.ts': case '.tsx': return 'typescript';
      case '.js': case '.jsx': return 'javascript';
      case '.go': return 'go';
      case '.rs': return 'rust';
      case '.gleam': return 'gleam';
      case '.py': case '.pyw': return 'python';
      case '.java': return 'java';
      case '.c': case '.h': return 'c';
      case '.cpp': case '.hpp': case '.cc': case '.cxx': return 'cpp';
      case '.cs': return 'csharp';
      case '.rb': return 'ruby';
      case '.php': return 'php';
      case '.sh': case '.bash': return 'shell';
      case '.sql': return 'sql';
      case '.json': return 'json';
      case '.yaml': case '.yml': return 'yaml';
      case '.toml': return 'toml';
      case '.xml': return 'xml';
      case '.html': case '.htm': return 'html';
      case '.css': return 'css';
      case '.md': case '.markdown': return 'markdown';
      default: return 'text';
    }
  }
}