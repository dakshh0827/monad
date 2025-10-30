import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/**
 * Summarize article using Groq (FREE & SUPER FAST)
 * @param {Object} articleData - Article metadata from scraper
 * @returns {Promise<Object>} Summarized content with headline and detailed summary
 */
export async function summarizeArticle(articleData) {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant", // Fast and reliable
      messages: [
        {
          role: "system",
          content: "You are a professional news editor. Create two summaries: 1) A concise 60-80 word headline summary for quick reading, 2) A detailed 300-500 word comprehensive summary with key points, context, and implications. Respond ONLY with valid JSON."
        },
        {
          role: "user",
          content: `Summarize this article:\n\nTitle: ${articleData.title}\n\nContent: ${articleData.description}\n\nProvide response in JSON format:\n{\n  "headline": "short summary here",\n  "detailed": "comprehensive summary here"\n}`
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const summaries = JSON.parse(completion.choices[0].message.content);
    
    const cardJson = JSON.stringify({
      headline: articleData.title,
      summary: summaries.headline,
      detailedSummary: summaries.detailed,
      source: articleData.publisher,
      author: articleData.author,
      publishedAt: articleData.date,
      imageUrl: articleData.image
    });
    
    console.log(`✓ Summarized: "${articleData.title.substring(0, 50)}..."`);
    
    return {
      summary: summaries.headline,
      detailedSummary: summaries.detailed,
      cardJson
    };
  } catch (error) {
    console.error('Groq Summarization error:', error.message);
    
    // Fallback to description
    const fallbackSummary = articleData.description
      ? articleData.description.substring(0, 200) + '...'
      : 'Summary not available';
    
    return {
      summary: fallbackSummary,
      detailedSummary: articleData.description || fallbackSummary,
      cardJson: JSON.stringify({
        headline: articleData.title,
        summary: fallbackSummary,
        detailedSummary: articleData.description || fallbackSummary,
        source: articleData.publisher,
        author: articleData.author,
        publishedAt: articleData.date,
        imageUrl: articleData.image
      })
    };
  }
}

/**
 * Extract full article content using Groq
 * @param {string} htmlContent - Raw HTML content
 * @param {Object} metadata - Article metadata
 * @returns {Promise<Object>} Structured article content
 */
export async function extractFullContent(htmlContent, metadata) {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: "Extract the main article content from HTML and structure it with sections, key points, and any data/statistics mentioned. Respond ONLY with valid JSON."
        },
        {
          role: "user",
          content: `Extract content from this article:\n\n${htmlContent.substring(0, 8000)}\n\nProvide JSON format:\n{\n  "mainContent": "full text",\n  "keyPoints": ["point1", "point2"],\n  "statistics": [{"label": "stat", "value": "number"}],\n  "sections": [{"heading": "title", "content": "text"}]\n}`
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const extracted = JSON.parse(completion.choices[0].message.content);
    
    return {
      mainContent: extracted.mainContent || '',
      keyPoints: extracted.keyPoints || [],
      statistics: extracted.statistics || [],
      sections: extracted.sections || []
    };
  } catch (error) {
    console.error('Content extraction error:', error.message);
    return {
      mainContent: metadata.description || '',
      keyPoints: [],
      statistics: [],
      sections: []
    };
  }
}