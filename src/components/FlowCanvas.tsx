import { useEffect, useMemo } from 'react';
import { Background, Controls, Handle, MarkerType, MiniMap, Position, ReactFlow, useNodesState, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Dependency, Flow, Stage } from '../types';
import { Badge } from './ui';
import { useDirectory } from '../app/Directory';

const statusTone = (state: Stage['state']) => state === 'Concluída' ? 'green' : state === 'Em andamento' || state === 'Disponível' ? 'blue' : state.includes('Aguardando') ? 'amber' : state === 'Invalidada' || state === 'Cancelada' ? 'red' : 'neutral';

function StageNode({ data, selected }: NodeProps) {
  const { userName } = useDirectory();
  const stage = data.stage as Stage;
  const flow = data.flow as Flow;
  return <div className={`flow-node ${selected ? 'selected' : ''}`}><Handle type="target" position={Position.Left} /><div className="flow-node-stripe" /><small>{flow.name}</small><strong>{stage.name}</strong><Badge tone={statusTone(stage.state)}>{stage.state}</Badge><span>{stage.assigneeIds.length ? userName(stage.assigneeIds[0]) : 'Sem responsável'}</span><Handle type="source" position={Position.Right} /></div>;
}

const nodeTypes = { stage: StageNode };

export function FlowCanvas({ flows, dependencies, onSelectStage, editing = false }: { flows: Flow[]; dependencies: Dependency[]; onSelectStage?: (stage: Stage) => void; editing?: boolean }) {
  const nodes = useMemo(() => flows.filter(flow => flow.active).flatMap((flow, flowIndex) => flow.stages.filter((stage) => stage.active).map((stage, stageIndex) => ({
    id: stage.id,
    type: 'stage',
    position: { x: stageIndex * 255, y: flowIndex * 210 + (stageIndex % 2) * 20 },
    data: { stage, flow },
  }))), [flows]);
  const [displayNodes, setNodes, onNodesChange] = useNodesState(nodes);
  useEffect(() => setNodes(nodes), [nodes, setNodes]);
  const edges = useMemo(() => dependencies.filter((dependency) => dependency.active).map((dependency) => ({
    id: dependency.id, source: dependency.sourceStageId, target: dependency.targetStageId,
    animated: dependency.condition === 'Escolha manual',
    markerEnd: { type: MarkerType.ArrowClosed },
    label: dependency.expected,
    className: dependency.sourceFlowId !== dependency.targetFlowId ? 'cross-edge' : '',
  })), [dependencies]);

  return <div className="canvas-wrap"><ReactFlow nodes={displayNodes} onNodesChange={onNodesChange} edges={edges} nodeTypes={nodeTypes} fitView nodesDraggable={editing} nodesConnectable={false} onNodeClick={(_, node) => onSelectStage?.(node.data.stage as Stage)}><Background gap={20} size={1} /><Controls /><MiniMap pannable zoomable nodeColor="#93c5fd" /></ReactFlow><div className="canvas-legend"><span><i className="dot-blue" />Ativa</span><span><i className="dot-green" />Concluída</span><span><i className="line-purple" />Entre fluxos</span></div></div>;
}
