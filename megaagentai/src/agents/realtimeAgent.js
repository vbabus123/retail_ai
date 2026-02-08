const realtimeAgent = (() => {
  const feedbackQueue = [];

  const processFeedback = (feedback) => {
    // Simulate processing feedback
    const processedFeedback = {
      id: feedback.id,
      message: feedback.message,
      timestamp: new Date().toISOString(),
    };
    feedbackQueue.push(processedFeedback);
    return processedFeedback;
  };

  const getInsights = () => {
    // Generate insights from the feedback queue
    const insights = feedbackQueue.map((item) => ({
      id: item.id,
      summary: item.message.substring(0, 50) + "...", // Example summary
      receivedAt: item.timestamp,
    }));
    return insights;
  };

  const clearFeedback = () => {
    feedbackQueue.length = 0; // Clear the feedback queue
  };

  return {
    processFeedback,
    getInsights,
    clearFeedback,
  };
})();

export function processFeedbackData(feedbackData) {
  return feedbackData.map((feedback) => ({
    id: feedback.id,
    summary: feedback.comment?.slice(0, 60) || "New feedback received",
    receivedAt: feedback.timestamp || new Date().toISOString(),
    issue: feedback.issue || "Uncategorized",
    severity: feedback.severity || "Medium",
    recommendations: feedback.recommendations || ["Review the feedback details."],
  }));
}

export default realtimeAgent;
