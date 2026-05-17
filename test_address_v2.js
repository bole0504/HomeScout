const addressParser = require('./server/src/utils/location/AddressParser');

const texts = [
    "CHỐT NHANH CHỈ 4 ĐỒNG 8 CÓ NGAY NHÀ PHÙNG VĂN CUNG P7 PHÚ NHUẬN",
    "BÁN ĐẤT TẶNG NHÀ,ĐƯỜNG OTO TRUNG TÂM BẮC NHA TRANG. LH O399.57.5577",
    "Bán lô đất Bắc Nha Trang - Diện tích 145.2m2 ngang 6m - Đường rộng 3.2m"
];

texts.forEach(t => {
    console.log(`\nInput: ${t}`);
    console.log(JSON.stringify(addressParser.parse(t), null, 2));
});
