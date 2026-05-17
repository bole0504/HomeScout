const addressParser = require('./server/src/utils/location/AddressParser');

const testText = "CHỐT NHANH CHỈ 4 ĐỒNG 8 CÓ NGAY NHÀ PHÙNG VĂN CUNG P7 PHÚ NHUẬN- 56m²- SHR- HẺM OTO THÔNG THOÁNG";
const result = addressParser.parse(testText);

console.log(JSON.stringify(result, null, 2));
