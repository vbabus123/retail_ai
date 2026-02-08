import { processFeedbackData } from '../agents/realtimeAgent';
import { analyzeRootCauses } from '../agents/rcaAgent';

/**
 * Processes insights derived from customer feedback.
 * 
 * @param {Array} feedbackData - The raw feedback data to process.
 * @returns {Object} - An object containing actionable insights and root-cause analysis.
 */
export function processInsights(feedbackData) {
  const processedData = processFeedbackData(feedbackData);
  const rootCauseInsights = analyzeRootCauses(processedData);

  return {
    actionableInsights: processedData,
    rootCauseAnalysis: rootCauseInsights,
  };
}