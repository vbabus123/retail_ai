import React, { useEffect, useState } from "react";
import { fetchFeedback } from "../services/feedbackApi";
import { processInsights } from "../services/insightsProcessor";

export default function FeedbackStream() {
  const [feedbackData, setFeedbackData] = useState([]);
  const [insights, setInsights] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchFeedback().then((data) => {
        setFeedbackData((prevData) => [...prevData, ...data]);
        const { actionableInsights } = processInsights(data);
        setInsights((prevInsights) => [...prevInsights, ...actionableInsights]);
      });
    }, 5000); // Fetch feedback every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="feedback-stream">
      <h2>Real-Time Customer Feedback</h2>
      <div className="feedback-list">
        {feedbackData.map((feedback, index) => (
          <div key={index} className="feedback-item">
            <p>{feedback.comment}</p>
            <span>{feedback.timestamp}</span>
          </div>
        ))}
      </div>
      <div className="insights-panel">
        <h3>Actionable Insights</h3>
        {insights.map((insight, index) => (
          <div key={index} className="insight-item">
            <p>{insight.summary}</p>
            <span>{insight.receivedAt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
