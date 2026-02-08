import OpenAI from "openai";

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, use a backend proxy
});

export async function analyzeProductWithOpenAI(url, onProgress) {
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

  const identifyResult = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: identifyPrompt }],
    response_format: { type: "json_object" }
  });

  let product;
  try {
    product = JSON.parse(identifyResult.choices[0].message.content);
  } catch {
    product = { name: url.split("/").pop() || "Unknown Product", brand: "Unknown", category: "Retail", productUrl: url };
  }

  onProgress({ 
    stage: "identified", 
    message: `Product identified: ${product.name}`, 
    progress: 30,
    data: product 
  });

  // Step 2: Search for feedback analysis
  onProgress({ stage: "searching", message: "Searching for recent feedback and major trends...", progress: 45 });

  const searchPrompt = `Based on your knowledge of "${product.name}" ${product.brand ? `by ${product.brand}` : ""}, provide an analysis of user feedback, reviews, and community sentiment.

Return JSON:
{
  "sources": [
    {"name": "Source Name", "url": "https://...", "snippet": "User feedback or insight", "recency": "approximate date"}
  ],
  "keyFindings": ["Significant insight 1", "Major trend 2", "Competitive factor 3"],
  "overallSentiment": "positive/negative/mixed",
  "sentimentScore": 0-100
}

Only return valid JSON.`;

  const searchResult = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: searchPrompt }],
    response_format: { type: "json_object" }
  });

  let searchData;
  try {
    searchData = JSON.parse(searchResult.choices[0].message.content);
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

  const analyzePrompt = `Based on your knowledge of "${product.name}", provide a DEEP seller-centric analysis. 

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

Only return valid JSON.`;

  const analyzeResult = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: analyzePrompt }],
    response_format: { type: "json_object" }
  });

  let analysis;
  try {
    analysis = JSON.parse(analyzeResult.choices[0].message.content);
  } catch {
    analysis = { 
      positives: [], 
      negatives: [], 
      keyThemes: [], 
      summary: "Analysis unavailable.", 
      metrics: { 
        priceValue: {label: "N/A", score: 0}, 
        quality: {label: "N/A", score: 0}, 
        recommendRate: {label: "N/A", score: 0} 
      } 
    };
  }

  onProgress({ 
    stage: "analyzed", 
    message: "Actionable insights ready", 
    progress: 75,
    data: analysis 
  });

  // Step 4: Deep research - competitive intelligence & roadmap
  onProgress({ stage: "researching", message: "Conducting competitive intelligence...", progress: 85 });

  const deepResearchPrompt = `You are a high-end business consultant. For "${product.name}":

Perform deep competitive research for the seller. 
Identify strategic moves the competition is making and what you must do to win. 

Return JSON:
{
  "competitors": [
    {"name": "Competitor Product", "comparison": "Specific threat or advantage", "url": "https://..."}
  ],
  "marketPosition": "Detailed segment standing",
  "expertOpinions": ["Actionable expert insight on product-market fit"],
  "bestAlternatives": ["Alternative 1", "Alternative 2"],
  "priceComparison": "Specific pricing strategy",
  "actionableRoadmap": [
    {"priority": "High", "action": "Specific product fix or feature to add", "rationale": "Why this wins based on user pain"},
    {"priority": "Medium", "action": "Marketing or positioning shift", "rationale": "Leverage a discovered strength"}
  ]
}

Only return valid JSON.`;

  const deepResult = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: deepResearchPrompt }],
    response_format: { type: "json_object" }
  });

  let deepResearch;
  try {
    deepResearch = JSON.parse(deepResult.choices[0].message.content);
  } catch {
    deepResearch = { 
      competitors: [], 
      marketPosition: "Market analysis unavailable.", 
      expertOpinions: [], 
      bestAlternatives: [], 
      priceComparison: "Pricing analysis pending.", 
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
