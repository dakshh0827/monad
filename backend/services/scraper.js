import metascraper from 'metascraper';
import metascraperAuthor from 'metascraper-author';
import metascraperDate from 'metascraper-date';
import metascraperDescription from 'metascraper-description';
import metascraperImage from 'metascraper-image';
import metascraperLogo from 'metascraper-logo';
import metascraperPublisher from 'metascraper-publisher';
import metascraperTitle from 'metascraper-title';
import metascraperUrl from 'metascraper-url';
import got from 'got';
import * as cheerio from 'cheerio';

const scraper = metascraper([
  metascraperAuthor(),
  metascraperDate(),
  metascraperDescription(),
  metascraperImage(),
  metascraperLogo(),
  metascraperPublisher(),
  metascraperTitle(),
  metascraperUrl()
]);

/**
 * Extract main article content from HTML
 * @param {string} html - Raw HTML
 * @returns {string} Extracted text content
 */
function extractArticleContent(html) {
  try {
    const $ = cheerio.load(html);
    
    // Remove unwanted elements
    const unwantedSelectors = ['script', 'style', 'nav', 'header', 'footer', 'aside', 'iframe', 'ads', '.ad', '#ad'];
    unwantedSelectors.forEach(selector => {
      $(selector).remove();
    });
    
    // Try to find main content area
    const contentSelectors = [
      'article',
      '[role="main"]',
      '.article-content',
      '.post-content',
      '.entry-content',
      'main',
      '#content'
    ];
    
    let contentElement = null;
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        contentElement = element;
        break;
      }
    }
    
    // Fallback to body if no specific content area found
    if (!contentElement) {
      contentElement = $('body');
    }
    
    // Extract text with paragraph breaks
    let fullText = '';
    
    contentElement.find('p, h1, h2, h3, h4, h5, h6, li').each((i, elem) => {
      const text = $(elem).text().trim();
      if (text.length > 20) { // Filter out short/empty paragraphs
        fullText += text + '\n\n';
      }
    });
    
    return fullText.trim();
  } catch (error) {
    console.error('Content extraction error:', error.message);
    return '';
  }
}

/**
 * Scrape article metadata and full content from URL
 * @param {string} targetUrl - The URL to scrape
 * @returns {Promise<Object>} Scraped metadata and content
 */
export async function scrapeArticle(targetUrl) {
  try {
    const { body: html, url } = await got(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
      },
      timeout: {
        request: 10000
      },
      retry: {
        limit: 2
      },
      followRedirect: true,
      https: {
        rejectUnauthorized: false
      }
    });
    
    // Extract metadata using metascraper
    const metadata = await scraper({ html, url });
    
    // Extract full article content
    const fullContent = extractArticleContent(html);
    
    return {
      title: metadata.title || 'Untitled',
      description: metadata.description || '',
      fullContent: fullContent || metadata.description || '',
      image: metadata.image || null,
      author: metadata.author || 'Unknown',
      publisher: metadata.publisher || new URL(targetUrl).hostname,
      date: metadata.date || new Date().toISOString(),
      url: metadata.url || targetUrl,
      logo: metadata.logo || null
    };
  } catch (error) {
    console.error('Scraping error:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      throw new Error('Invalid URL or domain not found');
    } else if (error.response?.statusCode === 403) {
      throw new Error('Access forbidden - website blocking scraping');
    } else if (error.response?.statusCode === 404) {
      throw new Error('Article not found (404)');
    } else if (error.name === 'TimeoutError') {
      throw new Error('Request timeout - website too slow');
    } else {
      throw new Error(`Failed to scrape URL: ${error.message}`);
    }
  }
}