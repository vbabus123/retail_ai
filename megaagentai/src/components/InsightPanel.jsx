import React from "react";

const InsightPanel = ({ insights = [] }) => {
  return (
    <div className="insight-panel">
      <h2>Actionable Insights</h2>
      {insights.length > 0 ? (
        <ul>
          {insights.map((insight, index) => (
            <li key={index} className="insight-item">
              <h3>{insight.title}</h3>
              <p>{insight.description}</p>
              <p className="insight-root-cause">
                <strong>Root Cause:</strong> {insight.rootCause}
              </p>
              <p className="insight-recommendation">
                <strong>Recommendation:</strong> {insight.recommendation}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No insights available at the moment.</p>
      )}
    </div>
  );
};

export default InsightPanel;
