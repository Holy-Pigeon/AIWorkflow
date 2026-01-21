import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { TrendingUp, Activity, Box, Cpu } from 'lucide-react';

const mockSentimentData = [
  { date: '2023-01', 白酒: 0.2, 新能源车: 0.8, 半导体: 0.5, 机器人: 0.3 },
  { date: '2023-02', 白酒: 0.3, 新能源车: 0.7, 半导体: 0.4, 机器人: 0.4 },
  { date: '2023-03', 白酒: 0.5, 新能源车: 0.9, 半导体: 0.6, 机器人: 0.5 },
  { date: '2023-04', 白酒: 0.4, 新能源车: 0.6, 半导体: 0.7, 机器人: 0.6 },
  { date: '2023-05', 白酒: 0.6, 新能源车: 0.5, 半导体: 0.5, 机器人: 0.7 },
  { date: '2023-06', 白酒: 0.7, 新能源车: 0.4, 半导体: 0.8, 机器人: 0.8 },
];

const mockIndustryDetails = {
  '白酒': [
    { name: '中证白酒指数', value: 0.8 },
    { name: '茅台批发价', value: 0.6 },
    { name: '库存周转', value: 0.7 },
  ],
  '新能源车': [
    { name: '新能源汽车销量', value: 0.9 },
    { name: '动力电池产量', value: 0.85 },
    { name: '充电桩增长', value: 0.75 },
  ],
  '半导体': [
    { name: '芯片指数', value: 0.6 },
    { name: '集成电路进口', value: 0.5 },
    { name: '国产化率', value: 0.7 },
  ],
  '机器人': [
    { name: '制造业PMI', value: 0.55 },
    { name: '工业机器人产量', value: 0.8 },
    { name: '伺服电机成本', value: 0.4 },
  ]
};

const App = () => {
  const [selectedIndustry, setSelectedIndustry] = useState('新能源车');

  const industryConfig = {
    '白酒': { icon: Box, color: '#f87171' },
    '新能源车': { icon: Activity, color: '#4ade80' },
    '半导体': { icon: Cpu, color: '#60a5fa' },
    '机器人': { icon: TrendingUp, color: '#fbbf24' },
  };

  const radarData = useMemo(() => {
    return mockIndustryDetails[selectedIndustry] || [];
  }, [selectedIndustry]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-8">
      <header className="mb-10">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          行业景气度计算引擎与展示
        </h1>
        <p className="text-slate-400 mt-2">基于 Rust 高性能计算引擎与 React 交互式前端</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">各行业景气度趋势</h2>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockSentimentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis domain={[-1, 1]} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                />
                <Legend />
                <Line type="monotone" dataKey="白酒" stroke="#f87171" strokeWidth={2} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="新能源车" stroke="#4ade80" strokeWidth={2} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="半导体" stroke="#60a5fa" strokeWidth={2} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="机器人" stroke="#fbbf24" strokeWidth={2} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Industry Selector & Mini Stats */}
        <div className="space-y-4">
          {Object.entries(industryConfig).map(([name, config]) => {
            const Icon = config.icon;
            const isSelected = selectedIndustry === name;
            return (
              <button
                key={name}
                onClick={() => setSelectedIndustry(name)}
                className={`w-full flex items-center p-4 rounded-xl border transition-all duration-200 ${
                  isSelected
                    ? 'bg-slate-800 border-blue-500/50 shadow-lg shadow-blue-500/10'
                    : 'bg-slate-900/30 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className={`p-3 rounded-lg mr-4`} style={{ backgroundColor: `${config.color}20` }}>
                  <Icon size={24} style={{ color: config.color }} />
                </div>
                <div className="text-left">
                  <div className="text-sm text-slate-400 font-medium">{name}行业</div>
                  <div className="text-lg font-bold">景气得分: {(mockSentimentData[mockSentimentData.length-1][name] * 100).toFixed(1)}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Drill-down Radar Chart */}
        <div className="lg:col-span-3 bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-semibold">{selectedIndustry} - 因子贡献下钻</h2>
              <p className="text-sm text-slate-400 mt-1">分析组成行业景气度的核心因子权重</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-around">
            <div className="h-[350px] w-full md:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 1]} tick={false} axisLine={false} />
                  <Radar
                    name={selectedIndustry}
                    dataKey="value"
                    stroke={industryConfig[selectedIndustry].color}
                    fill={industryConfig[selectedIndustry].color}
                    fillOpacity={0.5}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/3 space-y-4">
              <h3 className="text-lg font-medium border-b border-slate-800 pb-2">因子明细</h3>
              {radarData.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2">
                  <span className="text-slate-400">{item.name}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${item.value * 100}%`,
                          backgroundColor: industryConfig[selectedIndustry].color
                        }}
                      />
                    </div>
                    <span className="font-mono text-sm w-8 text-right">{(item.value * 100).toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
