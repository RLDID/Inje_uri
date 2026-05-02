import { prisma } from "@/server/db/prisma";                                                                   
                
export async function findPlaces(filter?: { categoryCode?: string; tag?: string }) {
    return prisma.place.findMany({
        where: {
        is_active: true,
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
