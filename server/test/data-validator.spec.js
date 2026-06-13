const { expect } = require('chai');
const DataValidator = require('../src/services/DataValidator');

describe('DataValidator Unit Tests', () => {
  it('should reject raw items missing mandatory fields', () => {
    // Missing title
    const item1 = DataValidator.validate({
      detailLink: 'https://example.com/1',
      address: { city: 'Thành phố Hồ Chí Minh', district: 'Quận 1' },
      rawArea: 50,
      rawPrice: 5000000000
    });
    expect(item1).to.be.null;

    // Missing detailLink
    const item2 = DataValidator.validate({
      title: 'Bán nhà đẹp Q1',
      address: { city: 'Thành phố Hồ Chí Minh', district: 'Quận 1' },
      rawArea: 50,
      rawPrice: 5000000000
    });
    expect(item2).to.be.null;

    // Missing city/province or district
    const item3 = DataValidator.validate({
      title: 'Bán nhà đẹp Q1',
      detailLink: 'https://example.com/1',
      address: { city: '', district: 'Quận 1' },
      rawArea: 50,
      rawPrice: 5000000000
    });
    expect(item3).to.be.null;

    // Missing or invalid area
    const item4 = DataValidator.validate({
      title: 'Bán nhà đẹp Q1',
      detailLink: 'https://example.com/1',
      address: { city: 'Thành phố Hồ Chí Minh', district: 'Quận 1' },
      rawArea: -5,
      rawPrice: 5000000000
    });
    expect(item4).to.be.null;
  });

  it('should successfully normalize price to Million VNĐ', () => {
    const rawItem = {
      title: 'Bán nhà Quận 10',
      detailLink: 'https://example.com/1',
      address: { city: 'Thành phố Hồ Chí Minh', district: 'Quận 10', ward: 'Phường 12' },
      rawArea: 60,
      rawPrice: 4800000000, // 4.8 tỷ -> 4800 triệu
      rawPricePerM2: 80000000 // 80 triệu/m2 -> 80 triệu
    };

    const validated = DataValidator.validate(rawItem);
    expect(validated).to.not.be.null;
    expect(validated.totalPrice).to.equal(4800);
    expect(validated.pricePerM2).to.equal(80);
    expect(validated.area).to.equal(60);
  });

  it('should calculate missing totalPrice if pricePerM2 and area are present', () => {
    const rawItem = {
      title: 'Bán nhà Quận 10',
      detailLink: 'https://example.com/1',
      address: { city: 'Thành phố Hồ Chí Minh', district: 'Quận 10' },
      rawArea: 100,
      rawPricePerM2: 50000000 // 50 tr/m² -> 50 tr
    };

    const validated = DataValidator.validate(rawItem);
    expect(validated).to.not.be.null;
    expect(validated.pricePerM2).to.equal(50);
    expect(validated.totalPrice).to.equal(5000); // 50 * 100 = 5000 triệu
  });

  it('should calculate missing pricePerM2 if totalPrice and area are present', () => {
    const rawItem = {
      title: 'Bán nhà Quận 10',
      detailLink: 'https://example.com/1',
      address: { city: 'Thành phố Hồ Chí Minh', district: 'Quận 10' },
      rawArea: 50,
      rawPrice: 2500000000 // 2.5 tỷ -> 2500 triệu
    };

    const validated = DataValidator.validate(rawItem);
    expect(validated).to.not.be.null;
    expect(validated.totalPrice).to.equal(2500);
    expect(validated.pricePerM2).to.equal(50); // 2500 / 50 = 50 tr/m²
  });

  it('should map city to province properly', () => {
    const rawItem = {
      title: 'Nhà bán Vũng Tàu',
      detailLink: 'https://example.com/1',
      address: { city: 'Bà Rịa Vũng Tàu', district: 'Vũng Tàu' },
      rawArea: 50,
      rawPrice: 1500000000
    };

    const validated = DataValidator.validate(rawItem);
    expect(validated.address.province).to.equal('Bà Rịa Vũng Tàu');
  });

  it('should correctly parse bedrooms and wc from raw text and description', () => {
    const rawItem = {
      title: 'Bán nhà Quận 1',
      detailLink: 'https://example.com/1',
      address: { city: 'Hồ Chí Minh', district: 'Quận 1' },
      rawArea: 50,
      rawPrice: 5000000000,
      bedrooms: '3 PN',
      wc: '2 Toilets',
      description: 'Nhà có 4 phòng ngủ rộng rãi, 3WC khép kín hoàn hảo...'
    };

    // Scraped values take priority over description
    const validated = DataValidator.validate(rawItem);
    expect(validated.bedrooms).to.equal(3);
    expect(validated.wc).to.equal(2);

    // Fallback to description extraction if scraped is missing
    const rawItem2 = {
      title: 'Bán nhà Quận 1',
      detailLink: 'https://example.com/1',
      address: { city: 'Hồ Chí Minh', district: 'Quận 1' },
      rawArea: 50,
      rawPrice: 5000000000,
      description: 'Nhà có 4 phòng ngủ rộng rãi, 3WC khép kín hoàn hảo...'
    };
    const validated2 = DataValidator.validate(rawItem2);
    expect(validated2.bedrooms).to.equal(4);
    expect(validated2.wc).to.equal(3);
  });
});
