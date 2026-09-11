import React, { useState } from 'react';
import { ScriptFile } from '../types';
import { Copy, Check, Download, Archive, Code2, Layers, Cpu } from 'lucide-react';
import JSZip from 'jszip';

interface ScriptViewerProps {
  scripts: ScriptFile[];
}

export const ScriptViewer: React.FC<ScriptViewerProps> = ({ scripts }) => {
  const [activeScriptId, setActiveScriptId] = useState<string>(scripts[0]?.id || 'player-controller');
  const [copied, setCopied] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  const activeScript = scripts.find((s) => s.id === activeScriptId) || scripts[0];

  const handleCopy = () => {
    if (!activeScript) return;
    navigator.clipboard.writeText(activeScript.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingle = () => {
    if (!activeScript) return;
    const blob = new Blob([activeScript.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeScript.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      const scriptsFolder = zip.folder('Unity_3D_Survival_Scripts');

      scripts.forEach((script) => {
        scriptsFolder?.file(script.filename, script.code);
      });

      // Add a handy README inside the zip
      scriptsFolder?.file(
        'README.txt',
        `Unity 3D Survival Action Game Scripts
Generated for Unity 2022 LTS / Unity 6000.

SCRIPTS INCLUDED:
1. PlayerController.cs - Smooth WASD First-Person controller, mouse look, jump, sprint, and ground check
2. Gun.cs - Raycast shooting, ammo count, reload coroutine, and damage logic
3. EnemyAI.cs - NavMeshAgent patrol waypoints, vision cone detection, and chase behavior
4. PlayerHealth.cs - Health tracking and damage events
5. HUDController.cs - Health slider, ammo text, dynamic crosshair, and hitmarker
6. IDamageable.cs - Interface for decoupling combat
7. GameManager.cs - Wave spawning and game over coordination

HOW TO IMPORT:
1. Drag this entire folder into your Unity Project window under 'Assets/Scripts/'.
2. See the Setup Instructions in the Developer Studio for component attachment guides.
`
      );

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Unity_3D_Survival_Scripts.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to create ZIP', err);
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl font-sans">
      {/* Top Header & Global Actions */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Code2 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white tracking-wide">Unity C# Scripts Suite</h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              C# 9.0+ / Unity 2022+ & 6000
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Clean, decoupled classes with serializable inspector fields and performance optimizations.
          </p>
        </div>

        {/* Global Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            id="btn-download-zip"
            onClick={handleDownloadZip}
            disabled={downloadingZip}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            <Archive className="w-4 h-4" />
            <span>{downloadingZip ? 'Packaging ZIP...' : 'Download All (.ZIP)'}</span>
          </button>
        </div>
      </div>

      {/* Script Tabs Navigation */}
      <div className="flex items-center overflow-x-auto border-b border-slate-800 bg-slate-950/40 px-3 py-2 gap-1.5 scrollbar-thin">
        {scripts.map((script) => {
          const isActive = script.id === activeScriptId;
          return (
            <button
              key={script.id}
              id={`tab-script-${script.id}`}
              onClick={() => setActiveScriptId(script.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-slate-800 text-white font-semibold border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  script.category === 'Player'
                    ? 'bg-emerald-400'
                    : script.category === 'Combat'
                    ? 'bg-amber-400'
                    : script.category === 'AI'
                    ? 'bg-rose-400'
                    : script.category === 'UI'
                    ? 'bg-sky-400'
                    : 'bg-indigo-400'
                }`}
              />
              <span>{script.filename}</span>
            </button>
          );
        })}
      </div>

      {/* Active Script Details Banner */}
      {activeScript && (
        <div className="px-4 py-3 bg-slate-850/50 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex-1 min-w-[280px]">
            <p className="text-slate-300 mb-1">{activeScript.description}</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-500" />
                Category: <span className="text-slate-300 font-medium">{activeScript.category}</span>
              </span>

              {activeScript.unityComponentsRequired.length > 0 && (
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-amber-400" />
                  Requires:{' '}
                  <span className="text-amber-300">{activeScript.unityComponentsRequired.join(', ')}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-copy-code"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? 'Copied!' : 'Copy C# Code'}</span>
            </button>

            <button
              id="btn-download-single-cs"
              onClick={handleDownloadSingle}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Download .cs</span>
            </button>
          </div>
        </div>
      )}

      {/* Code Display with Line Numbers */}
      <div className="relative bg-slate-950 p-4 font-mono text-[13px] leading-relaxed overflow-x-auto max-h-[580px] scrollbar-thin">
        <pre className="text-slate-200">
          <code>
            {activeScript.code.split('\n').map((line, idx) => (
              <div key={idx} className="table-row">
                <span className="table-cell select-none pr-4 text-slate-600 text-right text-xs">
                  {idx + 1}
                </span>
                <span className="table-cell whitespace-pre">
                  {highlightCSharp(line)}
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
};

// Syntax highlighter helper for C# code
function highlightCSharp(line: string) {
  // Comments
  if (line.trim().startsWith('//') || line.trim().startsWith('///')) {
    return <span className="text-slate-500 italic">{line}</span>;
  }

  // Header attributes [Header(...)]
  if (line.trim().startsWith('[') && line.trim().endsWith(']')) {
    return <span className="text-amber-300">{line}</span>;
  }

  return (
    <span>
      {line.split(/(\b(?:using|public|private|protected|class|interface|enum|void|int|float|bool|string|return|if|else|switch|case|break|new|override|static|get|set|IEnumerator|yield|typeof|this)\b)/g).map((chunk, i) => {
        if (/^(using|public|private|protected|class|interface|enum|void|int|float|bool|string|return|if|else|switch|case|break|new|override|static|get|set|IEnumerator|yield|typeof|this)$/.test(chunk)) {
          return <span key={i} className="text-indigo-400 font-semibold">{chunk}</span>;
        }
        if (/^(Vector3|Quaternion|Transform|GameObject|Camera|CharacterController|NavMeshAgent|Collider|AudioSource|AudioClip|ParticleSystem|TextMeshProUGUI|Slider|Image|CanvasGroup|LayerMask|Ray|RaycastHit|Physics|Mathf|Time|Input|KeyCode)$/.test(chunk)) {
          return <span key={i} className="text-emerald-400">{chunk}</span>;
        }
        return chunk;
      })}
    </span>
  );
}
