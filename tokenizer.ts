export function tokenizeWord(word: string): string[] {
  const alwaysSplit = word.match(/^(qu|tu|tch|li)\'/i);
  if (alwaysSplit) {
    const prefix = alwaysSplit[1] as "qu" | "tu" | "tch" | "li";
    return [prefix, tokenizeWord(word.substring(prefix.length + 1))].flat();
  }

  const prefix = word.match(/^(ch|[djlmnsty])\'/i);
  if (prefix) {
    const prefixToken = prefix[1]!;
    if (
      prefixToken in nobreak &&
      nobreak[
        prefixToken as "ch" | "d" | "j" | "l" | "m" | "n" | "s" | "t"
      ].includes(stem(word))
    ) {
      return [word];
    }
    return [
      prefixToken,
      tokenizeWord(word.substring(prefixToken.length + 1)),
    ].flat();
  }

  return [word];
}

export function tokenize(text: string): string[] {
  const tokens = text
    .split(/[^\'a-z0-9äâàéèëêïîöôùüûç]+/i)
    .flatMap(tokenizeWord)
    .filter(Boolean);

  return tokens;
}

/**
 * Stem a word thanks to Porter Stemmer rules
 * @param  {String} token Word to be stemmed
 * @return {String}       Stemmed word
 */
function stem(token: string): string {
  token = prelude(token.toLowerCase());

  if (token.length === 1) {
    return token;
  }

  const regs = regions(token);

  let r1txt = token.substring(regs.r1);
  let r2txt = token.substring(regs.r2);
  let rvtxt = token.substring(regs.rv);

  // Step 1
  const beforeStep1 = token;
  let suf: string;
  let letterBefore: string;
  let letter2Before: string;
  let i: number;
  let doStep2a = false;

  if (
    (suf = endsinArr(r2txt, [
      "ance",
      "iqUe",
      "isme",
      "abl'Ye",
      "ibl'Ye",
      "iste",
      "eux",
      "ances",
      "iqUes",
      "ismes",
      "abl'Yes",
      "ibl'Yes",
      "istes",
    ])) !== ""
  ) {
    token = token.slice(0, -suf.length); // delete
  } else if (
    (suf = endsinArr(token, [
      "icatrice",
      "icateur",
      "icâtion",
      "icatrices",
      "icateurs",
      "icâtions",
    ])) !== ""
  ) {
    if (
      endsinArr(r2txt, [
        "icatrice",
        "icateur",
        "icâtion",
        "icatrices",
        "icateurs",
        "icâtions",
      ]) !== ""
    ) {
      token = token.slice(0, -suf.length); // delete
    } else {
      token = token.slice(0, -suf.length) + "iqU"; // replace by iqU
    }
  } else if (
    (suf = endsinArr(r2txt, [
      "atrice",
      "ateur",
      "âtion",
      "atrices",
      "ateurs",
      "âtions",
    ])) !== ""
  ) {
    token = token.slice(0, -suf.length); // delete
  } else if ((suf = endsinArr(r2txt, ["logie", "logies"])) !== "") {
    token = token.slice(0, -suf.length) + "log"; // replace with log
  } else if (
    (suf = endsinArr(r2txt, ["usion", "ution", "usions", "utions"])) !== ""
  ) {
    token = token.slice(0, -suf.length) + "u"; // replace with u
  } else if ((suf = endsinArr(r2txt, ["ence", "ences"])) !== "") {
    token = token.slice(0, -suf.length) + "ent"; // replace with ent
  } else if ((suf = endsinArr(r1txt, ["issement", "issements"])) !== "") {
    if (!isVowel(token[token.length - suf.length - 1]!)) {
      token = token.slice(0, -suf.length); // delete
      r1txt = token.substring(regs.r1);
      r2txt = token.substring(regs.r2);
      rvtxt = token.substring(regs.rv);
    }
  } else if ((suf = endsinArr(r2txt, ["ativement", "ativements"])) !== "") {
    token = token.slice(0, -suf.length); // delete
  } else if ((suf = endsinArr(r2txt, ["ivement", "ivements"])) !== "") {
    token = token.slice(0, -suf.length); // delete
  } else if ((suf = endsinArr(token, ["eusement", "eusements"])) !== "") {
    if ((suf = endsinArr(r2txt, ["eusement", "eusements"])) !== "") {
      token = token.slice(0, -suf.length);
    } else if ((suf = endsinArr(r1txt, ["eusement", "eusements"])) !== "") {
      token = token.slice(0, -suf.length) + "eux";
    } else if ((suf = endsinArr(rvtxt, ["ement", "ements"])) !== "") {
      token = token.slice(0, -suf.length);
    } // delete
  } else if (
    (suf = endsinArr(r2txt, [
      "abl'Yement",
      "abl'Yements",
      "iqUement",
      "iqUements",
    ])) !== ""
  ) {
    token = token.slice(0, -suf.length); // delete
  } else if (
    (suf = endsinArr(rvtxt, [
      "ièthement",
      "ièthements",
      "Ièthement",
      "Ièthements",
    ])) !== ""
  ) {
    token = token.slice(0, -suf.length) + "i"; // replace by i
  } else if ((suf = endsinArr(rvtxt, ["ement", "ements"])) !== "") {
    token = token.slice(0, -suf.length); // delete
  } else if ((suf = endsinArr(token, ["icité", "icités"])) !== "") {
    if (endsinArr(r2txt, ["icité", "icités"]) !== "") {
      token = token.slice(0, -suf.length);
    } else {
      token = token.slice(0, -suf.length) + "iqU";
    }
  } else if ((suf = endsinArr(token, ["abilité", "abilités"])) !== "") {
    if (endsinArr(r2txt, ["abilité", "abilités"]) !== "") {
      token = token.slice(0, -suf.length);
    } else {
      token = token.slice(0, -suf.length) + "abl";
    }
  } else if ((suf = endsinArr(r2txt, ["ité", "ités"])) !== "") {
    token = token.slice(0, -suf.length); // delete if in R2
  } else if (
    (suf = endsinArr(token, ["icatif", "icative", "icatifs", "icatives"])) !==
    ""
  ) {
    if (
      (suf = endsinArr(r2txt, ["icatif", "icative", "icatifs", "icatives"])) !==
      ""
    ) {
      token = token.slice(0, -suf.length); // delete
      r2txt = token.substring(regs.r2);
      rvtxt = token.substring(regs.rv);
    }
    if ((suf = endsinArr(r2txt, ["atif", "ative", "atifs", "atives"])) !== "") {
      token = token.slice(0, -suf.length - 2) + "iqU"; // replace with iqU
      r2txt = token.substring(regs.r2);
      rvtxt = token.substring(regs.rv);
    }
  } else if (
    (suf = endsinArr(r2txt, ["atif", "ative", "atifs", "atives"])) !== ""
  ) {
    token = token.slice(0, -suf.length); // delete
  } else if ((suf = endsinArr(r2txt, ["if", "ive", "ifs", "ives"])) !== "") {
    token = token.slice(0, -suf.length); // delete
  } else if ((suf = endsinArr(token, ["tchieaux"])) !== "") {
    token = token.slice(0, -suf.length) + "té"; // replace by eau
  } else if ((suf = endsinArr(token, ["ieaux"])) !== "") {
    token = token.slice(0, -suf.length) + "é"; // replace by eau
  } else if ((suf = endsinArr(token, ["eaux"])) !== "") {
    token = token.slice(0, -suf.length) + "eau"; // replace by eau
  } else if ((suf = endsinArr(r1txt, ["aux"])) !== "") {
    token = token.slice(0, -suf.length) + "al"; // replace by al
  } else if ((suf = endsinArr(r2txt, ["euse", "euses"])) !== "") {
    token = token.slice(0, -suf.length); // delete
  } else if (
    (suf = endsinArr(r1txt, ["euse", "euses", "euthe", "euthes"])) !== ""
  ) {
    token = token.slice(0, -suf.length) + "eux"; // replace by eux
  } else if ((suf = endsinArr(rvtxt, ["amment"])) !== "") {
    token = token.slice(0, -suf.length) + "ant"; // replace by ant
    doStep2a = true;
  } else if ((suf = endsinArr(rvtxt, ["emment"])) !== "") {
    token = token.slice(0, -suf.length) + "ent"; // replace by ent
    doStep2a = true;
  } else if ((suf = endsinArr(rvtxt, ["ment", "ments"])) !== "") {
    // letter before must be a vowel in RV
    letterBefore = token[token.length - suf.length - 1]!;
    if (isVowel(letterBefore) && endsin(rvtxt, letterBefore + suf)) {
      token = token.slice(0, -suf.length); // delete
      doStep2a = true;
    }
  }

  // re compute regions
  r1txt = token.substring(regs.r1);
  r2txt = token.substring(regs.r2);
  rvtxt = token.substring(regs.rv);

  // Step 2a
  const beforeStep2a = token;
  let step2aDone = false;
  if (beforeStep1 === token || doStep2a) {
    step2aDone = true;
    if (
      (suf = endsinArr(rvtxt, [
        "iéthie",
        "éthie",
        "'thie",
        "'die",
        "'lie",
        "'nie",
        "'rie",
        "'sie",
        "'tie",
        "Yi",
        "Yis",
        "Yit",
        "Yînmes",
        "Yîtes",
        "Yîdres",
        "Yîtent",
        "Yîdrent",
        "'Ye",
        "Yons",
        "Yiz",
        "'Yent",
        "Yais",
        "Yait",
        "Yêmes",
        "Yions",
        "Yêtes",
        "Yiez",
        "YaIent",
        "înmes",
        "ît",
        "îtes",
        "îdres",
        "i",
        "ie",
        "Ie",
        "ies",
        "ith",
        "itha",
        "ithai",
        "ithaIent",
        "ithais",
        "ithait",
        "ithas",
        "ithent",
        "ithez",
        "ithêmes",
        "ithiez",
        "ithêtes",
        "ithions",
        "ithons",
        "ithont",
        "is",
        "issaIent",
        "issais",
        "issait",
        "issant",
        "issante",
        "issantes",
        "issants",
        "isse",
        "issent",
        "isses",
        "issez",
        "issêtes",
        "issiez",
        "issêmes",
        "issions",
        "issons",
        "it",
        "îsse",
        "îssions",
        "îssYiz",
        "îssiez",
        "îssent",
      ])) !== ""
    ) {
      letterBefore = token[token.length - suf.length - 1]!;
      if (!isVowel(letterBefore) && endsin(rvtxt, letterBefore + suf)) {
        token = token.slice(0, -suf.length);
      } // delete
    }
  }

  // Step 2b
  if (step2aDone && token === beforeStep2a) {
    if (
      (suf = endsinArr(rvtxt, [
        "é",
        "ée",
        "ées",
        "és",
        "èrent",
        "er",
        "etha",
        "ethai",
        "ethaIent",
        "ethais",
        "ethait",
        "ethas",
        "ethez",
        "ethêtes",
        "ethiez",
        "ethêmes",
        "ethions",
        "ethons",
        "ethont",
        "étha",
        "éthai",
        "éthaIent",
        "éthais",
        "éthait",
        "éthas",
        "éthez",
        "éthêtes",
        "éthiez",
        "éthêmes",
        "éthions",
        "éthons",
        "éthont",
        "ez",
        "iez",
        "Iez",
        "éthions",
        "éthiez",
        "'thai",
        "'thas",
        "'tha",
        "'thons",
        "'thez",
        "'thont",
        "'thais",
        "'thait",
        "'thêmes",
        "'thêtes",
        "'thaIent",
        "'dai",
        "'das",
        "'da",
        "'dons",
        "'dez",
        "'dont",
        "'dais",
        "'dait",
        "'dêmes",
        "'dêtes",
        "'daIent",
        "'lai",
        "'las",
        "'la",
        "'lons",
        "'lez",
        "'lont",
        "'lais",
        "'lait",
        "'lêmes",
        "'lêtes",
        "'laIent",
        "'nai",
        "'nas",
        "'na",
        "'nons",
        "'nez",
        "'nont",
        "'nais",
        "'nait",
        "'nêmes",
        "'nêtes",
        "'naIent",
        "'rai",
        "'ras",
        "'ra",
        "'rons",
        "'rez",
        "'ront",
        "'rais",
        "'rait",
        "'rêmes",
        "'rêtes",
        "'raIent",
        "'sai",
        "'sas",
        "'sa",
        "'sons",
        "'sez",
        "'sont",
        "'sais",
        "'sait",
        "'sêmes",
        "'sêtes",
        "'saIent",
        "'tai",
        "'tas",
        "'ta",
        "'tons",
        "'tez",
        "'tont",
        "'tais",
        "'tait",
        "'têmes",
        "'têtes",
        "'taIent",
        "'chai",
        "'chas",
        "'cha",
        "'chons",
        "'chez",
        "'chont",
        "'chais",
        "'chait",
        "'chêmes",
        "'chêtes",
        "'chaIent",
        "êmes",
        "êtes",
      ])) !== ""
    ) {
      token = token.slice(0, -suf.length); // delete
      r2txt = token.substring(regs.r2);
      rvtxt = token.substring(regs.rv);
    } else if (
      (suf = endsinArr(rvtxt, ["ions"])) !== "" &&
      endsinArr(r2txt, ["ions"])
    ) {
      token = token.slice(0, -suf.length); // delete
      r2txt = token.substring(regs.r2);
      rvtxt = token.substring(regs.rv);
    } else if (
      (suf = endsinArr(rvtxt, [
        "âmes",
        "ât",
        "âtes",
        "a",
        "ai",
        "aIent",
        "ais",
        "ait",
        "Yant",
        "ant",
        "ante",
        "antes",
        "ants",
        "as",
        "asse",
        "assent",
        "asses",
        "assiez",
        "assions",
      ])) !== ""
    ) {
      token = token.slice(0, -suf.length); // delete

      letterBefore = token[token.length - 1]!;
      if (letterBefore === "e" && endsin(rvtxt, "e" + suf)) {
        token = token.slice(0, -1);
      }

      r2txt = token.substring(regs.r2);
      rvtxt = token.substring(regs.rv);
    }
  }

  // Step 3
  if (!(token === beforeStep1)) {
    if (token[token.length - 1] === "Y") {
      token = token.slice(0, -1) + "i";
    }
    if (token[token.length - 1] === "ç") {
      token = token.slice(0, -1) + "c";
    }
  } else {
    // Step 4
    letterBefore = token[token.length - 1]!;
    letter2Before = token[token.length - 2]!;

    if (
      letterBefore === "s" &&
      ["a", "i", "o", "u", "è", "s"].indexOf(letter2Before) === -1
    ) {
      token = token.slice(0, -1);
      r1txt = token.substring(regs.r1);
      r2txt = token.substring(regs.r2);
      rvtxt = token.substring(regs.rv);
    }

    if ((suf = endsinArr(r2txt, ["ion"])) !== "") {
      letterBefore = token[token.length - suf.length - 1]!;
      if (letterBefore === "s" || letterBefore === "t") {
        token = token.slice(0, -suf.length); // delete
        r1txt = token.substring(regs.r1);
        r2txt = token.substring(regs.r2);
        rvtxt = token.substring(regs.rv);
      }
    }

    if (
      (suf = endsinArr(rvtxt, [
        "ier",
        "ièr",
        "ière",
        "Ier",
        "Ière",
        "iethe",
        "iéthe",
        "Iethe",
        "Iéthe",
      ])) !== ""
    ) {
      token = token.slice(0, -suf.length) + "i"; // replace by i
      r1txt = token.substring(regs.r1);
      r2txt = token.substring(regs.r2);
      rvtxt = token.substring(regs.rv);
    }
    if ((suf = endsinArr(rvtxt, ["'Ye", "e"])) !== "") {
      token = token.slice(0, -suf.length); // delete
      r1txt = token.substring(regs.r1);
      r2txt = token.substring(regs.r2);
      rvtxt = token.substring(regs.rv);
    }
    if ((suf = endsinArr(rvtxt, ["ë"])) !== "") {
      if (token.slice(token.length - 3, -1) === "gu") {
        token = token.slice(0, -suf.length);
      } // delete
    }
  }

  // Step 5
  if ((suf = endsinArr(token, ["enn", "onn", "ett", "ell", "eill"])) !== "") {
    token = token.slice(0, -1); // delete last letter
  }

  // Step 6a
  if ((suf = endsinArr(token, ["èl"])) !== "") {
    token = token.slice(0, -2) + "'l";
  }

  // Step 6
  i = token.length - 1;
  while (i > 0) {
    if (!isVowel(token[i]!)) {
      i--;
    } else if (
      i !== token.length - 1 &&
      (token[i] === "é" || token[i] === "è")
    ) {
      token =
        token.substring(0, i) + "e" + token.substring(i + 1, token.length);
      break;
    } else {
      break;
    }
  }

  return token.toLowerCase();
}

/**
 * Compute r1, r2, rv regions as required by french porter stemmer algorithm
 * @param  {String} token Word to compute regions on
 * @return {Object}       Regions r1, r2, rv as offsets from the begining of the word
 */
function regions(token: string) {
  let r1: number;
  let r2: number;
  let rv: number;
  let len: number;
  // var i

  r1 = r2 = rv = len = token.length;

  // R1 is the region after the first non-vowel following a vowel,
  for (let i = 0; i < len - 1 && r1 === len; i++) {
    if (isVowel(token[i]!) && !isVowel(token[i + 1]!)) {
      r1 = i + 2;
    }
  }
  // Or is the null region at the end of the word if there is no such non-vowel.

  // R2 is the region after the first non-vowel following a vowel in R1
  for (let i = r1; i < len - 1 && r2 === len; i++) {
    if (isVowel(token[i]!) && !isVowel(token[i + 1]!)) {
      r2 = i + 2;
    }
  }
  // Or is the null region at the end of the word if there is no such non-vowel.

  // RV region
  const three = token.slice(0, 3);
  if (isVowel(token[0]!) && isVowel(token[1]!)) {
    rv = 3;
  }
  if (three === "par" || three === "col" || three === "tap") {
    rv = 3;
  } else {
    // the region after the first vowel not at the beginning of the word or null
    for (let i = 1; i < len - 1 && rv === len; i++) {
      if (isVowel(token[i]!)) {
        rv = i + 1;
      }
    }
  }

  return {
    r1: r1,
    r2: r2,
    rv: rv,
  };
}

/**
 * Pre-process/prepare words as required by french porter stemmer algorithm
 * @param  {String} token Word to be prepared
 * @return {String}       Prepared word
 */
function prelude(token: string) {
  token = token.toLowerCase();

  let result = "";
  let i = 0;

  // special case for i = 0 to avoid '-1' index
  if (token[i] === "y" && isVowel(token[i + 1]!)) {
    result += token[i]!.toUpperCase();
  } else {
    result += token[i];
  }

  for (i = 1; i < token.length; i++) {
    if (
      (token[i] === "u" || token[i] === "i") &&
      isVowel(token[i - 1]!) &&
      isVowel(token[i + 1]!)
    ) {
      result += token[i]!.toUpperCase();
    } else if (
      token[i] === "y" &&
      (isVowel(token[i - 1]!) || isVowel(token[i + 1]!))
    ) {
      result += token[i]!.toUpperCase();
    } else if (token[i] === "u" && token[i - 1] === "q") {
      result += token[i]!.toUpperCase();
    } else {
      result += token[i];
    }
  }

  return result;
}

/**
 * Return longest matching suffixes for a token or '' if no suffix match
 * @param  {String} token    Word to find matching suffix
 * @param  {Array} suffixes  Array of suffixes to test matching
 * @return {String}          Longest found matching suffix or ''
 */
function endsinArr(token: string, suffixes: string[]) {
  let i;
  let longest = "";
  for (i = 0; i < suffixes.length; i++) {
    if (endsin(token, suffixes[i]!) && suffixes[i]!.length > longest.length) {
      longest = suffixes[i]!;
    }
  }

  return longest;
}

function isVowel(letter: string) {
  return (
    letter === "a" ||
    letter === "e" ||
    letter === "i" ||
    letter === "o" ||
    letter === "u" ||
    letter === "y" ||
    letter === "â" ||
    letter === "à" ||
    letter === "ë" ||
    letter === "é" ||
    letter === "ê" ||
    letter === "è" ||
    letter === "ï" ||
    letter === "î" ||
    letter === "ô" ||
    letter === "û" ||
    letter === "ù"
  );
}

function endsin(token: string, suffix: string) {
  if (token.length < suffix.length) return false;
  return token.slice(-suffix.length) === suffix;
}

export default stem;

const nobreak = {
  ch: [
    "ch'ler",
    "ch'lîn",
    "ch'lyi",
    "ch'minner",
    "ch'minneux",
    "ch'na",
    "ch'napan",
    "ch'nile",
    "ch'nole",
    "ch't",
    "ch'tî",
    "ch’la",
    "ch’lo",
  ].map(stem),
  d: [
    "d's",
    "d'bat",
    "d'battre",
    "d'bit",
    "d'bitant",
    "d'biter",
    "d'biteux",
    "d'bris",
    "d'but",
    "d'chet",
    "d'cours",
    "d'enpis",
    "d'faut",
    "d'faute",
    "d'fend",
    "d'fendre",
    "d'fendu",
    "d'fens'rêsse",
    "d'fense",
    "d'fenseûse",
    "d'fenseûthe",
    "d'fenseux",
    "d'fi",
    "d'fier",
    "d'finni",
    "d'funter",
    "d'gâchi",
    "d'gann'nie",
    "d'ganner",
    "d'gât",
    "d'gout",
    "d'goutter",
    "d'gré",
    "d'hait",
    "d'houors",
    "d'lai",
    "d'lédgi",
    "d'licat",
    "d'licatement",
    "d'licatesse",
    "d'licatesses",
    "d'lice",
    "d'licieusement",
    "d'licieux",
    "d'lit",
    "d'livrance",
    "d'livrer",
    "d'luge",
    "d'lugi",
    "d'main",
    "d'maine",
    "d'mande",
    "d'mander",
    "d'mangi",
    "d'meuthe",
    "d'meuther",
    "d'mi",
    "d'mie",
    "d'mouaîselle",
    "d'mouaîselles",
    "d'natuthe",
    "d'ores",
    "d'pâsser",
    "d'péthi",
    "d'péthissant",
    "d'péthissement",
    "d'pich'chie",
    "d'pichi",
    "d'pis",
    "d'puther",
    "d'rive",
    "d'sabil'lie",
    "d'sabil'rêsse",
    "d'sabilleux",
    "d'sabilyi",
    "d'sabuser",
    "d'saccord",
    "d'saccorder",
    "d'saccouôteunmer",
    "d'saccouplier",
    "d'sagrêment",
    "d'sagriabl'ye",
    "d'sagriabliément",
    "d'sahonter",
    "d'saîner",
    "d'sajuster",
    "d'salîngni",
    "d'salleunmer",
    "d'saltéthant",
    "d'saltéther",
    "d'samathage",
    "d'samathé",
    "d'samather",
    "d'sappathié",
    "d'sappathier",
    "d'sappointé",
    "d'sappointêment",
    "d'sappointer",
    "d'sappouainté",
    "d'sappouaintêment",
    "d'sappouainter",
    "d'sapprendre",
    "d'sapprouver",
    "d'sareuné",
    "d'sareunêment",
    "d'sareuner",
    "d'sarmer",
    "d'sarrangi",
    "d'sarun",
    "d'sarunn'nie",
    "d'sarunné",
    "d'sarunner",
    "d'sasaisonner",
    "d'sastre",
    "d'savantag'gie",
    "d'savantage",
    "d'savantageusement",
    "d'savantageux",
    "d'savantagi",
    "d'saveuglier",
    "d'saveugliéthie",
    "d'savouer",
    "d'savouêthie",
    "d'scendant",
    "d'scendre",
    "d'sembarrasser",
    "d'sembèrqu'thie",
    "d'sembèrquément",
    "d'sembèrtchément",
    "d'sembèrtchi",
    "d'sembourbéler",
    "d'sêmitter",
    "d'semmanchi",
    "d'semp'ser",
    "d'sempliai",
    "d'sempliyé",
    "d'semplyi",
    "d'semplyi",
    "d'sempoter",
    "d'senchaîner",
    "d'senchantement",
    "d'senchanter",
    "d'senchorchéler",
    "d'senchorchéleux",
    "d'senchorchell'lie",
    "d'senchorchellement",
    "d'senflier",
    "d'senfoui",
    "d'sengagi",
    "d'sengouement",
    "d'sengouer",
    "d'sengouêthie",
    "d'sengoueux",
    "d'senhalaûder",
    "d'senhèrméler",
    "d'senn'yant",
    "d'senn'yer",
    "d'senniêthie",
    "d'senrouer",
    "d'senrouêthie",
    "d'sensev'li",
    "d'sentèrrer",
    "d'sêpîler",
    "d'sèrgoter",
    "d'sèrt",
    "d'sèrtage",
    "d'sèrter",
    "d'sèrtéthie",
    "d'sèrteux",
    "d'sêtablyi",
    "d'sêtchilbouêtchi",
    "d'sêtchilibré",
    "d'shabituer",
    "d'shabitueûthie",
    "d'sharmonie",
    "d'sharmonnique",
    "d'shéthiter",
    "d'shonneu",
    "d'shonorabl'ye",
    "d'shonorabliément",
    "d'shonorer",
    "d'si",
    "d'sînfecter",
    "d'sînfecteux",
    "d'sithabl'ye",
    "d'sithabliément",
    "d'sither",
    "d'so",
    "d'sobéi",
    "d'sobéissance",
    "d'sobéissant",
    "d'soblyigeant",
    "d'soblyigi",
    "d'sodorant",
    "d'sodothant",
    "d'sodother",
    "d'soeuvré",
    "d'soeuvrer",
    "d'sorbiter",
    "d'sordonné",
    "d'sordre",
    "d'sorganniser",
    "d'sotchupé",
    "d'souothil'lie",
    "d'souothilyi",
    "d'ssous",
    "d'ssus",
    "d'va",
    "d'valer",
    "d'valeux",
    "d'vanchi",
    "d'vant",
    "d'vant'lée",
    "d'vanté",
    "d'vantuthe",
    "d'vaster",
    "d'ver",
    "d'vièrs",
    "d'vinn'nie",
    "d'vinnâle",
    "d'vinner",
    "d'vinneux",
    "d'vis",
    "d'viser",
    "d'vouother",
  ].map(stem),
  j: ["j'ter", "j'ton", "j'va", "j'val", "j'valot"].map(stem),
  l: ["l's", "l'vant", "l'vée", "l'ver"].map(stem),
  m: [
    "m'lasse",
    "m'lon",
    "m'luque",
    "m'n",
    "m'neux",
    "m'nichant",
    "m'niche",
    "m'nichi",
    "m'nottes",
    "m'nu",
    "m's",
    "m'sage",
    "m'sagi",
    "m'sagiéthe",
    "m'sespé",
    "m'sespéther",
    "m'soûque",
    "m'suthabl'ye",
    "m'suthabliément",
    "m'suthe",
    "m'suther",
    "m'sutheux",
  ].map(stem),
  n: ["n'veu", "n'yer"].map(stem),
  s: [
    "s'n",
    "s'crèche",
    "s'gond",
    "s'gondaithe",
    "s'gondaithement",
    "s'gonde",
    "s'gondement",
    "s'gret",
    "s'grétaithe",
    "s'grètement",
    "s'lon",
    "s'mailles",
    "s'maine",
    "s'meuse",
    "s'na",
    "s'nichon",
    "s'nîle",
    "s'path'thie",
    "s'pathabl'ye",
    "s'pathanner",
    "s'pathâtion",
    "s'pathêment",
    "s'pather",
    "s'tchâge",
    "s'tcheux",
    "s'tchi",
  ].map(stem),
  t: [
    "t'n",
    "t'nailles",
    "t'naisie",
    "t'nant",
    "t'neux",
    "t'nîn",
    "t'non",
    "t'nu",
    "t'nue",
  ].map(stem),
};
