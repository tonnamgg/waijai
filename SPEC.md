# ไว้ใจ (Waijai) — ตัวกลางพักเงินซื้อขายออนไลน์

> ไฟล์นี้คือสเปกสำหรับให้ AI ใน VS Code ใช้สร้างโปรเจกต์
> วางไว้ที่ root ของโปรเจกต์ แล้วสั่ง AI ว่า: **"อ่าน SPEC.md แล้วทำ Milestone 1"** ทีละขั้น

---

## 1. ปัญหาและแนวคิด

ปัญหาการซื้อขายออนไลน์ระหว่างคนทั่วไป:
- **ผู้ซื้อ** โอนเงินแล้ว ของไม่มา หรือได้ของไม่ตรงปก
- **ผู้ขาย** ส่งของแล้ว ไม่ได้รับเงิน

แนวคิด: แอปเป็น **ตัวกลางพักเงิน (escrow)**
1. ผู้ซื้อจ่ายเงินเข้าแอป → แอปพักเงินไว้ (ผู้ขายยังไม่ได้เงิน)
2. ผู้ขายส่งของ + แนบเลขพัสดุ
3. ของถึงมือผู้ซื้อ → ผู้ซื้อตรวจของ
4. ผู้ซื้อกดยืนยัน "ตรงปก" → แอปโอนเงินให้ **ผู้ขาย** ทันที
5. ถ้าไม่ตรงปก → เปิดข้อพิพาท → คืนเงินผู้ซื้อ หรือปล่อยเงินให้ผู้ขายตามหลักฐาน

---

## 2. กติกาหลัก (Business Rules)

| กติกา | ค่าเริ่มต้น | แก้ที่ |
|---|---|---|
| ผู้ซื้อต้องจ่ายภายในเวลาหลังสร้างรายการ ไม่งั้นยกเลิก | 24 ชม. | `config.PAYMENT_DEADLINE_HOURS` |
| ผู้ขายต้องส่งของภายในเวลาหลังผู้ซื้อจ่าย ไม่งั้น **คืนเงินอัตโนมัติ** | 72 ชม. (3 วัน) | `config.SHIP_DEADLINE_HOURS` |
| ผู้ซื้อต้องตรวจของภายในเวลาหลังของถึง ไม่กดอะไร = **ปล่อยเงินให้ผู้ขายอัตโนมัติ** | 48 ชม. | `config.INSPECT_WINDOW_HOURS` |
| ส่งแล้วแต่ของไม่ถึงภายในเวลา ผู้ซื้อเปิดข้อพิพาท "ของไม่มา" ได้ | 14 วัน | `config.DELIVERY_MAX_DAYS` |
| ค่าบริการตัวกลาง (ผู้ซื้อจ่าย) | [กำหนดเอง] เช่น 2% ขั้นต่ำ ฿10 | `config.FEE_PERCENT`, `config.FEE_MIN` |

กฎเรื่องเงิน:
- เก็บเงินเป็น **จำนวนเต็มหน่วยสตางค์** (`amountSatang: number`) ห้ามใช้ float
- ทุกการเคลื่อนไหวของเงินต้องบันทึกใน `LedgerEntry` (ห้ามแก้/ลบ ทำได้แค่เพิ่มรายการใหม่)
- การปล่อยเงิน / คืนเงิน ต้อง idempotent (กดซ้ำหรือ cron รันซ้ำแล้วไม่โอนซ้ำ)

---

## 3. สถานะรายการ (Order State Machine)

```
CREATED ──(ผู้ซื้อจ่าย)──> PAID_HELD ──(ผู้ขายใส่เลขพัสดุ)──> SHIPPED ──(ของถึง)──> DELIVERED
   │                          │                                  │                    │
   │ หมดเวลาจ่าย              │ หมดเวลาส่ง                        │ เกิน 14 วัน          ├─(ผู้ซื้อยืนยัน)───> RELEASED ✅
   ▼                          ▼                                  ▼                    ├─(หมด 48 ชม.)─────> RELEASED ✅
CANCELLED                  REFUNDED                          DISPUTED <──(ไม่ตรงปก)──┘
                                                                 │
                                                  (แอดมินตัดสิน) ├──> REFUNDED
                                                                 └──> RELEASED
```

| จาก | ไป | ใครทำ | เงื่อนไข |
|---|---|---|---|
| CREATED | PAID_HELD | ผู้ซื้อ | ชำระเงินสำเร็จ (webhook จาก payment gateway) |
| CREATED | CANCELLED | ระบบ / คนสร้าง | หมดเวลาจ่าย หรือกดยกเลิก |
| PAID_HELD | SHIPPED | ผู้ขาย | ใส่เลขพัสดุ + รูปตอนแพ็กของ |
| PAID_HELD | REFUNDED | ระบบ | เกิน `SHIP_DEADLINE_HOURS` |
| SHIPPED | DELIVERED | ระบบ / ผู้ซื้อ | ขนส่งแจ้งว่าถึง หรือผู้ซื้อกด "ได้รับของแล้ว" |
| SHIPPED | DISPUTED | ผู้ซื้อ | เกิน `DELIVERY_MAX_DAYS` แล้วของยังไม่ถึง |
| DELIVERED | RELEASED | ผู้ซื้อ / ระบบ | กดยืนยันตรงปก หรือหมด `INSPECT_WINDOW_HOURS` |
| DELIVERED | DISPUTED | ผู้ซื้อ | กด "ไม่ตรงปก" + แนบหลักฐาน (ภายในช่วงเวลาตรวจ) |
| DISPUTED | REFUNDED / RELEASED | แอดมิน | ตัดสินจากหลักฐานทั้งสองฝ่าย |

ให้เขียน state machine เป็นฟังก์ชันเดียว `transition(order, event, actor)` ที่ตรวจสิทธิ์และเงื่อนไขทุกครั้ง ห้ามแก้ `status` ตรง ๆ ที่อื่น

---

## 4. Tech Stack (ค่าเริ่มต้น — เปลี่ยนได้)

- **Next.js 15 (App Router) + TypeScript** — เว็บแอปแบบ mobile-first (กว้างสูงสุด 430px กลางจอ)
- **Tailwind CSS** — ใช้ design tokens ในข้อ 6
- **Prisma + SQLite** (ตอน dev) → PostgreSQL (ตอนขึ้นจริง)
- **Auth:** NextAuth / Auth.js (เบอร์โทร OTP หรือ email) — Milestone แรกใช้ mock user ไปก่อน
- **Payment:** ทำเป็น interface `PaymentProvider` ตัว `MockPaymentProvider` ก่อน แล้วค่อยต่อ gateway จริง (เช่น Omise / 2C2P / GB Prime Pay ที่รองรับ PromptPay)
- **อัปโหลดไฟล์:** interface `StorageProvider` → เริ่มด้วยเก็บใน `/public/uploads` แล้วค่อยเปลี่ยนเป็น S3 / Cloudflare R2
- **งานตั้งเวลา:** route `/api/cron/tick` ที่รันทุก 5 นาที (Vercel Cron หรือ node-cron) เพื่อจัดการ auto-refund / auto-release / auto-cancel
- **Validation:** Zod
- **ทดสอบ:** Vitest (unit test state machine + การคำนวณเงิน)

---

## 5. หน้าจอ (6 หน้า — ตามดีไซน์ใน Claude Design)

ขนาดอ้างอิง 390×844, ฟอนต์ IBM Plex Sans Thai, ปุ่มสูงอย่างน้อย 44px

### 5.1 หน้าหลัก `/`
- Header: โลโก้ (สี่เหลี่ยมมุมโค้งสี accent + ไอคอนโล่ติ๊กถูก), "สวัสดี {ชื่อ}", ชื่อแอป, ปุ่มกระดิ่งแจ้งเตือน
- การ์ดยอดเงิน: "เงินที่ไว้ใจพักไว้ให้" = ผลรวมยอดของรายการที่ยังไม่จบ (PAID_HELD, SHIPPED, DELIVERED, DISPUTED) ที่ผู้ใช้เป็นผู้ซื้อหรือผู้ขาย + "จาก N รายการที่ยังไม่เสร็จ"
- ปุ่มหลัก "+ สร้างรายการซื้อขาย" → `/orders/new`
- 3 กล่องอธิบายขั้นตอน: จ่ายเข้าตัวกลาง → ตรวจว่าตรงปก → โอนให้ผู้ขาย
- "รายการล่าสุด" (5 รายการ): รูป, ชื่อสินค้า, "ซื้อจาก @x" หรือ "ขายให้ @x", ยอดเงิน, ป้ายสถานะ → `/orders/[id]`
- Bottom nav: หน้าหลัก / รายการ / สร้าง / บัญชี

ป้ายสถานะ (ข้อความภาษาไทย + สี):
| status | ข้อความ (มุมผู้ซื้อ) | ข้อความ (มุมผู้ขาย) | โทน |
|---|---|---|---|
| CREATED | รอชำระเงิน | รอผู้ซื้อจ่าย | amber |
| PAID_HELD | รอผู้ขายส่งของ | ต้องส่งของ | amber |
| SHIPPED | กำลังจัดส่ง | กำลังจัดส่ง | neutral |
| DELIVERED | ตรวจของ | รอผู้ซื้อตรวจของ | accent |
| DISPUTED | อยู่ระหว่างตรวจสอบ | อยู่ระหว่างตรวจสอบ | amber |
| RELEASED | เสร็จสิ้น | ได้รับเงินแล้ว | muted |
| REFUNDED | คืนเงินแล้ว | คืนเงินผู้ซื้อแล้ว | muted |
| CANCELLED | ยกเลิก | ยกเลิก | muted |

### 5.2 สร้างรายการ `/orders/new`
- ปุ่มย้อนกลับ + หัวข้อ "สร้างรายการซื้อขาย"
- Segmented control: "ฉันเป็นผู้ขาย" / "ฉันเป็นผู้ซื้อ"
- รูปสินค้าจริง (1–4 รูป, บังคับอย่างน้อย 1 ถ้าเป็นผู้ขาย) — ข้อความ "ใช้เทียบตอนรับของ"
- ฟอร์ม: ชื่อสินค้า, ราคา (บาท), อีกฝ่าย (@username หรือเบอร์โทร), "รายละเอียดที่ต้องตรงปก" (textarea: สี ขนาด รุ่น สภาพ ตำหนิ อุปกรณ์)
- รายการเช็กลิสต์: แยก textarea ทีละบรรทัดเป็น `checklistItems[]` (ใช้ในหน้า 5.5)
- กล่องกติกา: "ผู้ขายต้องส่งภายใน 3 วัน ไม่ส่ง = คืนเงินอัตโนมัติ", "ผู้ซื้อตรวจของภายใน 48 ชม. หลังของถึง" (ดึงตัวเลขจาก config)
- ปุ่ม "สร้างและส่งลิงก์ให้อีกฝ่าย" → สร้าง Order สถานะ CREATED + สร้าง share link `/o/[shareCode]` → แสดง sheet ให้คัดลอกลิงก์/แชร์

### 5.3 จ่ายเงินเข้าตัวกลาง `/orders/[id]/pay` (เฉพาะผู้ซื้อ, สถานะ CREATED)
- การ์ดสินค้า: รูป, ชื่อ, "จาก @ผู้ขาย", ป้าย "ผู้ขายยืนยันตัวตนแล้ว" (ถ้า `seller.kycVerified`)
- ราคาสินค้า / ค่าบริการตัวกลาง / **ยอดที่ต้องจ่าย**
- กล่องสี accent อ่อน: "เงินถูกพักไว้กับไว้ใจ — ผู้ขายจะได้เงินก็ต่อเมื่อคุณกดยืนยันว่าได้ของตรงปก ถ้าของไม่มาหรือไม่ตรงปก รับเงินคืนเต็มจำนวน"
- เลือกช่องทาง: พร้อมเพย์ QR / บัตรเครดิต-เดบิต / โมบายแบงกิ้ง (radio)
- ปุ่ม "จ่าย ฿{total} เข้าตัวกลาง" → สร้าง Payment → (mock: สำเร็จทันที) → webhook เปลี่ยนเป็น PAID_HELD → ไปหน้า 5.4

### 5.4 ติดตามสถานะ `/orders/[id]`
- การ์ดสรุป: รูป, ชื่อ, อีกฝ่าย, ยอด + ป้าย "พักไว้แล้ว" (ไอคอนแม่กุญแจ)
- กล่องเลขพัสดุ + ปุ่ม "คัดลอก" (แสดงเมื่อ SHIPPED ขึ้นไป)
- Timeline 6 ขั้น (done = วงกลมทึบสี accent มีติ๊ก, current = วงแหวนหนา, todo = วงแหวนเทา):
  1. จ่ายเงินเข้าตัวกลางแล้ว
  2. ผู้ขายส่งของแล้ว
  3. กำลังขนส่ง
  4. ของถึงมือคุณ — "มีเวลาตรวจของ 48 ชม."
  5. ยืนยันว่าตรงปก
  6. โอนเงินให้ผู้ขาย
  (แต่ละขั้นแสดงวันเวลาจาก `OrderEvent`)
- ปุ่มตามบทบาท/สถานะ:
  - ผู้ขาย + PAID_HELD → "ส่งของแล้ว · ใส่เลขพัสดุ" (sheet: ขนส่ง, เลขพัสดุ, รูปตอนแพ็ก) + นับถอยหลังเวลาส่ง
  - ผู้ซื้อ + SHIPPED/DELIVERED → "ได้รับของแล้ว · ตรวจสอบสินค้า" → หน้า 5.5
  - ผู้ซื้อ + SHIPPED → ลิงก์รอง "ยังไม่ได้ของ? แจ้งปัญหา" (ใช้ได้เมื่อเกิน `DELIVERY_MAX_DAYS`)

### 5.5 ตรวจของก่อนปล่อยเงิน `/orders/[id]/inspect` (เฉพาะผู้ซื้อ)
- แถบ amber นับถอยหลัง: "เหลือ {ชม.} {นาที} ถ้าไม่กดอะไร ระบบจะปล่อยเงินให้ผู้ขายอัตโนมัติ"
- เทียบรูป 2 ช่อง: "รูปจากผู้ขาย" | "ถ่ายของที่ได้รับ" (อัปโหลด/กล้อง)
- เช็กลิสต์จาก `checklistItems` + ตัวนับ "ตรวจแล้ว x/n"
- ปุ่ม "แนบวิดีโอแกะกล่อง" — "ช่วยตอนมีข้อพิพาท"
- ปุ่มหลัก "ของตรงปก · ปล่อยเงินให้ผู้ขาย" → dialog ยืนยันอีกครั้ง → `transition(CONFIRM)` → RELEASED → หน้า 5.6
- ปุ่มรอง (ขอบสีส้ม) "ไม่ตรงปก · ขอคืนเงิน" → ฟอร์มข้อพิพาท (เหตุผล, รายการที่ไม่ตรง, รูป/วิดีโอบังคับ) → DISPUTED

### 5.6 เสร็จสิ้น `/orders/[id]/done`
- วงกลมสี accent + ติ๊ก, "ปล่อยเงินให้ผู้ขายแล้ว", "โอน ฿{ยอดสินค้า} เข้าบัญชีของ @ผู้ขาย เรียบร้อย"
- ใบสรุป: สินค้า, เลขรายการ (`WJ-xxxxx`), วันที่ปล่อยเงิน, คุณจ่าย, ผู้ขายได้รับ
- ให้คะแนนผู้ขาย 1–5 ดาว (+ ความเห็นสั้น ๆ ไม่บังคับ)
- ปุ่ม "กลับหน้าหลัก" + "ดาวน์โหลดใบเสร็จ" (PDF)

---

## 6. Design Tokens

```ts
// tailwind.config.ts → theme.extend
colors: {
  bg:        '#FAFAF8', // พื้นหลังแอป
  surface:   '#FFFFFF', // การ์ด
  line:      '#E7E7E3', // เส้นขอบ
  field:     '#DCDCD6', // ขอบ input
  soft:      '#F1F1EE', // กล่องพื้นเทา
  ink:       '#141414', // ตัวหนังสือหลัก
  muted:     '#5F5F5A', // ตัวหนังสือรอง
  accent:    { DEFAULT: '#0E7A5A', dark: '#0A5C44', soft: '#E6F2ED' },
  warn:      { DEFAULT: '#B4530A', text: '#8A4A06', soft: '#FDF1E3' },
  star:      '#E8A317',
},
fontFamily: { sans: ['"IBM Plex Sans Thai"', 'sans-serif'] },
borderRadius: { card: '16px', btn: '12px', pill: '999px' },
```
- ปุ่มหลัก: สูง 52px, `rounded-btn bg-accent text-white font-semibold`
- Input: สูง 46px, `rounded-btn border-field`
- ระยะขอบจอ 20px, ช่องว่างระหว่าง section 16px
- ไอคอน: เส้น (stroke) แบบ lucide-react, ห้ามใช้ emoji
- ตัวหนังสือทุกสีต้องผ่าน contrast 4.5:1

---

## 7. Data Model (Prisma)

```prisma
model User {
  id           String   @id @default(cuid())
  username     String   @unique
  displayName  String
  phone        String?  @unique
  email        String?  @unique
  kycVerified  Boolean  @default(false)
  payoutBank   String?  // ข้อมูลบัญชีรับเงิน (เข้ารหัส)
  createdAt    DateTime @default(now())
  buyOrders    Order[]  @relation("buyer")
  sellOrders   Order[]  @relation("seller")
}

enum OrderStatus { CREATED PAID_HELD SHIPPED DELIVERED DISPUTED RELEASED REFUNDED CANCELLED }

model Order {
  id              String      @id @default(cuid())
  code            String      @unique        // WJ-24811
  shareCode       String      @unique        // ใช้ในลิงก์ /o/[shareCode]
  title           String
  specText        String                     // รายละเอียดที่ต้องตรงปก
  checklistItems  String[]                   // SQLite: เก็บเป็น Json
  priceSatang     Int
  feeSatang       Int
  status          OrderStatus @default(CREATED)
  createdById     String
  buyerId         String?
  sellerId        String?
  buyer           User?       @relation("buyer",  fields: [buyerId],  references: [id])
  seller          User?       @relation("seller", fields: [sellerId], references: [id])
  paymentDeadline DateTime?
  shipDeadline    DateTime?
  inspectDeadline DateTime?
  carrier         String?
  trackingNo      String?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  media           OrderMedia[]
  events          OrderEvent[]
  payments        Payment[]
  ledger          LedgerEntry[]
  dispute         Dispute?
  rating          Rating?
}

enum MediaKind { LISTING PACKING RECEIVED UNBOXING_VIDEO DISPUTE_EVIDENCE }

model OrderMedia {
  id         String    @id @default(cuid())
  orderId    String
  order      Order     @relation(fields: [orderId], references: [id])
  kind       MediaKind
  url        String
  uploadedBy String
  createdAt  DateTime  @default(now())
}

model OrderEvent {          // ประวัติทุกการเปลี่ยนสถานะ (ใช้ทำ timeline)
  id        String      @id @default(cuid())
  orderId   String
  order     Order       @relation(fields: [orderId], references: [id])
  from      OrderStatus?
  to        OrderStatus
  actor     String      // userId หรือ "SYSTEM"
  note      String?
  createdAt DateTime    @default(now())
}

model Payment {
  id           String   @id @default(cuid())
  orderId      String
  order        Order    @relation(fields: [orderId], references: [id])
  provider     String   // mock | omise | ...
  providerRef  String?  @unique
  method       String   // promptpay | card | mobile_banking
  amountSatang Int
  status       String   // pending | succeeded | failed
  createdAt    DateTime @default(now())
}

enum LedgerType { HOLD RELEASE_TO_SELLER REFUND_TO_BUYER FEE }

model LedgerEntry {         // บันทึกเงินแบบเพิ่มอย่างเดียว
  id             String     @id @default(cuid())
  orderId        String
  order          Order      @relation(fields: [orderId], references: [id])
  type           LedgerType
  amountSatang   Int
  idempotencyKey String     @unique   // เช่น `${orderId}:RELEASE`
  createdAt      DateTime   @default(now())
}

model Dispute {
  id         String   @id @default(cuid())
  orderId    String   @unique
  order      Order    @relation(fields: [orderId], references: [id])
  reason     String   // NOT_RECEIVED | NOT_AS_DESCRIBED | DAMAGED | OTHER
  detail     String
  resolution String?  // REFUND | RELEASE
  resolvedBy String?
  createdAt  DateTime @default(now())
  resolvedAt DateTime?
}

model Rating {
  id        String   @id @default(cuid())
  orderId   String   @unique
  order     Order    @relation(fields: [orderId], references: [id])
  stars     Int      // 1-5
  comment   String?
  createdAt DateTime @default(now())
}
```

---

## 8. API / Server Actions

| Method | Path | ทำอะไร | ใครเรียกได้ |
|---|---|---|---|
| POST | `/api/orders` | สร้างรายการ (CREATED) | ผู้ใช้ที่ล็อกอิน |
| GET | `/api/orders` | รายการของฉัน (ผู้ซื้อ/ผู้ขาย) | เจ้าของ |
| GET | `/api/orders/[id]` | รายละเอียด + events + media | คู่สัญญา |
| POST | `/api/o/[shareCode]/accept` | อีกฝ่ายกดรับรายการ (ผูก buyerId/sellerId) | ผู้ใช้ที่ล็อกอิน |
| POST | `/api/orders/[id]/pay` | สร้าง payment intent | ผู้ซื้อ |
| POST | `/api/webhooks/payment` | gateway แจ้งผล → PAID_HELD | gateway (ตรวจ signature) |
| POST | `/api/orders/[id]/ship` | ใส่เลขพัสดุ → SHIPPED | ผู้ขาย |
| POST | `/api/orders/[id]/delivered` | ผู้ซื้อกดได้รับของ → DELIVERED | ผู้ซื้อ |
| POST | `/api/orders/[id]/confirm` | ยืนยันตรงปก → RELEASED | ผู้ซื้อ |
| POST | `/api/orders/[id]/dispute` | เปิดข้อพิพาท → DISPUTED | ผู้ซื้อ |
| POST | `/api/orders/[id]/rating` | ให้คะแนน | ผู้ซื้อ (หลัง RELEASED) |
| POST | `/api/uploads` | อัปโหลดรูป/วิดีโอ | คู่สัญญา |
| POST | `/api/admin/disputes/[id]/resolve` | ตัดสิน REFUND / RELEASE | แอดมิน |
| GET | `/api/cron/tick` | จัดการ deadline ทั้งหมด | cron (ตรวจ `CRON_SECRET`) |

---

## 9. โครงสร้างโฟลเดอร์

```
waijai/
├─ SPEC.md
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts                 # ผู้ใช้ตัวอย่าง + รายการ 3 อัน (หูฟัง, แจ็กเก็ต, กล้องฟิล์ม)
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx           # ฟอนต์ IBM Plex Sans Thai, กรอบ mobile 430px
│  │  ├─ page.tsx             # 5.1 หน้าหลัก
│  │  ├─ orders/
│  │  │  ├─ new/page.tsx      # 5.2
│  │  │  └─ [id]/
│  │  │     ├─ page.tsx       # 5.4
│  │  │     ├─ pay/page.tsx   # 5.3
│  │  │     ├─ inspect/page.tsx # 5.5
│  │  │     └─ done/page.tsx  # 5.6
│  │  ├─ o/[shareCode]/page.tsx  # หน้าเปิดลิงก์ที่ถูกแชร์
│  │  ├─ admin/disputes/page.tsx
│  │  └─ api/...              # ตามข้อ 8
│  ├─ components/
│  │  ├─ ui/                  # Button, Input, Card, Pill, SegmentedControl, Sheet
│  │  ├─ BalanceCard.tsx
│  │  ├─ OrderListItem.tsx
│  │  ├─ StatusPill.tsx
│  │  ├─ Timeline.tsx
│  │  ├─ PhotoCompare.tsx
│  │  ├─ Checklist.tsx
│  │  ├─ Countdown.tsx
│  │  ├─ StarRating.tsx
│  │  └─ BottomNav.tsx
│  ├─ lib/
│  │  ├─ config.ts            # ค่าในข้อ 2
│  │  ├─ money.ts             # satang <-> บาท, คำนวณค่าบริการ, format "฿1,290"
│  │  ├─ order-machine.ts     # transition(order, event, actor)
│  │  ├─ ledger.ts            # hold / release / refund แบบ idempotent
│  │  ├─ deadlines.ts         # ฟังก์ชันที่ cron เรียก
│  │  ├─ payments/
│  │  │  ├─ provider.ts       # interface PaymentProvider
│  │  │  └─ mock.ts
│  │  ├─ storage/
│  │  │  ├─ provider.ts
│  │  │  └─ local.ts
│  │  ├─ auth.ts
│  │  └─ db.ts
│  └─ tests/
│     ├─ order-machine.test.ts
│     └─ money.test.ts
└─ .env.example               # DATABASE_URL, CRON_SECRET, PAYMENT_* ...
```

---

## 10. ลำดับการสร้าง (Milestones)

ให้ AI ทำทีละ milestone และหยุดให้ตรวจก่อนไปขั้นต่อไป

1. **Setup** — Next.js + TS + Tailwind + tokens ข้อ 6 + ฟอนต์ + กรอบ mobile + component `ui/` พื้นฐาน
2. **UI ล้วน (ข้อมูลปลอม)** — สร้าง 6 หน้าตามข้อ 5 ด้วย mock data ให้หน้าตาตรงดีไซน์ และกดลิงก์ไปหน้าถัดไปได้
3. **Database** — Prisma schema ข้อ 7 + seed + ต่อหน้าเข้ากับข้อมูลจริง
4. **State machine + Ledger** — `order-machine.ts`, `ledger.ts`, `money.ts` + unit test ครบทุก transition (รวมกรณีห้ามทำ)
5. **Flow หลัก** — สร้างรายการ → แชร์ลิงก์ → รับรายการ → จ่าย (mock) → ส่งของ → ได้รับ → ยืนยัน → เสร็จสิ้น
6. **อัปโหลดรูป/วิดีโอ** — รูปสินค้า, รูปตอนแพ็ก, รูปตอนรับ, วิดีโอแกะกล่อง
7. **Deadlines** — `/api/cron/tick` ทำ auto-cancel / auto-refund / auto-release + Countdown บนหน้าจอ
8. **ข้อพิพาท** — ฟอร์มผู้ซื้อ, หน้าให้ผู้ขายส่งหลักฐานโต้แย้ง, หน้าแอดมินตัดสิน
9. **Auth จริง** — OTP เบอร์โทร / email, สิทธิ์ของแต่ละ API
10. **Payment จริง** — ต่อ gateway (PromptPay QR ก่อน), ตรวจ webhook signature, การโอนเงินออก (payout) ให้ผู้ขาย
11. **แจ้งเตือน** — in-app + LINE / SMS ทุกครั้งที่สถานะเปลี่ยนหรือใกล้หมดเวลา

---

## 11. คำสั่งสำหรับ AI (วางไว้ใน prompt หรือ `.github/copilot-instructions.md` / `CLAUDE.md`)

- ข้อความบนหน้าจอทั้งหมดเป็นภาษาไทย, โค้ด/ชื่อตัวแปรเป็นภาษาอังกฤษ
- ห้ามเปลี่ยน `Order.status` นอก `order-machine.ts`
- ห้ามใช้ float กับเงิน ใช้ `Int` หน่วยสตางค์เท่านั้น
- ทุก API ต้องเช็กว่าผู้เรียกเป็นคู่สัญญาของรายการนั้นและมีสิทธิ์ทำ action นั้น
- ทุก API ต้อง validate input ด้วย Zod
- ทำ Milestone ละครั้ง บอกไฟล์ที่สร้าง/แก้ และวิธีทดสอบเมื่อเสร็จ
- ถ้าไม่แน่ใจกติกาธุรกิจ ให้ถามก่อน อย่าเดาเอง

---

## 12. หมายเหตุก่อนเปิดใช้จริง

- การรับและพักเงินของคนอื่นในไทยอาจเข้าข่ายธุรกิจที่ต้องขออนุญาตหรือขึ้นทะเบียนกับธนาคารแห่งประเทศไทย ควรปรึกษาผู้เชี่ยวชาญด้านกฎหมาย และ/หรือใช้บริการ escrow/payment ของผู้ให้บริการที่มีใบอนุญาตอยู่แล้ว
- ต้องมี KYC ของผู้ขายก่อนให้รับเงินออก (ป้องกันบัญชีม้า)
- ต้องทำนโยบายความเป็นส่วนตัวตาม PDPA (เก็บเบอร์โทร, บัญชีธนาคาร, รูป/วิดีโอ)
