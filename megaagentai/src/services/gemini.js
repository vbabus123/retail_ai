import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export async function analyzeProduct(url, onProgress) {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash"
  });

  onProgress({ stage: "identifying", message: "Analyzing product URL...", progress: 15 });

  // Step 1: Identify product from URL
  const identifyPrompt = `Analyze this product URL from a SELLER'S BUSINESS INTELLIGENCE perspective: ${url}

Identify the core product. Return a JSON object:
{
  "name": "specific product name",
  "brand": "brand name",
  "category": "industry category",
  "description": "one sentence business description",
  "productUrl": "${url}"
}

Only return valid JSON.`;

  const identifyResult = await model.generateContent(identifyPrompt);
  let product;
  try {
    const text = identifyResult.response.text();
    product = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
  } catch {
    product = { name: url.split("/").pop() || "Unknown Product", brand: "Unknown", category: "Retail", productUrl: url };
  }

  onProgress({ 
    stage: "identified", 
    message: `Product identified: ${product.name}`, 
    progress: 30,
    data: product 
  });

  // Step 2: Search for RECENT reviews (Prefer recent weeks/month)
  onProgress({ stage: "searching", message: "Searching for recent feedback and major trends...", progress: 45 });

  const searchPrompt = `Search for recent user feedback, Reddit discussions, Twitter/X mentions, and community reviews for "${product.name}" ${product.brand ? `by ${product.brand}` : ""}.

Provide the latest available signals. If no data is found in the last 48 hours, look for the most recent data from the last few months. 

Return JSON:
{
  "sources": [
    {"name": "Source Name", "url": "https://...", "snippet": "User feedback or insight", "recency": "approximate date"}
  ],
  "keyFindings": ["Significant insight 1", "Major trend 2", "Competitive factor 3"],
  "overallSentiment": "positive/negative/mixed",
  "sentimentScore": 0-100
}

Search the web for real, UP-TO-DATE information. DO NOT return empty findings if the product exists. Only return valid JSON.`;

  const searchResult = await model.generateContent(searchPrompt);
  let searchData;
  try {
    const text = searchResult.response.text();
    searchData = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
    if (!searchData.keyFindings || searchData.keyFindings.length === 0) {
      searchData.keyFindings = [];
    }
  } catch {
    searchData = { 
      sources: [], 
      keyFindings: [], 
      overallSentiment: "mixed", 
      sentimentScore: 50 
    };
  }

  onProgress({ 
    stage: "found_reviews", 
    message: `Found ${searchData.sources?.length || 0} recent signals`, 
    progress: 55,
    data: searchData 
  });

  // Step 3: Analyze for the SELLER (Actionable Insights)
  onProgress({ stage: "analyzing", message: "Extracting actionable insights for seller...", progress: 65 });

  const analyzePrompt = `Based on recent web signals for "${product.name}", provide a DEEP seller-centric analysis. 

Return JSON:
{
  "positives": ["Specific feature users praise", "Customer delight factor"],
  "negatives": ["Critical friction point", "Immediate product risk"],
  "keyThemes": ["Dominant conversation theme", "Emerging user need"],
  "metrics": {
    "priceValue": {"label": "Competitive/Premium/Value", "score": 0-100, "analysis": "1-sentence context"},
    "quality": {"label": "High/Average/Low", "score": 0-100, "analysis": "1-sentence context"},
    "recommendRate": {"label": "85%", "score": 85, "analysis": "1-sentence context"}
  },
  "summary": "Deep business-focused executive summary."
}

Only return valid JSON. Do not use N/A. Analyze the web data thoroughly.`;

  const analyzeResult = await model.generateContent(analyzePrompt);
  let analysis;
  try {
    const text = analyzeResult.response.text();
    analysis = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim());
  } catch {
    analysis = { positives: [], negatives: [], keyThemes: [], summary: "Market data insufficient for deep analysis.", metrics: { priceValue: {label: "N/A", score: 0}, quality: {label: "N/A", score: 0}, recommendRate: {label: "N/A", score: 0} } };
  }

  onProgress({ 
    stage: "analyzed", 
    message: "Actionable insights ready", 
    progress: 75,
    data: analysis 
  });

  // Step 4: Deep research - competitive intelligence & roadmap
  onProgress({ stage: "researching", message: "Conducting competitive intelligence...", progress: 85 });

  const deepResearchPrompt = `You are a high-end business consultant. Based on these discoveries for "${product.name}": 
${searchData.keyFindings.join(", ")}

Perform deep competitive research for the seller. 
Identify the exact strategic moves the competition is making and what you must do to win. 

Return JSON:
{
  "competitors": [
    {"name": "Competitor Product", "comparison": "Specific threat or advantage", "url": "https://..."}
  ],
  "marketPosition": "Detailed segment standing (e.g. 'Premium niche leader at risk of commoditization')",
  "expertOpinions": ["Actionable expert insight on product-market fit"],
  "bestAlternatives": ["Alternative 1", "Alternative 2"],
  "priceComparison": "Specific pricing strategy (e.g. 'Undercutting mid-tier competitors by 15%')",
  "actionableRoadmap": [
    {"priority": "High", "action": "Specific product fix or feature to add", "rationale": "Why this wins based on user pain"},
    {"priority": "Medium", "action": "Marketing or positioning shift", "rationale": "Leverage a discovered strength"}
  ]
}

DO NOT say "N/A" or "Market data unavailable". Use your knowledge and the web search tools to provide the BEST POSSIBLE STRATEGIC GUESS if data is thin. Only return valid JSON.`;

  const deepResult = await model.generateContent(deepResearchPrompt);
  let deepResearch;
  try {
    const text = deepResult.response.text();
    // More robust JSON cleaning
    const cleaned = text.replace(/```json\n?|\n?```/g, "").replace(/^[\s\S]*?\{/, "{").replace(/\}[^}]*$/, "}").trim();
    deepResearch = JSON.parse(cleaned);
  } catch (err) {
    console.error("Deep research JSON parse failed:", err);
    deepResearch = { 
      competitors: [], 
      marketPosition: "Market analysis failed due to formatting issues.", 
      expertOpinions: [], 
      bestAlternatives: [], 
      priceComparison: "Strategic pricing analysis pending.", 
      actionableRoadmap: [] 
    };
  }

  onProgress({ 
    stage: "deep_research", 
    message: "Competitive intelligence complete", 
    progress: 95, 
    data: deepResearch 
  });

  // Final result
  const finalResult = {
    product,
    sources: searchData.sources || [],
    sentiment: {
      overall: searchData.overallSentiment,
      score: searchData.sentimentScore,
      keyFindings: searchData.keyFindings
    },
    analysis,
    deepResearch
  };

  onProgress({ 
    stage: "complete", 
    message: "Analysis complete!",
    progress: 100,
    data: finalResult
  });

  return finalResult;
}

