import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { analyzeSellerStore, analyzeFromHtml } from '../services/sellerAnalysisService';
import '../styles/theme.css';

const SellerAnalysis = () => {
  const [sellerUrl, setSellerUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ stage: '', message: '', progress: 0 });
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});
  const [showHtmlInput, setShowHtmlInput] = useState(false);
  const [pastedHtml, setPastedHtml] = useState('');

  const handleAnalyze = useCallback(async () => {
    if (!sellerUrl.trim()) {
      setError('Please enter a seller store URL');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResults(null);
    setProgress({ stage: 'starting', message: 'Starting seller analysis...', progress: 0 });

    try {
      const data = await analyzeSellerStore(sellerUrl, (progressUpdate) => {
        setProgress(progressUpdate);
      });
      setResults(data);
    } catch (err) {
      setError(err.message || 'Failed to analyze seller store');
      console.error('Seller analysis error:', err);
      // Show HTML input option on error
      setShowHtmlInput(true);
    } finally {
      setIsAnalyzing(false);
    }
  }, [sellerUrl]);

  const handleAnalyzeHtml = useCallback(async () => {
    if (!pastedHtml.trim()) {
      setError('Please paste the HTML content');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResults(null);
    setProgress({ stage: 'starting', message: 'Analyzing pasted HTML...', progress: 0 });

    try {
      const data = await analyzeFromHtml(pastedHtml, sellerUrl, (progressUpdate) => {
        setProgress(progressUpdate);
      });
      setResults(data);
      setShowHtmlInput(false);
    } catch (err) {
      setError(err.message || 'Failed to analyze HTML');
      console.error('HTML analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [pastedHtml, sellerUrl]);

  const toggleExpand = (index) => {
    setExpandedItems(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const getOfferDensityBadge = (density) => {
    if (density >= 10) return { color: '#ef4444', label: 'High Competition', icon: '🔥' };
    if (density >= 5) return { color: '#f59e0b', label: 'Moderate', icon: '⚡' };
    return { color: '#10b981', label: 'Low Competition', icon: '✅' };
  };

  const getBestOfferBadge = (hasBestOffer) => {
    if (hasBestOffer) return { color: '#10b981', label: 'Best Price', icon: '👑' };
    return { color: '#ef4444', label: 'Not Best Price', icon: '⚠️' };
  };

  const getIncrementalBadge = (isIncremental) => {
    if (isIncremental) return { color: '#8b5cf6', label: 'Unique to Seller', icon: '💎' };
    return { color: '#6b7280', label: 'Available Elsewhere', icon: '📦' };
  };

  const getSentimentBadge = (sentiment) => {
    if (sentiment >= 4.0) return { color: '#10b981', label: 'Excellent', icon: '⭐' };
    if (sentiment >= 3.5) return { color: '#22c55e', label: 'Good', icon: '👍' };
    if (sentiment >= 3.0) return { color: '#f59e0b', label: 'Mixed', icon: '😐' };
    return { color: '#ef4444', label: 'Poor', icon: '👎' };
  };

  return (
    <div className="seller-analysis-page" style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      padding: '2rem',
      color: '#e5e7eb'
    }}>
      {/* Header */}
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Navigation */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '2rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid rgba(99, 102, 241, 0.2)'
        }}>
          <Link to="/" style={{
            color: '#60a5fa',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.9rem'
          }}>
            ← Back to Home
          </Link>
          <div style={{ 
            padding: '0.5rem 1rem',
            background: 'rgba(99, 102, 241, 0.2)',
            borderRadius: '20px',
            fontSize: '0.8rem',
            color: '#a78bfa'
          }}>
            🧪 Beta Feature
          </div>
        </div>
        
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 700, 
            background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem'
          }}>
            🏪 Seller Store Analysis
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '1rem' }}>
            Analyze 3rd party seller catalogs to find competitive opportunities
          </p>
        </div>

        {/* Input Section */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.8)',
          borderRadius: '16px',
          padding: '1.5rem',
          marginBottom: '2rem',
          border: '1px solid rgba(99, 102, 241, 0.2)'
        }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#9ca3af', fontSize: '0.9rem' }}>
            Enter Seller Store URL (Amazon, Walmart Marketplace, etc.)
          </label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <input
              type="url"
              value={sellerUrl}
              onChange={(e) => setSellerUrl(e.target.value)}
              placeholder="https://www.amazon.com/sp?seller=XXXXXX or brand store URL"
              style={{
                flex: 1,
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                background: 'rgba(15, 23, 42, 0.8)',
                color: '#e5e7eb',
                fontSize: '1rem'
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            />
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              style={{
                padding: '1rem 2rem',
                borderRadius: '8px',
                border: 'none',
                background: isAnalyzing 
                  ? 'rgba(99, 102, 241, 0.5)' 
                  : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                fontWeight: 600,
                cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s'
              }}
            >
              {isAnalyzing ? (
                <>
                  <span className="spinner" style={{ 
                    width: '16px', 
                    height: '16px', 
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></span>
                  Analyzing...
                </>
              ) : (
                <>🔍 Analyze Seller</>
              )}
            </button>
          </div>

          {/* Example URLs */}
          <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#6b7280' }}>
            <span>Examples: </span>
            <button 
              onClick={() => setSellerUrl('https://www.amazon.com/sp?ie=UTF8&seller=ASSKFE9KVAV03')}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#60a5fa', 
                cursor: 'pointer',
                textDecoration: 'underline',
                marginRight: '1rem'
              }}
            >
              Amazon Seller Page
            </button>
            <button 
              onClick={() => setSellerUrl('https://www.amazon.com/stores/page/XXXXXXXX')}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#60a5fa', 
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Amazon Brand Store
            </button>
          </div>
        </div>

        {/* Progress Section */}
        {isAnalyzing && (
          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '2rem',
            border: '1px solid rgba(99, 102, 241, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pulse 2s infinite'
              }}>
                🔄
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{progress.stage}</div>
                <div style={{ color: '#9ca3af', fontSize: '0.9rem' }}>{progress.message}</div>
              </div>
            </div>
            <div style={{ 
              height: '8px', 
              background: 'rgba(99, 102, 241, 0.2)', 
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${progress.progress}%`,
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                borderRadius: '4px',
                transition: 'width 0.3s ease'
              }}></div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1rem',
            color: '#ef4444'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* HTML Paste Fallback Option */}
        {(showHtmlInput || error) && !results && (
          <div style={{
            background: 'rgba(30, 41, 59, 0.8)',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '2rem',
            border: '1px solid rgba(245, 158, 11, 0.3)'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              marginBottom: '1rem'
            }}>
              <span style={{ fontSize: '1.5rem' }}>📋</span>
              <div>
                <h3 style={{ margin: 0, color: '#f59e0b', fontSize: '1.1rem' }}>
                  Alternative: Paste Page HTML
                </h3>
                <p style={{ margin: '0.25rem 0 0', color: '#9ca3af', fontSize: '0.85rem' }}>
                  Amazon is blocking automated requests. You can manually copy the page source.
                </p>
              </div>
            </div>

            <div style={{
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <h4 style={{ color: '#e5e7eb', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                📌 How to get the HTML:
              </h4>
              <ol style={{ color: '#9ca3af', fontSize: '0.85rem', margin: 0, paddingLeft: '1.25rem', lineHeight: '1.8' }}>
                <li>Open the seller page in your browser: <a href={sellerUrl || 'https://www.amazon.com/s?me=ASSKFE9KVAV03'} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa' }}>{sellerUrl || 'Seller URL'}</a></li>
                <li>Right-click anywhere on the page and select <strong style={{ color: '#e5e7eb' }}>"View Page Source"</strong> (or press Ctrl+U / Cmd+Option+U)</li>
                <li>Press <strong style={{ color: '#e5e7eb' }}>Ctrl+A</strong> to select all, then <strong style={{ color: '#e5e7eb' }}>Ctrl+C</strong> to copy</li>
                <li>Paste the HTML below</li>
              </ol>
            </div>

            <textarea
              value={pastedHtml}
              onChange={(e) => setPastedHtml(e.target.value)}
              placeholder="Paste the full HTML source code here..."
              style={{
                width: '100%',
                minHeight: '150px',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                background: 'rgba(15, 23, 42, 0.8)',
                color: '#e5e7eb',
                fontSize: '0.85rem',
                fontFamily: 'monospace',
                resize: 'vertical'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
              <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                {pastedHtml.length > 0 ? `${(pastedHtml.length / 1024).toFixed(1)} KB pasted` : 'Waiting for HTML...'}
              </span>
              <button
                onClick={handleAnalyzeHtml}
                disabled={isAnalyzing || pastedHtml.length < 1000}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: pastedHtml.length >= 1000 
                    ? 'linear-gradient(135deg, #f59e0b, #d97706)' 
                    : 'rgba(107, 114, 128, 0.5)',
                  color: 'white',
                  fontWeight: 600,
                  cursor: pastedHtml.length >= 1000 ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                📊 Analyze Pasted HTML
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {results && (
          <div>
            {/* Data Source Indicator */}
            {results.sellerInfo?.dataSource && (
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
                <span>ℹ️</span>
                <span style={{ color: '#f59e0b', fontSize: '0.85rem' }}>
                  Data Source: {results.sellerInfo.dataSource}
                </span>
              </div>
            )}
            
            {/* Summary Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '12px',
                padding: '1.25rem',
                border: '1px solid rgba(99, 102, 241, 0.2)'
              }}>
                <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  Seller Name
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#60a5fa' }}>
                  {results.sellerInfo?.name || 'Unknown'}
                </div>
              </div>
              <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '12px',
                padding: '1.25rem',
                border: '1px solid rgba(99, 102, 241, 0.2)'
              }}>
                <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  📄 Pages Scanned
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#60a5fa' }}>
                  {results.summary?.pagesScanned || results.sellerInfo?.pagesScanned || 1}
                </div>
              </div>
              <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '12px',
                padding: '1.25rem',
                border: '1px solid rgba(99, 102, 241, 0.2)'
              }}>
                <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  📦 Total Products Found
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#a78bfa' }}>
                  {results.summary?.totalProductsFound || results.allProducts?.length || results.products?.length || 0}
                </div>
              </div>
              <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '12px',
                padding: '1.25rem',
                border: '1px solid rgba(99, 102, 241, 0.2)'
              }}>
                <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  🔬 Products Analyzed
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#a78bfa' }}>
                  {results.summary?.totalProductsAnalyzed || results.products?.length || 0}
                </div>
              </div>
              <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '12px',
                padding: '1.25rem',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  💡 Opportunities
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>
                  {results.opportunities?.length || 0}
                </div>
              </div>
              <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                borderRadius: '12px',
                padding: '1.25rem',
                border: '1px solid rgba(139, 92, 246, 0.3)'
              }}>
                <div style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                  💎 Incremental Items
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8b5cf6' }}>
                  {results.summary?.incrementalCount || results.products?.filter(p => p.isIncremental).length || 0}
                </div>
              </div>
            </div>

            {/* Opportunities Section */}
            {results.opportunities?.length > 0 && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                borderRadius: '16px',
                padding: '1.5rem',
                marginBottom: '2rem',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                <h2 style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: 600, 
                  color: '#10b981',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  💡 Key Opportunities
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {results.opportunities.map((opp, i) => (
                    <div key={i} style={{
                      background: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: '8px',
                      padding: '1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#e5e7eb' }}>{opp.product}</div>
                        <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{opp.reason}</div>
                      </div>
                      <div style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '20px',
                        background: opp.priority === 'high' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: opp.priority === 'high' ? '#ef4444' : '#f59e0b',
                        fontSize: '0.8rem',
                        fontWeight: 600
                      }}>
                        {opp.priority === 'high' ? '🔥 High Priority' : '⚡ Medium Priority'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Products Table */}
            <div style={{
              background: 'rgba(30, 41, 59, 0.8)',
              borderRadius: '16px',
              padding: '1.5rem',
              border: '1px solid rgba(99, 102, 241, 0.2)'
            }}>
              <h2 style={{ 
                fontSize: '1.25rem', 
                fontWeight: 600, 
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                📦 Product Catalog Analysis
              </h2>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  fontSize: '0.9rem'
                }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(99, 102, 241, 0.2)' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', color: '#9ca3af', fontWeight: 500 }}>Product</th>
                      <th style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af', fontWeight: 500 }}>Price</th>
                      <th style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af', fontWeight: 500 }}>Offer Density</th>
                      <th style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af', fontWeight: 500 }}>Best Offer?</th>
                      <th style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af', fontWeight: 500 }}>Incremental?</th>
                      <th style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af', fontWeight: 500 }}>Sentiment</th>
                      <th style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af', fontWeight: 500 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.products?.map((product, index) => {
                      const densityBadge = getOfferDensityBadge(product.offerDensity);
                      const bestOfferBadge = getBestOfferBadge(product.hasBestOffer);
                      const incrementalBadge = getIncrementalBadge(product.isIncremental);
                      const sentimentBadge = getSentimentBadge(product.sentiment?.score);
                      
                      return (
                        <React.Fragment key={index}>
                          <tr style={{ 
                            borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
                            background: expandedItems[index] ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
                          }}>
                            <td style={{ padding: '1rem' }}>
                              <div style={{ fontWeight: 600, color: '#e5e7eb', marginBottom: '0.25rem' }}>
                                {product.name}
                              </div>
                              <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                                {product.brand} • {product.category}
                              </div>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              <div style={{ fontWeight: 600, color: '#10b981' }}>{product.price}</div>
                              {product.competitorPrice && (
                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                  vs {product.competitorPrice}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              <span style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '12px',
                                background: `${densityBadge.color}20`,
                                color: densityBadge.color,
                                fontSize: '0.8rem',
                                fontWeight: 500
                              }}>
                                {densityBadge.icon} {product.offerDensity} sellers
                              </span>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              <span style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '12px',
                                background: `${bestOfferBadge.color}20`,
                                color: bestOfferBadge.color,
                                fontSize: '0.8rem',
                                fontWeight: 500
                              }}>
                                {bestOfferBadge.icon} {bestOfferBadge.label}
                              </span>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              <span style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '12px',
                                background: `${incrementalBadge.color}20`,
                                color: incrementalBadge.color,
                                fontSize: '0.8rem',
                                fontWeight: 500
                              }}>
                                {incrementalBadge.icon} {product.isIncremental ? 'Yes' : 'No'}
                              </span>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              <span style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '12px',
                                background: `${sentimentBadge.color}20`,
                                color: sentimentBadge.color,
                                fontSize: '0.8rem',
                                fontWeight: 500
                              }}>
                                {sentimentBadge.icon} {product.sentiment?.score?.toFixed(1) || 'N/A'}
                              </span>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              <button
                                onClick={() => toggleExpand(index)}
                                style={{
                                  padding: '0.5rem 1rem',
                                  borderRadius: '6px',
                                  border: '1px solid rgba(99, 102, 241, 0.3)',
                                  background: 'transparent',
                                  color: '#60a5fa',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem'
                                }}
                              >
                                {expandedItems[index] ? '▲ Less' : '▼ More'}
                              </button>
                            </td>
                          </tr>
                          
                          {/* Expanded Details Row */}
                          {expandedItems[index] && (
                            <tr>
                              <td colSpan="7" style={{ padding: '0' }}>
                                <div style={{
                                  background: 'rgba(15, 23, 42, 0.8)',
                                  padding: '1.5rem',
                                  margin: '0 1rem 1rem',
                                  borderRadius: '8px'
                                }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                                    {/* Competitor Offers */}
                                    <div>
                                      <h4 style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                                        🏪 Competitor Offers
                                      </h4>
                                      {product.competitorOffers?.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                          {product.competitorOffers.map((offer, i) => (
                                            <div key={i} style={{
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              padding: '0.5rem',
                                              background: 'rgba(99, 102, 241, 0.1)',
                                              borderRadius: '4px'
                                            }}>
                                              <span style={{ color: '#e5e7eb' }}>{offer.retailer}</span>
                                              <span style={{ color: offer.isBest ? '#10b981' : '#9ca3af', fontWeight: offer.isBest ? 600 : 400 }}>
                                                {offer.price} {offer.isBest && '👑'}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                                          No competitor offers found
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Sentiment Details */}
                                    <div>
                                      <h4 style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                                        💭 Customer Sentiment
                                      </h4>
                                      {product.sentiment ? (
                                        <div>
                                          <div style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '0.5rem',
                                            marginBottom: '0.5rem'
                                          }}>
                                            <div style={{ 
                                              fontSize: '1.5rem', 
                                              fontWeight: 700,
                                              color: sentimentBadge.color 
                                            }}>
                                              {product.sentiment.score?.toFixed(1)}/5
                                            </div>
                                            <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                                              ({product.sentiment.reviewCount || 0} reviews)
                                            </div>
                                          </div>
                                          <div style={{ color: '#e5e7eb', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                            {product.sentiment.summary}
                                          </div>
                                          {product.sentiment.keywords && (
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                              {product.sentiment.keywords.map((kw, i) => (
                                                <span key={i} style={{
                                                  padding: '0.25rem 0.5rem',
                                                  borderRadius: '4px',
                                                  background: 'rgba(99, 102, 241, 0.2)',
                                                  color: '#a78bfa',
                                                  fontSize: '0.75rem'
                                                }}>
                                                  {kw}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                                          No sentiment data available
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Deep Research Insights */}
                                  {product.deepResearch && (
                                    <div style={{ marginTop: '1.5rem' }}>
                                      <h4 style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                                        🔬 Deep Research Insights
                                      </h4>
                                      <div style={{ 
                                        color: '#e5e7eb', 
                                        fontSize: '0.9rem',
                                        lineHeight: '1.6',
                                        background: 'rgba(99, 102, 241, 0.05)',
                                        padding: '1rem',
                                        borderRadius: '8px',
                                        borderLeft: '3px solid #6366f1'
                                      }}>
                                        {product.deepResearch}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default SellerAnalysis;
