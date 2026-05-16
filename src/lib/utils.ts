/**
 * Converts a number to Arabic words (simplified for currency)
 */
export function numberToArabicWords(num: number): string {
  if (num === 0) return "صفر";
  if (num < 0) return "سالب " + numberToArabicWords(Math.abs(num));

  // Remove fractions, we deal with IQD typical integer currency
  num = Math.floor(num);

  const units = [
    "",
    "واحد",
    "اثنان",
    "ثلاثة",
    "أربعة",
    "خمسة",
    "ستة",
    "سبعة",
    "ثمانية",
    "تسعة",
  ];
  const teens = [
    "عشرة",
    "أحد عشر",
    "اثنا عشر",
    "ثلاثة عشر",
    "أربعة عشر",
    "خمسة عشر",
    "ستة عشر",
    "سبعة عشر",
    "ثمانية عشر",
    "تسعة عشر",
  ];
  const tens = [
    "",
    "عشرة",
    "عشرون",
    "ثلاثون",
    "أربعون",
    "خمسون",
    "ستون",
    "سبعون",
    "ثمانون",
    "تسعون",
  ];
  const hundreds = [
    "",
    "مائة",
    "مائتان",
    "ثلاثمائة",
    "أربعمائة",
    "خمسمائة",
    "ستمائة",
    "سبعمائة",
    "ثمانمائة",
    "تسعمائة",
  ];

  function getGroup3(n: number): string {
    let res = "";
    const h = Math.floor(n / 100);
    const remainder = n % 100;

    if (h > 0) res += hundreds[h];

    if (remainder > 0) {
      if (res !== "") res += " و";
      if (remainder < 10) {
        res += units[remainder];
      } else if (remainder < 20) {
        res += teens[remainder - 10];
      } else {
        const u = remainder % 10;
        const t = Math.floor(remainder / 10);
        if (u > 0) {
          res += units[u] + " و" + tens[t];
        } else {
          res += tens[t];
        }
      }
    }
    return res.trim();
  }

  const scales = [
    { single: "", dual: "", plural: "" },
    { single: "ألف", dual: "ألفان", plural: "آلاف" },
    { single: "مليون", dual: "مليونان", plural: "ملايين" },
    { single: "مليار", dual: "ملياران", plural: "مليارات" },
  ];

  let resParts: string[] = [];
  let temp = num;
  let scaleIdx = 0;

  while (temp > 0) {
    const group = temp % 1000;
    temp = Math.floor(temp / 1000);

    if (group > 0) {
      let groupWord = "";
      if (scaleIdx === 0) {
        groupWord = getGroup3(group);
      } else {
        if (group === 1) {
          groupWord = scales[scaleIdx].single;
        } else if (group === 2) {
          groupWord = scales[scaleIdx].dual;
        } else if (group >= 3 && group <= 10) {
          groupWord = getGroup3(group) + " " + scales[scaleIdx].plural;
        } else {
          groupWord = getGroup3(group) + " " + scales[scaleIdx].single;
        }
      }
      if (groupWord !== "") {
        resParts.push(groupWord);
      }
    }
    scaleIdx++;
  }

  let finalPhrase = resParts.reverse().join(" و");
  finalPhrase = finalPhrase.replace(/\s+/g, " ").trim();

  // Handle grammatical fix for Mudhaf: replace Noon when directly preceding the currency
  finalPhrase = finalPhrase
    .replace(/مليونان$/, "مليونا")
    .replace(/ألفان$/, "ألفا")
    .replace(/مائتان$/, "مائتا")
    .replace(/ملياران$/, "مليارا");

  return finalPhrase + " دينار فقط لا غير";
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ar-IQ", {
    style: "currency",
    currency: "IQD",
  }).format(amount);
}

export function generateNumericBarcode(
  schoolId?: string,
  length: number = 10,
): string {
  let prefix = "";
  if (schoolId) {
    let hash = 0;
    for (let i = 0; i < schoolId.length; i++) {
      hash = schoolId.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Take a 4-digit number (1000-9999) based on the hash string to ensure distinctness between schools
    prefix = ((Math.abs(hash) % 9000) + 1000).toString();
  } else {
    prefix = Math.floor(Math.random() * 9000 + 1000).toString();
  }

  let result = prefix;
  for (let i = 0; i < length - prefix.length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}
