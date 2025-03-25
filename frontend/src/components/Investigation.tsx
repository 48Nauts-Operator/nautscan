import { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';

interface NetworkNode {
  id: number;
  label: string;
  title?: string;
  level?: number;
}

interface NetworkEdge {
  id: number;
  from: number;
  to: number;
  label?: string;
}

interface TracerouteHop {
  hop: number;
  ip: string;
  hostname: string;
  rtt: number;
}

export default function Investigation() {
  const networkRef = useRef<HTMLDivElement>(null);
  const [network, setNetwork] = useState<Network | null>(null);
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (networkRef.current) {
      const nodes = new DataSet<NetworkNode>([]);
      const edges = new DataSet<NetworkEdge>([]);

      const options = {
        nodes: {
          shape: 'dot',
          size: 16,
          font: {
            size: 12,
            color: '#000000',
          },
          borderWidth: 2,
          shadow: true,
        },
        edges: {
          width: 2,
          color: {
            color: '#2B7CE9',
            highlight: '#848484',
            hover: '#848484',
          },
          arrows: {
            to: { enabled: true, scaleFactor: 0.5 },
          },
          smooth: {
            type: 'continuous',
          },
        },
        physics: {
          stabilization: false,
          barnesHut: {
            gravitationalConstant: -80000,
            springConstant: 0.001,
            springLength: 200,
          },
        },
        layout: {
          hierarchical: {
            direction: 'LR',
            sortMethod: 'directed',
            levelSeparation: 150,
            nodeSpacing: 100,
          },
        },
      };

      const newNetwork = new Network(
        networkRef.current,
        { nodes, edges },
        options
      );

      setNetwork(newNetwork);

      // Add some initial data
      const initialNodes = [
        { id: 1, label: 'Your Network', level: 0 },
        { id: 2, label: 'Router', level: 1 },
        { id: 3, label: 'ISP', level: 2 },
        { id: 4, label: 'Internet', level: 3 },
        { id: 5, label: 'example.com\n203.0.113.1', level: 4 }
      ];

      const initialEdges = [
        { id: 1, from: 1, to: 2, label: '2ms' },
        { id: 2, from: 2, to: 3, label: '10ms' },
        { id: 3, from: 3, to: 4, label: '25ms' },
        { id: 4, from: 4, to: 5, label: '45ms' }
      ];

      newNetwork.setData({
        nodes: new DataSet(initialNodes),
        edges: new DataSet(initialEdges)
      });

      return () => {
        newNetwork.destroy();
      };
    }
  }, []);

  const handleTrace = async () => {
    if (!network || !target) return;

    setLoading(true);
    setError(null);

    try {
      // Mock traceroute data - replace with actual API call
      const mockTraceroute: TracerouteHop[] = Array.from({ length: 5 }, (_, i) => ({
        hop: i + 1,
        ip: `192.168.${i + 1}.1`,
        hostname: `router-${i + 1}.example.com`,
        rtt: Math.random() * 100,
      }));

      // Clear existing nodes and edges
      network.setData({ nodes: [], edges: [] });

      // Add source node
      const nodes: NetworkNode[] = [
        { id: 0, label: 'Source\n(You)', level: 0 },
      ];

      const edges: NetworkEdge[] = [];

      // Add traceroute hops
      mockTraceroute.forEach((hop, index) => {
        nodes.push({
          id: hop.hop,
          label: `${hop.hostname}\n${hop.ip}`,
          title: `RTT: ${hop.rtt.toFixed(2)}ms`,
          level: hop.hop,
        });

        edges.push({
          id: hop.hop,
          from: index === 0 ? 0 : hop.hop - 1,
          to: hop.hop,
          label: `${hop.rtt.toFixed(1)}ms`,
        });
      });

      // Add target node
      nodes.push({
        id: nodes.length,
        label: `Target\n${target}`,
        level: nodes.length,
      });

      edges.push({
        id: edges.length + 1,
        from: nodes.length - 2,
        to: nodes.length - 1,
      });

      network.setData({
        nodes: new DataSet(nodes),
        edges: new DataSet(edges),
      });

      network.fit();
    } catch (err) {
      setError('Failed to perform traceroute. Please try again.');
      console.error('Traceroute error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 h-[80vh] flex flex-col bg-white dark:bg-slate-800 rounded-lg shadow-lg">
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Network Investigation</h2>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 p-2 border rounded-md dark:bg-slate-700 dark:text-white"
            placeholder="Enter hostname or IP address"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            disabled={loading}
          />
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
            onClick={handleTrace}
            disabled={!target || loading}
          >
            {loading ? 'Tracing...' : 'Trace'}
          </button>
        </div>
        {error && (
          <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
      </div>

      <div
        ref={networkRef}
        className="flex-1 border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-900"
      />
    </div>
  );
} 