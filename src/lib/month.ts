export const MES = /^\d{4}-(0[1-9]|1[0-2])$/

export function mesOuPadrao(valor: string | undefined, padrao: string): string {
  return valor && MES.test(valor) ? valor : padrao
}