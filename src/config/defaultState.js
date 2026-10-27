const todayISO = new Date().toISOString().slice(0, 10);
const defaultProjects = require('./defaultProjects');

const defaultState = {
  meeting: {
    title: '',
    format: 'ONSITE', // 'ONSITE' | 'ONLINE'
    location: '',
    onlinePlatform: 'GOOGLE_MEET', // 'GOOGLE_MEET' | 'ZOOM' | 'TEAMS' | 'DISCORD' | 'WEBEX' | 'OTHER'
    onlineUrl: '',
    onlinePasscode: '',
    checkinToken: null,
    date: todayISO,
    endDate: todayISO,
    startTime: '17:00',
    lateTime: '17:15',
    endTime: '19:00',
    startedAtMs: null,
    isStarted: false,
    isEnded: false,
    realtimeVoting: true,
    showSeatsToUsers: true
  },
  users: [
    {
      id: 'COMSAN-01',
      firstName: 'อิทธิพัทธ์',
      lastName: 'พืชผักหวาน',
      nickname: 'ประธานคมสัน',
      year: '2',
      major: 'AI',
      position: 'ประธานชมรม',
      password: '123',
      checkedIn: false,
      checkInTimeStr: '-',
      checkInTimestamp: null,
      isLate: false,
      isLeave: false,
      leaveReason: '',
      attendedMinutes: 0,
      raiseHandCount: 0,
      note: '',
      noteSubmitted: false,
      filePermission: 'NONE',
      streamPermission: 'NONE' // 'NONE' | 'PENDING' | 'APPROVED'
    },
    {
      id: 'COMSAN-02',
      firstName: 'กมลชนก',
      lastName: 'ใจดี',
      nickname: 'พลอย',
      year: '2',
      major: 'CS',
      position: 'เลขานุการ',
      password: '123',
      checkedIn: false,
      checkInTimeStr: '-',
      checkInTimestamp: null,
      isLate: false,
      isLeave: false,
      leaveReason: '',
      attendedMinutes: 0,
      raiseHandCount: 0,
      note: '',
      noteSubmitted: false,
      filePermission: 'NONE',
      streamPermission: 'NONE'
    },
    {
      id: 'COMSAN-03',
      firstName: 'ณัฐพงศ์',
      lastName: 'สายฮา',
      nickname: 'เจมส์',
      year: '1',
      major: 'IT',
      position: 'ฝ่ายสันทนาการ',
      password: '123',
      checkedIn: false,
      checkInTimeStr: '-',
      checkInTimestamp: null,
      isLate: false,
      isLeave: false,
      leaveReason: '',
      attendedMinutes: 0,
      raiseHandCount: 0,
      note: '',
      noteSubmitted: false,
      filePermission: 'NONE',
      streamPermission: 'NONE'
    }
  ],
  raiseHandQueue: [],
  motions: [],
  chats: [],
  files: [],
  chatLogs: [],
  randomizer: {
    lastWinner: null,
    history: []
  },
  activeStream: null, // { streamerId, streamerName, mode: 'CAMERA'|'SCREEN', frameDataUrl }
  meetingHistory: [], // Array of archived past meeting summaries
  lastMeetingSummary: null,
  calendarEvents: [
    {
      id: 'evt_sample_1',
      title: 'เตรียมงาน Open House ชมรมคมสัน 2569',
      description: 'ประชุมวางแผนและจัดเตรียมบูธสาธิต AI / Web Application พร้อมตรวจเช็คอุปกรณ์นิทรรศการ',
      startDate: todayISO,
      startTime: '13:00',
      endDate: todayISO,
      endTime: '16:00',
      isAllDay: false,
      location: 'ห้องประชุมสุพรรณิการ์ ชั้น 2',
      category: 'EVENT',
      color: 'indigo',
      assignees: [
        {
          userId: 'COMSAN-01',
          name: 'อิทธิพัทธ์ พืชผักหวาน (ประธานคมสัน)',
          role: 'ผู้รับผิดชอบหลัก / ดูแลภาพรวมบูธ'
        },
        {
          userId: 'COMSAN-03',
          name: 'ณัฐพงศ์ สายฮา (เจมส์)',
          role: 'ประสานงานฝ่ายสันทนาการและของรางวัล'
        }
      ],
      createdSource: 'MANUAL',
      createdAt: new Date().toISOString()
    },
    {
      id: 'evt_sample_2',
      title: 'ประชุมคณะกรรมการชมรมประจำเดือน',
      description: 'สรุปงบประมาณและผลการดำเนินกิจกรรมไตรมาสที่ 3 พร้อมวางแนวทางกิจกรรมค่ายอาสา',
      startDate: todayISO,
      startTime: '17:00',
      endDate: todayISO,
      endTime: '19:00',
      isAllDay: false,
      location: 'Google Meet (ออนไลน์)',
      category: 'MEETING',
      color: 'primary',
      assignees: [
        {
          userId: 'COMSAN-02',
          name: 'กมลชนก ใจดี (พลอย)',
          role: 'จัดทำวาระการประชุมและบันทึกรายงาน'
        }
      ],
      createdSource: 'MANUAL',
      createdAt: new Date().toISOString()
    },
    {
      id: 'evt_sample_3',
      title: 'กำหนดส่งแบบร่างโครงการค่ายไอทีเพื่อน้อง',
      description: 'ส่งเอกสารข้อเสนอโครงการและแผนค่าใช้จ่ายให้กองพัฒนานักศึกษาตรวจสอบ',
      startDate: todayISO,
      startTime: '23:59',
      endDate: todayISO,
      endTime: '23:59',
      isAllDay: true,
      location: 'ระบบเอกสารอิเล็กทรอนิกส์ มหาวิทยาลัย',
      category: 'DEADLINE',
      color: 'rose',
      assignees: [
        {
          userId: 'COMSAN-01',
          name: 'อิทธิพัทธ์ พืชผักหวาน (ประธานคมสัน)',
          role: 'ลงนามรับรองโครงการ'
        },
        {
          userId: 'COMSAN-02',
          name: 'กมลชนก ใจดี (พลอย)',
          role: 'รวบรวมเอกสารแนบและยื่นคำขอ'
        }
      ],
      createdSource: 'ICS_IMPORT',
      createdAt: new Date().toISOString()
    }
  ],
  projects: defaultProjects,
  systemVersion: '2.0.1',
  versionNotes: {
    version: '2.0.1',
    releaseDate: '18 ตุลาคม 2569',
    features: [
      {
        title: 'ระบบตรึงมติที่เปิดอยู่ไว้ด้านบนสุด (Active Motion Priority)',
        desc: 'แสดงญัตติที่กำลังเปิดให้ลงคะแนนไว้ตำแหน่งบนสุดของการ์ดโหวตโดยอัตโนมัติ เพื่อความสะดวกและรวดเร็วของสมาชิก'
      },
      {
        title: 'ระบบสถานะผู้เข้าร่วมประชุมแบบเรียลไทม์ (Live Presence)',
        desc: 'แสดงจุดสีเขียวเฉพาะสมาชิกที่เช็คชื่อเข้าประชุมและกำลังออนไลน์อยู่ในห้องสนทนา พร้อมแจ้งเตือนเมื่อสมาชิกเข้า/ออก'
      },
      {
        title: 'ระบบควบคุมการเช็คชื่อตามสถานะการประชุม (Check-in Guard)',
        desc: 'ป้องกันการเช็คชื่อทั้ง QR Code และการพิมพ์รหัส หากผู้ดูแลระบบยังไม่ได้กดเริ่มการประชุมอย่างเป็นทางการ'
      },
      {
        title: 'ระบบปิดการลงมติอัตโนมัติเมื่อสิ้นสุดการประชุม',
        desc: 'สั่งปิดญัตติการลงคะแนนทั้งหมดทันทีเมื่อผู้ดูแลระบบกดจบการประชุม เพื่อความโปร่งใสและถูกต้อง'
      },
      {
        title: 'ระบบไข่อีสเตอร์ลับ (Secret Easter Egg: Resignation Request)',
        desc: 'เพิ่มลูกเล่นคำร้องขอลาออกจากชมรมในหน้าตั้งค่า เมื่อแตะโลโก้ระบบ 6 ครั้ง พร้อมเงื่อนไขแนบใบปริญญาบัตรแสนสนุก'
      },
      {
        title: 'หน้าต่างบันทึกการอัปเดตระบบ (Release Notes)',
        desc: 'แสดงรายละเอียดฟีเจอร์ใหม่ที่เพิ่มเข้ามาและรายการบั๊กที่ได้รับการแก้ไขอย่างครบถ้วนเมื่อแตะที่เลขเวอร์ชัน'
      }
    ],
    bugFixes: [
      {
        title: 'แก้ไขปัญหาการข้ามหน้า Login เข้าสู่ระบบอัตโนมัติ',
        desc: 'ปรับปรุงระบบ Authentication ให้ต้องกรอกรหัสผ่านเพื่อความปลอดภัย'
      },
      {
        title: 'แก้ไขปุ่มควบคุมการประชุมบนหน้าจอมือถือ',
        desc: 'ปรับปรุงปุ่ม "เปิดการประชุม" บนสมาร์ตโฟนให้กว้างเต็มแถว ไม่บีบแคบหรือตัวอักษรตัดบรรทัดแนวตั้ง'
      },
      {
        title: 'แก้ไขปัญหา QR Code ประจำตัวสมาชิกหายเมื่อรีเฟรชหน้าเว็บ',
        desc: 'ระบบจะเรนเดอร์และสร้าง QR Code สำหรับเช็คชื่อให้อัตโนมัติทุกครั้งที่โหลดหน้าจอ'
      },
      {
        title: 'ปรับปรุงไอคอนสถานะการเช็คชื่อให้ตรงตามความเป็นจริง',
        desc: 'แสดงไอคอนนาฬิกาเมื่อยังไม่เริ่มประชุม, กากบาทแดงเมื่อยังไม่เช็คชื่อ, ติ๊กถูกเขียวเมื่อมาทันเวลา, นาฬิกาส้มเมื่อมาสาย และสมุดฟ้าเมื่อแจ้งลา'
      },
      {
        title: 'ปรับปรุงระยะห่างแถบเมนูด้านล่าง (Bottom Navigation)',
        desc: 'กระจายพื้นที่ปุ่มกดให้สวยงามและพอดีกับหน้าจอมือถือทุกรุ่น'
      },
      {
        title: 'อัปเดตช่องทางติดต่อและช่วยเหลือฝ่ายเทคนิค',
        desc: 'เปลี่ยนอีเมลติดต่อเป็น comsan.meeting@gmail.com หรือติดต่อพี่แมทธิว'
      }
    ]
  },
  liveDashboardConfig: {
    concurrencyMode: 'BOTH', // 'BOTH' | 'STREAM' | 'VOTE'
    showRaiseHandPopup: true,
    showPermissionPopup: true,
    showRandomizerPopup: true,
    theme: 'DARK',
    clockFormat: '24H'
  }
};

module.exports = defaultState;
