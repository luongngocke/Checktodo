/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Clock, Tag, MapPin } from 'lucide-react';
import { DetectedPlate } from '../types';

interface ReportTableProps {
  plates: DetectedPlate[];
}

export default function ReportTable({ plates }: ReportTableProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200">
          <tr>
            <th className="px-6 py-4">Snapshot</th>
            <th className="px-6 py-4">Plate Identifier</th>
            <th className="px-6 py-4">Region</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4 text-right">Confidence</th>
          </tr>
        </thead>
        <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
          {plates.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium uppercase tracking-widest text-xs italic">
                Waiting for license plate detection events...
              </td>
            </tr>
          ) : (
            plates.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                <td className="px-6 py-4">
                  <div className="w-16 h-10 bg-slate-200 rounded border border-slate-300 overflow-hidden shadow-inner">
                    <img src={item.thumbnail} alt="Plate" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Tag size={14} className="text-blue-500" />
                    <span className="font-mono font-black text-slate-900 tracking-tighter text-base">
                      {item.plate}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-500">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} />
                    <span className="font-medium">Vietnam (Detected)</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                    <Clock size={14} />
                    {new Date(item.timestamp).toLocaleTimeString([], { hour12: false })}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                    item.confidence > 0.8 
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                  }`}>
                    {(item.confidence * 100).toFixed(1)}% Match
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
        <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
           Records Today: {plates.length}
        </div>
        <div>ALPR System Encryption Active</div>
      </div>
    </div>
  );
}
