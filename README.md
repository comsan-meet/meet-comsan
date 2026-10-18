# ระบบการประชุมชมรมคมสัน (COMSAN Meeting System)

Real-time Meeting Management System for COMSAN Club (Modular Architecture V6)

## 📌 คุณสมบัติของระบบ (Features)
- **ระบบเช็คชื่อสมาชิก (Attendance Check-in):** รองรับการเช็คชื่อผ่าน QR Code หรือการลงชื่อโดย Admin
- **ระบบโหวต / ญัตติการประชุม (Motions & Voting):** โหวตแบบ Real-time พร้อมแสดงผลทันที
- **ห้องแชทและการส่งไฟล์ (Live Chat & File Sharing):** สื่อสารระหว่างการประชุมและแนบไฟล์
- **การยกมือ (Raise Hand Queue):** ระบบคิวสำหรับผู้ที่ต้องการพูด
- **ปฏิทินกิจกรรมและการสุ่ม (Calendar & Randomizer):** จัดการกำหนดการและสุ่มเลือกสมาชิก

---

## 🚀 วิธีการติดตั้งและเริ่มใช้งาน (Getting Started)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. เริ่มต้นรันเซิร์ฟเวอร์
```bash
npm start
# หรือ
node server.js
```

### 3. การเข้าใช้งาน
- **คอมพิวเตอร์ Admin/Host:** เข้าผ่านบราวเซอร์ที่ `http://localhost:3000`
- **มือถือสมาชิก (ผ่านเครือข่าย Wi-Fi เดียวกัน):** เข้าผ่าน IP เครื่องโฮสต์ เช่น `http://192.168.x.x:3000`

---

## 🌐 วิธีเปิดเซิร์ฟเวอร์ผ่าน Cloudflare Tunnel (สำหรับการใช้งานภายนอกเครือข่าย)
หากต้องการให้สมาชิกหรือ Admin นอกวง Wi-Fi เข้าใช้งาน แนะนำให้เปิด Cloudflare Tunnel:
1. เปิดเซิร์ฟเวอร์ตามขั้นตอนปกติ (`node server.js`)
2. เปิด Command Prompt หรือ Terminal หน้าต่างใหม่อีกหน้าต่าง
3. รันคำสั่ง:
   ```bash
   npx cloudflared tunnel --url http://localhost:3000
   ```
4. คัดลอกลิงก์ที่ระบบแสดงขึ้นมา (เช่น `https://xxxx-xxxx.trycloudflare.com`) ส่งให้ผู้เข้าร่วมประชุม

---

## ⚠️ ข้อควรระวัง
- ระหว่างที่รัน Server อยู่ ห้ามปิดเครื่องคอมพิวเตอร์ที่เป็นโฮสต์
- หากต้องการปิดเซิร์ฟเวอร์ ให้กด `Ctrl + C` ในหน้าต่าง Terminal
