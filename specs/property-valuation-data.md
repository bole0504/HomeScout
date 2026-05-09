# CapNhatGia — Property Valuation Data Spec

## Mục đích

Định nghĩa **tất cả data fields** mà crawl engine cần extract để hỗ trợ định giá BĐS chính xác.  
Các fields được chia thành 5 nhóm ảnh hưởng đến giá, với mức độ ưu tiên crawl và khả năng tự động hóa.

---

## Tổng quan Data Fields

| Nhóm | Số fields | Crawl được | Cần manual input |
|------|-----------|------------|-------------------|
| 1. Thông tin đất | 9 | ✅ Phần lớn | Hình thể, dốc |
| 2. Nhà trên đất | 7 | ✅ Phần lớn | Kết cấu chi tiết |
| 3. Pháp lý | 6 | ⚠️ Một phần | Tranh chấp, hoàn công |
| 4. Vị trí thực tế | 7 | ⚠️ Một phần | Ngập, ồn, dân trí |
| 5. Tiện ích xung quanh | 6 | ✅ Tính toán được | Via Google Maps API |

---

## 1. Thông tin đất 🏗️

> [!IMPORTANT]
> Nhóm ảnh hưởng **rất mạnh** đến giá. Crawl engine PHẢI ưu tiên extract các fields này.

| Field | Type | Unit | Crawl Strategy | Mô tả |
|-------|------|------|----------------|--------|
| `land.actualArea` | `Number` | m² | Auto-crawl | Diện tích thực tế (có thể khác tin đăng) |
| `land.frontWidth` | `Number` | m | Auto-crawl | Mặt tiền rộng bao nhiêu mét |
| `land.depth` | `Number` | m | Auto-crawl | Chiều sâu lô đất |
| `land.shape` | `String` enum | — | Auto-crawl + NLP | Hình thể đất |
| `land.elevation` | `String` enum | — | NLP from description | Đất cao hay thấp so với đường |
| `land.slope` | `Boolean` | — | NLP from description | Có bị dốc không |
| `land.direction` | `String` enum | — | Auto-crawl | Hướng đất/nhà |

### Enum Values

```javascript
// land.shape
const LAND_SHAPES = {
  SQUARE: 'vuông đẹp',           // Giá cao nhất
  WIDER_BACK: 'nở hậu',          // Giá cao (phong thủy tốt)
  NARROWER_BACK: 'tóp hậu',      // Giảm giá 5-15%
  TRIANGLE: 'tam giác',           // Giảm giá 15-30%
  IRREGULAR: 'méo / không vuông', // Giảm giá 10-20%
};

// land.elevation
const LAND_ELEVATIONS = {
  HIGHER: 'cao hơn đường',   // Tốt
  LEVEL: 'bằng đường',       // Bình thường
  LOWER: 'thấp hơn đường',   // Giảm giá (nguy cơ ngập)
};

// land.direction
const DIRECTIONS = {
  NORTH: 'Bắc',
  SOUTH: 'Nam',
  EAST: 'Đông',
  WEST: 'Tây',
  NORTHEAST: 'Đông Bắc',
  NORTHWEST: 'Tây Bắc',
  SOUTHEAST: 'Đông Nam',
  SOUTHWEST: 'Tây Nam',
};
```

### Crawl Patterns (Regex)

```javascript
// Mặt tiền
/mặt\s*tiền[:\s]*(\d+[\.,]?\d*)\s*m/i
/ngang[:\s]*(\d+[\.,]?\d*)\s*m/i
/MT[:\s]*(\d+[\.,]?\d*)\s*m/i

// Chiều sâu
/sâu[:\s]*(\d+[\.,]?\d*)\s*m/i
/dài[:\s]*(\d+[\.,]?\d*)\s*m/i

// Hướng
/(hướng|mặt tiền hướng)[:\s]*(Đông Nam|Tây Nam|Đông Bắc|Tây Bắc|Đông|Tây|Nam|Bắc)/i

// Hình thể
/(nở hậu|tóp hậu|vuông|tam giác|méo)/i
```

---

## 2. Thông tin nhà trên đất 🏠

> [!NOTE]
> Giúp tính **giá trị xây dựng còn lại** + **khấu hao**. Ảnh hưởng đáng kể đến tổng giá trị BĐS.

| Field | Type | Unit | Crawl Strategy | Mô tả |
|-------|------|------|----------------|--------|
| `building.type` | `String` enum | — | Auto-crawl | Loại nhà trên đất |
| `building.yearBuilt` | `Number` | year | Auto-crawl | Năm xây dựng |
| `building.yearRenovated` | `Number` | year | NLP from description | Năm sửa chữa gần nhất |
| `building.structure` | `String` enum | — | Auto-crawl + NLP | Kết cấu xây dựng |
| `building.condition` | `String` enum | — | NLP from description | Tình trạng hiện tại |
| `building.floors` | `Number` | — | Auto-crawl | Số tầng |
| `building.rentable` | `Boolean` | — | NLP from description | Có thể cho thuê ngay không |

### Enum Values

```javascript
// building.type
const BUILDING_TYPES = {
  NONE: 'đất trống',          // Chỉ có đất
  TEMPORARY: 'nhà tạm',       // Nhà tạm, không giá trị
  LEVEL4: 'nhà cấp 4',        // Nhà cấp 4
  ONE_STORY: 'nhà 1 tầng',    // Nhà 1 tầng kiên cố
  MULTI_STORY: 'nhà nhiều tầng', // Nhà nhiều tầng
};

// building.structure
const BUILDING_STRUCTURES = {
  TEMPORARY: 'tạm',           // Tôn, gỗ, lá
  REINFORCED: 'BTCT',         // Bê tông cốt thép
  PREMIUM: 'cao cấp',         // Hoàn thiện cao cấp
};

// building.condition
const BUILDING_CONDITIONS = {
  NEW: 'mới',                 // Mới xây / vừa sửa
  GOOD: 'ở tốt',              // Ở được, không cần sửa
  DETERIORATED: 'xuống cấp',   // Cần sửa chữa lớn
};
```

### Crawl Patterns (Regex)

```javascript
// Số tầng
/(\d+)\s*tầng/i
/(\d+)\s*lầu/i

// Năm xây
/(xây|xây dựng|xây năm)[:\s]*(\d{4})/i
/năm\s*xây[:\s]*(\d{4})/i

// Kết cấu
/(BTCT|bê tông cốt thép|btct|kiên cố)/i
/(nhà tạm|tạm bợ|tôn|gỗ)/i
/(cao cấp|full nội thất|hoàn thiện)/i

// Tình trạng
/(mới xây|vừa xây|mới sửa|mới hoàn thiện)/i
/(ở tốt|ở ngay|vào ở ngay|dọn vào ở)/i
/(xuống cấp|cũ|dột|nứt)/i

// Cho thuê
/(cho thuê|đang cho thuê|thu nhập|rental)/i
```

### Công thức khấu hao xây dựng

```
Giá trị xây dựng còn lại = Chi phí xây dựng × (1 - Tuổi nhà / Tuổi thọ)

Tuổi thọ tham khảo:
- Nhà tạm: 10 năm
- Nhà cấp 4: 20 năm  
- BTCT: 50 năm
- Cao cấp: 50 năm

Chi phí xây dựng tham khảo (2024):
- Nhà cấp 4: 3-5 triệu/m² sàn
- BTCT: 5-8 triệu/m² sàn
- Cao cấp: 8-15 triệu/m² sàn
```

---

## 3. Pháp lý 📜

> [!WARNING]
> **Cực kỳ ảnh hưởng giá** nhưng crawler khó lấy. Cần kết hợp auto-crawl + manual enrichment.

| Field | Type | Unit | Crawl Strategy | Mô tả |
|-------|------|------|----------------|--------|
| `legal.titleDeed` | `String` enum | — | Auto-crawl | Sổ đỏ / sổ hồng / chưa có sổ |
| `legal.ownerType` | `String` enum | — | Auto-crawl + NLP | Chính chủ hay môi giới |
| `legal.zoning` | `Boolean` | — | Manual / NLP | Có nằm trong quy hoạch không |
| `legal.dispute` | `Boolean` | — | Manual only | Có tranh chấp không |
| `legal.sharedAccess` | `Boolean` | — | NLP from description | Hẻm chung / lối đi chung |
| `legal.constructionPermit` | `Boolean` | — | NLP from description | Đã hoàn công chưa |

### Enum Values

```javascript
// legal.titleDeed
const TITLE_DEED_TYPES = {
  RED_BOOK: 'sổ đỏ',           // Quyền sử dụng đất
  PINK_BOOK: 'sổ hồng',        // Giấy chứng nhận QSDĐ + nhà ở
  PENDING: 'chờ sổ',           // Đang làm sổ
  NONE: 'chưa có sổ',          // Giảm giá 20-40%
};

// legal.ownerType
const OWNER_TYPES = {
  OWNER: 'chính chủ',          // Mua trực tiếp
  BROKER: 'môi giới',          // Qua trung gian
  UNKNOWN: 'không rõ',
};
```

### Crawl Patterns (Regex)

```javascript
// Pháp lý
/(sổ đỏ|sổ hồng|có sổ|sổ riêng|sổ chung)/i
/(chưa có sổ|chưa sổ|chờ sổ|giấy tay)/i

// Chính chủ
/(chính chủ|bán trực tiếp|không qua trung gian)/i
/(môi giới|trung gian|hoa hồng|commission)/i

// Quy hoạch
/(quy hoạch|QH|nằm trong quy hoạch|không quy hoạch)/i
/(không dính quy hoạch|không vướng QH|QH rõ ràng)/i

// Hoàn công
/(hoàn công|đã hoàn công|chưa hoàn công)/i

// Hẻm chung
/(hẻm chung|lối đi chung|ngõ chung|đường chung)/i
```

### Hệ số điều chỉnh giá pháp lý

```
- Sổ đỏ/hồng chính chủ: ×1.0 (baseline)
- Chờ sổ: ×0.8 - 0.9
- Chưa có sổ: ×0.6 - 0.8
- Có quy hoạch: ×0.5 - 0.7 (tùy mức độ)
- Tranh chấp: ×0.4 - 0.6
- Hẻm chung: ×0.9 - 0.95
```

---

## 4. Vị trí thực tế 📍

> [!NOTE]
> Ảnh hưởng trực tiếp đến giá. Một số fields crawl được từ mô tả, một số cần Google Maps API hoặc manual input.

| Field | Type | Unit | Crawl Strategy | Mô tả |
|-------|------|------|----------------|--------|
| `location.roadWidth` | `Number` | m | Auto-crawl | Đường trước nhà rộng bao nhiêu mét |
| `location.carAccess` | `Boolean` | — | NLP / calculated | Xe hơi vào được không (road ≥ 4m) |
| `location.alleyType` | `String` enum | — | NLP from description | Hẻm cụt hay thông |
| `location.distanceToMainRoad` | `Number` | m | NLP / Google Maps | Cách đường lớn bao xa |
| `location.flooding` | `Boolean` | — | Manual / historical data | Khu vực có ngập không |
| `location.noisy` | `Boolean` | — | Manual only | Có ồn không |
| `location.neighborhoodQuality` | `String` enum | — | Manual / NLP | Khu dân trí / an ninh |

### Enum Values

```javascript
// location.alleyType
const ALLEY_TYPES = {
  FRONTAGE: 'mặt tiền',     // Giá cao nhất
  THROUGH: 'hẻm thông',     // Giá trung bình
  DEAD_END: 'hẻm cụt',      // Giảm giá
};

// location.neighborhoodQuality
const NEIGHBORHOOD_QUALITIES = {
  HIGH: 'cao cấp',           // Khu biệt thự, an ninh
  GOOD: 'tốt',               // Dân trí cao, yên tĩnh
  AVERAGE: 'trung bình',     // Bình thường
  LOW: 'kém',                // Phức tạp
};
```

### Crawl Patterns (Regex)

```javascript
// Đường rộng
/(đường|hẻm)\s*(\d+[\.,]?\d*)\s*m/i
/rộng\s*(\d+[\.,]?\d*)\s*m/i
/hẻm\s*xe\s*(hơi|tải|máy)/i

// Hẻm
/(hẻm thông|hẻm cụt|hẻm xe hơi|hẻm xe máy)/i
/(mặt tiền|MT đường|mặt đường)/i

// Xe hơi
/(ô tô|xe hơi|xe tải)\s*(vào|đỗ|đậu|tới|được)/i
/(hẻm\s*(\d+)m)/ // → nếu ≥ 4m thì carAccess = true

// Khoảng cách đường lớn
/cách\s*(đường|mặt tiền|MT)\s*(\w+)\s*(\d+)\s*m/i
```

### Hệ số điều chỉnh giá vị trí

```
- Mặt tiền đường lớn (≥12m): ×1.5 - 2.5
- Mặt tiền đường nhỏ (6-12m): ×1.2 - 1.5  
- Hẻm xe hơi (4-6m): ×1.0 (baseline)
- Hẻm xe máy (2-4m): ×0.7 - 0.9
- Hẻm cụt: ×0.6 - 0.8
- Khu ngập: ×0.7 - 0.9
```

---

## 5. Tiện ích xung quanh 🏪

> [!TIP]
> Có thể **tính toán tự động** bằng Google Maps / OpenStreetMap API dựa trên tọa độ GPS.

| Field | Type | Unit | Crawl Strategy | Mô tả |
|-------|------|------|----------------|--------|
| `amenities.nearSchool` | `Boolean` | — | Maps API / NLP | Gần trường học (≤ 1km) |
| `amenities.nearMarket` | `Boolean` | — | Maps API / NLP | Gần chợ / siêu thị (≤ 500m) |
| `amenities.nearMetro` | `Boolean` | — | Maps API | Gần metro (≤ 1km) |
| `amenities.nearIndustrial` | `Boolean` | — | Maps API / NLP | Gần KCN / văn phòng (≤ 2km) |
| `amenities.nearPark` | `Boolean` | — | Maps API / NLP | Gần công viên / sông / hồ |
| `amenities.negativeFactors` | `[String]` | — | Maps API / Manual | Yếu tố tiêu cực gần đó |

### Negative Factors List

```javascript
const NEGATIVE_FACTORS = [
  'nghĩa trang',
  'bãi rác',
  'cột điện cao thế',
  'trạm xử lý nước thải',
  'nhà máy ô nhiễm',
  'đường ray xe lửa',
  'quán bar / karaoke',
];
```

### Maps API Strategy (Phase tương lai)

```javascript
// Sử dụng Google Places API hoặc OpenStreetMap Overpass API
// Input: lat, lng (từ geocoding address)
// Output: distance to nearest amenity of each type

async function calculateAmenities(lat, lng) {
  const amenityTypes = {
    nearSchool: { type: 'school', maxDistance: 1000 },
    nearMarket: { type: 'supermarket|store', maxDistance: 500 },
    nearMetro: { type: 'subway_station', maxDistance: 1000 },
    nearIndustrial: { type: 'industrial', maxDistance: 2000 },
    nearPark: { type: 'park', maxDistance: 1000 },
  };
  // ... query API for each type
}
```

### Crawl Patterns (NLP fallback)

```javascript
// Tiện ích từ mô tả
/(gần|cạnh|kế bên|đối diện)\s*(trường|chợ|siêu thị|metro|công viên|bệnh viện)/i
/(trường|chợ|metro|công viên)\s*(cách|chỉ)\s*(\d+)\s*(m|km|phút)/i

// Negative factors
/(nghĩa trang|bãi rác|cột điện|dây điện|nhà xác)/i
/(khu công nghiệp|nhà máy)/i  // Có thể positive hoặc negative
```

---

## Property Schema Update (Mongoose)

Dưới đây là schema mở rộng cho `Property.js` model, bổ sung các fields định giá:

```javascript
// === NEW: Land Info (Nhóm 1) ===
land: {
  actualArea: { type: Number, min: 0 },       // m² - diện tích thực tế
  frontWidth: { type: Number, min: 0 },        // m - mặt tiền
  depth: { type: Number, min: 0 },             // m - chiều sâu
  shape: {
    type: String,
    enum: ['vuông đẹp', 'nở hậu', 'tóp hậu', 'tam giác', 'méo / không vuông'],
  },
  elevation: {
    type: String,
    enum: ['cao hơn đường', 'bằng đường', 'thấp hơn đường'],
  },
  slope: { type: Boolean },
  direction: {
    type: String,
    enum: ['Bắc', 'Nam', 'Đông', 'Tây', 'Đông Bắc', 'Tây Bắc', 'Đông Nam', 'Tây Nam'],
  },
},

// === NEW: Building Info (Nhóm 2) ===
building: {
  type: {
    type: String,
    enum: ['đất trống', 'nhà tạm', 'nhà cấp 4', 'nhà 1 tầng', 'nhà nhiều tầng'],
  },
  yearBuilt: { type: Number, min: 1900 },
  yearRenovated: { type: Number, min: 1900 },
  structure: {
    type: String,
    enum: ['tạm', 'BTCT', 'cao cấp'],
  },
  condition: {
    type: String,
    enum: ['mới', 'ở tốt', 'xuống cấp'],
  },
  floors: { type: Number, min: 0 },
  rentable: { type: Boolean },
},

// === NEW: Legal Info (Nhóm 3) ===
legal: {
  titleDeed: {
    type: String,
    enum: ['sổ đỏ', 'sổ hồng', 'chờ sổ', 'chưa có sổ'],
  },
  ownerType: {
    type: String,
    enum: ['chính chủ', 'môi giới', 'không rõ'],
  },
  zoning: { type: Boolean },
  dispute: { type: Boolean },
  sharedAccess: { type: Boolean },
  constructionPermit: { type: Boolean },
},

// === NEW: Location Details (Nhóm 4) ===
location: {
  roadWidth: { type: Number, min: 0 },        // m
  carAccess: { type: Boolean },
  alleyType: {
    type: String,
    enum: ['mặt tiền', 'hẻm thông', 'hẻm cụt'],
  },
  distanceToMainRoad: { type: Number, min: 0 }, // m
  flooding: { type: Boolean },
  noisy: { type: Boolean },
  neighborhoodQuality: {
    type: String,
    enum: ['cao cấp', 'tốt', 'trung bình', 'kém'],
  },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number },
  },
},

// === NEW: Amenities (Nhóm 5) ===
amenities: {
  nearSchool: { type: Boolean },
  nearMarket: { type: Boolean },
  nearMetro: { type: Boolean },
  nearIndustrial: { type: Boolean },
  nearPark: { type: Boolean },
  negativeFactors: [{ type: String }],
},
```

---

## Data Source Priority

Mỗi field có thể fill bằng nhiều nguồn, theo thứ tự ưu tiên:

| Priority | Source | Reliability | Coverage |
|----------|--------|-------------|----------|
| 1 | **Structured fields trên website** | ⭐⭐⭐⭐⭐ | ~60% fields |
| 2 | **NLP từ description/title** | ⭐⭐⭐ | ~30% fields |
| 3 | **Google Maps / OSM API** | ⭐⭐⭐⭐ | Amenities + location |
| 4 | **Facebook post parsing** | ⭐⭐ | Varies |
| 5 | **Admin manual enrichment** | ⭐⭐⭐⭐⭐ | Any field |

---

## Data Completeness Score

Mỗi property sẽ được tính **DataCompletenessScore** (0-100%) để biết mức độ đầy đủ thông tin:

```javascript
const FIELD_WEIGHTS = {
  // Nhóm 1: Đất (40 điểm)
  'land.actualArea': 8,
  'land.frontWidth': 8,
  'land.depth': 5,
  'land.shape': 7,
  'land.elevation': 4,
  'land.slope': 3,
  'land.direction': 5,

  // Nhóm 2: Nhà (15 điểm)
  'building.type': 5,
  'building.yearBuilt': 3,
  'building.structure': 4,
  'building.condition': 3,

  // Nhóm 3: Pháp lý (25 điểm)
  'legal.titleDeed': 10,
  'legal.ownerType': 5,
  'legal.zoning': 5,
  'legal.dispute': 5,

  // Nhóm 4: Vị trí (15 điểm)
  'location.roadWidth': 5,
  'location.carAccess': 3,
  'location.alleyType': 4,
  'location.distanceToMainRoad': 3,

  // Nhóm 5: Tiện ích (5 điểm)
  'amenities.nearSchool': 1,
  'amenities.nearMarket': 1,
  'amenities.nearMetro': 1,
  'amenities.nearIndustrial': 1,
  'amenities.nearPark': 1,
};
// TOTAL = 100
```

---

## Impact on Existing Specs

### Roadmap Changes

- **Phase 4 (Crawl Engine)**: DataValidator phải parse 5 nhóm data fields mới
- **Phase 4c (Data Validation)**: Thêm NLP extraction logic cho các fields từ description
- **Phase 6 (Good Price Detection)**: PriceAnalyzer sử dụng hệ số điều chỉnh từ pháp lý + vị trí
- **Phase mới (Future)**: Google Maps API integration cho amenities auto-calculation

### Property Model Changes

- Thêm 5 sub-schemas mới: `land`, `building`, `legal`, `location`, `amenities`
- Thêm field `dataCompletenessScore` (calculated)
- Di chuyển `frontWidth` hiện tại vào `land.frontWidth`

### Crawl Config Changes

- DOM selector mapping cần thêm selectors cho các fields mới
- NLP service cần build patterns cho Vietnamese BĐS descriptions

---

## Implementation Priority

| Phase | Action | Effort |
|-------|--------|--------|
| Phase 4 | Extract `land.*`, `building.*`, `legal.titleDeed` từ structured fields | Medium |
| Phase 4c | NLP extraction từ description cho remaining fields | High |
| Phase 6 | Tích hợp hệ số điều chỉnh vào PriceAnalyzer | Medium |
| Phase 7 | Facebook parser extract đầy đủ 5 nhóm | Medium |
| Future | Google Maps API cho amenities | Low |
| Future | Admin manual enrichment UI | Low |
