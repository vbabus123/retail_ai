import React from "react";

const AgentTile = ({ agent, title }) => {
  const name = agent?.name || title || "Agent";
  const role = agent?.role || "Specialist workflow agent";
  const description =
    agent?.description ||
    "Coordinates insights, escalations, and follow-through across the team.";

  return (
    <div className="agent-tile">
      <h3 className="agent-title">{name}</h3>
      <p className="agent-role">{role}</p>
      <p className="agent-description">{description}</p>
      <button className="agent-action-btn">Learn More</button>
    </div>
  );
};

export default AgentTile;
