import React from "react";
import FeedbackStream from "../components/FeedbackStream";
import InsightPanel from "../components/InsightPanel";
import AgentTile from "../components/AgentTile";

const agents = [
  {
    name: "Real-Time Feedback Agent",
    description: "Processes incoming customer feedback in real-time.",
  },
  {
    name: "Root-Cause Analysis Agent",
    description: "Analyzes feedback to identify underlying issues.",
  },
];

export default function Dashboard() {
  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <FeedbackStream />
      <InsightPanel />
      <div className="agent-tiles">
        {agents.map((agent) => (
          <AgentTile key={agent.name} agent={agent} />
        ))}
      </div>
    </div>
  );
}