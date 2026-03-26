"use client"

// 开奖历史页负责整合历史开奖列表、彩种筛选与刷新动作。
import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { CalendarClock } from "lucide-react"
import { Button } from "@/components/ui/actions/button"
import { useHistoryData } from "@/src/features/history/hooks/use-history-data"
import { formatDateTime } from "@/src/shared/utils/date"
import { Footer } from "@/src/shared/layout/footer"
import { Header } from "@/src/shared/layout/header"
import { MobileNav } from "@/src/shared/layout/mobile-nav"

function ballClass(index: number): string {
  // 历史页号码球颜色按索引轮换，只为形成更清晰的视觉层次，不代表真实球色规则。
  const type = index % 3
  if (type === 0) return "border-rose-300 text-rose-500"
  if (type === 1) return "border-blue-300 text-blue-500"
  return "border-emerald-300 text-emerald-500"
}

function resolveDisplayLabels(
  labels: string[],
  zodiacLabels?: string[],
  pairLabels?: string[],
  wuxingLabels?: string[],
  showFive = false
): string[] {
  // 优先生效的是后端单独拆出的生肖数组；缺失时才退回 pair_labels/labels。
  const sourceZodiac = (zodiacLabels && zodiacLabels.length > 0 ? zodiacLabels : pairLabels || labels || []).map(
    (item) => String(item || "").split("/")[0]
  )

  if (!showFive) return sourceZodiac

  // 开启五行时，把生肖与五行拼回“生肖/五行”的复合展示标签。
  const sourceWuxing = (wuxingLabels && wuxingLabels.length > 0 ? wuxingLabels : pairLabels || labels || []).map(
    (item) => {
      const raw = String(item || "")
      return raw.includes("/") ? raw.split("/")[1] || "" : raw
    }
  )

  return sourceZodiac.map((zodiac, index) => {
    const wuxing = sourceWuxing[index] || ""
    return wuxing ? `${zodiac}/${wuxing}` : zodiac
  })
}

export function HistoryPage() {
  const searchParams = useSearchParams()
  const preferredTabID = useMemo(() => {
    // 历史页允许从首页右侧热门彩种直接带 tabId 跳进来并默认选中对应彩种。
    const raw = Number(searchParams.get("tabId") || 0)
    return Number.isFinite(raw) && raw > 0 ? raw : 0
  }, [searchParams])
  const { state, displayItems, selectTab, toggleOrder, toggleShowFive } = useHistoryData(preferredTabID)
  const orderLabel = state.orderMode === "desc" ? "降序" : "升序"

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-6 pb-24 lg:pb-8 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">开奖历史</h1>
          </div>
        </div>

        <section className="mb-4 rounded-[28px] bg-gradient-to-b from-secondary/18 via-secondary/8 to-transparent px-4 py-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.24)] lg:rounded-2xl lg:border lg:border-border/60 lg:bg-card lg:p-4 lg:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide lg:flex-wrap">
              {state.tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  // tabs 负责决定“看哪个彩种的历史”；排序和五行只负责“怎么展示”。
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                    state.activeTabID === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  }`}
                  onClick={() => void selectTab(tab.id)}
                >
                  {tab.name}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              {/* “切换”两个字去掉之后，按钮本身直接展示当前排序状态，信息密度更高。 */}
              <Button variant="outline" size="sm" onClick={toggleOrder}>
                {orderLabel}
              </Button>
              <Button variant={state.showFive ? "default" : "outline"} size="sm" onClick={toggleShowFive}>
                五行
              </Button>
            </div>
          </div>
        </section>

        {state.error ? (
          <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {state.error}
          </div>
        ) : null}

        {state.loading ? (
          <div className="rounded-[26px] bg-secondary/10 py-12 text-center text-sm text-muted-foreground shadow-[0_18px_40px_-28px_rgba(15,23,42,0.18)] lg:rounded-xl lg:border lg:border-border/60 lg:bg-card lg:shadow-none">
            加载中...
          </div>
        ) : displayItems.length === 0 ? (
          <div className="rounded-[26px] bg-secondary/10 py-12 text-center text-sm text-muted-foreground shadow-[0_18px_40px_-28px_rgba(15,23,42,0.18)] lg:rounded-xl lg:border lg:border-border/60 lg:bg-card lg:shadow-none">
            暂无开奖记录
          </div>
        ) : (
          <section className="space-y-4">
            {displayItems.map((item) => {
              // labels 在这里按当前 showFive 状态一次性整理，模板层只负责渲染。
              const labels = resolveDisplayLabels(
                item.labels,
                item.zodiac_labels,
                item.pair_labels,
                item.wuxing_labels,
                state.showFive
              )

              return (
                <article className="rounded-[26px] bg-secondary/10 p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.18)] lg:rounded-xl lg:border lg:border-border/60 lg:bg-card lg:p-4 lg:shadow-none" key={item.id}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-base font-semibold md:text-lg">第 {item.issue} 期</div>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <CalendarClock className="h-4 w-4" />
                      {formatDateTime(item.draw_at)}
                    </span>
                  </div>
                  <div className="mb-3 flex flex-wrap items-center gap-1.5 md:gap-2">
                    {item.numbers.map((num, index) => (
                      <span
                        key={`${item.id}-${num}-${index}`}
                        // 球体颜色只是视觉分组，不和开奖规则做强绑定。
                        className={`inline-flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full border-2 text-xs md:text-sm font-bold ${ballClass(index)}`}
                      >
                        {String(num).padStart(2, "0")}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {labels.map((label, index) => (
                      <span key={`${item.id}-l-${index}`} className="rounded-full bg-secondary px-2.5 py-1 text-[11px] md:px-3 md:text-xs text-muted-foreground">
                        {label}
                      </span>
                    ))}
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  )
}
