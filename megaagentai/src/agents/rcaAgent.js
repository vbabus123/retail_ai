export function analyzeRootCauses(processedFeedback) {
  return processedFeedback.map((item) => ({
    issue: item.issue || "Uncategorized",
    severity: item.severity || "Medium",
    recommendations: item.recommendations || ["Review and triage the signal."],
  }));
}

export const rcaAgent = {
  identifyRootCauses: analyzeRootCauses,
};
