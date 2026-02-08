import React from "react";
import Nav from "../components/Nav";
import Hero from "../components/Hero";
import FeedbackStream from "../components/FeedbackStream";
import InsightPanel from "../components/InsightPanel";
import AgentTile from "../components/AgentTile";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <div>
      <Nav />
      <Hero />
      <FeedbackStream />
      <InsightPanel />
      <div className="agent-tiles">
        {["Real-time Feedback Agent", "Root-Cause Analysis Agent"].map((agent, index) => (
          <AgentTile key={index} title={agent} />
        ))}
      </div>
      <Footer />
    </div>
  );
}