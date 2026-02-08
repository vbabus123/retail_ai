import React from "react";
import FeedbackStream from "../components/FeedbackStream";
import InsightPanel from "../components/InsightPanel";

export default function Integrations() {
  return (
    <div className="integrations-page">
      <h1>Integrations</h1>
      <p>
        Discover how our AI agents can seamlessly integrate with your existing systems to transform customer feedback into actionable insights.
      </p>
      <FeedbackStream />
      <InsightPanel />
    </div>
  );
}