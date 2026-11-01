/** plural(3, ["пункт", "пункта", "пунктов"]) → "3 пункта" */
export function plural(n: number, forms: [string, string, string]): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  let form = forms[2];
  if (mod100 < 11 || mod100 > 14) {
    if (mod10 === 1) form = forms[0];
    else if (mod10 >= 2 && mod10 <= 4) form = forms[1];
  }
  return `${n} ${form}`;
}
