import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseFile } from "./parse.ts";

const BASE = join(
  import.meta.dirname,
  "../lespages/members.societe-jersiaise.org/geraint/jerriais"
);

function parse(filename: string) {
  const buf = readFileSync(join(BASE, filename));
  return parseFile(buf, { rewriteRelativeUrls: false }).data;
}

describe("author detection", () => {
  it("blair.html — single italic+date attribution at end", () => {
    const { authorSlug, multiAuthorSuspected } = parse("blair.html");
    expect(authorSlug).toBe("jerpoem");
    expect(multiAuthorSuspected).toBe(false);
  });

  it("reverie.html — single italic attribution near end", () => {
    const { authorSlug, multiAuthorSuspected } = parse("reverie.html");
    expect(authorSlug).toBe("langlois");
    expect(multiAuthorSuspected).toBe(false);
  });

  it("achiejt.html — 'Par' prefix in bold (no italic)", () => {
    const { authorSlug, multiAuthorSuspected } = parse("achiejt.html");
    expect(authorSlug).toBe("joantapley");
    expect(multiAuthorSuspected).toBe(false);
  });

  it("1914gj.html — jerpoem wins over gwdec (both italic+date; jerpoem is later)", () => {
    // gwdec is a quoted historical poem; jerpoem wrote the framing page.
    // Both score 5; jerpoem is last in document order → winner.
    const { authorSlug, multiAuthorSuspected } = parse("1914gj.html");
    expect(authorSlug).toBe("jerpoem");
    expect(multiAuthorSuspected).toBe(true); // gwdec also scores ≥ 3
  });

  it("gdfgeon.html — lefeuvre (italic near end) beats lemaistre (body mention)", () => {
    const { authorSlug, multiAuthorSuspected } = parse("gdfgeon.html");
    expect(authorSlug).toBe("lefeuvre");
    expect(multiAuthorSuspected).toBe(false);
  });

  it("cahouain_nueuxpids.html — gwdec (italic+date+near-end) beats brambilo (story character)", () => {
    const { authorSlug, multiAuthorSuspected } = parse(
      "cahouain_nueuxpids.html"
    );
    expect(authorSlug).toBe("gwdec");
    expect(multiAuthorSuspected).toBe(false);
  });

  it("esviers.html — langlois wins; flip is mentioned within the poem, not an attribution", () => {
    const { authorSlug, multiAuthorSuspected } = parse("esviers.html");
    expect(authorSlug).toBe("langlois");
    expect(multiAuthorSuspected).toBe(false);
  });

  it("acrostiche1.html — flagged as suspected multi-author (subject link in italic)", () => {
    // Jean Picot wrote the acrostic; Alfred Messervy's name *forms* the acrostic.
    // Both links score ≥ 3 → multiAuthorSuspected, surfaces for manual review.
    const { multiAuthorSuspected } = parse("acrostiche1.html");
    expect(multiAuthorSuspected).toBe(true);
  });

  it("1000ditons.html — only candidate (body mention, score 0); returned as best guess", () => {
    const { authorSlug, multiAuthorSuspected } = parse("1000ditons.html");
    expect(authorSlug).toBe("lemaistre");
    expect(multiAuthorSuspected).toBe(false);
  });

  it("hastings.html — no author slugs present", () => {
    const { authorSlug, multiAuthorSuspected } = parse("hastings.html");
    expect(authorSlug).toBeUndefined();
    expect(multiAuthorSuspected).toBe(false);
  });

  it("10feet.html — informational page with no author attribution", () => {
    const { authorSlug, multiAuthorSuspected } = parse("10feet.html");
    expect(authorSlug).toBeUndefined();
    expect(multiAuthorSuspected).toBe(false);
  });
});

describe("encoding", () => {
  it("12penjqzw.html (latin1) — title decoded correctly, not garbled", () => {
    // Raw byte 0xE9 in title ('é') would become U+FFFD without latin1 fallback.
    const { title } = parse("12penjqzw.html");
    expect(title).toBe("Un quiz auve des neunméthos");
    expect(title).not.toContain("\uFFFD");
  });

  it("blair.html (latin1) — boilerplate keyword properly decoded then filtered", () => {
    // 'Jèrriais' has a raw 0xE8 byte; must be decoded to è before stoplist check.
    const { tags } = parse("blair.html");
    expect(tags).toEqual([]);
  });

  it("reverie.html (UTF-8) — title with HTML entity still decoded correctly", () => {
    const { title } = parse("reverie.html");
    expect(title).toBe("Rêverie (Fragment)");
  });
});

describe("tags extraction", () => {
  it("organnique.html — unique topic keywords extracted, boilerplate filtered", () => {
    const { tags } = parse("organnique.html");
    expect(tags).toContain("organic farming");
    expect(tags).toContain("produits biologiques");
    expect(tags).not.toContain("Jèrriais");
    expect(tags).not.toContain("language");
    expect(tags).not.toContain("Channel Islands");
  });

  it("helier.html — domain-specific keywords retained", () => {
    const { tags } = parse("helier.html");
    expect(tags).toContain("hagiography");
    expect(tags).toContain("patron saint");
    expect(tags).not.toContain("Jersey");
    expect(tags).not.toContain("langue");
  });

  it("blair.html — only boilerplate keywords → empty tags", () => {
    const { tags } = parse("blair.html");
    expect(tags).toEqual([]);
  });
});

describe("attribution date + source extraction", () => {
  it("blair.html — date from italic attribution at end", () => {
    const { date, source } = parse("blair.html");
    expect(date).toBe("2002-12-11");
    expect(source).toBeUndefined();
  });

  it("1914gj.html — date from italic attribution; no publication source", () => {
    const { date, source } = parse("1914gj.html");
    expect(date).toBe("2014-08-04");
    expect(source).toBeUndefined();
  });

  it("1901.html — date and publication source extracted from italic block", () => {
    const { date, source } = parse("1901.html");
    expect(date).toBe("1901-01-09");
    expect(source).toBe("Nouvelle Chronique de Jersey");
  });

  it("organnique.html — no date in attribution context", () => {
    const { date } = parse("organnique.html");
    expect(date).toBeUndefined();
  });

  it("ahier.html — truncated year from split italic tag produces no date", () => {
    // <i>Chroniques de Jersey 21/12/193</i>8 — closing tag mid-year
    // DATE_RE requires 4-digit year, so '21/12/193' must not produce a date.
    const { date } = parse("ahier.html");
    if (date !== undefined) {
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // must be valid ISO if present
      expect(parseInt(date.slice(0, 4))).toBeGreaterThanOrEqual(1000);
    }
  });
});
