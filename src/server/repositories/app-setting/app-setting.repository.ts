import { prisma } from "@/server/db/prisma";

const appSettingSelect = {
  key: true,
  value: true,
  updated_at: true,
} as const;

export async function findAppSetting(key: string) {
  return prisma.appSetting.findUnique({
    where: { key },
    select: appSettingSelect,
  });
}

export async function upsertAppSetting(key: string, value: string) {
  return prisma.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: {
      value,
      updated_at: new Date(),
    },
    select: appSettingSelect,
  });
}
