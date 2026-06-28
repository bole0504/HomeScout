const fs = require('fs');
const path = require('path');

class AddressParser {
  constructor() {
    this.provinces = [];
    this.isLoaded = false;
    this.loadData();
  }

  loadData() {
    try {
      const dataPath = path.join(__dirname, 'provinces.json');
      if (fs.existsSync(dataPath)) {
        this.provinces = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        this.isLoaded = true;
        console.log('Location data loaded successfully');
      }
    } catch (error) {
      console.error('Failed to load location data:', error);
    }
  }

  /**
   * Normalize text for searching
   * Lowercase, remove accents, remove common prefixes
   */
  normalize(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9\s]/g, ' ') // Remove special chars
      .replace(/\s+/g, ' ')
      .trim();
  }

  parse(text) {
    if (!text || !this.isLoaded) return {};

    const normalizedText = this.normalize(text);
    const NOISE_WORDS = [
      'phong tho', 'phong ngu', 'phong khach', 'huong', 'mat tien', 'duong rong', 
      'ban gap', 'chinh chu', 'chu', 'so', 'tang', 'dien tich'
    ];
    
    let result = {
      city: '',
      district: '',
      ward: '',
      street: '',
      cityCode: null,
      districtCode: null
    };

    // --- District aliases: viết tắt / biến thể thường gặp ---
    // key = normalized alias, value = normalized district name cần match
    const DISTRICT_ALIASES = {
      'bmt':     'buon ma thuot',  // Thành phố Buôn Ma Thuột
      'buon ma thuot': 'buon ma thuot',
      'cukuin':  'cu kuin',        // Huyện Cư Kuin (viết liền)
      'cu kuin': 'cu kuin',
      'binhtan': 'binh tan',       // Quận Bình Tân
      'govap':   'go vap',
      'thuduc':  'thu duc',
      'tph':     'thu phu',
    };

    // --- STEP 1: Find District First (Bottom-up with Scoring) ---
    let allDistricts = [];
    this.provinces.forEach(p => {
      if (p.districts) {
        p.districts.forEach(d => {
          allDistricts.push({ ...d, provinceName: p.name, provinceCode: p.code });
        });
      }
    });

    // Check alias match first — replace alias token in normalized text with the canonical form
    let workingText = normalizedText;
    for (const [alias, canonical] of Object.entries(DISTRICT_ALIASES)) {
      const aliasRe = new RegExp(`\\b${alias}\\b`, 'gi');
      if (aliasRe.test(workingText)) {
        workingText = workingText.replace(aliasRe, canonical);
      }
    }

    let candidates = [];
    for (const d of allDistricts) {
      const dName = this.normalize(d.name);
      const dNameClean = dName.replace(/^(quan|huyen|thi xa|thanh pho)\s+/, '');

      // Skip if name is too short and looks like noise
      if (dNameClean.length <= 4 && NOISE_WORDS.includes(dNameClean)) continue;

      let patterns = [dName];
      if (dNameClean.match(/^\d+$/)) {
        patterns.push(`q\\s?${dNameClean}`, `q\\.${dNameClean}`, `quan\\s${dNameClean}`);
      } else if (dNameClean.length > 2) {
        patterns.push(dNameClean);
      }

      const regex = new RegExp(`\\b(${patterns.join('|')})\\b`, 'gi');
      let match;
      while ((match = regex.exec(workingText)) !== null) {
        // Scoring: 
        // - More words in dNameClean = higher score (Vd: "Nam Tu Liem" > "Chu")
        // - Matches with prefix (Quận/Huyện) get higher score
        // - Matches earlier in the text get higher score
        let score = (1000 - match.index); 
        
        const wordCount = dNameClean.split(' ').length;
        score += wordCount * 200; // Multi-word districts get boost

        if (match[0].includes('quan') || match[0].includes('huyen') || match[0].includes('thanh pho')) {
            score += 500;
        }
        
        // Priority for big cities if ambiguous
        if ([1, 79].includes(d.provinceCode)) score += 100;

        candidates.push({
          district: d,
          score: score,
          index: match.index
        });
      }
    }

    // Pick the best candidate
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score);
      const best = candidates[0].district;
      result.district = best.name;
      result.districtCode = best.code;
      result.city = best.provinceName;
      result.cityCode = best.code;
      var foundDistrictObj = best; // for ward matching
    }

    // --- STEP 2: Find Province (If district not found) ---
    if (!result.city) {
      const sortedProvinces = [...this.provinces].sort((a, b) => b.name.length - a.name.length);
      for (const p of sortedProvinces) {
        const pName = this.normalize(p.name);
        const pNameClean = pName.replace(/^(thanh pho|tinh)\s+/, '');
        
        // Special logic for common abbreviations
        let patterns = [pName, pNameClean];
        if (p.code === 79) patterns.push('hcm', 'tp hcm', 'sai gon');
        if (p.code === 1)  patterns.push('ha noi', 'hn');
        if (p.code === 66) patterns.push('dak lak', 'daklak', 'bmt');

        const regex = new RegExp(`\\b(${patterns.join('|')})\\b`, 'i');
        if (regex.test(normalizedText)) {
          result.city = p.name;
          result.cityCode = p.code;
          break;
        }
      }
    }

    // --- STEP 3: Find Ward (Within the found district) ---
    let foundWardMatch = null;
    if (foundDistrictObj && foundDistrictObj.wards) {
      const sortedWards = [...foundDistrictObj.wards].sort((a, b) => b.name.length - a.name.length);
      for (const w of sortedWards) {
        const wName = this.normalize(w.name);
        const wNameClean = wName.replace(/^(phuong|xa|thi tran)\s+/, '');
        
        let patterns = [wName];
        if (wNameClean.match(/^\d+$/)) {
          patterns.push(`p\\s?${wNameClean}`, `p\\.${wNameClean}`, `phuong\\s${wNameClean}`);
        } else {
          patterns.push(wNameClean);
        }

        const regex = new RegExp(`\\b(${patterns.join('|')})\\b`, 'i');
        const match = normalizedText.match(regex);
        if (match) {
          result.ward = w.name;
          foundWardMatch = { index: match.index, text: match[0] };
          break;
        }
      }
    }

    // --- STEP 4: Extract Street ---
    const pivotMatch = foundWardMatch || candidates.find(c => c.district.code === result.districtCode);
    if (pivotMatch) {
        const pivotIndex = pivotMatch.index;
        
        if (pivotIndex > 0) {
            let beforeText = normalizedText.substring(0, pivotIndex).trim();
            // Remove common noise at the beginning
            beforeText = beforeText.replace(/^(chot nhanh|ban gap|can ban|gia re|sieu pham|hot|can tien|nhanh chi|co ngay|nha|ban|o)\s+/gi, '');
            
            const streetMatch = beforeText.match(/(?:duong|pho|mat tien|tai)\s+([a-z0-9\s]+)$/i);
            let potentialStreet = '';
            if (streetMatch) {
                potentialStreet = streetMatch[1].trim();
            } else {
                const words = beforeText.split(' ');
                potentialStreet = words.slice(-3).join(' ').trim();
            }

            if (potentialStreet) {
                result.street = potentialStreet.toUpperCase();
            }
        }
    }

    return {
      city: result.city,
      district: result.district,
      ward: result.ward,
      street: result.street,
      fullAddress: [result.street, result.ward, result.district, result.city].filter(Boolean).join(', ')
    };
  }
}

module.exports = new AddressParser();
