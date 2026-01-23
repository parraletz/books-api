import { memoryUsageBytes } from "./index"

export function startRuntimeMetricsCollection(intervalMs: number = 5000): void {
  const collectMemoryMetrics = () => {
    const memUsage = process.memoryUsage()

    memoryUsageBytes.set({ type: "rss" }, memUsage.rss)
    memoryUsageBytes.set({ type: "heapTotal" }, memUsage.heapTotal)
    memoryUsageBytes.set({ type: "heapUsed" }, memUsage.heapUsed)
    memoryUsageBytes.set({ type: "external" }, memUsage.external)

    if ("arrayBuffers" in memUsage) {
      memoryUsageBytes.set({ type: "arrayBuffers" }, memUsage.arrayBuffers as number)
    }
  }

  collectMemoryMetrics()
  setInterval(collectMemoryMetrics, intervalMs)
}
