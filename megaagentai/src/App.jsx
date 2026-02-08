import React from "react";
import { Link } from "react-router-dom";
import logo from "./assets/megaagent-logo-cropped.png";
import DemoSection from "./components/DemoSection";

const navLinks = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Results", href: "#results" },
  { label: "Seller Analysis", href: "/seller-analysis", isRoute: true },
  { label: "Pricing", href: "#pricing" },
  { label: "Contact", href: "#contact" },
];

const differentiators = [
  "Most tools show dashboards. We deliver decisions.",
  "Our multi-agent system fuses voice, text, images, reviews, returns, and operational data.",
  "So you act before it is too late, not after the damage is done.",
];

const agents = [
  {
    name: "Voice-of-Customer Understanding",
    role: "Understands tone, emotion, and urgency.",
  },
  {
    name: "Feedback Normalizer",
    role: "Unifies emails, calls, chats, and images.",
  },
  {
    name: "Authenticity Checker",
    role: "Filters spam, bots, and fake signals.",
  },
  {
    name: "Root-Cause Investigator",
    role: "Reveals underlying patterns and drivers.",
  },

  {
    name: "Learning Layer",
    role: "Improves performance with every insight.",
  },
];

const modalities = [
  "Support calls",
  "App reviews",
  "Text and chat",
  "Product images",
  "Return notes",
  "Operational metrics",
];



const industries = [
  "Retail and E-Commerce",
  "Marketplaces",
  "Consumer Apps",
  "Healthcare",
  "Travel and Hospitality",
];

const roadmap = [
  {
    phase: "Now",
    focus: "Text + voice + root-cause mapping",
  },
  {
    phase: "6-12 Months",
    focus: "Image + video + returns integration",
  },
  {
    phase: "12-24 Months",
    focus: "Fully autonomous optimization",
  },
];

export default function App() {
  return (
    <div className="site">
      <header className="hero" id="top">
        <nav className="nav">
          <div className="nav-container">
            <div className="logo">
              <img src={logo} alt="MegaAgentAI" className="logo-image" />
            </div>
            <div className="nav-links">
              {navLinks.map((link) => (
                link.isRoute ? (
                  <Link key={link.label} to={link.href} style={{ 
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    color: 'white',
                    fontWeight: 600
                  }}>
                    🏪 {link.label}
                  </Link>
                ) : (
                  <a key={link.label} href={link.href}>
                    {link.label}
                  </a>
                )
              ))}
            </div>
            <div className="nav-actions">
              <a href="#demo" className="primary-btn">Try demo</a>
            </div>
          </div>
        </nav>

        <div className="hero-layout">
          <div className="hero-copy">
            <h1>Turn every customer signal into action, instantly.</h1>
            <p className="lead">
              AI agents transform raw feedback into real-time root-cause
              insights, predictions, and business decisions.
            </p>
            <p className="hero-subcopy">
              Stop guessing. Start knowing in hours, not months.
            </p>
            <div className="hero-actions">
              <a href="#contact" className="primary-btn">Request early access</a>
              <a href="#demo" className="ghost-btn">Try demo</a>
            </div>
            <div className="hero-metrics">
              <div className="metric">
                <span>24-72 hrs</span>
                <p>Time to insight</p>
              </div>
              <div className="metric">
                <span>6 agents</span>
                <p>Specialized workflow team</p>
              </div>
              <div className="metric">
                <span>Enterprise</span>
                <p>Secure and scalable</p>
              </div>
            </div>
          </div>
          <div className="hero-panel">
            <div className="panel-top">
              <div>
                <p>Command console</p>
                <span className="panel-sub">Real-time root-cause view</span>
              </div>
              <span className="pulse">Live</span>
            </div>
            <div className="panel-stream">
              <div className="stream-card">
                <h4>Returns spike</h4>
                <p>Root cause linked to packaging defect</p>
                <span className="tag">Investigator engaged</span>
              </div>
              <div className="stream-card">
                <h4>Support surge</h4>
                <p>Voice sentiment trending negative</p>
                <span className="tag">Forecast warning</span>
              </div>
              <div className="stream-card">
                <h4>App review</h4>
                <p>Crash reports rising in v4.2.1</p>
                <span className="tag">Alert sent</span>
              </div>
            </div>
            <div className="panel-footer">
              <p>Agents aligned</p>
              <div className="agent-row">
                {agents.slice(0, 3).map((agent) => (
                  <div key={agent.name} className="agent-pill">
                    <span>{agent.name.split(" ")[0]}</span>
                    <small>{agent.role}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="hero-glow" />
      </header>

      <DemoSection />

      <section className="section dark" id="how-it-works">
        <div className="section-title" style={{ maxWidth: "1000px" }}>
          <p>How it works</p>
          <h2>
            Six specialized agents. One intelligent Voice-of-Customer brain.
          </h2>
        </div>
        <div className="agent-grid">
          {agents.map((agent) => (
            <div key={agent.name} className="agent-card">
              <div className="agent-title">
                <span>{agent.name}</span>
                <span className="pill">Specialist</span>
              </div>
              <p>{agent.role}</p>
              <div className="signal">
                <span />
                Always-on analysis
              </div>
            </div>
          ))}
        </div>
        <p className="section-footnote">
          Together, they operate like a real team - only faster, consistent, and
          autonomous.
        </p>
      </section>



      <section className="section">
        <div className="section-title">
          <p>Results in hours</p>
          <h2>Before vs after</h2>
        </div>
        <div className="comparison">
          <div className="comparison-card">
            <h3>Traditional BI</h3>
            <ul>
              <li>Manual analysis</li>
              <li>Sentiment only</li>
              <li>Delayed reports</li>
              <li>Guesswork decisions</li>
            </ul>
          </div>
          <div className="comparison-card highlight">
            <h3>With AI agents</h3>
            <ul>
              <li>Autonomous insight discovery</li>
              <li>Real root-cause intelligence</li>
              <li>Real-time alerts</li>
              <li>Confident execution</li>
            </ul>
          </div>
        </div>
        <div className="time-shift">
          <p>Time to insight</p>
          <h3>12-16 weeks &rarr; 24-72 hours</h3>
        </div>
      </section>





      <section className="section dark" id="pricing">
        <div className="section-title">
          <p>Pricing model</p>
          <h2>Simple, scalable, value-aligned.</h2>
        </div>
        <div className="pricing-grid">
          <div className="pricing-card">
            <h3>SaaS subscription</h3>
            <p>Base platform access, orchestration, and governance.</p>
          </div>
          <div className="pricing-card">
            <h3>Usage-based intelligence</h3>
            <p>Pay only for the signals processed and insights delivered.</p>
          </div>
        </div>
        <div className="pricing-footnote">
          <p>
            Enterprise-ready with security, compliance, CRM and BI integrations,
            and scalable cloud architecture.
          </p>
        </div>
      </section>





      <section className="section" id="contact">
        <div className="section-title">
          <p>Contact</p>
          <h2>Talk to the MegaAgentAI team.</h2>
        </div>
        <div className="contact-grid">
          <div className="contact-card">
            <h3>Contact details</h3>
            <p>Reach our team for pilots, pricing, or integration support.</p>
            <div className="contact-list">
              <div>
                <span>Name</span>
                <p>MegaAgentAI Team</p>
              </div>
              <div>
                <span>Phone</span>
                <p>+1 (415) 555-0198</p>
              </div>
              <div>
                <span>Email</span>
                <p>hello@megaagentai.com</p>
              </div>
            </div>
          </div>
          <div className="contact-card">
            <h3>Send a message</h3>
            <p>We reply within one business day.</p>
            <form
              className="contact-form"
              action="mailto:hello@megaagentai.com"
              method="post"
              encType="text/plain"
            >
              <input type="text" name="name" placeholder="Your name" required />
              <input
                type="email"
                name="email"
                placeholder="Email address"
                required
              />
              <input type="tel" name="phone" placeholder="Phone number" />
              <textarea
                name="message"
                rows="4"
                placeholder="Tell us about your use case"
                required
              />
              <button className="primary-btn" type="submit">
                Send email
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="section cta">
        <div>
          <h2>Ready to transform feedback into your competitive advantage?</h2>
          <p>Enterprise pilots available now.</p>
        </div>
        <div className="cta-actions">
          <button className="primary-btn">Book strategy call</button>
          <button className="ghost-btn">Join beta access</button>
        </div>
      </section>

      <footer className="footer">
        <div>
          <div className="logo">
            <img
              src={logo}
              alt="MegaAgentAI"
              className="logo-image footer-logo"
            />
          </div>
          <p>AI agents that turn customer feedback into action.</p>
        </div>
        <div className="footer-links">
          <a href="#">Security</a>
          <a href="#">Compliance</a>
          <a href="#">Integrations</a>
          <a href="#">Contact</a>
        </div>
        <p className="footer-note">
          megaagentai.com · © 2024 MegaAgentAI. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
