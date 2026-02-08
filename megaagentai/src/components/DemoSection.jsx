import React, { useState, useRef, useEffect } from "react";
import { analyzeProductEnhanced as analyzeProduct } from "../services/openaiEnhanced";
import EnhancedResults from "./EnhancedResults";

const stages = [
  { id: "parsing", label: "Parsing URL", icon: "🔗" },
  { id: "competitors", label: "Competitors", icon: "🎯" },
  { id: "signals", label: "Signals", icon: "📡" },
  { id: "sentiment", label: "Sentiment", icon: "💬" },
  { id: "opportunity", label: "Opportunity", icon: "🚀" },
  { id: "summary", label: "Summary", icon: "📋" },
  { id: "complete", label: "Complete", icon: "✅" },
];

export default function DemoSection() {
  const [url, setUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStage, setCurrentStage] = useState(null);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const logsEndRef = useRef(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [logs]);

  const addLog = (message, type = "info") => {
    setLogs(prev => [...prev, { message, type, time: new Date().toLocaleTimeString() }]);
  };

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    
    setIsAnalyzing(true);
    setCurrentStage("identifying");
    setProgress(0);
    setLogs([]);
    setResult(null);
    setError(null);
    addLog(`Starting analysis of ${url}`, "start");

    try {
      const data = await analyzeProduct(url, (update) => {
        setCurrentStage(update.stage);
        setProgress(update.progress || 0);
        addLog(update.message, update.stage);
        
        if (update.stage === "identified" && update.data) {
          addLog(`Product: ${update.data.name}`, "success");
        }
        if (update.stage === "found_reviews" && update.data) {
          update.data.sources?.forEach(s => addLog(`📌 ${s.name}`, "source"));
        }
        if (update.stage === "complete" && update.data) {
          setResult(update.data);
        }
      });
      
      if (!result && data) {
        setResult(data);
      }
    } catch (err) {
      setError(err.message);
      addLog(`Error: ${err.message}`, "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStageIndex = (stage) => {
    if (!stage) return -1;
    const idx = stages.findIndex(s => s.id === stage);
    if (idx >= 0) return idx;
    if (stage.includes("found") || stage.includes("search")) return 1;
    if (stage.includes("deep")) return 3;
    return stages.findIndex(s => stage.startsWith(s.id.split("_")[0]));
  };

  const getSentimentColor = (sentiment) => {
    if (sentiment === "positive") return "#4ade80";
    if (sentiment === "negative") return "#f87171";
    return "#fbbf24";
  };

  return (
    <section className="demo-section" id="demo">
      <div className="demo-container">
        <div className="demo-header">
          <p className="demo-eyebrow">Try it now</p>
          <h2>Analyze any product in seconds</h2>
          <p className="demo-lead">
            Enter a product URL and watch our AI agents discover insights from across the web.
          </p>
        </div>

        <div className="demo-input-wrapper">
          <input
            type="url"
            placeholder="https://amazon.com/product/... or any product page"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isAnalyzing}
            className="demo-input"
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
          />
          <button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing || !url.trim()}
            className="demo-btn"
          >
            {isAnalyzing ? "Analyzing..." : "🔍 Analyze"}
          </button>
        </div>

        {(isAnalyzing || result) && (
          <div className="demo-progress-panel">
            <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
              <span className="progress-text">{progress}%</span>
            </div>
            
            <div className="stage-indicators">
              {stages.map((stage, idx) => (
                <div 
                  key={stage.id} 
                  className={`stage-item ${getStageIndex(currentStage) >= idx ? "active" : ""} ${currentStage === stage.id || (currentStage?.includes(stage.id)) ? "current" : ""}`}
                >
                  <span className="stage-icon">{stage.icon}</span>
                  <span className="stage-label">{stage.label}</span>
                </div>
              ))}
            </div>

            <div className="logs-panel">
              {logs.map((log, i) => (
                <div key={i} className={`log-entry log-${log.type}`}>
                  <span className="log-time">{log.time}</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}

        {error && (
          <div className="demo-error">
            <p>❌ {error}</p>
          </div>
        )}

        {result && (
          <div className="demo-results">
            {/* Header */}
            <div className="result-header" style={{ 
              background: '#f8fafc', 
              padding: '1.5rem', 
              borderRadius: '12px', 
              marginBottom: '1rem',
              border: '1px solid #e5e7eb'
            }}>
              <div className="result-title-row" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, color: '#1f2937', fontSize: '1.25rem' }}>{result.product?.name}</h3>
                {result.product?.brand && <span className="result-brand" style={{ background: '#3b82f6', color: '#fff', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>{result.product.brand}</span>}
                <span className="result-category" style={{ color: '#6b7280', fontSize: '0.9rem' }}>{result.product?.category}</span>
              </div>
              {result.product?.productUrl && (
                <a 
                  href={result.product.productUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  style={{ 
                    color: '#3b82f6', 
                    textDecoration: 'none', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    marginTop: '0.75rem',
                    padding: '0.5rem 1rem',
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '8px',
                    fontWeight: 500
                  }}
                >
                  🔗 View Product →
                </a>
              )}
            </div>

            {/* Enhanced Results Component */}
            <EnhancedResults result={result} />
          </div>
        )}
      </div>
    </section>
  );
}
