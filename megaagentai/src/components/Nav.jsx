import React from "react";
import { Link } from "react-router-dom";

const Nav = () => {
  return (
    <nav className="nav">
      <div className="logo">
        <span className="logo-mark">AI</span>
        <span className="logo-text">Feedback Insights</span>
      </div>
      <div className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/integrations">Integrations</Link>
      </div>
      <div className="nav-actions">
        <button className="primary-btn">Get Started</button>
      </div>
    </nav>
  );
};

export default Nav;