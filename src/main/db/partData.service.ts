import { Prisma } from '@prisma/client'
import { prisma, serialize } from './prisma'
import { getSessionUser } from './auth.service'

export interface PartDataDateRange {
  startDate: string | Date
  endDate: string | Date
  shift?: string
}

export async function createPartData(input: Prisma.PartDataCreateInput) {
  const sessionUser = getSessionUser()

  return serialize(
    await prisma.partData.create({
      data: {
        ...input,
        ...(sessionUser
          ? {
              updatedBy: {
                connect: { id: sessionUser.id }
              }
            }
          : {})
      }
    })
  )
}

export async function listPartData({ startDate, endDate, shift }: PartDataDateRange) {
  return serialize(
    await prisma.partData.findMany({
      where: {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        },
        shift
      },
      include: {
        updatedBy: {
          select: { userName: true }
        }
      }
    })
  )
}

export async function getPartDataById(id: number) {
  return serialize(await prisma.partData.findUnique({ where: { id } }))
}

export async function updatePartData(input: Prisma.PartDataUpdateInput & { id: number }) {
  const { id, ...data } = input
  return serialize(await prisma.partData.update({ where: { id }, data }))
}

export async function deletePartData(id: number) {
  return serialize(await prisma.partData.delete({ where: { id } }))
}
