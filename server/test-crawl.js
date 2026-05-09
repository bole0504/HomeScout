const CrawlService = require('./src/services/CrawlService');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function runTest() {
  const url = 'https://batdongsan.com.vn/nha-dat-ban';
  const selectors = {
    listContainer: '.re__srp-list',
    itemSelector: '.re__card-full',
    fields: {
      address: '.re__card-location',
      price: '.re__card-config-price',
      area: '.re__card-config-area',
      phone: '.re__card-contact-phone',
      description: '.re__card-description',
      detailLink: 'a'
    }
  };

  try {
    console.log('--- Starting Crawl Test ---');
    const results = await CrawlService.testCrawl(url, selectors);
    console.log('Results Found:', results.length);
    console.log('Sample Data:', JSON.stringify(results[0], null, 2));
    console.log('--- Test Finished ---');
  } catch (error) {
    console.error('Test Failed:', error);
  } finally {
    process.exit(0);
  }
}

runTest();
