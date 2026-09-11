import React, { useState } from 'react';
import { unityHierarchyData, stepByStepInstructions, HierarchyNode } from '../data/setupInstructions';
import { BookOpen, ChevronRight, ChevronDown, AlertTriangle, Layers, Box, CheckCircle2, Sliders } from 'lucide-react';

export const SetupGuide: React.FC = () => {
  const [activeStepId, setActiveStepId] = useState<string>('step-1');

  return (
    <div className="space-y-6 font-sans">
      {/* Overview Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white tracking-wide">Unity Scene Setup & Inspector Guide</h2>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
            Detailed walkthrough on how to create the game objects, attach each script in the Unity Inspector, bake the AI NavMesh, and configure collision layers.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Tested on Unity 2022.3 LTS & Unity 6000</span>
        </div>
      </div>

      {/* Two Column Layout: Left = Step-by-Step Instructions, Right = Visual Hierarchy */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Instructions (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              <span>Step-by-Step Implementation Guide</span>
            </h3>

            {/* Step navigation tabs */}
            <div className="flex flex-wrap gap-2 mb-4 pb-3 border-b border-slate-800">
              {stepByStepInstructions.map((step) => {
                const isActive = step.id === activeStepId;
                return (
                  <button
                    key={step.id}
                    id={`btn-guide-${step.id}`}
                    onClick={() => setActiveStepId(step.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {step.title.split('.')[0]}. {step.category}
                  </button>
                );
              })}
            </div>

            {/* Active Step Content */}
            {(() => {
              const currentStep = stepByStepInstructions.find((s) => s.id === activeStepId) || stepByStepInstructions[0];
              return (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-base font-bold text-white mb-1">{currentStep.title}</h4>
                    <p className="text-xs text-slate-400">{currentStep.summary}</p>
                  </div>

                  {/* Numbered Steps */}
                  <div className="space-y-2.5">
                    {currentStep.steps.map((st, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-2.5 bg-slate-950/60 rounded-lg border border-slate-850">
                        <div className="w-5 h-5 rounded-full bg-slate-800 text-indigo-300 text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{st}</p>
                      </div>
                    ))}
                  </div>

                  {/* Inspector Values Table if available */}
                  {currentStep.inspectorNotes && (
                    <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
                      <div className="text-xs font-bold text-amber-400 font-mono flex items-center gap-1.5 mb-2">
                        <Sliders className="w-3.5 h-3.5" />
                        <span>RECOMMENDED INSPECTOR VALUES</span>
                      </div>
                      <div className="space-y-1 text-xs font-mono">
                        {Object.entries(currentStep.inspectorNotes).map(([field, val]) => (
                          <div key={field} className="flex justify-between py-1 border-b border-slate-850 text-slate-400 last:border-0">
                            <span className="text-slate-300">{field}:</span>
                            <span className="text-emerald-400 font-semibold">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Common Pitfalls / Mistakes */}
                  {currentStep.commonMistakes && currentStep.commonMistakes.length > 0 && (
                    <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-3.5 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span>CRITICAL GOTCHAS & PITFALLS</span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-amber-200/90 list-disc list-inside">
                        {currentStep.commonMistakes.map((mistake, mIdx) => (
                          <li key={mIdx} className="leading-relaxed">
                            {mistake}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right Column: Interactive Unity Hierarchy (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Scene Hierarchy & Components</span>
              </h3>
              <span className="text-[10px] font-mono text-slate-400">UNITY OBJECT TREE</span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Expand and inspect the exact GameObject nesting required in your Unity Hierarchy window.
            </p>

            <div className="bg-slate-950 rounded-lg border border-slate-800 p-3 font-mono text-xs overflow-x-auto max-h-[540px] scrollbar-thin">
              {unityHierarchyData.children?.map((child, idx) => (
                <HierarchyTreeNode key={idx} node={child} depth={0} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface HierarchyTreeNodeProps {
  node: HierarchyNode;
  depth: number;
}

const HierarchyTreeNode: React.FC<HierarchyTreeNodeProps> = ({ node, depth }) => {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="space-y-1">
      <div
        onClick={() => hasChildren && setIsOpen(!isOpen)}
        className={`flex items-start gap-1.5 py-1 px-1.5 rounded hover:bg-slate-900 transition-colors ${
          hasChildren ? 'cursor-pointer' : ''
        }`}
        style={{ paddingLeft: `${depth * 16 + 6}px` }}
      >
        {hasChildren ? (
          <button className="text-slate-500 hover:text-slate-300 mt-0.5">
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0 mt-0.5">
            <Box className="w-3 h-3 text-slate-600" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-slate-200">{node.name}</span>
            {node.tag && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Tag: {node.tag}
              </span>
            )}
            {node.layer && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Layer: {node.layer}
              </span>
            )}
          </div>

          {node.components && node.components.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {node.components.map((comp, cIdx) => (
                <div key={cIdx} className="text-[10px] text-slate-400 pl-2 border-l border-slate-800">
                  ⚡ <span className="text-emerald-400 font-medium">{comp}</span>
                </div>
              ))}
            </div>
          )}

          {node.notes && (
            <div className="text-[10px] text-slate-500 italic mt-0.5 pl-2">
              ℹ️ {node.notes}
            </div>
          )}
        </div>
      </div>

      {hasChildren && isOpen && (
        <div>
          {node.children!.map((child, idx) => (
            <HierarchyTreeNode key={idx} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};
