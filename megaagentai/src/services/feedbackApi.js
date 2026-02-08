const mockFeedback = [
  {
    id: 1,
    comment: "We need faster incident summaries across regions.",
    timestamp: new Date().toISOString(),
    issue: "Reporting latency",
    severity: "High",
    recommendations: ["Automate summary generation with agents."],
  },
  {
    id: 2,
    comment: "Analysts want clearer escalation paths in the workflow.",
    timestamp: new Date().toISOString(),
    issue: "Escalation clarity",
    severity: "Medium",
    recommendations: ["Add guardrail steps in the agent canvas."],
  },
];

export const fetchFeedback = async () => {
  return Promise.resolve(mockFeedback);
};

export const fetchFeedbackStream = async () => {
  return Promise.resolve(mockFeedback);
};

export const submitFeedback = async (feedbackData) => {
  return Promise.resolve({
    id: Date.now(),
    ...feedbackData,
    timestamp: new Date().toISOString(),
  });
};
