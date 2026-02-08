// filepath: /megaagent-feedback-ai/megaagent-feedback-ai/src/agents/agentHelpers.js
export const formatFeedback = (feedback) => {
  return feedback.map(item => ({
    id: item.id,
    message: item.message,
    timestamp: new Date(item.timestamp).toLocaleString(),
    sentiment: item.sentiment || 'neutral',
  }));
};

export const categorizeFeedback = (feedback) => {
  const categories = {
    positive: [],
    negative: [],
    neutral: [],
  };

  feedback.forEach(item => {
    if (item.sentiment === 'positive') {
      categories.positive.push(item);
    } else if (item.sentiment === 'negative') {
      categories.negative.push(item);
    } else {
      categories.neutral.push(item);
    }
  });

  return categories;
};

export const extractInsights = (feedback) => {
  const insights = {
    totalFeedback: feedback.length,
    positiveCount: feedback.filter(item => item.sentiment === 'positive').length,
    negativeCount: feedback.filter(item => item.sentiment === 'negative').length,
    neutralCount: feedback.filter(item => item.sentiment === 'neutral').length,
  };

  return insights;
};