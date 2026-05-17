const { expect } = require('chai');
const addressParser = require('../src/utils/location/AddressParser');

describe('AddressParser Unit Tests', () => {
  const testCases = [
    {
      title: "SIÊU HIẾM! NHÀ PHỐ DT LỚN TT TÂN BÌNH, NGAY TUYẾN METRO SỐ 2, GIÁ THẤP NHẤT",
      description: "Một BĐS hiếm hoi còn sót lại ngay lõi trung tâm phù hợp nhà ở, làm văn phòng, hoặc đầu tư dài hạn. * DT lớn: Ngang 11m x dài 21m. CN 227.23m². * Thế đất đẹp, vuông vức cực kỳ lý tưởng xây nhà phố cao cấp hoặc biệt thự villa. * Nằm trong khu compound riêng biệt chỉ 6 căn, xung quanh là villa biệt thự liền kề. * Môi trường sống an ninh, yên tĩnh, dân trí cao.Vị trí vàng - đắc địa. * Nằm trên trục đường Trường Chinh, tuyến đường huyết mạch kết nối t...",
      expected: {
        city: "Thành phố Hồ Chí Minh",
        district: "Quận Tân Bình"
      }
    },
    {
      title: "TÔI CHỦ NHÀ BÁN NHÀ 6 PHÒNG NGỦ, 40M2 5T TẠI PHÚ ĐÔ, NGÕ Ô TÔ TRÁNH, TRƯỚC NHÀ 3M CHỈ 8 TỶ",
      description: "Tôi chính chủ trên sổ đỏ bán nhà Lê Quang Đạo (Phú Đô), Nam Từ Liêm. Nhà 35/40m² x 5 Tầng.6 phòng 3 vệ sinh - full nội thất - ô chờ thang máy sẵn có. (Có thể làm 6 phòng dòng tiền cho thuê hoặc sửa làm 8p cho thuê. Nhà 5 tầng: + Tầng 1: Phòng khách và bếp, WC. + Tầng 2,3: Mỗi tầng 2 ngủ, WC. + Tầng 4: 1 phòng to + 1 phòng nhỏ và sân phơi. + Tầng 5: Tum + sân trồng cây...- Phía sau có khe thoáng. Phòng nào đều gió thoáng tự nhiên, ánh sáng ngập tr...",
      expected: {
        city: "Thành phố Hà Nội",
        district: "Quận Nam Từ Liêm",
        ward: "Phường Phú Đô"
      }
    },
    {
      title: "BÁN NHÀ HẺM XE HƠI TRUNG TÂM VŨNG TÀU, NHÀ PHỐ HXH VŨNG TÀU",
      description: "HOT NHÀ PHỐ VŨNG TÀU HẺM Ô TÔ BA CU, FULL NỘI THẤT CAO CẤP CHỈ 8,2 TỶ Sở hữu ngay căn nhà phố trung tâm Vũng Tàu nằm tại đường Ba Cu, Phường 4 khu vực cực hiếm nhà bán, cách biển Bãi Trước chỉ vài phút di chuyển. Vị trí vàng trung tâm: Hẻm ô tô rộng, cách mặt tiền Ba Cu khoảng 60m Thông ra Yên Bái di chuyển thuận tiện Gần biển Bãi Trước, chợ, trường học, trung tâm thương mại Khu dân cư văn minh, an ninh, thích hợp ở lâu dài hoặc khai thác...",
      expected: {
        city: "Tỉnh Bà Rịa - Vũng Tàu",
        district: "Thành phố Vũng Tàu", // Note: The user's expected data had "Thành phố Bà Rịa" but text says Vũng Tàu center. 
        ward: "Phường 4"
      }
    },
    {
      title: "BÁN ĐẤT TẶNG NHÀ,ĐƯỜNG OTO TRUNG TÂM BẮC NHA TRANG. LH O399.57.5577",
      description: "BÁN NHANH LÔ ĐẤT BẮC NHA TRANG - Diện tích 145.2m² ngang 6m - Đường rộng 3,2m quy hoạch 27m nối xuống bãi tắm biển. -Hướng đông nam - Nhà cấp 4 sạch đẹp, mát mẻ: 3PN, 1wc, sân đỗ oto rộng. - Cách bãi tắm biển 5p chạy bộ - Cách chợ Vĩnh Hải, bệnh viện 5p chạy xe - Cách trường học 1,2,3 từ 3p-7p - Cách bến xe Phía Bắc 500m - Cách trường đại học Nha Trang, Tôn Đức Thắng 10p Phù hợp cho người mua ở, xây nhà vườn, sửa cho thuê, bán. Đặc biệt, giá chưa...",
      expected: {
        city: "Tỉnh Khánh Hòa",
        district: "Thành phố Nha Trang",
        ward: "Phường Vĩnh Hải"
      }
    },
    {
      title: "NHANH CHỈ 4 ĐỒNG 8 CÓ NGAY NHÀ PHÙNG VĂN CUNG P7 PHÚ NHUẬN- 56M2- SHR- HẺM OTO THÔNG THOÁNG",
      description: "CHỐT NHANH CHỈ 4 ĐỒNG 8 CÓ NGAY NHÀ PHÙNG VĂN CUNG P7 PHÚ NHUẬN- 56m²- SHR- HẺM OTO THÔNG THOÁNGDiện tích công nhận: 4 x 14 ( 56m²) Kết cấu hoàn công 1 trệt 2 lầu có 3 phòng ngủ -3wc và có cả phòng thờ phía trên và khoảng sân thượng thoáng mát Giá bán chỉ 4 tỷ 800 triệu bao giấy tờ Pháp lý hoàn chỉnh, mua chốt trong ngàyHẻm oto thông thoáng 5m cách mặt tiêng chỉ 30m, thông các hướng, nhà nằm trong khu vực dân trí cao và văn hoá Gần các trục đường...",
      expected: {
        city: "Thành phố Hồ Chí Minh",
        district: "Quận Phú Nhuận",
        ward: "Phường 7"
      }
    }
  ];

  testCases.forEach((tc, index) => {
    it(`should correctly parse address from text case ${index + 1}`, () => {
      const textToSearch = `${tc.title} ${tc.description}`;
      const result = addressParser.parse(textToSearch);

      if (tc.expected.city) {
        expect(result.city).to.equal(tc.expected.city);
      }
      if (tc.expected.district) {
        expect(result.district).to.equal(tc.expected.district);
      }
      if (tc.expected.ward) {
        expect(result.ward).to.equal(tc.expected.ward);
      }
    });
  });
});
