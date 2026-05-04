/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Play, Square, Camera, Upload, AlertCircle } from 'lucide-react';
import { detectLicensePlate } from '../services/gemini';
import { DetectedPlate } from '../types';

interface VideoProcessorProps {
  onPlateDetected: (plate: DetectedPlate) => void;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
}

export default function VideoProcessor({ onPlateDetected, isProcessing, setIsProcessing }: VideoProcessorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [useUrl, setUseUrl] = useState(false);
  const [useWebcam, setUseWebcam] = useState(false);
  const [status, setStatus] = useState<string>('IDLE');
  const processingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setVideoSource('WEBCAM');
      }
    } catch (err) {
      console.error("Error accessing webcam:", err);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setVideoSource(null);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    stopWebcam();
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSource(url);
      setUseUrl(false);
      setUseWebcam(false);
    }
  };

  const handleUrlConnect = () => {
    stopWebcam();
    if (streamUrl) {
      setVideoSource(streamUrl);
      setUseUrl(true);
      setUseWebcam(false);
    }
  };

  const handleToggleWebcam = () => {
    if (useWebcam) {
      stopWebcam();
      setUseWebcam(false);
    } else {
      setUseUrl(false);
      setUseWebcam(true);
      startWebcam();
    }
  };

  const processFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !isProcessing || processingRef.current) return;

    processingRef.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      processingRef.current = false;
      return;
    }

    const MAX_DIMENSION = 1024;
    let width = videoRef.current.videoWidth;
    let height = videoRef.current.videoHeight;
    
    if (width === 0 || height === 0) {
      processingRef.current = false;
      return;
    }

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      if (width > height) {
        height = (height / width) * MAX_DIMENSION;
        width = MAX_DIMENSION;
      } else {
        width = (width / height) * MAX_DIMENSION;
        height = MAX_DIMENSION;
      }
    }

    canvas.width = width;
    canvas.height = height;
    
    try {
      ctx.drawImage(videoRef.current, 0, 0, width, height);
    } catch (e) {
      console.error("Failed to draw video frame to canvas", e);
      processingRef.current = false;
      return;
    }

    const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    
    setStatus('ANALYZING...');
    const result = await detectLicensePlate(base64Image);
    
    if (result.plate && result.plate !== 'null') {
      onPlateDetected({
        id: Math.random().toString(36).substr(2, 9),
        plate: result.plate,
        timestamp: Date.now(),
        confidence: result.confidence,
        thumbnail: canvas.toDataURL('image/jpeg', 0.3),
      });
      setStatus('PLATE FOUND!');
    } else {
      setStatus('SCANNING...');
    }
    
    processingRef.current = false;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProcessing) {
      interval = setInterval(processFrame, 5000);
    }
    return () => clearInterval(interval);
  }, [isProcessing, videoSource]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-slate-200">
        {videoSource ? (
          <video
            ref={videoRef}
            src={videoSource}
            className="w-full h-full object-contain"
            autoPlay
            muted
            loop
            playsInline
            crossOrigin="anonymous"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-6 p-8">
            <div className="bg-slate-800 p-4 rounded-full">
              <Camera size={32} className="text-slate-500" />
            </div>
            
            <div className="w-full max-w-sm space-y-4">
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 text-center">Input Source Configuration</p>
                <div className="flex bg-slate-800 p-1 rounded-lg">
                  <button 
                    onClick={() => { stopWebcam(); setUseUrl(false); setUseWebcam(false); }}
                    className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded-md transition-all ${!useUrl && !useWebcam ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500'}`}
                  >
                    File
                  </button>
                  <button 
                    onClick={() => { setUseUrl(true); setUseWebcam(false); }}
                    className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded-md transition-all ${useUrl ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500'}`}
                  >
                    URL Stream
                  </button>
                  <button 
                    onClick={handleToggleWebcam}
                    className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded-md transition-all ${useWebcam ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500'}`}
                  >
                    OBS / Virtual Cam
                  </button>
                </div>
              </div>

              {useUrl ? (
                <div className="flex gap-2 text-center flex-col">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="rtmp:// or http://.../stream.m3u8"
                      value={streamUrl}
                      onChange={(e) => setStreamUrl(e.target.value)}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    />
                    <button 
                      onClick={handleUrlConnect}
                      className="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-blue-500 transition-colors"
                    >
                      Link
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-500 italic">Lưu ý: Camera IP (RTSP) yêu cầu phần mềm trung gian như OBS Virtual Cam.</p>
                </div>
              ) : useWebcam ? (
                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 text-center">
                  <p className="text-[11px] text-slate-400 mb-2">Đang kết nối với thiết bị camera...</p>
                  <p className="text-[10px] text-blue-400 font-bold">Hãy chọn "OBS Virtual Camera" khi trình duyệt yêu cầu cấp quyền.</p>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-lg cursor-pointer hover:bg-slate-700 transition-all font-bold text-sm border border-slate-700">
                  <Upload size={18} />
                  <span>Chọn File Video CCTV</span>
                  <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
                </label>
              )}
            </div>
          </div>
        )}
        
        {/* HUD Elements */}
        {isProcessing && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              <div className="bg-rose-600 px-3 py-1 rounded flex items-center gap-2 shadow-lg">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-[10px] text-white font-black uppercase tracking-wider">Live Processing</span>
              </div>
              <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded text-[10px] text-emerald-400 font-mono font-bold border border-white/10 uppercase">
                {status}
              </div>
            </div>
            
            {/* Corners */}
            <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-white/30 rounded-tr" />
            <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-white/30 rounded-bl" />
            
            <div className="absolute bottom-4 right-4 text-white/50 text-[9px] font-mono bg-black/30 px-2 py-1 rounded">
              CAM-04 • GATEWAY_TERMINAL • ENC: H.264
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setIsProcessing(!isProcessing)}
          disabled={!videoSource}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold uppercase tracking-tight transition-all shadow-sm ${
            isProcessing 
              ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100' 
              : 'bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed'
          }`}
        >
          {isProcessing ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          {isProcessing ? 'Terminate Video Scan' : 'Initialize Vision AI'}
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
