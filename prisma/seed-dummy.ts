import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const PLAN_MONTHLY = "cmr16qk7j0004w61rydikeytz";   // Μηνιαία 200€
const PLAN_6MONTH  = "cmr16rfyr0005w61rc28v5nsr";   // 6μηνη  500€
const PLAN_PERSONAL = "cmr18674j00009h1rxkwpma3t";  // Friendly (personalized) 15€/class

// weeklyDays JSON: [{day: isoWeekDay(1=Mon..7=Sun), time: "HH:MM"}]
const SCHEDULES = [
  '[{"day":1,"time":"09:00"},{"day":3,"time":"09:00"}]',   // Mon+Wed 09:00
  '[{"day":2,"time":"10:00"},{"day":4,"time":"10:00"}]',   // Tue+Thu 10:00
  '[{"day":1,"time":"11:00"},{"day":5,"time":"11:00"}]',   // Mon+Fri 11:00
  '[{"day":3,"time":"12:00"},{"day":5,"time":"12:00"}]',   // Wed+Fri 12:00
  '[{"day":2,"time":"13:00"},{"day":6,"time":"13:00"}]',   // Tue+Sat 13:00
  '[{"day":1,"time":"14:00"},{"day":4,"time":"14:00"}]',   // Mon+Thu 14:00
  '[{"day":3,"time":"15:00"},{"day":5,"time":"15:00"}]',   // Wed+Fri 15:00
  '[{"day":2,"time":"16:00"},{"day":4,"time":"16:00"}]',   // Tue+Thu 16:00
  '[{"day":1,"time":"17:00"},{"day":3,"time":"17:00"}]',   // Mon+Wed 17:00
  '[{"day":4,"time":"18:00"},{"day":6,"time":"18:00"}]',   // Thu+Sat 18:00
  '[{"day":2,"time":"19:00"},{"day":5,"time":"19:00"}]',   // Tue+Fri 19:00
  '[{"day":1,"time":"20:00"},{"day":4,"time":"20:00"}]',   // Mon+Thu 20:00
  '[{"day":3,"time":"09:00"},{"day":5,"time":"09:00"}]',   // Wed+Fri 09:00
  '[{"day":2,"time":"11:00"},{"day":6,"time":"11:00"}]',   // Tue+Sat 11:00
  '[{"day":1,"time":"10:00"},{"day":3,"time":"10:00"},{"day":5,"time":"10:00"}]', // Mon+Wed+Fri 10:00
];

const MEMBERS = [
  { name: "Αλέξανδρος Παπαδόπουλος", email: "alex.papad@gym.local", plan: PLAN_MONTHLY, schedIdx: 0 },
  { name: "Μαρία Κωνσταντίνου",      email: "maria.konst@gym.local", plan: PLAN_6MONTH,  schedIdx: 1 },
  { name: "Νίκος Γεωργίου",          email: "nikos.georg@gym.local", plan: PLAN_PERSONAL, schedIdx: 2 },
  { name: "Ελένη Παπανικολάου",      email: "eleni.papan@gym.local", plan: PLAN_MONTHLY, schedIdx: 3 },
  { name: "Γιώργος Αντωνίου",        email: "giorg.anton@gym.local", plan: PLAN_6MONTH,  schedIdx: 4 },
  { name: "Κατερίνα Νικολάου",       email: "kater.nikol@gym.local", plan: PLAN_PERSONAL, schedIdx: 5 },
  { name: "Πέτρος Δημητρίου",        email: "petros.dimit@gym.local", plan: PLAN_MONTHLY, schedIdx: 6 },
  { name: "Σοφία Αλεξάνδρου",        email: "sofia.alexan@gym.local", plan: PLAN_6MONTH,  schedIdx: 7 },
  { name: "Βασίλης Παπαδάκης",       email: "vasil.papad@gym.local", plan: PLAN_PERSONAL, schedIdx: 8 },
  { name: "Αντιγόνη Σταματίου",      email: "antig.stamat@gym.local", plan: PLAN_MONTHLY, schedIdx: 9 },
  { name: "Δημήτρης Λαζαρίδης",      email: "dimit.lazar@gym.local", plan: PLAN_6MONTH,  schedIdx: 10 },
  { name: "Χριστίνα Μαρκοπούλου",    email: "xrist.marko@gym.local", plan: PLAN_PERSONAL, schedIdx: 11 },
  { name: "Τάσος Βλάχος",            email: "tasos.vlach@gym.local", plan: PLAN_MONTHLY, schedIdx: 12 },
  { name: "Ιωάννα Σπυροπούλου",      email: "ioann.spyro@gym.local", plan: PLAN_6MONTH,  schedIdx: 13 },
  { name: "Κώστας Μιχαηλίδης",       email: "kostas.micha@gym.local", plan: PLAN_PERSONAL, schedIdx: 14 },
];

async function main() {
  const passwordHash = await bcrypt.hash("member123", 10);
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1); // start of current month

  for (const m of MEMBERS) {
    // Check if already exists
    const existing = await prisma.user.findUnique({ where: { email: m.email } });
    if (existing) { console.log(`Skip (exists): ${m.name}`); continue; }

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: m.plan } });
    if (!plan) { console.log(`Plan not found for ${m.name}, skipping`); continue; }

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + plan.durationDays);

    await prisma.user.create({
      data: {
        email: m.email,
        name: m.name,
        passwordHash,
        role: "MEMBER",
        member: {
          create: {
            weeklyDays: SCHEDULES[m.schedIdx],
            subscriptions: {
              create: {
                planId: m.plan,
                status: "ACTIVE",
                startDate,
                endDate,
                classesLeft: plan.maxClasses ?? null,
              },
            },
          },
        },
      },
    });
    console.log(`✓ Created: ${m.name} (${plan.name})`);
  }

  console.log("\nDone! 15 dummy members created.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
