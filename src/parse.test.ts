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
