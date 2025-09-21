import { vec3Add, vec3Sub, vec3Dot } from "../src/lib/math";

describe("vector operations", () => {
  it("adds vectors", () => {
    const a = [1, 2, 3] as any;
    const b = [4, -2, 1] as any;
    expect(vec3Add(a, b)).toEqual([5, 0, 4]);
  });

  it("subtracts vectors", () => {
    const a = [1, 2, 3] as any;
    const b = [4, -2, 1] as any;
    expect(vec3Sub(a, b)).toEqual([-3, 4, 2]);
  });

  it("computes dot product", () => {
    const a = [1, 2, 3] as any;
    const b = [4, -2, 1] as any;
    expect(vec3Dot(a, b)).toBe(1);
  });
});
