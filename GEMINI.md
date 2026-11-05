# Rules & Workflow for comsan-meeting-system

## Git Push Workflow
- **Automatic GitHub Push**:
  - เมื่อผู้ใช้สั่งให้แก้ไขไฟล์ หรือเพิ่ม/ลบ/ปรับปรุงโค้ดในโปรเจกต์นี้ เมื่อทำการแก้ไขเสร็จแล้วให้รัน `git add`, `git commit` (ระบุข้อความอธิบายสิ่งที่แก้ไขอย่างชัดเจน) และ `git push origin main` ขึ้น GitHub ให้โดยอัตโนมัติทันที
  - เมื่อผู้ใช้แจ้งว่าตนเองได้แก้ไขไฟล์แล้ว และต้องการให้พุช ให้ตรวจสอบ `git status`, ทำการ stage, commit และ push ขึ้น GitHub ทันที
  - แจ้งสถานะการ push ให้ผู้ใช้ทราบหลังจากเสร็จสิ้นทุกครั้ง
