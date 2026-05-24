import { prisma } from "@/server/db/prisma";

const HIDDEN_PLACE_NAMES = ["A동", "D동"];
                
export async function findPlaces(filter?: { categoryCode?: string; tag?: string }) {
    return prisma.place.findMany({
        where: {
        is_active: true,
        name: { notIn: HIDDEN_PLACE_NAMES },
        ...(filter?.categoryCode ? { category: { code: filter.categoryCode } } : {}),
        ...(filter?.tag ? { tags: { some: { tag: filter.tag } } } : {}),
        },
        include: { category: true, tags: true },
    });
}

export async function findPlaceById(placeId: number) {
    return prisma.place.findUnique({
        where: { id: placeId },
        include: { category: true, tags: true },
    });
}
