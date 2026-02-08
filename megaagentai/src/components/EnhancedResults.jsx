import React, { useState } from "react";

export default function EnhancedResults({ result }) {
  const [activeTab, setActiveTab] = useState("overview");

  if (!result) return null;

  const { product, competitorGraph, competitorSignals, aspectSentiment, opportunityIndex, summary, trendsAndGaps } = result;

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "competitors", label: "Competitors", icon: "🎯" },
    { id: "trends", label: "Trends", icon: "📈" },
    { id: "gaps", label: "Gaps", icon: "🔍" },
    { id: "signals", label: "Signals", icon: "📡" },
    { id: "sentiment", label: "Sentiment", icon: "💬" },
    { id: "opportunity", label: "Opportunity", icon: "🚀" },
    { id: "alerts", label: "Alerts", icon: "🔔" },
    { id: "evidence", label: "Evidence", icon: "🔗" },
  ];

  return (
    <div className="enhanced-results">
      {/* Header with Opportunity Score */}
      <div className="results-header">
        <div className="product-info">
          <span className="retailer-badge">{product?.retailer || "Retailer"}</span>
          <h2>{product?.productName || "Product"}</h2>
          <p className="brand-model">{product?.brand} {product?.model && `• Model: ${product.model}`}</p>
        </div>
        <div className="opportunity-score-card">
          <div className="score-circle" data-grade={opportunityIndex?.opportunityIndex?.grade}>
            <span className="score">{opportunityIndex?.opportunityIndex?.score || "—"}</span>
            <span className="label">Opportunity Index</span>
          </div>
          <span className="trend">{opportunityIndex?.opportunityIndex?.trend}</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="results-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === "overview" && (
          <OverviewTab summary={summary} opportunityIndex={opportunityIndex} />
        )}
        {activeTab === "competitors" && (
          <CompetitorsTab data={competitorGraph} sourceRetailer={product?.retailer} />
        )}
        {activeTab === "trends" && (
          <TrendsTab data={trendsAndGaps} retailer={product?.retailer} />
        )}
        {activeTab === "gaps" && (
          <GapsTab data={trendsAndGaps} retailer={product?.retailer} />
        )}
        {activeTab === "signals" && (
          <SignalsTab data={competitorSignals} />
        )}
        {activeTab === "sentiment" && (
          <SentimentTab data={aspectSentiment} />
        )}
        {activeTab === "opportunity" && (
          <OpportunityTab data={opportunityIndex} />
        )}
        {activeTab === "alerts" && (
          <AlertsTab data={opportunityIndex} />
        )}
        {activeTab === "evidence" && (
          <EvidenceTab data={summary} trendsData={trendsAndGaps} />
        )}
      </div>

      <style>{`
        .enhanced-results {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
          margin-top: 2rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 2rem;
          background: #f8fafc;
          border-bottom: 1px solid #e5e7eb;
        }

        .product-info h2 {
          margin: 0.5rem 0 0.25rem;
          font-size: 1.5rem;
          color: #1f2937;
        }

        .retailer-badge {
          background: #3b82f6;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .brand-model {
          color: #6b7280;
          margin: 0;
          font-size: 0.9rem;
        }

        .opportunity-score-card {
          text-align: center;
        }

        .score-circle {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #1e40af);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 30px rgba(59, 130, 246, 0.3);
        }

        .score-circle .score {
          font-size: 2rem;
          font-weight: 700;
          color: #fff;
        }

        .score-circle .label {
          font-size: 0.6rem;
          color: rgba(255,255,255,0.8);
          text-transform: uppercase;
        }

        .trend {
          display: block;
          margin-top: 0.5rem;
          color: #3b82f6;
          font-size: 0.85rem;
        }

        .results-tabs {
          display: flex;
          gap: 0.5rem;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          overflow-x: auto;
          background: #ffffff;
        }

        .tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .tab:hover {
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .tab.active {
          background: #3b82f6;
          border-color: #3b82f6;
          color: #fff;
        }

        .tab-icon {
          font-size: 1.1rem;
        }

        .tab-content {
          padding: 1.5rem 2rem;
          min-height: 400px;
          background: #ffffff;
        }

        .section-title {
          color: #3b82f6;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 1rem;
        }

        .card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
        }

        .insight-card {
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.25rem;
        }

        .insight-card h4 {
          color: #1f2937;
          margin: 0 0 0.5rem;
          font-size: 1rem;
        }

        .insight-card p {
          color: #4b5563;
          margin: 0;
          font-size: 0.9rem;
        }

        .metric-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0;
          border-bottom: 1px solid #f3f4f6;
        }

        .metric-label {
          color: #6b7280;
          font-size: 0.9rem;
        }

        .metric-value {
          color: #1f2937;
          font-weight: 600;
        }

        .metric-value.positive { color: #059669; }
        .metric-value.negative { color: #dc2626; }
        .metric-value.warning { color: #d97706; }

        .tag {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
          background: #f3f4f6;
          color: #374151;
        }

        .tag.high { border-left: 3px solid #ef4444; }
        .tag.medium { border-left: 3px solid #f59e0b; }
        .tag.low { border-left: 3px solid #22c55e; }
        .tag.positive { border-left: 3px solid #22c55e; }

        .alert-card {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 0.75rem;
        }

        .alert-icon {
          font-size: 1.5rem;
        }

        .alert-content h4 {
          color: #1f2937;
          margin: 0 0 0.25rem;
          font-size: 0.95rem;
        }

        .alert-content p {
          color: #4b5563;
          margin: 0;
          font-size: 0.85rem;
        }

        .alert-time {
          color: #3b82f6;
          font-size: 0.75rem;
          margin-top: 0.5rem;
        }

        .evidence-link {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 0.75rem;
          text-decoration: none;
          transition: all 0.2s;
        }

        .evidence-link:hover {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .evidence-source {
          color: #3b82f6;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .evidence-data {
          color: #1f2937;
          font-size: 0.9rem;
        }

        .evidence-fresh {
          color: #3b82f6;
          font-size: 0.75rem;
        }

        .competitor-table {
          width: 100%;
          border-collapse: collapse;
        }

        .competitor-table th {
          text-align: left;
          padding: 0.75rem;
          color: #6b7280;
          font-size: 0.8rem;
          text-transform: uppercase;
          border-bottom: 1px solid #e5e7eb;
          background: #f8fafc;
        }

        .competitor-table td {
          padding: 0.75rem;
          color: #1f2937;
          border-bottom: 1px solid #f3f4f6;
        }

        .pros-cons-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .pros-list, .cons-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .pros-list li, .cons-list li {
          background: #f8fafc;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 0.75rem;
        }

        .pros-list li { border-left: 3px solid #22c55e; }
        .cons-list li { border-left: 3px solid #ef4444; }

        .aspect-name {
          color: #1f2937;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .aspect-detail {
          color: #4b5563;
          font-size: 0.85rem;
        }

        .component-bar {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .component-label {
          width: 150px;
          color: #6b7280;
          font-size: 0.9rem;
        }

        .component-track {
          flex: 1;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }

        .component-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #1e40af);
          border-radius: 4px;
          transition: width 0.5s ease;
        }

        .component-score {
          width: 40px;
          text-align: right;
          color: #1f2937;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .results-header {
            flex-direction: column;
            gap: 1.5rem;
            text-align: center;
          }

          .pros-cons-grid {
            grid-template-columns: 1fr;
          }

          .tab-content {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}

// Overview Tab
function OverviewTab({ summary, opportunityIndex }) {
  const exec = summary?.executiveSummary || {};
  const digest = opportunityIndex?.weeklyDigest || {};

  return (
    <div>
      <div className="insight-card" style={{ marginBottom: "1.5rem" }}>
        <h4>📋 Executive Summary</h4>
        <p style={{ color: "#1f2937", fontSize: "1.1rem", marginBottom: "1rem" }}>{exec.headline || "Analysis complete"}</p>
        <p>{exec.categoryOverview}</p>
      </div>

      <div className="card-grid">
        <div className="insight-card">
          <h4>⚠️ Top Risks</h4>
          <ul style={{ paddingLeft: "1.25rem", margin: 0 }}>
            {(exec.topRisks || []).map((risk, i) => (
              <li key={i} style={{ marginBottom: "0.5rem" }}><span style={{ marginRight: "0.5rem" }}>🔴</span>{risk}</li>
            ))}
          </ul>
        </div>

        <div className="insight-card">
          <h4>🚀 Top Opportunities</h4>
          <ul style={{ paddingLeft: "1.25rem", margin: 0 }}>
            {(exec.topOpportunities || []).map((opp, i) => (
              <li key={i} style={{ marginBottom: "0.5rem" }}><span style={{ marginRight: "0.5rem" }}>✅</span>{opp}</li>
            ))}
          </ul>
        </div>

        <div className="insight-card">
          <h4>⚡ Immediate Actions</h4>
          <ul style={{ paddingLeft: "1.25rem", margin: 0 }}>
            {(exec.immediateActions || []).map((action, i) => (
              <li key={i} style={{ marginBottom: "0.5rem" }}><span style={{ marginRight: "0.5rem" }}>➡️</span>{action}</li>
            ))}
          </ul>
        </div>
      </div>

      {digest.topSKUsLosingShare && (
        <div style={{ marginTop: "1.5rem" }}>
          <p className="section-title">📉 SKUs Losing Share</p>
          {digest.topSKUsLosingShare.map((sku, i) => (
            <div key={i} className="alert-card">
              <span className="alert-icon">📉</span>
              <div className="alert-content">
                <h4>{sku.sku}</h4>
                <p>{sku.issue}</p>
                <span className="tag negative">{sku.shareLoss}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Competitors Tab
function CompetitorsTab({ data, sourceRetailer }) {
  const graph = data?.competitorGraph || {};

  // Normalize retailer names for comparison
  const normalizeRetailer = (name) => {
    if (!name) return '';
    return name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '');
  };

  const isSourceRetailer = (retailerName) => {
    return normalizeRetailer(retailerName) === normalizeRetailer(sourceRetailer);
  };

  // Helper to detect retailer from URL
  const getRetailerFromUrl = (url) => {
    if (!url) return 'Retailer';
    const urlLower = url.toLowerCase();
    if (urlLower.includes('amazon.com')) return 'Amazon';
    if (urlLower.includes('walmart.com')) return 'Walmart';
    if (urlLower.includes('homedepot.com')) return 'Home Depot';
    if (urlLower.includes('lowes.com')) return 'Lowes';
    if (urlLower.includes('target.com')) return 'Target';
    if (urlLower.includes('bestbuy.com')) return 'Best Buy';
    if (urlLower.includes('costco.com')) return 'Costco';
    if (urlLower.includes('menards.com')) return 'Menards';
    if (urlLower.includes('acehardware.com')) return 'Ace Hardware';
    return 'Retailer';
  };

  // Helper to generate proper search URL for a retailer
  const generateSearchUrl = (retailer, searchTerms) => {
    const encoded = encodeURIComponent(searchTerms).replace(/%20/g, '+');
    const retailerLower = (retailer || 'amazon').toLowerCase().replace(/\s+/g, '');
    
    switch (retailerLower) {
      case 'walmart':
        return `https://www.walmart.com/search?q=${encoded}`;
      case 'amazon':
        return `https://www.amazon.com/s?k=${encoded}`;
      case 'target':
        return `https://www.target.com/s?searchTerm=${encoded}`;
      case 'homedepot':
      case 'home depot':
        return `https://www.homedepot.com/s/${encodeURIComponent(searchTerms)}`;
      case 'lowes':
        return `https://www.lowes.com/search?searchTerm=${encoded}`;
      case 'bestbuy':
      case 'best buy':
        return `https://www.bestbuy.com/site/searchpage.jsp?st=${encoded}`;
      case 'costco':
        return `https://www.costco.com/CatalogSearch?keyword=${encoded}`;
      default:
        return `https://www.amazon.com/s?k=${encoded}`;
    }
  };

  // Helper to get match type badge color
  const getMatchTypeBadge = (matchType) => {
    const badges = {
      'UPC_MATCH': { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)', label: '🔢 UPC Match', desc: 'Exact product identified by UPC/GTIN' },
      'MPN_MATCH': { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', label: '🏭 MPN Match', desc: 'Matched by manufacturer part number' },
      'ATTRIBUTE_MATCH': { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', label: '📋 Attribute Match', desc: 'Same brand, size, and specs' },
      'SEMANTIC_MATCH': { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)', label: '🧠 AI Semantic Match', desc: 'Matched by AI embedding similarity' },
      'SIMILAR_CATEGORY': { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', label: '📂 Similar Category', desc: 'Same category, competing product' },
      'CLOSE_SUBSTITUTE': { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', label: '🔄 Close Substitute', desc: 'Similar specs, different brand' },
    };
    // Default to SIMILAR_CATEGORY if unknown or empty
    if (!matchType || matchType === 'unknown' || matchType === 'Unknown') {
      return { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', label: '📂 Similar Category', desc: 'Similar product in same category' };
    }
    return badges[matchType] || badges['SIMILAR_CATEGORY'];
  };

  // Filter out source retailer from close substitutes (show only competitor retailers)
  const competitorSubstitutes = (graph.closeSubstitutes || []).filter(sub => {
    const subRetailer = sub.retailer || getRetailerFromUrl(sub.url || sub.competitorUrl);
    return !isSourceRetailer(subRetailer);
  });

  // Also filter similar matches to exclude source retailer
  const competitorSimilarMatches = (graph.similarMatches || []).filter(match => {
    const matchRetailer = match.retailer || getRetailerFromUrl(match.url);
    return !isSourceRetailer(matchRetailer);
  });

  return (
    <div>
      {/* Match Method Summary */}
      {data?.matchMethod && (
        <div className="insight-card" style={{ marginBottom: "1rem", borderLeft: `3px solid ${getMatchTypeBadge(data.matchMethod).color}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ 
              background: getMatchTypeBadge(data.matchMethod).bg, 
              color: getMatchTypeBadge(data.matchMethod).color,
              padding: '0.35rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              {getMatchTypeBadge(data.matchMethod).label}
            </span>
            <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>
              {getMatchTypeBadge(data.matchMethod).desc}
            </span>
          </div>
        </div>
      )}

      <div className="insight-card" style={{ marginBottom: "1.5rem" }}>
        <h4>🎯 Competitive Graph</h4>
        <p style={{ color: "#1f2937", fontSize: "1.1rem" }}>{data?.competitorSummary}</p>
        {data?.matchingSummary && (
          <div style={{ marginTop: "0.75rem", padding: "0.75rem", background: "rgba(59, 130, 246, 0.1)", borderRadius: "8px", borderLeft: "3px solid #3b82f6" }}>
            <span style={{ color: data?.matchingSummary?.exactMatchesFound ? "#22c55e" : "#f59e0b", fontWeight: 600 }}>
              {data?.matchingSummary?.exactMatchesFound ? "✅ Exact matches found" : "⚠️ No exact matches at other retailers"}
            </span>
            <p style={{ color: "#6b7280", fontSize: "0.85rem", margin: "0.25rem 0 0" }}>
              {data?.matchingSummary?.exactMatchNote}
            </p>
          </div>
        )}
        {data?.pricePosition && (
          <div style={{ marginTop: "1rem" }}>
            <div className="metric-row">
              <span className="metric-label">Price Index vs Market</span>
              <span className={`metric-value ${data.pricePosition.priceIndex > 100 ? 'warning' : 'positive'}`}>
                {data.pricePosition.priceIndex} ({data.pricePosition.percentageDifference || data.pricePosition.interpretation})
              </span>
            </div>
            
            {/* Step-by-step calculation breakdown */}
            {data.pricePosition.calculation && (
              <div style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '8px',
                padding: '1rem',
                marginTop: '0.75rem'
              }}>
                <div style={{ 
                  fontWeight: 600, 
                  color: '#6366f1', 
                  fontSize: '0.85rem',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span>📊</span> How Price Index is Calculated
                </div>
                
                {/* Source Product Info */}
                {data.pricePosition.sourceProduct && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    padding: '0.5rem 0',
                    borderBottom: '1px dashed rgba(107, 114, 128, 0.3)'
                  }}>
                    <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Your Product ({data.pricePosition.sourceProduct.retailer})</span>
                    <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{data.pricePosition.sourceProduct.price}</span>
                  </div>
                )}
                
                {/* Reference Product Info */}
                {data.pricePosition.referenceProduct && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    padding: '0.5rem 0',
                    borderBottom: '1px dashed rgba(107, 114, 128, 0.3)'
                  }}>
                    <div>
                      <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Reference Price ({data.pricePosition.referenceProduct.retailer})</span>
                      <div style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        {data.pricePosition.referenceProduct.name}
                      </div>
                    </div>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>{data.pricePosition.referenceProduct.price}</span>
                  </div>
                )}
                
                {/* Calculation Steps */}
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ color: '#9ca3af', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Calculation Steps:</div>
                  <div style={{ 
                    background: 'rgba(0, 0, 0, 0.2)', 
                    borderRadius: '6px', 
                    padding: '0.75rem',
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    color: '#d1d5db'
                  }}>
                    {data.pricePosition.calculation.step1 && <div style={{ marginBottom: '0.25rem' }}>1️⃣ {data.pricePosition.calculation.step1}</div>}
                    {data.pricePosition.calculation.step2 && <div style={{ marginBottom: '0.25rem' }}>2️⃣ {data.pricePosition.calculation.step2}</div>}
                    {data.pricePosition.calculation.step3 && <div style={{ marginBottom: '0.25rem' }}>3️⃣ {data.pricePosition.calculation.step3}</div>}
                    {data.pricePosition.calculation.step4 && <div style={{ marginBottom: '0.25rem' }}>4️⃣ {data.pricePosition.calculation.step4}</div>}
                    {data.pricePosition.calculation.step5 && <div style={{ color: '#10b981', fontWeight: 600 }}>✅ {data.pricePosition.calculation.step5}</div>}
                  </div>
                </div>
                
                {/* Recommendation */}
                {data.pricePosition.recommendation && (
                  <div style={{ 
                    marginTop: '0.75rem',
                    padding: '0.5rem 0.75rem',
                    background: data.pricePosition.priceIndex > 100 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span>{data.pricePosition.priceIndex > 100 ? '💡' : '✅'}</span>
                    <span style={{ 
                      color: data.pricePosition.priceIndex > 100 ? '#f59e0b' : '#10b981', 
                      fontSize: '0.8rem' 
                    }}>
                      {data.pricePosition.recommendation}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {graph.exactMatches?.length > 0 ? (
        <>
          <p className="section-title">✅ Exact Matches (Same SKU at Other Retailers)</p>
          <div style={{ 
            background: 'rgba(245, 158, 11, 0.1)', 
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ fontSize: '1.2rem' }}>💡</span>
            <span style={{ color: '#f59e0b', fontSize: '0.85rem' }}>
              <strong>Note:</strong> Prices marked with ✓ are fetched live from retailer pages. Others are AI-estimated.
            </span>
          </div>
          <table className="competitor-table">
            <thead>
              <tr>
                <th>Retailer</th>
                <th>Price</th>
                <th>Match Type</th>
                <th>Confidence</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {graph.exactMatches.map((match, i) => {
                const badge = getMatchTypeBadge(match.matchType);
                return (
                  <tr key={i}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{match.retailer}</div>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280", maxWidth: "280px" }}>
                        {match.verifiedProductName || match.productName}
                      </div>
                    </td>
                    <td>
                      {match.priceVerified ? (
                        <>
                          <div style={{ 
                            color: match.priceConfidence === 'high' ? '#22c55e' : '#f59e0b', 
                            fontSize: '0.7rem', 
                            fontWeight: 600 
                          }}>
                            ✓ {match.priceConfidence === 'high' ? 'Live' : 'Extracted'}
                          </div>
                          <div style={{ 
                            fontWeight: 700, 
                            color: match.priceConfidence === 'high' ? '#22c55e' : '#f59e0b', 
                            fontSize: '1.1rem' 
                          }}>
                            {match.price}
                          </div>
                          {match.estimatedPrice && match.estimatedPrice !== match.price && (
                            <div style={{ fontSize: '0.65rem', color: '#6b7280', textDecoration: 'line-through' }}>
                              AI Est: {match.estimatedPrice}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div style={{ color: '#6b7280', fontSize: '0.7rem' }}>~AI Est.</div>
                          <div style={{ fontWeight: 600 }}>{match.price}</div>
                        </>
                      )}
                    </td>
                    <td>
                      <span style={{ 
                        background: badge.bg, 
                        color: badge.color,
                        padding: '0.25rem 0.5rem',
                        borderRadius: '12px',
                        fontSize: '0.7rem',
                        fontWeight: 600
                      }}>
                        {match.matchType || 'ATTRIBUTE'}
                      </span>
                    </td>
                    <td>
                      <span style={{ 
                        color: (match.matchConfidence || 0) >= 90 ? '#22c55e' : (match.matchConfidence || 0) >= 70 ? '#f59e0b' : '#ef4444',
                        fontWeight: 600
                      }}>
                        {match.matchConfidence}%
                      </span>
                      {match.embeddingSimilarity && (
                        <div style={{ fontSize: '0.7rem', color: '#a855f7' }}>
                          🧠 {(match.embeddingSimilarity * 100).toFixed(0)}% similar
                        </div>
                      )}
                    </td>
                    <td>
                        <a 
                          href={generateSearchUrl(match.retailer, match.searchTerms || `${match.brand || ''} ${match.model || ''} ${match.productName || match.product || ''}`.trim())}
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ 
                            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                            color: '#fff',
                            padding: '0.4rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                            display: 'inline-block',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          🔗 View on {match.retailer}
                        </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      ) : (
        <div className="insight-card" style={{ marginBottom: "1rem", borderLeft: "3px solid #f59e0b" }}>
          <p style={{ color: "#f59e0b", margin: 0 }}>
            ⚠️ No exact matches found at other major retailers. This product may be exclusive to {data?.matchingSummary?.bestAlternative ? `the original retailer. Best alternative: ${data.matchingSummary.bestAlternative}` : "this retailer."}
          </p>
        </div>
      )}

      {competitorSimilarMatches?.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <p className="section-title">🔄 Similar Products at Competitor Retailers</p>
          <div className="card-grid">
            {competitorSimilarMatches.map((match, i) => (
              <div key={i} className="insight-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0 }}>{match.product}</h4>
                  <span style={{ 
                    background: 'rgba(59, 130, 246, 0.15)', 
                    color: '#3b82f6',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '10px',
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                  }}>
                    {match.retailer || getRetailerFromUrl(match.url)}
                  </span>
                </div>
                <p><strong>Brand:</strong> {match.brand} | <strong>Price:</strong> {match.priceVerified ? <span style={{color: '#22c55e'}}>✓ {match.price}</span> : match.price}</p>
                <p style={{ color: "#f59e0b", fontSize: "0.85rem" }}>⚡ {match.differentiator}</p>
                <a 
                  href={generateSearchUrl(match.retailer, match.searchTerms || `${match.brand} ${match.model || ''} ${match.product}`.trim())}
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    color: '#3b82f6', 
                    fontSize: '0.9rem', 
                    display: 'inline-block', 
                    marginTop: '0.75rem',
                    padding: '0.5rem 1rem',
                    background: 'rgba(59, 130, 246, 0.15)',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontWeight: '500'
                  }}
                >
                  🔗 View on {match.retailer} →
                </a>
                <div style={{ marginTop: '0.5rem' }}>
                  <span style={{ color: "#6b7280", fontSize: "0.75rem" }}>Match Score: {match.matchScore}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {competitorSubstitutes?.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <p className="section-title">⚔️ Competing Products at Other Retailers</p>
          <p style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '-0.5rem', marginBottom: '1rem' }}>
            Similar products from competitor retailers (excluding {sourceRetailer})
          </p>
          <div className="card-grid">
            {competitorSubstitutes.map((sub, i) => {
              const badge = getMatchTypeBadge(sub.matchType);
              return (
                <div key={i} className="insight-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <h4 style={{ margin: 0 }}>{sub.product}</h4>
                    {sub.matchType && (
                      <span style={{ 
                        background: badge.bg, 
                        color: badge.color,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '10px',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                      }}>
                        {sub.matchType}
                      </span>
                    )}
                  </div>
                  <p>
                    <strong>Brand:</strong> {sub.brand} | <strong>Price:</strong>{' '}
                    {sub.priceVerified ? (
                      <span style={{ color: '#22c55e', fontWeight: 600 }}>✓ {sub.price}</span>
                    ) : (
                      <span>{sub.price} <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>(est.)</span></span>
                    )}
                  </p>
                  
                  {/* Match Confidence Display */}
                  {(sub.matchConfidence || sub.embeddingSimilarity) && (
                    <div style={{ 
                      display: 'flex', 
                      gap: '1rem', 
                      marginBottom: '0.5rem',
                      padding: '0.5rem',
                      background: 'rgba(59, 130, 246, 0.1)',
                      borderRadius: '6px'
                    }}>
                      {sub.matchConfidence && (
                        <div>
                          <span style={{ color: '#6b7280', fontSize: '0.7rem' }}>Confidence</span>
                          <div style={{ 
                            color: sub.matchConfidence >= 90 ? '#22c55e' : sub.matchConfidence >= 70 ? '#f59e0b' : '#ef4444',
                            fontWeight: 700,
                            fontSize: '1.1rem'
                          }}>
                            {sub.matchConfidence}%
                          </div>
                        </div>
                      )}
                      {sub.embeddingSimilarity && (
                        <div>
                          <span style={{ color: '#6b7280', fontSize: '0.7rem' }}>🧠 AI Similarity</span>
                          <div style={{ 
                            color: '#a855f7',
                            fontWeight: 700,
                            fontSize: '1.1rem'
                          }}>
                            {(sub.embeddingSimilarity * 100).toFixed(0)}%
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {sub.specsMatch && <p style={{ color: "#22c55e", fontSize: "0.85rem" }}>✅ {sub.specsMatch}</p>}
                  {sub.specsDiffer && <p style={{ color: "#f59e0b", fontSize: "0.85rem" }}>⚡ {sub.specsDiffer}</p>}
                  <p>{sub.whyCompetitor}</p>
                  <a 
                    href={generateSearchUrl(sub.retailer, sub.searchTerms || `${sub.brand} ${sub.model || ''} ${sub.product}`.trim())}
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                    color: '#3b82f6', 
                    fontSize: '0.9rem', 
                    display: 'inline-block', 
                    marginTop: '0.75rem',
                    padding: '0.5rem 1rem',
                    background: 'rgba(59, 130, 246, 0.15)',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontWeight: '500'
                  }}
                >
                  🔗 View on {sub.retailer} →
                </a>
                {sub.evidenceSource && (
                  <span style={{ color: '#6b7280', fontSize: '0.75rem', display: 'block', marginTop: '0.5rem' }}>
                    📊 Source: {sub.evidenceSource}
                  </span>
                )}
                <div style={{ marginTop: '0.5rem' }}>
                  <span className={`tag ${sub.threatLevel?.toLowerCase()}`}>{sub.threatLevel} Threat</span>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Promotions Section - Separated by Source vs Competitor */}
      {data?.categoryPromotions?.activeDeals?.length > 0 && (() => {
        const sourceDeals = data.categoryPromotions.activeDeals.filter(d => isSourceRetailer(d.retailer));
        const competitorDeals = data.categoryPromotions.activeDeals.filter(d => !isSourceRetailer(d.retailer));
        
        return (
          <>
            {/* Source Retailer Promotions */}
            {sourceDeals.length > 0 && (
              <div style={{ marginTop: "1.5rem" }}>
                <p className="section-title">🏪 {sourceRetailer || 'Source'} Promotions (Your Retailer)</p>
                <div style={{ 
                  background: 'rgba(59, 130, 246, 0.1)', 
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
                  <span style={{ color: '#3b82f6', fontSize: '0.85rem' }}>
                    <strong>Your Retailer:</strong> These are promotions from the source retailer you searched. Consider if price matching is needed.
                  </span>
                </div>
                <div className="card-grid">
                  {sourceDeals.map((deal, i) => (
                    <div key={i} className="insight-card" style={{ borderLeft: '3px solid #3b82f6' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <h4 style={{ margin: 0 }}>{deal.brand} - {deal.product}</h4>
                        <span style={{ 
                          background: 'rgba(59, 130, 246, 0.2)', 
                          color: '#3b82f6',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '10px',
                          fontSize: '0.7rem',
                          fontWeight: 600
                        }}>
                          {deal.discount}
                        </span>
                      </div>
                      <p style={{ margin: '0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ background: '#3b82f6', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem' }}>SOURCE</span>
                        {deal.retailer}
                      </p>
                      <div style={{ display: 'flex', gap: '1rem', margin: '0.5rem 0' }}>
                        <div>
                          <span style={{ color: '#6b7280', fontSize: '0.7rem' }}>Was</span>
                          <div style={{ color: '#6b7280', textDecoration: 'line-through' }}>{deal.originalPrice}</div>
                        </div>
                        <div>
                          <span style={{ color: '#3b82f6', fontSize: '0.7rem' }}>Now</span>
                          <div style={{ color: '#3b82f6', fontWeight: 700, fontSize: '1.1rem' }}>{deal.salePrice}</div>
                        </div>
                      </div>
                      <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: '0.5rem 0' }}>
                        <strong>Type:</strong> {deal.promoType}
                        {deal.validUntil && <span> • Ends: {deal.validUntil}</span>}
                      </p>
                      {deal.url && (
                        <a 
                          href={deal.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ 
                            color: '#3b82f6', 
                            fontSize: '0.85rem',
                            display: 'inline-block',
                            marginTop: '0.5rem',
                            padding: '0.4rem 0.75rem',
                            background: 'rgba(59, 130, 246, 0.1)',
                            borderRadius: '6px',
                            textDecoration: 'none'
                          }}
                        >
                          View Deal →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Competitor Promotions */}
            {competitorDeals.length > 0 && (
              <div style={{ marginTop: "1.5rem" }}>
                <p className="section-title">🏷️ Competitor Promotions & Discounts</p>
                <div style={{ 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                  <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>
                    <strong>Competitive Alert:</strong> These promotions from competitors could impact your sales.
                  </span>
                </div>
                <div className="card-grid">
                  {competitorDeals.map((deal, i) => (
                    <div key={i} className="insight-card" style={{ borderLeft: `3px solid ${deal.threatToSource === 'High' ? '#ef4444' : deal.threatToSource === 'Medium' ? '#f59e0b' : '#22c55e'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <h4 style={{ margin: 0 }}>{deal.brand} - {deal.product}</h4>
                        <span style={{ 
                          background: 'rgba(239, 68, 68, 0.2)', 
                          color: '#ef4444',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '10px',
                          fontSize: '0.7rem',
                          fontWeight: 600
                        }}>
                          {deal.discount}
                        </span>
                      </div>
                      <p style={{ margin: '0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ background: '#ef4444', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem' }}>COMPETITOR</span>
                        {deal.retailer}
                      </p>
                      <div style={{ display: 'flex', gap: '1rem', margin: '0.5rem 0' }}>
                        <div>
                          <span style={{ color: '#6b7280', fontSize: '0.7rem' }}>Was</span>
                          <div style={{ color: '#6b7280', textDecoration: 'line-through' }}>{deal.originalPrice}</div>
                        </div>
                        <div>
                          <span style={{ color: '#22c55e', fontSize: '0.7rem' }}>Now</span>
                          <div style={{ color: '#22c55e', fontWeight: 700, fontSize: '1.1rem' }}>{deal.salePrice}</div>
                        </div>
                      </div>
                      <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: '0.5rem 0' }}>
                        <strong>Type:</strong> {deal.promoType}
                        {deal.validUntil && <span> • Ends: {deal.validUntil}</span>}
                      </p>
                      {deal.url && (
                        <a 
                          href={deal.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ 
                            color: '#ef4444', 
                            fontSize: '0.85rem',
                            display: 'inline-block',
                            marginTop: '0.5rem',
                            padding: '0.4rem 0.75rem',
                            background: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: '6px',
                            textDecoration: 'none'
                          }}
                        >
                          View Deal →
                        </a>
                      )}
                      <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.9rem' }}>
                          {deal.threatToSource === 'High' ? '🔴' : deal.threatToSource === 'Medium' ? '🟡' : '🟢'}
                        </span>
                        <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>{deal.threatToSource} Threat</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Bundle Deals Section */}
      {data?.categoryPromotions?.bundleDeals?.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <p className="section-title">📦 Competitor Bundle Deals</p>
          <div className="card-grid">
            {data.categoryPromotions.bundleDeals.map((bundle, i) => (
              <div key={i} className="insight-card" style={{ borderLeft: '3px solid #3b82f6' }}>
                <h4>{bundle.bundle}</h4>
                <p><strong>At:</strong> {bundle.retailer}</p>
                <div className="metric-row">
                  <span className="metric-label">If Bought Separately</span>
                  <span style={{ color: '#6b7280', textDecoration: 'line-through' }}>{bundle.totalValue}</span>
                </div>
                <div className="metric-row">
                  <span className="metric-label">Bundle Price</span>
                  <span className="metric-value positive">{bundle.bundlePrice}</span>
                </div>
                <div className="metric-row">
                  <span className="metric-label">Savings</span>
                  <span className="metric-value positive">{bundle.savings}</span>
                </div>
                {bundle.url && (
                  <a 
                    href={bundle.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#3b82f6', fontSize: '0.85rem', marginTop: '0.5rem', display: 'inline-block' }}
                  >
                    View Bundle →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Promotions */}
      {data?.categoryPromotions?.upcomingPromos?.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <p className="section-title">📅 Upcoming Promotional Events</p>
          {data.categoryPromotions.upcomingPromos.map((promo, i) => (
            <div key={i} className="alert-card">
              <span className="alert-icon">📅</span>
              <div className="alert-content">
                <h4>{promo.event}</h4>
                <p><strong>Expected:</strong> {promo.expectedDate}</p>
                <p><strong>Typical Discounts:</strong> {promo.expectedDiscounts}</p>
                <div style={{ marginTop: '0.5rem' }}>
                  {promo.retailersParticipating?.map((retailer, j) => (
                    <span key={j} style={{ 
                      background: 'rgba(59, 130, 246, 0.15)', 
                      color: '#3b82f6',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '10px',
                      fontSize: '0.75rem',
                      marginRight: '0.5rem'
                    }}>
                      {retailer}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Signals Tab
function SignalsTab({ data }) {
  const signals = data?.competitorSignals || [];
  const threats = data?.topThreats || [];

  return (
    <div>
      <p className="section-title">🚨 Top Threats</p>
      {threats.map((threat, i) => (
        <div key={i} className="alert-card">
          <span className="alert-icon">⚠️</span>
          <div className="alert-content">
            <h4>{threat.threat}</h4>
            <p>Action: {threat.action}</p>
            <span className={`tag ${threat.urgency?.toLowerCase()}`}>{threat.urgency} Priority</span>
          </div>
        </div>
      ))}

      <p className="section-title" style={{ marginTop: "1.5rem" }}>📡 Competitor Signal Analysis</p>
      {signals.map((comp, i) => (
        <div key={i} className="insight-card" style={{ marginBottom: "1rem" }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🏢 {comp.competitor}
            {comp.competitorUrl && (
              <a 
                href={comp.competitorUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#3b82f6', fontSize: '0.75rem', fontWeight: 'normal' }}
              >
                View →
              </a>
            )}
          </h4>
          {comp.evidenceSource && (
            <span style={{ color: '#6b7280', fontSize: '0.75rem', display: 'block', marginBottom: '0.5rem' }}>
              📊 Data from: {comp.evidenceSource}
            </span>
          )}
          {comp.signals && (
            <div>
              <div className="metric-row">
                <span className="metric-label">Price Change Frequency</span>
                <span className="metric-value">{comp.signals.priceChangeFrequency?.value}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Review Velocity</span>
                <span className="metric-value">{comp.signals.reviewVelocity?.reviewsPerWeek}/week ({comp.signals.reviewVelocity?.trend})</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Rating Trend</span>
                <span className="metric-value">{comp.signals.ratingTrend?.current} ({comp.signals.ratingTrend?.trend})</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Content Score</span>
                <span className="metric-value">{comp.signals.contentCompleteness?.score}%</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Sentiment Tab
function SentimentTab({ data }) {
  const aspect = data?.aspectSentiment || {};
  const returnRisk = data?.returnRiskPrediction || {};
  const actions = data?.merchantActions || [];

  return (
    <div>
      <div className="pros-cons-grid">
        <div>
          <p className="section-title">✅ Top Pros (Customer Love)</p>
          <ul className="pros-list">
            {(aspect.topPros || []).map((pro, i) => (
              <li key={i}>
                <div className="aspect-name">{pro.aspect}</div>
                <div className="aspect-detail">{pro.percentMentions}% of reviews mention this • {pro.evidenceCount} mentions</div>
                {pro.customerQuote && <div className="aspect-detail" style={{ fontStyle: "italic", marginTop: "0.5rem" }}>"{pro.customerQuote}"</div>}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="section-title">❌ Top Cons (Pain Points)</p>
          <ul className="cons-list">
            {(aspect.topCons || []).map((con, i) => (
              <li key={i}>
                <div className="aspect-name">{con.aspect} <span className="tag high">{con.trend}</span></div>
                <div className="aspect-detail"><strong>Root Cause:</strong> {con.rootCause}</div>
                <div className="aspect-detail"><strong>PDP Fix:</strong> {con.pdpFix}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {returnRisk.riskLevel && (
        <div className="insight-card" style={{ marginTop: "1.5rem" }}>
          <h4>📦 Return Risk Prediction</h4>
          <div className="metric-row">
            <span className="metric-label">Risk Level</span>
            <span className={`metric-value ${returnRisk.riskLevel === 'High' ? 'negative' : returnRisk.riskLevel === 'Medium' ? 'warning' : 'positive'}`}>{returnRisk.riskLevel}</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Estimated Return Rate</span>
            <span className="metric-value">{returnRisk.estimatedReturnRate}</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Preventable Returns</span>
            <span className="metric-value positive">{returnRisk.reducibleReturns}</span>
          </div>
        </div>
      )}

      {actions.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <p className="section-title">🛠️ Merchant Actions</p>
          {actions.map((action, i) => (
            <div key={i} className="alert-card">
              <span className={`tag ${action.priority?.toLowerCase()}`}>{action.priority}</span>
              <div className="alert-content">
                <h4>{action.action}</h4>
                <p>Expected Impact: {action.expectedImpact} | Effort: {action.effort}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Opportunity Tab
function OpportunityTab({ data }) {
  const opp = data?.opportunityIndex || {};
  const components = opp.components || {};

  // Calculate step-by-step reasoning
  const getScoreReasoning = () => {
    const steps = [];
    let totalWeight = 0;
    let weightedSum = 0;

    const componentWeights = {
      pricingPower: { weight: 25, label: 'Pricing Power', icon: '💰' },
      demandStrength: { weight: 20, label: 'Demand Strength', icon: '📈' },
      competitivePosition: { weight: 20, label: 'Competitive Position', icon: '⚔️' },
      marginPotential: { weight: 15, label: 'Margin Potential', icon: '💵' },
      marketTiming: { weight: 10, label: 'Market Timing', icon: '⏰' },
      brandEquity: { weight: 10, label: 'Brand Equity', icon: '🏆' }
    };

    Object.entries(components).forEach(([key, val]) => {
      const config = componentWeights[key] || { weight: 15, label: key, icon: '📊' };
      const contribution = (val.score || 0) * (config.weight / 100);
      totalWeight += config.weight;
      weightedSum += contribution;
      
      steps.push({
        label: config.label,
        icon: config.icon,
        score: val.score || 0,
        weight: config.weight,
        contribution: contribution.toFixed(1),
        insight: val.insight,
        evidence: val.evidence || val.insight
      });
    });

    return { steps, finalScore: opp.score || Math.round(weightedSum) };
  };

  const reasoning = getScoreReasoning();

  return (
    <div>
      <div className="insight-card" style={{ marginBottom: "1.5rem", textAlign: "center" }}>
        <h4>Opportunity Index Score</h4>
        <div style={{ fontSize: "4rem", fontWeight: "700", color: "#3b82f6" }}>{opp.score || "—"}</div>
        <div style={{ color: "#6b7280" }}>Grade: <strong style={{ color: "#1f2937" }}>{opp.grade}</strong></div>
        <div style={{ color: "#3b82f6", marginTop: "0.5rem" }}>{opp.trend}</div>
      </div>

      {/* Step-by-Step Score Calculation */}
      <div className="insight-card" style={{ marginBottom: "1.5rem", background: "rgba(59, 130, 246, 0.05)", borderLeft: "3px solid #3b82f6" }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📐</span> How We Calculated This Score
        </h4>
        <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1rem' }}>
          The Opportunity Index is a weighted average of {reasoning.steps.length} key factors. Here's the breakdown:
        </p>
        
        <div style={{ background: '#f1f5f9', borderRadius: '8px', padding: '1rem' }}>
          {reasoning.steps.map((step, i) => (
            <div key={i} style={{ 
              padding: '0.75rem 0', 
              borderBottom: i < reasoning.steps.length - 1 ? '1px solid #e5e7eb' : 'none' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>{step.icon}</span>
                  <strong>{step.label}</strong>
                  <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>({step.weight}% weight)</span>
                </span>
                <span style={{ fontFamily: 'monospace', color: '#3b82f6' }}>
                  {step.score} × {step.weight}% = <strong>{step.contribution}</strong>
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginLeft: '1.75rem' }}>
                📄 {step.evidence}
              </div>
            </div>
          ))}
          
          <div style={{ 
            marginTop: '1rem', 
            paddingTop: '1rem', 
            borderTop: '2px solid rgba(59, 130, 246, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontWeight: 600 }}>Final Score (Sum of Contributions)</span>
            <span style={{ 
              fontSize: '1.5rem', 
              fontWeight: 700, 
              color: '#3b82f6',
              background: 'rgba(59, 130, 246, 0.15)',
              padding: '0.25rem 0.75rem',
              borderRadius: '8px'
            }}>
              {reasoning.finalScore}
            </span>
          </div>
        </div>
      </div>

      <p className="section-title">Score Components</p>
      {Object.entries(components).map(([key, val]) => (
        <div key={key} className="component-bar">
          <span className="component-label">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
          <div className="component-track">
            <div className="component-fill" style={{ width: `${val.score}%` }} />
          </div>
          <span className="component-score">{val.score}</span>
        </div>
      ))}

      {Object.entries(components).map(([key, val]) => (
        <div key={key} className="metric-row">
          <span className="metric-label">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
          <span className="metric-value">{val.insight}</span>
        </div>
      ))}
    </div>
  );
}

// Alerts Tab
function AlertsTab({ data }) {
  const alerts = data?.alerts || [];
  const digest = data?.weeklyDigest || {};

  const alertIcons = {
    price_drop: "💰",
    rating_spike: "⭐",
    oos_detection: "📦",
    stock_alert: "📦",
    competitive_threat: "⚔️",
    promotion_detected: "🏷️",
    default: "🔔"
  };

  const getRiskIcon = (level) => {
    const l = (level || '').toLowerCase();
    if (l === 'high' || l === 'critical') return '🔴';
    if (l === 'medium') return '🟡';
    return '🟢';
  };

  return (
    <div>
      {/* How Alerts Are Generated */}
      <div className="insight-card" style={{ marginBottom: "1.5rem", background: "rgba(59, 130, 246, 0.05)", borderLeft: "3px solid #3b82f6" }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📐</span> How We Generate Alerts
        </h4>
        <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
          Alerts are triggered based on real-time competitive intelligence analysis:
        </p>
        <ul style={{ color: '#6b7280', fontSize: '0.8rem', margin: 0, paddingLeft: '1.25rem' }}>
          <li><strong>Price Alerts:</strong> When competitor prices drop below your price by more than 5%</li>
          <li><strong>Stock Alerts:</strong> When competitors show low inventory or out-of-stock signals</li>
          <li><strong>Rating Alerts:</strong> When significant rating changes are detected (±0.3 stars)</li>
          <li><strong>Promotion Alerts:</strong> When competitors launch new deals or discounts</li>
        </ul>
      </div>

      <p className="section-title">🔔 Real-Time Alerts</p>
      {alerts.length === 0 ? (
        <div className="insight-card" style={{ textAlign: 'center', color: '#6b7280' }}>
          <span style={{ fontSize: '2rem' }}>✅</span>
          <p>No critical alerts at this time. Your competitive position is stable.</p>
        </div>
      ) : (
        alerts.map((alert, i) => (
          <div key={i} className="alert-card" style={{ borderLeft: `3px solid ${alert.severity === 'high' ? '#ef4444' : alert.severity === 'medium' ? '#f59e0b' : '#3b82f6'}` }}>
            <span className="alert-icon">{alertIcons[alert.type] || alertIcons.default}</span>
            <div className="alert-content">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span>{getRiskIcon(alert.severity)}</span>
                <h4 style={{ margin: 0 }}>{alert.message}</h4>
              </div>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>Action:</strong> {alert.action}
              </p>
              
              {/* Calculation/Reasoning */}
              {alert.calculation && (
                <div style={{ 
                  background: '#f1f5f9', 
                  borderRadius: '6px', 
                  padding: '0.5rem 0.75rem',
                  marginBottom: '0.5rem',
                  fontSize: '0.8rem'
                }}>
                  <strong style={{ color: '#3b82f6' }}>📊 How this was calculated:</strong>
                  <p style={{ margin: '0.25rem 0 0', color: '#6b7280' }}>{alert.calculation}</p>
                </div>
              )}
              
              {/* Reference Links */}
              {alert.referenceUrl && (
                <a 
                  href={alert.referenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    color: '#3b82f6', 
                    fontSize: '0.8rem', 
                    display: 'inline-block',
                    marginRight: '1rem',
                    padding: '0.25rem 0.5rem',
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '4px',
                    textDecoration: 'none'
                  }}
                >
                  🔗 View Source
                </a>
              )}
              
              <span className="alert-time">Detected {alert.detected}</span>
            </div>
          </div>
        ))
      )}

      {digest.topCompetitorThreats && (
        <div style={{ marginTop: "1.5rem" }}>
          <p className="section-title">⚔️ Competitor Threats</p>
          {digest.topCompetitorThreats.map((threat, i) => {
            // Generate a search URL if competitorUrl is not provided
            const getCompetitorSearchUrl = (competitorName) => {
              if (!competitorName) return null;
              const searchQuery = encodeURIComponent(competitorName);
              return `https://www.google.com/search?q=${searchQuery}`;
            };
            
            const threatUrl = threat.competitorUrl || threat.url || getCompetitorSearchUrl(threat.competitor);
            
            return (
            <div key={i} className="alert-card" style={{ borderLeft: `3px solid ${threat.urgency === 'High' ? '#ef4444' : threat.urgency === 'Medium' ? '#f59e0b' : '#3b82f6'}` }}>
              <span className="alert-icon">{getRiskIcon(threat.urgency)}</span>
              <div className="alert-content">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <h4 style={{ margin: 0 }}>🏢 {threat.competitor}</h4>
                </div>
                <p>{threat.threat}</p>
                
                {/* Calculation for threat */}
                {threat.calculation && (
                  <div style={{ 
                    background: '#f1f5f9', 
                    borderRadius: '6px', 
                    padding: '0.5rem 0.75rem',
                    marginBottom: '0.5rem',
                    fontSize: '0.8rem'
                  }}>
                    <strong style={{ color: '#3b82f6' }}>📊 Threat analysis:</strong>
                    <p style={{ margin: '0.25rem 0 0', color: '#6b7280' }}>{threat.calculation}</p>
                  </div>
                )}
                
                {threatUrl && (
                  <a 
                    href={threatUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                      color: '#3b82f6', 
                      fontSize: '0.8rem', 
                      display: 'inline-block',
                      marginRight: '1rem',
                      padding: '0.25rem 0.5rem',
                      background: 'rgba(59, 130, 246, 0.1)',
                      borderRadius: '4px',
                      textDecoration: 'none'
                    }}
                  >
                    🔗 View competitor listing
                  </a>
                )}
                {threat.evidenceSource && (
                  <span style={{ color: '#6b7280', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>
                    📊 Source: {threat.evidenceSource}
                  </span>
                )}
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>{getRiskIcon(threat.urgency)}</span>
                  <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>{threat.urgency} Priority</span>
                </div>
              </div>
            </div>
          );
          })}
        </div>
      )}

      {digest.marginOpportunities && (
        <div style={{ marginTop: "1.5rem" }}>
          <p className="section-title">💵 Margin Opportunities</p>
          {digest.marginOpportunities.map((opp, i) => (
            <div key={i} className="insight-card">
              <h4>{opp.opportunity}</h4>
              <div className="metric-row">
                <span className="metric-label">Potential Margin</span>
                <span className="metric-value">{opp.potentialMargin}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Risk</span>
                <span className={`metric-value ${opp.risk === 'Low' ? 'positive' : 'warning'}`}>{opp.risk}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Evidence Tab - Shows all research sources and evidence
function EvidenceTab({ data, trendsData }) {
  const links = data?.evidenceLinks || [];
  const preview = data?.weeklyReportPreview || {};
  const trendsSources = trendsData?.sources || trendsData?._groundingSources || [];
  const groundingSources = data?._groundingSources || [];
  
  // Combine all sources
  const allSources = [
    ...links.map(l => ({ ...l, type: 'competitive' })),
    ...trendsSources.map(s => ({ ...s, type: 'trends' })),
    ...groundingSources.map(s => ({ ...s, type: 'grounding' }))
  ];

  return (
    <div>
      {/* Trend Research Sources */}
      {trendsSources.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <p className="section-title">📈 Market Research Sources</p>
          <div className="card-grid">
            {trendsSources.map((source, i) => (
              <a 
                key={i} 
                href={source.url || source.sourceUrl || "#"} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="evidence-link"
                style={{ display: "block" }}
              >
                <span style={{ fontSize: "1.5rem" }}>📊</span>
                <div style={{ flex: 1 }}>
                  <div className="evidence-source">{source.title || source.source || "Market Research"}</div>
                  <div className="evidence-data">{source.type || "Industry Data"}</div>
                  {source.dateAccessed && (
                    <div className="evidence-fresh">Accessed: {source.dateAccessed}</div>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Competitive Evidence Links */}
      {links.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <p className="section-title">🔗 Competitive Evidence Links</p>
          {links.map((link, i) => (
            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="evidence-link">
              <span style={{ fontSize: "1.5rem" }}>🔗</span>
              <div style={{ flex: 1 }}>
                <div className="evidence-source">{link.source}</div>
                <div className="evidence-data">{link.dataPoint}</div>
                <div className="evidence-fresh">{link.freshness}</div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* AI Grounding Sources */}
      {groundingSources.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <p className="section-title">🤖 AI Research Sources (Google Search)</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {groundingSources.map((source, i) => (
              <a 
                key={i}
                href={source.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  background: "rgba(59, 130, 246, 0.1)", 
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "8px",
                  color: "#3b82f6",
                  fontSize: "0.8rem",
                  textDecoration: "none"
                }}
              >
                🔍 {source.title || "Web Source"}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {allSources.length === 0 && (
        <div className="insight-card" style={{ borderLeft: "3px solid #f59e0b", padding: "2rem", textAlign: "center" }}>
          <h4>📚 Evidence & Sources</h4>
          <p style={{ color: "#6b7280" }}>
            Sources and evidence links will appear here after running an analysis.
          </p>
          <p style={{ color: "#f59e0b", marginTop: "0.5rem" }}>
            Run a new product analysis to gather competitive intelligence with source citations.
          </p>
        </div>
      )}

      {preview.subject && (
        <div className="insight-card" style={{ marginTop: "1.5rem" }}>
          <h4>📧 Weekly Digest Preview</h4>
          <p><strong>Subject:</strong> {preview.subject}</p>
          <p><strong>Sections:</strong> {preview.sections?.join(" • ")}</p>
          {preview.keyMetrics && (
            <div style={{ marginTop: "1rem" }}>
              <div className="metric-row">
                <span className="metric-label">Opportunity Score</span>
                <span className="metric-value">{preview.keyMetrics.opportunityScore}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Competitor Threats</span>
                <span className="metric-value warning">{preview.keyMetrics.competitorThreats}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Price Position</span>
                <span className="metric-value">{preview.keyMetrics.pricePosition}</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Sentiment Trend</span>
                <span className="metric-value positive">{preview.keyMetrics.sentimentTrend}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Data Sources Info */}
      <div className="insight-card" style={{ marginTop: "1.5rem", borderLeft: "3px solid #3b82f6" }}>
        <h4>ℹ️ About Our Data Sources</h4>
        <p style={{ color: "#6b7280", fontSize: "0.9rem", lineHeight: "1.6" }}>
          MegaAgentAI gathers competitive intelligence from multiple sources:
        </p>
        <ul style={{ color: "#6b7280", fontSize: "0.85rem", paddingLeft: "1.25rem", marginTop: "0.5rem" }}>
          <li><strong>Retailer Pages:</strong> Live price and product data from Walmart, Amazon, Home Depot, Lowes</li>
          <li><strong>Market Research:</strong> Industry reports and trend analysis from Google Search grounding</li>
          <li><strong>Product Matching:</strong> UPC/GTIN verification and semantic AI matching</li>
          <li><strong>Review Analysis:</strong> Customer sentiment from verified purchase reviews</li>
        </ul>
      </div>
    </div>
  );
}

// Trends Tab - Product Sales Trends Analysis (Research-Driven)
function TrendsTab({ data, retailer }) {
  const trends = data?.salesTrends || {};
  const insight = data?.competitiveInsight || {};
  const sources = data?.sources || data?._groundingSources || [];

  // Check if we have any trends data
  const hasTrendsData = trends.trendingUp?.length > 0 || trends.trendingDown?.length > 0 || 
                        trends.emergingFeatures?.length > 0 || trends.consumerPreferences?.length > 0 ||
                        trends.marketInsight;

  if (!hasTrendsData) {
    return (
      <div>
        <div className="insight-card" style={{ borderLeft: "3px solid #f59e0b", padding: "2rem", textAlign: "center" }}>
          <h4>📈 Market Trend Analysis</h4>
          <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
            Trend data is being researched. This section shows real market trends from industry reports and sales data.
          </p>
          <p style={{ color: "#f59e0b" }}>
            Run a new analysis to fetch the latest market trend data from web research.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Google Trends Search Interest */}
      {(trends.searchInterest || trends.googleTrendsInsight) && (
        <div className="insight-card" style={{ marginBottom: "1.5rem", borderLeft: "3px solid #4285f4" }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📊</span> Google Trends Insights
          </h4>
          {trends.googleTrendsInsight && (
            <p style={{ color: "#1f2937", marginBottom: "0.75rem" }}>{trends.googleTrendsInsight}</p>
          )}
          {trends.searchInterest && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <div style={{ background: 'rgba(66, 133, 244, 0.1)', padding: '0.75rem', borderRadius: '8px' }}>
                <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>Search Interest</span>
                <div style={{ color: '#4285f4', fontWeight: 700, fontSize: '1.1rem' }}>{trends.searchInterest.currentInterest || 'N/A'}</div>
              </div>
              <div style={{ background: 'rgba(66, 133, 244, 0.1)', padding: '0.75rem', borderRadius: '8px' }}>
                <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>12-Month Trend</span>
                <div style={{ 
                  color: trends.searchInterest.trend?.toLowerCase().includes('rising') ? '#22c55e' : 
                         trends.searchInterest.trend?.toLowerCase().includes('declining') ? '#ef4444' : '#f59e0b',
                  fontWeight: 700, 
                  fontSize: '1.1rem' 
                }}>
                  {trends.searchInterest.trend?.toLowerCase().includes('rising') ? '📈' : 
                   trends.searchInterest.trend?.toLowerCase().includes('declining') ? '📉' : '➡️'} {trends.searchInterest.trend || 'N/A'}
                </div>
              </div>
              <div style={{ background: 'rgba(66, 133, 244, 0.1)', padding: '0.75rem', borderRadius: '8px' }}>
                <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>Peak Season</span>
                <div style={{ color: '#fff', fontWeight: 600 }}>{trends.searchInterest.peakSeason || 'N/A'}</div>
              </div>
            </div>
          )}
          {trends.searchInterest?.relatedRisingQueries?.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>Rising Search Queries: </span>
              {trends.searchInterest.relatedRisingQueries.map((q, i) => (
                <span key={i} style={{ 
                  background: 'rgba(66, 133, 244, 0.15)', 
                  color: '#4285f4',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  marginRight: '0.5rem',
                  display: 'inline-block',
                  marginTop: '0.25rem'
                }}>{q}</span>
              ))}
            </div>
          )}
          <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #e5e7eb' }}>
            <a 
              href={`https://trends.google.com/trends/explore?q=${encodeURIComponent(data?.salesTrends?.categoryTrend?.split(' ')[0] || 'product')}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#4285f4', fontSize: '0.8rem', textDecoration: 'none' }}
            >
              🔗 View on Google Trends →
            </a>
          </div>
        </div>
      )}

      {/* Market Overview */}
      <div className="insight-card" style={{ marginBottom: "1.5rem", borderLeft: "3px solid #22c55e" }}>
        <h4>📈 Category Market Analysis</h4>
        {trends.categoryTrend && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <span style={{ 
              background: trends.categoryTrend?.toLowerCase().includes('growing') ? 'rgba(34, 197, 94, 0.15)' : 
                         trends.categoryTrend?.toLowerCase().includes('declining') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: trends.categoryTrend?.toLowerCase().includes('growing') ? '#22c55e' : 
                     trends.categoryTrend?.toLowerCase().includes('declining') ? '#ef4444' : '#f59e0b',
              padding: '0.35rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              {trends.categoryTrend}
            </span>
          </div>
        )}
        {trends.marketInsight && (
          <p style={{ color: "#1f2937" }}>{trends.marketInsight}</p>
        )}
      </div>

      {/* Trending Up */}
      {trends.trendingUp?.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <p className="section-title">🔥 Trending Up (Growing Demand)</p>
          <div className="card-grid">
            {trends.trendingUp.map((item, i) => (
              <div key={i} className="insight-card" style={{ borderLeft: "3px solid #22c55e" }}>
                <h4 style={{ color: "#22c55e" }}>{item.trend || item.product || item.category}</h4>
                {(item.growthRate || item.growthIndicator) && (
                  <div className="metric-row">
                    <span className="metric-label">Growth</span>
                    <span className="metric-value positive">{item.growthRate || item.growthIndicator}</span>
                  </div>
                )}
                {(item.driver || item.reason) && (
                  <p style={{ color: "#6b7280", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                    <strong>Driver:</strong> {item.driver || item.reason}
                  </p>
                )}
                {(item.topProducts || item.relevantProducts)?.length > 0 && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <span style={{ color: "#6b7280", fontSize: "0.8rem" }}>Top Products: </span>
                    {(item.topProducts || item.relevantProducts).map((p, j) => (
                      <span key={j} style={{ 
                        background: "rgba(34, 197, 94, 0.1)", 
                        color: "#22c55e",
                        padding: "0.15rem 0.4rem",
                        borderRadius: "8px",
                        fontSize: "0.75rem",
                        marginRight: "0.25rem"
                      }}>{p}</span>
                    ))}
                  </div>
                )}
                {item.recommendation && (
                  <p style={{ color: "#3b82f6", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                    💡 {item.recommendation}
                  </p>
                )}
                {(item.source || item.sourceUrl) && (
                  <div style={{ marginTop: "0.5rem", paddingTop: "0.5rem", borderTop: "1px solid #e5e7eb" }}>
                    <a 
                      href={item.sourceUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#6b7280", fontSize: "0.75rem", textDecoration: "none" }}
                    >
                      📊 Source: {item.source || "Market Research"} →
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trending Down */}
      {trends.trendingDown?.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <p className="section-title">📉 Trending Down (Declining Demand)</p>
          <div className="card-grid">
            {trends.trendingDown.map((item, i) => (
              <div key={i} className="insight-card" style={{ borderLeft: "3px solid #ef4444" }}>
                <h4 style={{ color: "#ef4444" }}>{item.trend || item.product || item.category}</h4>
                {(item.declineRate || item.declineIndicator) && (
                  <div className="metric-row">
                    <span className="metric-label">Decline</span>
                    <span className="metric-value negative">{item.declineRate || item.declineIndicator}</span>
                  </div>
                )}
                {item.reason && (
                  <p style={{ color: "#6b7280", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                    <strong>Reason:</strong> {item.reason}
                  </p>
                )}
                {item.affectedBrands?.length > 0 && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <span style={{ color: "#6b7280", fontSize: "0.8rem" }}>Affected: </span>
                    {item.affectedBrands.map((b, j) => (
                      <span key={j} style={{ 
                        background: "rgba(239, 68, 68, 0.1)", 
                        color: "#ef4444",
                        padding: "0.15rem 0.4rem",
                        borderRadius: "8px",
                        fontSize: "0.75rem",
                        marginRight: "0.25rem"
                      }}>{b}</span>
                    ))}
                  </div>
                )}
                {(item.source || item.sourceUrl) && (
                  <a 
                    href={item.sourceUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#6b7280", fontSize: "0.75rem", textDecoration: "none", marginTop: "0.5rem", display: "block" }}
                  >
                    📊 Source: {item.source || "Market Research"} →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emerging Features */}
      {trends.emergingFeatures?.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <p className="section-title">⚡ Emerging Features (Innovation Drivers)</p>
          <div className="card-grid">
            {trends.emergingFeatures.map((feature, i) => {
              const featureData = typeof feature === 'string' ? { feature } : feature;
              return (
                <div key={i} className="insight-card" style={{ borderLeft: "3px solid #3b82f6" }}>
                  <h4 style={{ color: "#3b82f6" }}>✨ {featureData.feature}</h4>
                  {featureData.demandLevel && (
                    <div className="metric-row">
                      <span className="metric-label">Demand Level</span>
                      <span className={`metric-value ${featureData.demandLevel === 'High' ? 'positive' : 'warning'}`}>
                        {featureData.demandLevel}
                      </span>
                    </div>
                  )}
                  {featureData.examples?.length > 0 && (
                    <div style={{ marginTop: "0.5rem" }}>
                      <span style={{ color: "#6b7280", fontSize: "0.8rem" }}>Examples: </span>
                      {featureData.examples.map((ex, j) => (
                        <span key={j} style={{ 
                          background: "rgba(59, 130, 246, 0.1)", 
                          color: "#3b82f6",
                          padding: "0.15rem 0.4rem",
                          borderRadius: "8px",
                          fontSize: "0.75rem",
                          marginRight: "0.25rem"
                        }}>{ex}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Consumer Preferences */}
      {trends.consumerPreferences?.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <p className="section-title">👥 Consumer Preferences</p>
          <div className="card-grid">
            {trends.consumerPreferences.map((pref, i) => (
              <div key={i} className="insight-card">
                <h4>{pref.preference || pref.segment}</h4>
                {pref.percentage && (
                  <div className="component-bar">
                    <div className="component-track">
                      <div 
                        className="component-fill" 
                        style={{ width: `${parseInt(pref.percentage) || 50}%` }}
                      ></div>
                    </div>
                    <span className="component-score">{pref.percentage}</span>
                  </div>
                )}
                {pref.insight && (
                  <p style={{ color: "#6b7280", fontSize: "0.85rem" }}>{pref.insight}</p>
                )}
                {pref.source && (
                  <span style={{ color: "#666", fontSize: "0.7rem" }}>Source: {pref.source}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Competitive Insight Summary */}
      {(insight.retailerPosition || insight.categoryLeader || insight.strategicRecommendation) && (
        <div className="insight-card" style={{ marginTop: "1.5rem", borderLeft: "3px solid #3b82f6" }}>
          <h4>🎯 Market Position Insight</h4>
          {insight.categoryLeader && (
            <p style={{ color: "#1f2937", marginBottom: "0.5rem" }}>
              <strong>Category Leader:</strong> {insight.categoryLeader}
            </p>
          )}
          {insight.retailerPosition && (
            <p style={{ color: "#1f2937" }}>{insight.retailerPosition}</p>
          )}
          {insight.marketShare && (
            <p style={{ color: "#6b7280", marginTop: "0.5rem" }}>
              <strong>Market Share:</strong> {insight.marketShare}
            </p>
          )}
          {insight.strategicRecommendation && (
            <div style={{ marginTop: "1rem", padding: "1rem", background: "rgba(59, 130, 246, 0.1)", borderRadius: "8px" }}>
              <strong style={{ color: "#3b82f6" }}>Strategic Recommendation:</strong>
              <p style={{ color: "#1f2937", marginTop: "0.5rem" }}>{insight.strategicRecommendation}</p>
            </div>
          )}
        </div>
      )}

      {/* Sources Section */}
      {sources.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <p className="section-title">📚 Research Sources</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {sources.map((source, i) => (
              <a 
                key={i}
                href={source.url || source.sourceUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  background: "#f8fafc", 
                  border: "1px solid #e5e7eb",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "8px",
                  color: "#6b7280",
                  fontSize: "0.8rem",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}
              >
                🔗 {source.title || source.type || "Source"}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Gaps Tab - Assortment Gaps Analysis (Research-Driven)
function GapsTab({ data, retailer }) {
  const gaps = data?.assortmentGaps || {};
  const insight = data?.competitiveInsight || {};
  const sources = data?.sources || data?._groundingSources || [];

  const retailerName = gaps.retailerAnalyzed || retailer || "This Retailer";

  // Check if we have any gaps data
  const hasGapsData = gaps.missingFromRetailer?.length > 0 || gaps.newModelsNotStocked?.length > 0 || 
                      gaps.competitorExclusives?.length > 0 || gaps.recommendedAdditions?.length > 0;

  if (!hasGapsData) {
    return (
      <div>
        <div className="insight-card" style={{ borderLeft: "3px solid #f59e0b", padding: "2rem", textAlign: "center" }}>
          <h4>🔍 Assortment Gap Analysis</h4>
          <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
            Gap analysis compares {retailerName}'s product selection against competitors like Home Depot, Lowes, and Amazon.
          </p>
          <p style={{ color: "#f59e0b" }}>
            Run a new analysis to identify specific products missing from {retailerName}'s assortment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="insight-card" style={{ marginBottom: "1.5rem", borderLeft: "3px solid #f59e0b" }}>
        <h4>🔍 Assortment Gap Analysis for {retailerName}</h4>
        {gaps.analysisMethod && (
          <p style={{ color: "#6b7280" }}>{gaps.analysisMethod}</p>
        )}
        {!gaps.analysisMethod && (
          <p style={{ color: "#6b7280" }}>
            Products and variants available at competitors but missing at {retailerName}
          </p>
        )}
      </div>

      {/* Missing from Retailer */}
      {gaps.missingFromRetailer?.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <p className="section-title">❌ Missing Products (Available at Competitors)</p>
          <div className="card-grid">
            {gaps.missingFromRetailer.map((item, i) => (
              <div key={i} className="insight-card" style={{ borderLeft: "3px solid #ef4444" }}>
                <h4>{item.product}</h4>
                <p><strong>Brand:</strong> {item.brand}</p>
                {item.price && (
                  <p><strong>Price:</strong> <span style={{ color: "#22c55e" }}>{item.price}</span></p>
                )}
                <div style={{ marginTop: "0.5rem" }}>
                  <span style={{ color: "#6b7280", fontSize: "0.8rem" }}>Available at: </span>
                  {(Array.isArray(item.availableAt) ? item.availableAt : [item.availableAt || item.competitor]).map((retailer, j) => (
                    <span key={j} style={{ 
                      background: "rgba(34, 197, 94, 0.15)", 
                      color: "#22c55e",
                      padding: "0.2rem 0.5rem",
                      borderRadius: "10px",
                      fontSize: "0.75rem",
                      marginRight: "0.25rem"
                    }}>
                      {retailer}
                    </span>
                  ))}
                </div>
                {item.whyPopular && (
                  <p style={{ color: "#6b7280", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                    <strong>Why Popular:</strong> {item.whyPopular}
                  </p>
                )}
                {(item.demandLevel || item.demandIndicator) && (
                  <div className="metric-row" style={{ marginTop: "0.5rem" }}>
                    <span className="metric-label">Demand</span>
                    <span className={`metric-value ${item.demandLevel === 'High' ? 'positive' : 'warning'}`}>
                      {item.demandLevel || item.demandIndicator}
                    </span>
                  </div>
                )}
                {item.impact && (
                  <p style={{ color: "#f59e0b", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                    💰 {item.impact}
                  </p>
                )}
                {(item.competitorUrl || item.searchUrl) && (
                  <a 
                    href={item.competitorUrl || item.searchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ 
                      color: "#3b82f6", 
                      fontSize: "0.85rem",
                      display: "inline-block",
                      marginTop: "0.75rem",
                      padding: "0.4rem 0.75rem",
                      background: "rgba(59, 130, 246, 0.1)",
                      borderRadius: "6px",
                      textDecoration: "none"
                    }}
                  >
                    View at Competitor →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Models Not Stocked */}
      {gaps.newModelsNotStocked?.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <p className="section-title">🆕 New Models Not Stocked (2024-2025 Releases)</p>
          <div className="card-grid">
            {gaps.newModelsNotStocked.map((item, i) => (
              <div key={i} className="insight-card" style={{ borderLeft: "3px solid #3b82f6" }}>
                <h4>{item.product || item.model}</h4>
                <p><strong>Brand:</strong> {item.brand}</p>
                {item.launchDate && (
                  <p style={{ color: "#3b82f6", fontSize: "0.85rem" }}>
                    📅 Launched: {item.launchDate}
                  </p>
                )}
                {(item.keyFeatures || item.features) && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <span style={{ color: "#6b7280", fontSize: "0.8rem" }}>Features: </span>
                    {(item.keyFeatures || item.features || []).map((f, j) => (
                      <span key={j} style={{ 
                        background: "rgba(59, 130, 246, 0.1)", 
                        color: "#3b82f6",
                        padding: "0.15rem 0.4rem",
                        borderRadius: "8px",
                        fontSize: "0.75rem",
                        marginRight: "0.25rem"
                      }}>{f}</span>
                    ))}
                  </div>
                )}
                {item.availableAt && (
                  <p style={{ color: "#6b7280", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                    Available at: {Array.isArray(item.availableAt) ? item.availableAt.join(", ") : item.availableAt}
                  </p>
                )}
                {(item.url || item.competitorUrl) && (
                  <a 
                    href={item.url || item.competitorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ 
                      color: "#3b82f6", 
                      fontSize: "0.85rem",
                      display: "inline-block",
                      marginTop: "0.5rem"
                    }}
                  >
                    View Product →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Competitor Exclusives */}
      {gaps.competitorExclusives?.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <p className="section-title">🔒 Competitor Exclusives (Brands/Products You Can't Get)</p>
          <div className="card-grid">
            {gaps.competitorExclusives.map((item, i) => (
              <div key={i} className="insight-card" style={{ borderLeft: "3px solid #ef4444" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <h4>{item.product}</h4>
                  <span style={{ 
                    background: "rgba(239, 68, 68, 0.15)", 
                    color: "#ef4444",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "10px",
                    fontSize: "0.7rem",
                    fontWeight: 600
                  }}>
                    {item.exclusiveTo || item.retailer} Only
                  </span>
                </div>
                <p><strong>Brand:</strong> {item.brand}</p>
                {item.price && <p><strong>Price:</strong> {item.price}</p>}
                {(item.threatLevel || item.marketShare) && (
                  <div className="metric-row" style={{ marginTop: "0.5rem" }}>
                    <span className="metric-label">{item.marketShare ? "Market Share" : "Threat Level"}</span>
                    <span className={`metric-value ${item.threatLevel === 'High' ? 'negative' : 'warning'}`}>
                      {item.marketShare || item.threatLevel}
                    </span>
                  </div>
                )}
                {item.url && (
                  <a 
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#ef4444", fontSize: "0.85rem", marginTop: "0.5rem", display: "inline-block" }}
                  >
                    View at {item.exclusiveTo || "Competitor"} →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Additions */}
      {gaps.recommendedAdditions?.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <p className="section-title">💡 Recommended Additions for {retailerName}</p>
          {gaps.recommendedAdditions.map((item, i) => {
            // Handle both string and object formats
            const itemData = typeof item === 'string' ? { product: item } : item;
            return (
              <div key={i} className="alert-card">
                <span className="alert-icon">💡</span>
                <div className="alert-content">
                  <h4>{itemData.product || itemData.recommendation}</h4>
                  {itemData.brand && <p><strong>Brand:</strong> {itemData.brand}</p>}
                  {itemData.reason && <p>{itemData.reason}</p>}
                  <div style={{ marginTop: "0.5rem" }}>
                    {itemData.estimatedRevenue && (
                      <span className="tag positive">Revenue: {itemData.estimatedRevenue}</span>
                    )}
                    {itemData.potentialRevenue && (
                      <span className="tag positive">Potential: {itemData.potentialRevenue}</span>
                    )}
                    {itemData.priority && (
                      <span className={`tag ${itemData.priority?.toLowerCase()}`} style={{ marginLeft: "0.5rem" }}>
                        {itemData.priority} Priority
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Gap Summary / Competitive Insight */}
      {(insight.keyGaps || insight.assortmentSummary || insight.opportunityCost) && (
        <div className="insight-card" style={{ marginTop: "1.5rem", borderLeft: "3px solid #3b82f6" }}>
          <h4>📊 Assortment Gap Summary</h4>
          {insight.keyGaps && (
            <p style={{ color: "#1f2937", marginBottom: "0.5rem" }}>
              <strong>Key Gaps:</strong> {insight.keyGaps}
            </p>
          )}
          {insight.assortmentSummary && (
            <p style={{ color: "#1f2937" }}>{insight.assortmentSummary}</p>
          )}
          {insight.opportunityCost && (
            <div className="metric-row" style={{ marginTop: "1rem" }}>
              <span className="metric-label">Estimated Opportunity Cost</span>
              <span className="metric-value negative">{insight.opportunityCost}</span>
            </div>
          )}
        </div>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <p className="section-title">📚 Research Sources</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {sources.map((source, i) => (
              <a 
                key={i}
                href={source.url || source.sourceUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  background: "#f8fafc", 
                  border: "1px solid #e5e7eb",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "8px",
                  color: "#6b7280",
                  fontSize: "0.8rem",
                  textDecoration: "none"
                }}
              >
                🔗 {source.title || source.type || "Source"}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
