import { PrismaClient } from "@prisma/client";
import { ATTRIBUTES, DEFAULTS } from "../src/lib/game.config";

const prisma = new PrismaClient();

async function main() {
  let hunter = await prisma.hunter.findFirst();
  if (!hunter) {
    hunter = await prisma.hunter.create({
      data: {
        name: "Mathieu",
        penaltyIntensity: DEFAULTS.penaltyIntensity,
        dayRolloverHour: DEFAULTS.dayRolloverHour,
        timezone: DEFAULTS.timezone,
        maxHp: DEFAULTS.startingMaxHp,
        hp: DEFAULTS.startingMaxHp,
      },
    });
    console.log("Chasseur cree:", hunter.name);
  }

  for (const a of ATTRIBUTES) {
    await prisma.attribute.upsert({
      where: { hunterId_code: { hunterId: hunter.id, code: a.code } },
      update: { name: a.name, icon: a.icon, color: a.color, order: a.order },
      create: {
        hunterId: hunter.id,
        code: a.code,
        name: a.name,
        icon: a.icon,
        color: a.color,
        order: a.order,
      },
    });
  }
  console.log(ATTRIBUTES.length + " attributs prets.");

  const existing = await prisma.quest.count({ where: { hunterId: hunter.id } });
  if (existing === 0) {
    const samples: {
      title: string;
      attributeCodes: string[];
      baseXp: number;
      difficulty: string;
      isMandatory?: boolean;
    }[] = [
      { title: "Quete du Systeme : 30 min d'exercice", attributeCodes: ["FOR", "VIT"], baseXp: 80, difficulty: "D", isMandatory: true },
      { title: "Lire 20 pages", attributeCodes: ["INT"], baseXp: 50, difficulty: "E" },
      { title: "Mediter 10 minutes", attributeCodes: ["VOL"], baseXp: 40, difficulty: "E" },
      { title: "Noter ses depenses du jour", attributeCodes: ["FIN"], baseXp: 30, difficulty: "E" },
      { title: "Appeler / voir un proche", attributeCodes: ["FAM"], baseXp: 40, difficulty: "E" },
      { title: "Avancer une tache cle du travail", attributeCodes: ["TRA"], baseXp: 60, difficulty: "D" },
      { title: "S'occuper du jardin 15 min", attributeCodes: ["JAR"], baseXp: 40, difficulty: "E" },
      { title: "Pratiquer l'artisanat 20 min", attributeCodes: ["ART"], baseXp: 40, difficulty: "E" },
    ];
    for (const s of samples) {
      await prisma.quest.create({
        data: {
          hunterId: hunter.id,
          title: s.title,
          type: "daily",
          recurrence: "daily",
          attributeCodes: JSON.stringify(s.attributeCodes),
          baseXp: s.baseXp,
          difficulty: s.difficulty,
          isMandatory: s.isMandatory ?? false,
        },
      });
    }
    console.log(samples.length + " quetes d'exemple creees.");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
