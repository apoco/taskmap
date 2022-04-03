import { orchestrate } from "../src";

describe("The orchestrate object", () => {
  it("type checks task dependencies", () => {
    orchestrate
      .task("a", () => 1)
      // @ts-expect-error
      .task("b", ["c"], ({ c }) => c * 2);
  });

  it("type checks circular dependencies", () => {
    orchestrate
      .task("a", () => 1)
      // @ts-expect-error
      .task("b", ["b"], ({ b }) => b * 2);
  });

  it("disallows task redefinitions", () => {
    expect(() => {
      orchestrate
        .task("a", () => 1)
        .task("b", ["a"], ({ a }) => a * 2)
        .task("a", ["b"], ({ b }) => b + 3);
    }).toThrow(Error);
  });

  it("can create a Promise", async () => {
    const { sum } = await orchestrate
      .task("a", () => 1)
      .task("b", () => 2)
      .task("sum", ["a", "b"], ({ a, b }) => a + b)
      .promise();
    expect(sum).toEqual(3);
  });

  it("can resolve specific dependencies", async () => {
    const results = await orchestrate
      .task("a", () => 1)
      .task("b", () => 2)
      .task("sum", ["a", "b"], ({ a, b }) => a + b)
      .resolve("sum");
    expect(results).toHaveProperty("sum", 3);
    expect(results).not.toHaveProperty("a");
    expect(results).not.toHaveProperty("b");
  });

  it("is a thenable", async () => {
    const { sum } = await orchestrate
      .task("a", () => 1)
      .task("b", () => 2)
      .task("sum", ["a", "b"], ({ a, b }) => a + b);
    expect(sum).toEqual(3);
  });

  it("reuses in-flight tasks", async () => {
    const dataFn = jest.fn(async () => [1, 2, 3]);
    const sumFn = jest.fn(({ data }) =>
      data.reduce((sum: number, value: number) => sum + value, 0)
    );
    const countFn = jest.fn(({ data }) => data.length);
    const meanFn = jest.fn(({ sum, count }) => sum / count);

    const { sum, mean } = await orchestrate
      .task("data", dataFn)
      .task("sum", ["data"], sumFn)
      .task("count", ["data"], countFn)
      .task("mean", ["sum", "count"], meanFn);

    expect(sum).toEqual(6);
    expect(mean).toEqual(2);
    [dataFn, sumFn, countFn, meanFn].forEach((fn) =>
      expect(fn).toBeCalledTimes(1)
    );
  });
});
