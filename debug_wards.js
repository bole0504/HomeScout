const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./server/src/utils/location/provinces.json', 'utf8'));

const hcm = data.find(p => p.code === 79);
if (hcm) {
    const phuNhuan = hcm.districts.find(d => d.name.includes('Phú Nhuận'));
    if (phuNhuan) {
        console.log(JSON.stringify(phuNhuan.wards, null, 2));
    } else {
        console.log('Phú Nhuận not found in HCM');
    }
} else {
    console.log('HCM not found');
}
