# taskmap

Declare a set of tasks and their dependencies, then run them in an optimized manner. Tasks all run in parallel unless they have to wait on a dependency, and if a task is a dependency for multiple tasks it's only run once.

## Usage

```typescript
import { orchestrate } from "taskmap";

async function example() {
  const { sum, mean } = await orchestrate
    .task("data", () => fetchNumbers())
    .task("sum", ["data"], ({ data }) => data.reduce((sum, n) => sum + n, 0))
    .task("count", ["data"], ({ data }) => data.length)
    .task("mean", ["sum", "count"], ({ sum, count }) => sum / count);
}
```

## API

### orchestrate

The `orchestrate` object gives you the starting point for creating an `Orchestration`.

```typescript
import { orchestrate } from "taskmap";
```

### Orchestration

An `Orchestration` is an object that lets you define tasks and execute them. It has the following methods:

#### .task(id, fn)

#### .task(id, dependencies, fn)

The task method defines a new task, returning a new `Orchestration` containing previously-defined tasks along with the new one. You must supply an `id` for your task and a function `fn`. The function may or may not return a value, and it may be either synchronous or asynchronous.

If your task function depends on any of the previously-defined task results, you can add a `dependencies` Array containing one or more task IDs. An object map with those same task IDs and the results of those tasks will be passed to your function, with all Promises having been resolved.

The task's function will not be executed until the `Orchestration` is awaited/resolved.

#### .promise()

Finalizes the `Orchestration`, returning a `Promise` that resolves to an map object with every task's ID as a key and each value being the resolved result of the task function.

#### .then(...)

As a shortcut, an `Orchestration` is a also a "thenable" so you can directly `await` it without having to call `.promise()`. Note that if you're planning on awaiting an `Orchestration` multiple times, it does not behave like a `Promise` because each time it's awaited it re-runs the tasks. Use `.promise()` if you want a _real_ `Promise`.

#### .resolve(...ids)

If you want to execute a subset of tasks, the `.resolve()` function lets you pass the ID of each task you want to run, and the resolved result only contains the key/values of those tasks. Tasks that were not specified will not be run unless they are dependencies of the specified tasks.

## Inspiration

This package is heavily inspired by the `auto` function of `async`. The reason for creating a new package is that `async.auto` doesn't work well with TypeScript inference due to language limitations. While the API isn't quite as terse as `async.auto`, it does let you define your tasks in a way that enables TypeScript to infer the types of every task and dependency.

## Language compatibility

- JavaScript - `taskman` is compiled to ES2021 and is a CommonJS library, but if you find it useful and need compatibility with other environments, we will consider accommodating. It has no dependencies.
- TypeScript - `taskman` is written in TypeScript 4.6.3.
