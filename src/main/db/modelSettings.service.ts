import { Prisma } from '@prisma/client'
import { prisma, serialize } from './prisma'
import { getSessionUser } from './auth.service'
import { logModelSettingUpdate } from './modelSettingLog'

export async function createModelSetting(input: Prisma.ModelSettingCreateInput) {
  return serialize(await prisma.modelSetting.create({ data: input }))
}

export async function listModelSettings() {
  return serialize(await prisma.modelSetting.findMany())
}

export async function getModelSettingById(id: string) {
  return serialize(await prisma.modelSetting.findUnique({ where: { id } }))
}

export async function updateModelSetting(input: Prisma.ModelSettingUpdateInput & { id: string }) {
  const { id, ...data } = input

  const updated = await prisma.modelSetting.update({
    where: { id },
    data
  })

  logModelSettingUpdate({
    id,
    updatedFields: data,
    result: updated,
    userName: getSessionUser()?.userName
  })

  return serialize(updated)
}

export async function deleteModelSetting(id: string) {
  return serialize(await prisma.modelSetting.delete({ where: { id } }))
}
