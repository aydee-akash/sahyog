// Seed data. SCH-014/022/031 come from the brief's sample table; the rest are
// ILLUSTRATIVE schemes written for this demo (labelled in the TDD). Notice
// texts are mock "official notices" so the AI drafting can be exercised.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { confirmPayment } from "../src/lib/receipts";
import { addMonth } from "../src/lib/dates";

const prisma = new PrismaClient();
const src = (code: string) => `https://notices.example.org/mp/${code.toLowerCase()}`;

const schemes = [
  {
    code: "SCH-014",
    need: "PENSION",
    districts: [],
    titleHi: "राज्य विधवा पेंशन",
    titleEn: "State widow pension",
    summaryHi: "जिन महिलाओं के पति नहीं रहे और जिनके पास BPL कार्ड है, उन्हें हर महीने पेंशन मिल सकती है।",
    benefitHi: "हर महीने ₹600",
    eligibilityHi: "विधवा महिला, उम्र 18 से 79 वर्ष, BPL राशन कार्ड हो।",
    documentsHi: ["पति का मृत्यु प्रमाण पत्र", "BPL राशन कार्ड", "आधार कार्ड", "बैंक पासबुक", "उम्र का प्रमाण"],
    howToApplyHi: "ग्राम पंचायत या वार्ड कार्यालय में फ़ॉर्म भरें। सत्यापन के बाद पैसा सीधे बैंक खाते में आता है।",
    summaryEn: "Widows with a BPL card can get a monthly pension.",
    benefitEn: "₹600 a month",
    eligibilityEn: "Widow aged 18 to 79 with a BPL ration card.",
    documentsEn: ["Husband's death certificate", "BPL ration card", "Aadhaar card", "Bank passbook", "Age proof"],
    howToApplyEn: "Fill the form at the gram panchayat or ward office. After verification the money comes straight to your bank account.",
    rules: { minAge: 18, maxAge: 79, marital: ["WIDOW"], bpl: true },
    lastChecked: "2026-09-12",
    status: "PUBLISHED",
    noticeText:
      "State Widow Pension Scheme. Eligibility: widow aged 18 to 79 years belonging to a Below Poverty Line (BPL) household. Benefit: Rs 600 per month credited to the beneficiary's bank account. Documents: death certificate of husband, BPL card, Aadhaar, bank passbook, age proof. Apply at the Gram Panchayat or urban ward office.",
  },
  {
    code: "SCH-022",
    need: "LIVELIHOOD",
    districts: [],
    titleHi: "स्वयं सहायता समूह लोन सहायता",
    titleEn: "Self-help group loan support",
    summaryHi: "पंजीकृत स्वयं सहायता समूह (SHG) की महिलाएँ काम शुरू करने या बढ़ाने के लिए कम ब्याज पर लोन ले सकती हैं।",
    benefitHi: "₹3 लाख तक का लोन, कम ब्याज पर",
    eligibilityHi: "पंजीकृत स्वयं सहायता समूह की सदस्य।",
    documentsHi: ["SHG पंजीकरण प्रमाण", "समूह का बैंक खाता विवरण", "आधार कार्ड", "समूह की बैठक का प्रस्ताव"],
    howToApplyHi: "अपने समूह के साथ ब्लॉक कार्यालय या बैंक शाखा जाएँ। समूह का प्रस्ताव और खाता विवरण साथ रखें।",
    summaryEn: "Women in a registered self-help group (SHG) can take a low-interest loan to start or grow work.",
    benefitEn: "Loan up to ₹3 lakh at lower interest",
    eligibilityEn: "Member of a registered self-help group.",
    documentsEn: ["SHG registration certificate", "Group bank account details", "Aadhaar card", "Group meeting resolution"],
    howToApplyEn: "Go with your group to the block office or bank branch. Take the group resolution and account details.",
    rules: { shg: true },
    lastChecked: "2026-08-30",
    status: "PUBLISHED",
    noticeText:
      "Credit support for women Self-Help Groups. Members of registered SHGs may access loans up to Rs 3 lakh at a subsidised rate of interest for livelihood activities. Required: SHG registration certificate, group bank account details, member Aadhaar, group resolution. Apply through the block office or the bank branch where the group account is held.",
  },
  {
    code: "SCH-031",
    need: "HEALTH",
    districts: [],
    titleHi: "मातृत्व नकद सहायता",
    titleEn: "Maternity cash benefit",
    summaryHi: "पहले बच्चे के समय गर्भवती महिला को पोषण और आराम के लिए किस्तों में पैसा मिल सकता है।",
    benefitHi: "₹5,000, किस्तों में",
    eligibilityHi: "गर्भवती महिला, पहला बच्चा।",
    documentsHi: ["MCP कार्ड (ममता कार्ड)", "आधार कार्ड", "बैंक पासबुक"],
    howToApplyHi: "आंगनवाड़ी कार्यकर्ता या ANM के पास गर्भावस्था का पंजीकरण कराएँ। वही फ़ॉर्म भरने में मदद करेंगी।",
    summaryEn: "A pregnant woman expecting her first child may get money in instalments for nutrition and rest.",
    benefitEn: "₹5,000 in instalments",
    eligibilityEn: "Pregnant woman, first child.",
    documentsEn: ["MCP card (Mamta card)", "Aadhaar card", "Bank passbook"],
    howToApplyEn: "Register the pregnancy with the anganwadi worker or ANM. They will help fill the form.",
    rules: { pregnancy: ["FIRST"] },
    lastChecked: "2026-10-05",
    status: "PUBLISHED",
    noticeText:
      "Maternity Benefit Programme. Pregnant women for the first living child receive Rs 5,000 in instalments, subject to registration of pregnancy and ante-natal check-ups. Documents: MCP card, Aadhaar, bank passbook. Register at the Anganwadi centre or with the ANM.",
  },
  {
    code: "SCH-040",
    need: "PENSION",
    districts: [],
    titleHi: "वृद्धावस्था पेंशन (महिला)",
    titleEn: "Old age pension for women",
    summaryHi: "60 वर्ष या उससे अधिक उम्र की BPL परिवार की महिलाओं को हर महीने पेंशन मिल सकती है।",
    benefitHi: "हर महीने ₹600",
    eligibilityHi: "उम्र 60 वर्ष या अधिक, BPL राशन कार्ड हो।",
    documentsHi: ["उम्र का प्रमाण", "BPL राशन कार्ड", "आधार कार्ड", "बैंक पासबुक"],
    howToApplyHi: "ग्राम पंचायत या वार्ड कार्यालय में आवेदन दें।",
    summaryEn: "Women aged 60 or above from BPL families may get a monthly pension.",
    benefitEn: "₹600 a month",
    eligibilityEn: "Aged 60 or above, with a BPL ration card.",
    documentsEn: ["Age proof", "BPL ration card", "Aadhaar card", "Bank passbook"],
    howToApplyEn: "Apply at the gram panchayat or ward office.",
    rules: { minAge: 60, bpl: true },
    lastChecked: "2026-09-20",
    status: "PUBLISHED",
    noticeText:
      "Old Age Pension. Persons aged 60 years and above from BPL households receive Rs 600 per month. Documents: age proof, BPL card, Aadhaar, bank passbook. Apply at Gram Panchayat or ward office.",
  },
  {
    code: "SCH-046",
    need: "PENSION",
    districts: [],
    titleHi: "परित्यक्ता महिला पेंशन",
    titleEn: "Pension for separated or abandoned women",
    summaryHi: "तलाकशुदा या पति द्वारा छोड़ी गई महिलाएँ, जिनके पास BPL कार्ड है, पेंशन के लिए आवेदन कर सकती हैं।",
    benefitHi: "हर महीने ₹600",
    eligibilityHi: "तलाकशुदा या परित्यक्ता महिला, उम्र 18 से 59 वर्ष, BPL कार्ड हो।",
    documentsHi: ["तलाक या परित्याग का प्रमाण / शपथ पत्र", "BPL राशन कार्ड", "आधार कार्ड", "बैंक पासबुक"],
    howToApplyHi: "ग्राम पंचायत या वार्ड कार्यालय में आवेदन दें।",
    summaryEn: "Divorced or abandoned women with a BPL card can apply for a monthly pension.",
    benefitEn: "₹600 a month",
    eligibilityEn: "Divorced or abandoned woman aged 18 to 59 with a BPL card.",
    documentsEn: ["Proof of divorce / affidavit of abandonment", "BPL ration card", "Aadhaar card", "Bank passbook"],
    howToApplyEn: "Apply at the gram panchayat or ward office.",
    rules: { minAge: 18, maxAge: 59, marital: ["SEPARATED"], bpl: true },
    lastChecked: "2026-09-20",
    status: "PUBLISHED",
    noticeText:
      "Pension for divorced or abandoned women aged 18-59 from BPL households: Rs 600 per month. Documents: proof of divorce or affidavit of abandonment, BPL card, Aadhaar, bank passbook. Apply at Gram Panchayat or ward office.",
  },
  {
    code: "SCH-052",
    need: "HOUSEHOLD",
    districts: [],
    titleHi: "मुफ़्त रसोई गैस कनेक्शन",
    titleEn: "Free cooking gas connection",
    summaryHi: "BPL परिवार की वयस्क महिला के नाम पर मुफ़्त गैस कनेक्शन मिल सकता है।",
    benefitHi: "मुफ़्त गैस कनेक्शन और पहला सिलेंडर",
    eligibilityHi: "18 वर्ष से अधिक उम्र की महिला, BPL परिवार।",
    documentsHi: ["आधार कार्ड", "BPL राशन कार्ड", "बैंक पासबुक", "पासपोर्ट साइज़ फ़ोटो"],
    howToApplyHi: "नज़दीकी गैस एजेंसी पर फ़ॉर्म भरें।",
    summaryEn: "An adult woman from a BPL family may get a free cooking-gas connection in her name.",
    benefitEn: "Free gas connection and first cylinder",
    eligibilityEn: "Woman over 18 from a BPL family.",
    documentsEn: ["Aadhaar card", "BPL ration card", "Bank passbook", "Passport-size photo"],
    howToApplyEn: "Fill the form at the nearest gas agency.",
    rules: { minAge: 18, bpl: true },
    lastChecked: "2026-07-18",
    status: "PUBLISHED",
    noticeText:
      "Free LPG connection to adult women of BPL households, including the first refill. Documents: Aadhaar, BPL ration card, bank passbook, photograph. Apply at the nearest LPG distributor.",
  },
  {
    code: "SCH-058",
    need: "LIVELIHOOD",
    districts: ["BHOPAL", "SEHORE", "VIDISHA", "DEWAS"],
    titleHi: "महिला सिलाई और कौशल प्रशिक्षण",
    titleEn: "Tailoring and skills training for women",
    summaryHi: "18 से 45 वर्ष की महिलाओं को 3 महीने का मुफ़्त प्रशिक्षण और प्रमाण पत्र मिल सकता है।",
    benefitHi: "3 महीने मुफ़्त प्रशिक्षण, ₹1,500 मासिक भत्ता",
    eligibilityHi: "उम्र 18 से 45 वर्ष। केवल भोपाल, सीहोर, विदिशा, देवास ज़िलों में।",
    documentsHi: ["आधार कार्ड", "बैंक पासबुक", "फ़ोटो"],
    howToApplyHi: "ज़िला कौशल केंद्र या ट्रस्ट के सहायता केंद्र पर नाम लिखवाएँ।",
    summaryEn: "Women aged 18 to 45 may get 3 months of free training and a certificate.",
    benefitEn: "3 months free training, ₹1,500 monthly stipend",
    eligibilityEn: "Aged 18 to 45. Only in Bhopal, Sehore, Vidisha and Dewas districts.",
    documentsEn: ["Aadhaar card", "Bank passbook", "Photo"],
    howToApplyEn: "Enrol at the district skill centre or the trust's help centre.",
    rules: { minAge: 18, maxAge: 45 },
    lastChecked: "2026-10-01",
    status: "PUBLISHED",
    noticeText:
      "Skill training (tailoring, beauty, food processing) for women aged 18-45 in Bhopal, Sehore, Vidisha and Dewas districts. Duration 3 months with a stipend of Rs 1,500 per month and a certificate. Documents: Aadhaar, bank passbook, photograph. Enrol at the District Skill Centre.",
  },
  {
    code: "SCH-063",
    need: "HEALTH",
    districts: [],
    titleHi: "दूसरी बेटी पर मातृत्व सहायता",
    titleEn: "Maternity support for a second child (girl)",
    summaryHi: "",
    benefitHi: "",
    eligibilityHi: "",
    documentsHi: [],
    howToApplyHi: "",
    summaryEn: "",
    benefitEn: "",
    eligibilityEn: "",
    documentsEn: [],
    howToApplyEn: "",
    rules: { pregnancy: ["LATER"] },
    lastChecked: "2026-10-05",
    status: "DRAFT",
    noticeText:
      "Under the Maternity Benefit Programme, an additional benefit of Rs 6,000 is given in one instalment if the second child is a girl, after birth registration and completion of the first cycle of immunisation. Documents: MCP card, birth certificate of the girl child, Aadhaar of mother, bank passbook. Apply through the Anganwadi worker within 270 days of birth.",
  },
  {
    code: "SCH-070",
    need: "LIVELIHOOD",
    districts: [],
    titleHi: "महिला उद्यमी लोन",
    titleEn: "Women entrepreneur loan",
    summaryHi: "अपना छोटा व्यापार शुरू करने के लिए 18 से 55 वर्ष की महिलाएँ बैंक लोन पर ब्याज छूट पा सकती हैं।",
    benefitHi: "₹10 लाख तक लोन पर ब्याज में छूट",
    eligibilityHi: "उम्र 18 से 55 वर्ष, कम से कम 5वीं पास।",
    documentsHi: ["आधार कार्ड", "व्यापार योजना", "बैंक पासबुक", "शिक्षा प्रमाण पत्र"],
    howToApplyHi: "ज़िला उद्योग केंद्र में ऑनलाइन या सीधे आवेदन दें।",
    summaryEn: "Women aged 18 to 55 starting a small business may get interest relief on a bank loan.",
    benefitEn: "Interest relief on loans up to ₹10 lakh",
    eligibilityEn: "Aged 18 to 55, studied at least up to class 5.",
    documentsEn: ["Aadhaar card", "Business plan", "Bank passbook", "Education certificate"],
    howToApplyEn: "Apply online or in person at the District Industries Centre.",
    rules: { minAge: 18, maxAge: 55 },
    lastChecked: "2026-08-14",
    status: "IN_REVIEW",
    aiDrafted: true,
    noticeText:
      "Interest subvention on bank loans up to Rs 10 lakh for women aged 18-55 starting a micro enterprise. Minimum education: class 5. Documents: Aadhaar, project report, bank passbook, education certificate. Apply at the District Industries Centre.",
  },
] as const;

const helpCentres: [string, string, string][] = [
  ["BHOPAL", "भोपाल सहायता केंद्र", "ट्रस्ट कार्यालय, अरेरा कॉलोनी, भोपाल"],
  ["SEHORE", "सीहोर सहायता केंद्र", "जनपद पंचायत के पास, सीहोर"],
  ["RAISEN", "रायसेन सहायता केंद्र", "बस स्टैंड रोड, रायसेन"],
  ["VIDISHA", "विदिशा सहायता केंद्र", "माधव चौक, विदिशा"],
  ["RAJGARH", "राजगढ़ सहायता केंद्र", "कलेक्ट्रेट के सामने, राजगढ़"],
  ["NARMADAPURAM", "नर्मदापुरम सहायता केंद्र", "सेठानी घाट रोड, नर्मदापुरम"],
  ["BETUL", "बैतूल सहायता केंद्र", "गंज, बैतूल"],
  ["HARDA", "हरदा सहायता केंद्र", "घंटाघर के पास, हरदा"],
  ["DEWAS", "देवास सहायता केंद्र", "एबी रोड, देवास"],
];

async function main() {
  await prisma.$transaction([
    prisma.receipt.deleteMany(),
    prisma.donation.updateMany({ data: { parentId: null } }),
    prisma.donation.deleteMany(),
    prisma.outbox.deleteMany(),
    prisma.loginAttempt.deleteMany(),
    prisma.otpCode.deleteMany(),
    prisma.finderUse.deleteMany(),
    prisma.receiptCounter.deleteMany(),
    prisma.campaign.deleteMany(),
    prisma.scheme.deleteMany(),
    prisma.helpCentre.deleteMany(),
    prisma.callbackRequest.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // Receipts are issued at the end in payment-date order, like real life.
  const toConfirm: { id: string; when: Date; after?: (number: string) => Promise<void> }[] = [];

  const passwordHash = await bcrypt.hash("Demo@1234", 10);
  await prisma.user.create({ data: { email: "admin@demo.org", name: "Meera (Trust admin)", role: "ADMIN", passwordHash } });
  const donor = await prisma.user.create({ data: { email: "donor@demo.org", name: "Anita Verma", role: "DONOR", passwordHash } });

  for (const s of schemes) {
    await prisma.scheme.create({
      data: {
        ...s,
        districts: [...s.districts],
        documentsHi: [...s.documentsHi],
        documentsEn: [...s.documentsEn],
        rules: s.rules,
        sourceUrl: src(s.code),
        lastChecked: new Date(s.lastChecked),
        reviewedBy: s.status === "PUBLISHED" ? "admin@demo.org" : null,
      },
    });
  }

  await prisma.helpCentre.createMany({
    data: helpCentres.map(([district, name, address], i) => ({
      district,
      name,
      address,
      phone: `0755-000-01${String(i + 10)}`,
    })),
  });

  const health = await prisma.campaign.create({
    data: {
      slug: "maa-swasthya",
      titleHi: "माँ का स्वास्थ्य",
      titleEn: "Healthy mothers",
      blurbHi: "गर्भवती महिलाओं की जाँच, पोषण किट और अस्पताल तक पहुँच। ₹1,500 से एक माँ की तीन महीने की पोषण किट।",
      blurbEn: "Check-ups, nutrition kits and transport to hospital for pregnant women. ₹1,500 covers one mother's 3-month nutrition kit.",
      goal: 2_500_000,
    },
  });
  const livelihood = await prisma.campaign.create({
    data: {
      slug: "apni-kamai",
      titleHi: "अपनी कमाई",
      titleEn: "Her own income",
      blurbHi: "स्वयं सहायता समूहों को प्रशिक्षण और पहली मशीन। ₹5,000 से एक महिला का सिलाई प्रशिक्षण।",
      blurbEn: "Training and a first machine for self-help groups. ₹5,000 trains one woman in tailoring.",
      goal: 4_000_000,
    },
  });

  // Paid history for the demo donor, issued through the real receipt path.
  const history = [
    { campaign: health, amount: 5000, days: 210, frequency: "ONE_TIME" as const },
    { campaign: livelihood, amount: 2500, days: 60, frequency: "MONTHLY" as const },
    { campaign: health, amount: 1500, days: 12, frequency: "ONE_TIME" as const },
  ];
  for (const h of history) {
    const when = new Date(Date.now() - h.days * 86_400_000);
    const d = await prisma.donation.create({
      data: {
        idempotencyKey: randomUUID(),
        userId: donor.id,
        campaignId: h.campaign.id,
        amount: h.amount,
        donorName: donor.name,
        donorEmail: donor.email,
        donorPan: "ABCPV1234K",
        donorAddress: "12, Shivaji Nagar, Bhopal 462016",
        frequency: h.frequency,
        createdAt: when,
      },
    });
    toConfirm.push({
      id: d.id,
      when,
      after: async (number) => {
        if (h.frequency === "MONTHLY") {
          // Mandate started 60 days ago; its next instalment is overdue so the
          // admin "run monthly charges" button has real work to do in the demo.
          await prisma.donation.update({ where: { id: d.id }, data: { mandateStatus: "ACTIVE", nextChargeAt: addMonth(when) } });
        }
        await prisma.outbox.create({
          data: { to: donor.email, dedupeKey: `receipt:${number}`, subject: `रसीद ${number}: ₹${h.amount.toLocaleString("en-IN")} के दान के लिए धन्यवाद`, body: `प्रिय ${donor.name},\nआपके दान के लिए धन्यवाद। रसीद और 80G प्रमाण पत्र आपके खाते में है।`, createdAt: when },
        });
      },
    });
  }

  // Guest donations so campaign totals look alive.
  const names = ["Rohit Sharma", "Fatima Khan", "Suresh Patel", "Kavya Iyer", "Gurpreet Kaur", "Arjun Das"];
  for (let i = 0; i < 18; i++) {
    const campaign = i % 3 === 0 ? livelihood : health;
    const when = new Date(Date.now() - (i * 9 + 3) * 86_400_000);
    const d = await prisma.donation.create({
      data: {
        idempotencyKey: randomUUID(),
        campaignId: campaign.id,
        amount: [1000, 2000, 5000, 1500, 10000, 500][i % 6],
        donorName: names[i % names.length],
        donorEmail: `donor${i}@example.com`,
        donorPan: `ABCP${String.fromCharCode(65 + (i % 26))}${String(1000 + i)}K`,
        donorAddress: "Bhopal, Madhya Pradesh",
        createdAt: when,
      },
    });
    toConfirm.push({ id: d.id, when });
  }

  // A campaign push over the last two weeks, so the dashboard chart has shape.
  for (let i = 0; i < 30; i++) {
    const campaign = i % 4 === 0 ? livelihood : health;
    const when = new Date(Date.now() - ((i * 5) % 14) * 86_400_000 - (i % 5) * 3_600_000);
    const d = await prisma.donation.create({
      data: {
        idempotencyKey: randomUUID(),
        campaignId: campaign.id,
        amount: [500, 1000, 1500, 2500, 1000, 5000][i % 6],
        donorName: names[(i + 2) % names.length],
        donorEmail: `recent${i}@example.com`,
        donorPan: `ABCP${String.fromCharCode(65 + ((i + 7) % 26))}${String(2000 + i)}L`,
        donorAddress: "Madhya Pradesh",
        createdAt: when,
      },
    });
    toConfirm.push({ id: d.id, when });
  }

  toConfirm.sort((a, b) => a.when.getTime() - b.when.getTime());
  for (const c of toConfirm) {
    const r = await confirmPayment(c.id, `test_pay_seed_${c.id.slice(-6)}`, prisma, c.when);
    await c.after?.(r.number);
  }

  await prisma.callbackRequest.createMany({
    data: [
      { phone: "9876500011", district: "SEHORE", schemeCodes: ["SCH-014", "SCH-052"], createdAt: new Date(Date.now() - 2 * 86_400_000) },
      { phone: "9876500022", district: "VIDISHA", schemeCodes: ["SCH-031"], createdAt: new Date(Date.now() - 1 * 86_400_000) },
      { phone: "9876500033", district: "HARDA", schemeCodes: [], createdAt: new Date(Date.now() - 3 * 3_600_000) },
      { phone: "9876500044", district: "BHOPAL", schemeCodes: ["SCH-022"], handled: true, handledBy: "admin@demo.org", handledAt: new Date(Date.now() - 4 * 86_400_000), note: "SHG लोन के कागज़ समझाए, ब्लॉक कार्यालय भेजा", createdAt: new Date(Date.now() - 5 * 86_400_000) },
    ],
  });
  const vias = ["QUESTIONS", "AI_TEXT", "QUESTIONS", "VOICE", "AI_TEXT", "QUESTIONS"];
  await prisma.finderUse.createMany({
    data: Array.from({ length: 64 }, (_, i) => ({ via: vias[i % vias.length], matches: (i % 4) + 1, createdAt: new Date(Date.now() - (i % 28) * 86_400_000 - i * 3_600_000) })),
  });

  console.log("Seeded: 2 users, %d schemes, 9 help centres, 2 campaigns, 51 paid donations", schemes.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
