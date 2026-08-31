export function createReviewRevealPump(options: {
  delay?: number;
  schedule?: (fn: () => void, ms: number) => unknown;
  cancel?: (id: unknown) => void;
} = {}) {
  const delay = options.delay ?? 240;
  const schedule = options.schedule ?? ((fn, ms) => setTimeout(fn, ms));
  const cancel = options.cancel ?? ((id) => clearTimeout(id as ReturnType<typeof setTimeout>));
  let timer: unknown;
  let latestPath = "";

  return {
    schedule(path: string, reveal: (path: string) => void) {
      latestPath = path;
      if (timer != null) cancel(timer);
      timer = schedule(() => {
        timer = undefined;
        reveal(latestPath);
      }, delay);
    },
    cancel() {
      if (timer != null) cancel(timer);
      timer = undefined;
    },
  };
}
