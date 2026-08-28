/** Normalize CPF to digits only */
export function normalizeCpf(raw: string): string {
  return String(raw || "").replace(/\D/g, "");
}

export function isValidCpfFormat(cpf: string): boolean {
  const d = normalizeCpf(cpf);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;
  // checksum
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i], 10) * (10 - i);
  let rev = (sum * 10) % 11;
  if (rev === 10) rev = 0;
  if (rev !== parseInt(d[9], 10)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i], 10) * (11 - i);
  rev = (sum * 10) % 11;
  if (rev === 10) rev = 0;
  if (rev !== parseInt(d[10], 10)) return false;
  return true;
}

export async function assertCpfAvailable(
  prisma: { user: { findFirst: Function } },
  cpf: string,
  exceptUserId?: string
) {
  const digits = normalizeCpf(cpf);
  if (!isValidCpfFormat(digits)) {
    throw new Error("CPF inválido");
  }
  const existing = await prisma.user.findFirst({
    where: {
      cpf: digits,
      ...(exceptUserId ? { id: { not: exceptUserId } } : {}),
    },
  });
  if (existing) {
    throw new Error("CPF em uso");
  }
  return digits;
}
