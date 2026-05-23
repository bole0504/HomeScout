const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Use gemini-2.5-flash for speed, larger context, and active API support
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  /**
   * Suggest CSS selectors for real estate listing page
   * @param {string} htmlSnippet - Simplified HTML from target page
   * @returns {Promise<Object>} - Suggested selectors
   */
  async suggestSelectors(htmlSnippet) {
    const prompt = `
      You are an expert web scraper specialized in Vietnam's real estate market.
      I will provide you with a simplified HTML snippet from a real estate listing website.
      Your task is to analyze the HTML and suggest CSS selectors for the listing items and their fields.

      Fields required:
      1. listContainer: The CSS selector for the parent element containing all listing cards/items.
      2. itemSelector: The CSS selector for an individual listing card/item relative to the container.
      3. fields (object containing):
         - title: Selector for the property title
         - address: Selector for the full address text
         - publishedDate: Selector for the post date/time
         - price: Selector for the listing price
         - area: Selector for the property area (m2)
         - pricePerM2: Selector for price per m2 (if exists)
         - bedrooms: Selector for number of bedrooms
         - wc: Selector for number of toilets/bathrooms
         - legal: Selector for legal status (e.g., Sổ đỏ, Sổ hồng)
         - phone: Selector for the masked or partial phone number
         - revealPhoneSelector: Selector for the button that clicks to show the full phone number
         - description: Selector for short description
         - images: Selector for the item images (e.g., "img")
         - detailLink: Selector for the link leading to the property detail page

      Return ONLY a valid JSON object in this format:
      {
        "listContainer": "...",
        "itemSelector": "...",
        "fields": {
          "title": "...",
          ...
        }
      }

      Important: 
      - Use standard CSS selectors (classes, IDs, tags).
      - Ensure selectors are relative to the 'itemSelector' where appropriate.
      - If a field is not found, use an empty string.
      - Vietnamese websites often use specific classes for prices (e.g., .re__card-config-price). Pay attention to these patterns.

      HTML Snippet:
      ${htmlSnippet}
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      
      // Clean up JSON response (Gemini sometimes adds markdown blocks)
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      return JSON.parse(text);
    } catch (error) {
      console.error('AIService error:', error);
      throw new Error('Failed to get suggestions from AI: ' + error.message);
    }
  }
}

module.exports = new AIService();
