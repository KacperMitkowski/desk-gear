import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"

import { prisma } from "@/lib/db/prisma"

// DB-level CHECK `cart_exactly_one_owner` = num_nonnulls(user_id, guest_token) = 1.
// Koszyk musi mieć DOKŁADNIE jednego właściciela: gość XOR user.
// Weryfikuje review CodeRabbit (#32) — odrzucenie obu błędnych stanów (oba NULL, oba ustawione).

const TEST_EMAIL = "cart-owner-constraint@desk-gear.test"
const GUEST_TOKEN = "tok-guest-only"
const CONSTRAINT = /cart_exactly_one_owner/

let testUserId: string
const createdCartIds: string[] = []

// Sprząta po sobie ORAZ po ewentualnym przerwanym wcześniejszym przebiegu:
// koszyk usera kasuje kaskada przy usunięciu usera, ale koszyk-sierota gościa (bez usera)
// musimy usunąć po guest_token — inaczej kolejny run pada na unique violation (P2002).
async function purgeTestData() {
  await prisma.cart.deleteMany({ where: { guestToken: { in: [GUEST_TOKEN] } } })
  await prisma.user.deleteMany({ where: { email: TEST_EMAIL } })
}

beforeAll(async () => {
  await purgeTestData()
  const user = await prisma.user.create({
    data: { email: TEST_EMAIL, passwordHash: "test-not-a-real-hash" },
  })
  testUserId = user.id
})

afterEach(async () => {
  if (createdCartIds.length > 0) {
    await prisma.cart.deleteMany({ where: { id: { in: createdCartIds } } })
    createdCartIds.length = 0
  }
})

afterAll(async () => {
  await purgeTestData()
  await prisma.$disconnect()
})

describe("cart_exactly_one_owner (DB CHECK)", () => {
  it("odrzuca koszyk bez właściciela (user_id i guest_token = NULL)", async () => {
    await expect(prisma.cart.create({ data: {} })).rejects.toThrow(CONSTRAINT)
  })

  it("odrzuca koszyk z dwoma właścicielami (user_id i guest_token ustawione)", async () => {
    await expect(
      prisma.cart.create({ data: { userId: testUserId, guestToken: "tok-both-owners" } }),
    ).rejects.toThrow(CONSTRAINT)
  })

  it("akceptuje koszyk gościa (tylko guest_token)", async () => {
    const cart = await prisma.cart.create({ data: { guestToken: GUEST_TOKEN } })
    createdCartIds.push(cart.id)
    expect(cart.userId).toBeNull()
    expect(cart.guestToken).toBe(GUEST_TOKEN)
  })

  it("akceptuje koszyk użytkownika (tylko user_id)", async () => {
    const cart = await prisma.cart.create({ data: { userId: testUserId } })
    createdCartIds.push(cart.id)
    expect(cart.userId).toBe(testUserId)
    expect(cart.guestToken).toBeNull()
  })
})
