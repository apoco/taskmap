type MaybeAsync<T> = T | Promise<T>;

type TaskMap<T> = {
  [K in keyof T]: {
    deps: Array<keyof T>;
    fn: (deps: T) => MaybeAsync<T[K]>;
  };
};

type PromiseMap<T> = { [K in keyof T]: Promise<T[K]> };

class Orchestration<T> implements PromiseLike<T> {
  private readonly tasks: TaskMap<T>;

  constructor(tasks: TaskMap<T>) {
    this.tasks = tasks;
  }

  task<Key extends string, R>(
    key: Key,
    fn: () => MaybeAsync<R>
  ): Orchestration<T & { [K in Key]: R }>;
  task<Key extends string, Deps extends keyof T, R>(
    key: Key,
    deps: Array<Deps>,
    fn: (deps: Pick<T, Deps>) => MaybeAsync<R>
  ): Orchestration<T & { [K in Key]: R }>;
  task<Key extends string, Deps extends keyof T, R>(
    key: Key,
    ...args:
      | [fn: () => MaybeAsync<R>]
      | [deps: Array<Deps>, fn: (deps: Pick<T, Deps>) => MaybeAsync<R>]
  ): Orchestration<T & { [K in Key]: R }> {
    if (key in this.tasks) {
      throw new Error(`Task ${key} is already defined.`);
    }

    let deps: Array<Deps>, fn: (deps: Pick<T, Deps>) => MaybeAsync<R>;
    if (args.length === 1) {
      [fn, deps = []] = args;
    } else {
      [deps, fn] = args;
    }
    // @ts-ignore. Type inference fails us here.
    return new Orchestration({ ...this.tasks, [key]: { deps, fn } });
  }

  resolve<Keys extends keyof T>(
    ...tasks: Array<Keys>
  ): Promise<{ [K in Keys]: T[K] }> {
    return resolveMap(this.execTasksRecursive(tasks, {}));
  }

  async promise(): Promise<T> {
    return this.resolve(...(Object.keys(this.tasks) as Array<keyof T>));
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.promise().then(onfulfilled, onrejected);
  }

  private execTasksRecursive<Keys extends keyof T>(
    tasks: Array<Keys>,
    promises: Partial<PromiseMap<T>>
  ) {
    return Object.fromEntries(
      tasks.map((task) => [
        task,
        (promises[task] ??= this.execTaskRecursive(task, promises)),
      ])
    ) as PromiseMap<Pick<T, Keys>>;
  }

  private async execTaskRecursive<Key extends keyof T>(
    key: Key,
    promises: Partial<PromiseMap<T>>
  ): Promise<T[Key]> {
    const { deps, fn } = this.tasks[key];
    const values = await resolveMap(this.execTasksRecursive(deps, promises));
    return fn(values);
  }
}

async function resolveMap<T>(promiseMap: PromiseMap<T>): Promise<T> {
  const entries = await Promise.all(
    Object.entries(promiseMap).map(async ([key, promise]) => {
      const value = await promise;
      return [key, value];
    })
  );
  return Object.fromEntries(entries);
}

export const orchestrate = new Orchestration({});
