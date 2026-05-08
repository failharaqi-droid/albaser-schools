/**
 * Converts a number to Arabic words (simplified for currency)
 */
export function numberToArabicWords(num: number): string {
  if (num === 0) return "صفر";
  if (num > 999999999) return "مبلغ كبير جداً";

  const units = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  const tens = ["", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];
  
  function convertGroup(n: number): string {
    let res = "";
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (h > 0) res += hundreds[h] + " ";
    
    if (t > 0 || u > 0) {
      if (res !== "") res += "و ";
      if (t === 0) res += units[u];
      else if (t === 1) {
        if (u === 0) res += "عشرة";
        else if (u === 1) res += "أحد عشر";
        else if (u === 2) res += "اثنا عشر";
        else res += units[u] + " عشر";
      } else {
        if (u > 0) res += units[u] + " و " + tens[t];
        else res += tens[t];
      }
    }
    return res.trim();
  }

  let result = "";
  const millions = Math.floor(num / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const remainder = num % 1000;

  if (millions > 0) {
    if (millions === 1) result += "مليون";
    else if (millions === 2) result += "مليونان";
    else if (millions >= 3 && millions <= 10) result += convertGroup(millions) + " ملايين";
    else result += convertGroup(millions) + " مليون";
  }

  if (thousands > 0) {
    if (result !== "") result += " و ";
    if (thousands === 1) result += "ألف";
    else if (thousands === 2) result += "ألفان";
    else if (thousands >= 3 && thousands <= 10) result += convertGroup(thousands) + " آلاف";
    else result += convertGroup(thousands) + " ألف";
  }

  if (remainder > 0) {
    if (result !== "") result += " و ";
    result += convertGroup(remainder);
  }

  return result.trim() + " دينار فقط لا غير";
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-IQ', { style: 'currency', currency: 'IQD' }).format(amount);
}

export function generateNumericBarcode(length: number = 10): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}
