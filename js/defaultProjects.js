/**
 * Default Sample Projects for COMSAN Club
 */
const defaultProjects = [
  {
    id: 'PRJ-2569-01',
    title: 'โครงการค่ายสันทนาการสัมพันธ์ COMSAN Camp ประจำปี 2569',
    code: 'CS-PRJ-2569-01',
    academicYear: '2569',
    status: 'IN_PROGRESS', // 'IN_PROGRESS' | 'COMPLETED' | 'PLANNING'
    startDate: '2026-11-10',
    endDate: '2026-11-12',
    location: 'วิทยาลัยการคอมพิวเตอร์ และอุทยานแห่งชาติน้ำพอง จ.ขอนแก่น',
    budget: '28,500 บาท',
    summary: 'ค่ายพัฒนาทักษะการสันทนาการ การเป็นผู้นำ และการทำงานเป็นทีมสำหรับสมาชิกชมรมและนักศึกษาที่สนใจ',
    description: 'โครงการค่ายสันทนาการสัมพันธ์ จัดขึ้นเพื่อฝึกทักษะการเป็นผู้นำนันทนาการ กิจกรรมสร้างสรรค์ การร้องเพลงและเต้นประกอบจังหวะ รวมถึงการบำเพ็ญประโยชน์ต่อชุมชน โดยเปิดโอกาสให้สมาชิกได้ฝึกปฏิบัติจริงในการจัดค่ายและทำกิจกรรมร่วมกัน',
    googleDriveUrl: 'https://drive.google.com/drive/folders/1comsan_camp_2569',
    projectDocument: {
      title: 'เล่มโครงการค่ายสันทนาการสัมพันธ์_ฉบับอนุมัติ.pdf',
      url: 'https://drive.google.com/file/d/1comsan_camp_doc/view',
      updatedAt: '2026-10-20'
    },
    budgetDocument: {
      title: 'เล่มงบประมาณและบัญชีรายจ่ายค่ายสันทนาการ_2569.pdf',
      url: 'https://drive.google.com/file/d/1comsan_camp_budget/view',
      totalBudget: '28,500 บาท',
      updatedAt: '2026-10-22'
    },
    leaders: [
      {
        id: 'LDR-1',
        name: 'นายอิทธิพัทธ์ พืชผักหวาน',
        nickname: 'บอม',
        role: 'ประธานโครงการ',
        details: 'ดูแลภาพรวมการบริหารโครงการ การประสานงานภายนอก และการจัดสรรงบประมาณ',
        phone: '081-234-5678',
        kkuMail: 'ittipat.p@kkumail.com',
        contactLink: 'https://instagram.com/ittipat_bom',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
      }
    ],
    members: [
      {
        id: 'MBR-1',
        name: 'นางสาวพิมพ์ชนก รัตนสุวรรณ',
        nickname: 'พลอย',
        role: 'หัวหน้าฝ่ายกิจกรรมและเกม',
        details: 'ออกแบบฐานกิจกรรม กิจกรรมกลุ่มสัมพันธ์ และการประเมินผลความสุข',
        phone: '089-876-5432',
        kkuMail: 'pimchanok.r@kkumail.com',
        contactLink: 'https://instagram.com/ploy_cs',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
      },
      {
        id: 'MBR-2',
        name: 'นายกิตติศักดิ์ พรหมดี',
        nickname: 'ฟีฟ่า',
        role: 'หัวหน้าฝ่ายสถานที่และสวัสดิการ',
        details: 'จัดเตรียมอุปกรณ์ค่าย อาหาร น้ำดื่ม และการปฐมพยาบาลเบื้องต้น',
        phone: '082-345-6789',
        kkuMail: 'kittisak.p@kkumail.com',
        contactLink: 'https://line.me/ti/p/~fifa_cs',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
      }
    ],
    advisors: [
      {
        id: 'ADV-1',
        name: 'ผศ.ดร.สมชาย ใจดี',
        role: 'อาจารย์ที่ปรึกษาโครงการ',
        department: 'วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น',
        details: 'ให้คำปรึกษาด้านการจัดกิจกรรมนอกสถานที่ การขออนุมัติโครงการ และความปลอดภัยของนักศึกษา',
        phone: '043-009700 ต่อ 44521',
        kkuMail: 'somchai.j@kku.ac.th',
        contactLink: 'https://computing.kku.ac.th',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
      }
    ],
    smoOfficers: [
      {
        id: 'SMO-1',
        name: 'นายณภัทร วงศ์เจริญ',
        nickname: 'ภัทร',
        role: 'อุปนายกฝ่ายกิจกรรม สโมสรนักศึกษา',
        details: 'ผู้ประสานงานและกำกับดูแลโครงการในนามสโมสรนักศึกษา วิทยาลัยการคอมพิวเตอร์',
        phone: '088-777-9911',
        kkuMail: 'naphat.w@kkumail.com',
        contactLink: 'https://instagram.com/smo_cp_kku',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
      }
    ],
    createdAt: '2026-10-15T08:00:00Z',
    updatedAt: '2026-10-25T12:00:00Z'
  },
  {
    id: 'PRJ-2568-02',
    title: 'โครงการ KKU Carnival & Freshy Day ประจำปี 2568',
    code: 'CS-PRJ-2568-02',
    academicYear: '2568',
    status: 'COMPLETED',
    startDate: '2025-09-18',
    endDate: '2025-09-20',
    location: 'ศูนย์ประชุมอเนกประสงค์กาญจนาภิเษก มหาวิทยาลัยขอนแก่น',
    budget: '45,000 บาท',
    summary: 'การแสดงสันทนาการและสร้างบรรยากาศต้อนรับนักศึกษาใหม่ในงาน KKU Carnival ประจำปีการศึกษา 2568',
    description: 'โครงการนำทีมสันทนาการชมรมเข้าร่วมแสดงเปิดงาน สร้างความสนุกสนาน และจัดกิจกรรมกระชับมิตรแก่นักศึกษาใหม่ทุกคณะ ณ ศูนย์ประชุมกาญจนาภิเษก มีผู้เข้าร่วมกว่า 5,000 คน ได้รับการประเมินความพึงพอใจ 96.8%',
    googleDriveUrl: 'https://drive.google.com/drive/folders/1kku_carnival_2568',
    projectDocument: {
      title: 'เล่มรายงานสรุปผลโครงการ_KKU_Carnival_2568.pdf',
      url: 'https://drive.google.com/file/d/1kku_carnival_doc/view',
      updatedAt: '2025-09-25'
    },
    budgetDocument: {
      title: 'สรุปบัญชีรายรับ-รายจ่าย_KKU_Carnival_2568.pdf',
      url: 'https://drive.google.com/file/d/1kku_carnival_budget/view',
      totalBudget: '45,000 บาท',
      updatedAt: '2025-09-25'
    },
    leaders: [
      {
        id: 'LDR-2',
        name: 'นายอิทธิพัทธ์ พืชผักหวาน',
        nickname: 'บอม',
        role: 'ประธานโครงการ',
        details: 'ผู้กำกับการแสดงสันทนาการและประสานงานฝ่ายจัดงานส่วนกลาง',
        phone: '081-234-5678',
        kkuMail: 'ittipat.p@kkumail.com',
        contactLink: 'https://instagram.com/ittipat_bom',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
      }
    ],
    members: [
      {
        id: 'MBR-3',
        name: 'นายกิตติศักดิ์ พรหมดี',
        nickname: 'ฟีฟ่า',
        role: 'ผู้ควบคุมขบวนและเวที',
        details: 'ดูแลระบบเสียงและคิวการแสดงของนักแสดงสันทนาการบนเวทีใหญ่',
        phone: '082-345-6789',
        kkuMail: 'kittisak.p@kkumail.com',
        contactLink: 'https://line.me/ti/p/~fifa_cs',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
      }
    ],
    advisors: [
      {
        id: 'ADV-2',
        name: 'อาจารย์ วราภรณ์ วิริยะพร',
        role: 'อาจารย์ที่ปรึกษากิจกรรมนักศึกษา',
        department: 'ฝ่ายพัฒนานักศึกษา วิทยาลัยการคอมพิวเตอร์',
        details: 'ที่ปรึกษาด้านการประสานงานมหาวิทยาลัยและงบประมาณสนับสนุน',
        phone: '043-009700 ต่อ 44520',
        kkuMail: 'waraporn.v@kku.ac.th',
        contactLink: 'https://computing.kku.ac.th',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'
      }
    ],
    smoOfficers: [
      {
        id: 'SMO-2',
        name: 'นางสาวศิริพร บุญรักษา',
        nickname: 'แนน',
        role: 'นายกสโมสรนักศึกษา',
        details: 'ผู้รับผิดชอบการดำเนินงานภาพรวมของสโมสรนักศึกษา',
        phone: '086-555-4321',
        kkuMail: 'siriporn.b@kkumail.com',
        contactLink: 'https://instagram.com/smo_cp_kku',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150'
      }
    ],
    createdAt: '2025-08-10T08:00:00Z',
    updatedAt: '2025-09-26T12:00:00Z'
  },
  {
    id: 'PRJ-2569-03',
    title: 'โครงการอบรมเชิงปฏิบัติการ MC & Recreation Leader 2027',
    code: 'CS-PRJ-2569-03',
    academicYear: '2569',
    status: 'PLANNING',
    startDate: '2027-01-15',
    endDate: '2027-01-16',
    location: 'ห้องประชุมวิทยวิภาส 1 คณะวิทยาศาสตร์ มหาวิทยาลัยขอนแก่น',
    budget: '18,000 บาท',
    summary: 'อบรมเทคนิคการเป็นพิธีกรนันทนาการ การใช้ไมโครโฟน และการควบคุมบรรยากาศในเวทีระดับมหาวิทยาลัย',
    description: 'โครงการส่งเสริมศักยภาพสมาชิกด้านการพูดในที่สาธารณะ การเป็น MC กิจกรรม และการเป็นวิทยากรสันทนาการ โดยเชิญวิทยากรผู้ทรงคุณวุฒิภายนอกมาให้ความรู้และฝึกปฏิบัติจริง',
    googleDriveUrl: 'https://drive.google.com/drive/folders/1mc_recreation_2027',
    projectDocument: {
      title: 'ร่างข้อเสนอโครงการ_MC_Recreation_Leader_2027.pdf',
      url: 'https://drive.google.com/file/d/1mc_doc/view',
      updatedAt: '2026-10-18'
    },
    budgetDocument: {
      title: 'ประมาณการงบประมาณ_MC_Recreation_Leader_2027.pdf',
      url: 'https://drive.google.com/file/d/1mc_budget/view',
      totalBudget: '18,000 บาท',
      updatedAt: '2026-10-18'
    },
    leaders: [
      {
        id: 'LDR-3',
        name: 'นางสาวพิมพ์ชนก รัตนสุวรรณ',
        nickname: 'พลอย',
        role: 'ผู้รับผิดชอบโครงการ',
        details: 'ประสานงานวิทยากร จัดทำหลักสูตรอบรม และจัดการลงทะเบียน',
        phone: '089-876-5432',
        kkuMail: 'pimchanok.r@kkumail.com',
        contactLink: 'https://instagram.com/ploy_cs',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
      }
    ],
    members: [
      {
        id: 'MBR-4',
        name: 'นายอิทธิพัทธ์ พืชผักหวาน',
        nickname: 'บอม',
        role: 'ผู้ช่วยวิทยากรและฝ่ายเทคนิค',
        details: 'ดูแลระบบเครื่องเสียง สื่อการสอน และอุปกรณ์การฝึกปฏิบัติ',
        phone: '081-234-5678',
        kkuMail: 'ittipat.p@kkumail.com',
        contactLink: 'https://instagram.com/ittipat_bom',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
      }
    ],
    advisors: [
      {
        id: 'ADV-3',
        name: 'ผศ.ดร.สมชาย ใจดี',
        role: 'อาจารย์ที่ปรึกษาโครงการ',
        department: 'วิทยาลัยการคอมพิวเตอร์ มหาวิทยาลัยขอนแก่น',
        details: 'ที่ปรึกษาโครงการและการเชิญวิทยากร',
        phone: '043-009700 ต่อ 44521',
        kkuMail: 'somchai.j@kku.ac.th',
        contactLink: 'https://computing.kku.ac.th',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
      }
    ],
    smoOfficers: [
      {
        id: 'SMO-3',
        name: 'นายณภัทร วงศ์เจริญ',
        nickname: 'ภัทร',
        role: 'อุปนายกฝ่ายกิจกรรม สโมสรนักศึกษา',
        details: 'ผู้ประสานงานสโมสรนักศึกษา',
        phone: '088-777-9911',
        kkuMail: 'naphat.w@kkumail.com',
        contactLink: 'https://instagram.com/smo_cp_kku',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
      }
    ],
    createdAt: '2026-10-18T10:00:00Z',
    updatedAt: '2026-10-25T14:00:00Z'
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = defaultProjects;
}
if (typeof window !== 'undefined') {
  window.defaultProjects = defaultProjects;
}
