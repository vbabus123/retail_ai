// filepath: /megaagent-feedback-ai/megaagent-feedback-ai/src/types/index.d.ts
declare module "types" {
  export interface Feedback {
    id: string;
    customerId: string;
    content: string;
    timestamp: Date;
    sentiment: "positive" | "negative" | "neutral";
  }

  export interface Insight {
    id: string;
    feedbackId: string;
    rootCause: string;
    recommendations: string[];
    createdAt: Date;
  }

  export interface Agent {
    id: string;
    name: string;
    role: string;
    status: "active" | "inactive";
    processFeedback(feedback: Feedback): void;
    generateInsights(feedback: Feedback): Insight;
  }

  export interface ApiResponse<T> {
    data: T;
    message: string;
    success: boolean;
  }
}