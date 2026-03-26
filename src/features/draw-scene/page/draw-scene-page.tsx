"use client"

// 开奖现场页承接首页“查看详情”的细化场景：
// 1. 允许在同一页内切彩种、切期号；
// 2. 展示当前期开奖号码和下期预告；
// 3. 预留当前直播/历史回放视频位；
// 4. 把 tabId / issue 同步进 URL，方便分享与返回定位。
import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { CalendarClock, ChevronLeft, PlayCircle, Video } from "lucide-react"
import { Button } from "@/components/ui/actions/button"
import { historyAPI, type LotteryHistoryItem } from "@/src/features/history/api/history-api"
import { homeAPI } from "@/src/features/home/api/home-api"
import { normalizeDashboard, normalizeTabs } from "@/src/features/home/mappers/home-mappers"
import type { DashboardData, SpecialLotteryTab } from "@/src/features/home/model/types"
import { formatDateTime } from "@/src/shared/utils/date"
import { sanitizeImageURL, sanitizeOutboundURL } from "@/src/shared/security/url"
import { Footer } from "@/src/shared/layout/footer"
import { Header } from "@/src/shared/layout/header"
import { MobileNav } from "@/src/shared/layout/mobile-nav"

interface DrawSceneState {
  // loading 控制整页加载与占位显示。
  loading: boolean
  // error 统一收敛本页请求错误，避免多个小块各自报错。
  error: string
  // tabs 用于顶部彩种切换。
  tabs: SpecialLotteryTab[]
  // activeTabID 表示当前正在查看哪一个彩种。
  activeTabID: number
  // dashboard 提供当前期摘要，以及当前期可兜底使用的直播/回放地址。
  dashboard: DashboardData | null
  // items 承载当前彩种下的历史开奖记录与视频位。
  items: LotteryHistoryItem[]
  // selectedIssue 决定主摘要卡与主播放器当前展示哪一期。
  selectedIssue: string
}

function defaultState(): DrawSceneState {
  // 初始状态抽成函数，便于后续统一重置，避免散落多个初始对象版本。
  return {
    loading: true,
    error: "",
    tabs: [],
    activeTabID: 0,
    dashboard: null,
    items: [],
    selectedIssue: ""
  }
}

function ballClass(index: number, isBonus: boolean): string {
  // 特别号独立暖色；普通号按三色轮换。
  // 这样在详情页里也能和首页保持统一的“普通号/特别号”区分。
  if (isBonus) return "border-orange-300 text-orange-500 shadow-orange-500/10"

  const type = index % 3
  if (type === 0) return "border-rose-300 text-rose-500 shadow-rose-500/10"
  if (type === 1) return "border-blue-300 text-blue-500 shadow-blue-500/10"
  return "border-emerald-300 text-emerald-500 shadow-emerald-500/10"
}

function resolveDisplayLabels(item: LotteryHistoryItem): string[] {
  // pair_labels 已经是“生肖/五行”的复合格式，因此优先使用；
  // 缺失时再退回 labels，避免后端字段不完整时页面空白。
  const source = item.pair_labels || item.labels || []
  return source.map((entry) => {
    const raw = String(entry || "")
    return raw || "-"
  })
}

function normalizeHistoryItems(items: LotteryHistoryItem[]): LotteryHistoryItem[] {
  // 历史视频区直接消费外部图片/视频 URL，因此在入口统一清洗最稳妥。
  return (items || []).map((item) => ({
    ...item,
    cover_image_url: sanitizeImageURL(item.cover_image_url) || "/placeholder.jpg",
    playback_url: sanitizeOutboundURL(item.playback_url),
    video_url: sanitizeOutboundURL(item.video_url)
  }))
}

function resolveVideoURL(item: LotteryHistoryItem | null, dashboard: DashboardData | null): string {
  if (!item) return ""

  // 优先级：
  // 1. 历史回放地址 playback_url；
  // 2. 兼容字段 video_url；
  // 3. 如果当前选中就是当前期，则退回当前直播地址，避免主视频位完全空掉。
  return (
    item.playback_url ||
    item.video_url ||
    (item.issue === dashboard?.draw?.issue
      ? dashboard?.draw?.playback_url || dashboard?.live?.stream_url || ""
      : "") ||
    ""
  )
}

export function DrawScenePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedTabID = useMemo(() => {
    // 允许从首页热门彩种或开奖卡直接带 tabId 进入页面。
    const value = Number(searchParams.get("tabId") || 0)
    return Number.isFinite(value) && value > 0 ? value : 0
  }, [searchParams])
  // issue 参数允许我们直达某一期的开奖现场。
  const requestedIssue = searchParams.get("issue") || ""
  const [state, setState] = useState<DrawSceneState>(() => defaultState())

  const load = useCallback(async () => {
    // 每次重载前先把错误态清掉，防止旧错误残留到新请求周期。
    setState((prev) => ({ ...prev, loading: true, error: "" }))

    try {
      // overview 提供彩种 tabs；
      // dashboard 提供当前期开奖摘要；
      // history 列表提供历史期号与回放位。
      const overview = await homeAPI.getOverview()
      const tabs = normalizeTabs(overview.special_lotteries || [])
      const resolvedTabID =
        requestedTabID > 0 && tabs.some((tab) => tab.id === requestedTabID)
          ? requestedTabID
          : overview.active_tab_id || tabs[0]?.id || 0

      const [historyResp, dashboardResp] = await Promise.all([
        // 历史列表默认按倒序拉最近记录，方便用户优先看到最新回放。
        historyAPI.getDrawHistory(resolvedTabID, { limit: 12, order_mode: "desc", show_five: 1 }),
        resolvedTabID > 0 ? homeAPI.getDashboard(resolvedTabID) : Promise.resolve(null)
      ])

      const dashboard = normalizeDashboard(dashboardResp)
      const items = normalizeHistoryItems(historyResp.items || [])
      // 首次进入时的默认期号优先级：
      // 当前期开奖 > 历史列表第一条 > 空。
      const resolvedIssue = dashboard?.draw?.issue || items[0]?.issue || ""

      setState({
        loading: false,
        error: "",
        tabs,
        activeTabID: resolvedTabID,
        dashboard,
        items,
        selectedIssue: resolvedIssue
      })
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "开奖现场加载失败"
      }))
    }
  }, [requestedTabID])

  useEffect(() => {
    // 只要彩种 query 改了，就整页重拉，因为摘要卡和历史列表都会跟着变化。
    void load()
  }, [load])

  useEffect(() => {
    // issue 查询参数变化时，只同步当前选中期号，不重复整页拉取。
    if (
      requestedIssue &&
      requestedIssue !== state.selectedIssue &&
      state.items.some((item) => item.issue === requestedIssue)
    ) {
      setState((prev) => ({ ...prev, selectedIssue: requestedIssue }))
    }
  }, [requestedIssue, state.items, state.selectedIssue])

  const selectedItem = useMemo(
    // 当前选中期号失效时回退第一条，保证播放器和摘要卡始终有数据来源。
    () => state.items.find((item) => item.issue === state.selectedIssue) || state.items[0] || null,
    [state.items, state.selectedIssue]
  )
  // 主播放器地址在这里统一解析，模板层只消费最终结果。
  const selectedVideoURL = resolveVideoURL(selectedItem, state.dashboard)
  // 标签同样在渲染前整理，减少 JSX 中的分支噪音。
  const labels = selectedItem ? resolveDisplayLabels(selectedItem) : []

  const syncRoute = useCallback(
    (tabID: number, issue = "") => {
      // 使用 replace 而不是 push，避免用户切期号时浏览器历史堆得太长。
      const params = new URLSearchParams()
      if (tabID > 0) params.set("tabId", String(tabID))
      if (issue) params.set("issue", issue)
      router.replace(`/draw-scene?${params.toString()}`, { scroll: false })
    },
    [router]
  )

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-6 pb-24 lg:pb-8 lg:px-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          {/* 左侧返回历史页，中间标题标识当前场景。 */}
          <Button variant="ghost" className="gap-2" asChild>
            <Link href="/history">
              <ChevronLeft className="h-4 w-4" />
              返回历史
            </Link>
          </Button>
          <h1 className="text-xl font-bold md:text-2xl">开奖现场</h1>
          <div className="w-[88px]" />
        </div>

        <section className="rounded-[28px] bg-gradient-to-b from-secondary/18 via-secondary/8 to-transparent px-4 py-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.24)] md:px-5 md:py-6 lg:rounded-2xl lg:border lg:border-border/60 lg:bg-card lg:p-5 lg:shadow-none">
          <div className="mb-4 flex flex-wrap gap-2">
            {state.tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`min-w-[110px] rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  state.activeTabID === tab.id
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-primary"
                }`}
                onClick={() => syncRoute(tab.id)}
              >
                {tab.name}
              </button>
            ))}
          </div>

          {state.error ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {state.error}
            </div>
          ) : state.loading ? (
            <div className="rounded-[26px] bg-secondary/10 py-16 text-center text-sm text-muted-foreground shadow-[0_18px_40px_-28px_rgba(15,23,42,0.18)] lg:rounded-xl lg:border lg:border-border/60 lg:bg-background/40 lg:shadow-none">
              开奖现场加载中...
            </div>
          ) : !selectedItem ? (
            <div className="rounded-[26px] bg-secondary/10 py-16 text-center text-sm text-muted-foreground shadow-[0_18px_40px_-28px_rgba(15,23,42,0.18)] lg:rounded-xl lg:border lg:border-border/60 lg:bg-background/40 lg:shadow-none">
              暂无开奖现场数据
            </div>
          ) : (
            <div className="space-y-6">
              <section className="rounded-[26px] bg-secondary/10 p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.18)] md:p-5 lg:rounded-2xl lg:border lg:border-primary/30 lg:bg-background/70 lg:shadow-none">
                {/* 摘要卡集中展示：期号、开奖时间、号码球、历史入口、下期预告。 */}
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xl font-bold md:text-2xl">
                      <span>第</span>
                      <span className="text-primary">{selectedItem.issue}</span>
                      <span>期</span>
                    </div>
                    <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
                      <CalendarClock className="h-4 w-4" />
                      {formatDateTime(selectedItem.draw_at)}
                    </p>
                  </div>

                  <Button variant="ghost" className="text-primary hover:text-primary" asChild>
                    <Link href={`/history?tabId=${state.activeTabID}`}>
                      查看历史记录
                    </Link>
                  </Button>
                </div>

                <div className="mb-4 overflow-x-auto pb-2 scrollbar-hide">
                  <div className="flex min-w-max items-center justify-center gap-2 md:gap-3">
                    {selectedItem.numbers.map((num, index) => {
                      // 最后一颗球视为特别号并高亮，这样和首页的视觉规则保持一致。
                      const isBonus = index === selectedItem.numbers.length - 1
                      return (
                        <div key={`${selectedItem.id}-${num}-${index}`} className="flex items-center gap-2 md:gap-3">
                          {index === selectedItem.numbers.length - 1 ? (
                            <span className="text-xl font-light text-muted-foreground md:text-3xl">+</span>
                          ) : null}
                          <span
                            className={`inline-flex h-10 w-10 md:h-14 md:w-14 items-center justify-center rounded-full border-[3px] bg-white text-base md:text-2xl font-bold shadow-lg ${ballClass(index, isBonus)}`}
                          >
                            {String(num).padStart(2, "0")}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                  {labels.map((label, index) => (
                    <span key={`${selectedItem.id}-label-${index}`} className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                      {label}
                    </span>
                  ))}
                </div>

                <p className="mt-4 text-center text-sm text-primary">
                  下期预告：第 {state.dashboard?.special_lottery?.current_issue || "--"} 期 {formatDateTime(state.dashboard?.special_lottery?.next_draw_at || "")}
                </p>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold">开奖回放</h2>
                </div>

                <div className="overflow-hidden rounded-[26px] bg-secondary/10 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.18)] lg:rounded-2xl lg:border lg:border-border/60 lg:bg-card lg:shadow-none">
                  {selectedVideoURL ? (
                    // 已有可播放地址时，主区域直接变成视频播放器。
                    <video
                      key={`${state.activeTabID}-${selectedItem.issue}-${selectedVideoURL}`}
                      className="aspect-video w-full bg-slate-950 object-cover"
                      controls
                      playsInline
                      poster={selectedItem.cover_image_url || "/placeholder.jpg"}
                    >
                      <source src={selectedVideoURL} />
                    </video>
                  ) : (
                    // 暂无视频时也保留固定比例的视频位，这样未来接真实回放时不用再改布局。
                    <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-slate-950/90 text-center text-white">
                      <Video className="h-10 w-10 text-primary" />
                      <p className="text-lg font-semibold">当前期暂无可播放视频</p>
                      <p className="text-sm text-white/65">已保留历史开奖视频播放位，后续接入后台回放地址即可直接显示</p>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold">历史开奖视频</h2>
                  <Link href={`/history?tabId=${state.activeTabID}`} className="text-sm font-medium text-primary hover:text-primary/80">
                    更多开奖回放 &gt;&gt;
                  </Link>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {state.items.slice(0, 6).map((item) => {
                    // 历史视频区只取前 6 条，避免一进页面就被长列表压得很重。
                    const isActive = item.issue === selectedItem.issue
                    const itemVideoURL = resolveVideoURL(item, state.dashboard)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          // 先本地切中，保证交互立即响应；再同步回 URL，保证可分享。
                          setState((prev) => ({ ...prev, selectedIssue: item.issue }))
                          syncRoute(state.activeTabID, item.issue)
                        }}
                        className={`overflow-hidden rounded-[24px] text-left transition-all lg:rounded-xl ${
                          isActive
                            ? "bg-primary/8 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.18)] lg:border lg:border-primary lg:shadow-lg lg:shadow-primary/15"
                            : "bg-secondary/10 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.12)] hover:bg-secondary/14 lg:border lg:border-border/60 lg:shadow-none lg:hover:border-primary/40 lg:hover:shadow-md"
                        }`}
                      >
                        <div className="relative aspect-video bg-slate-200">
                          <img
                            src={item.cover_image_url || "/placeholder.jpg"}
                            alt={`${item.issue}期开奖视频`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/20" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/85 shadow-lg">
                              <PlayCircle className="h-8 w-8 text-primary" />
                            </span>
                          </div>
                          {!itemVideoURL ? (
                            <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
                              占位
                            </span>
                          ) : null}
                        </div>
                        <div className="space-y-1 p-3">
                          <p className="font-semibold text-foreground">{item.issue}期开奖结果视频</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(item.draw_at)}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>
            </div>
          )}
        </section>
      </main>

      <Footer />
      <MobileNav />
    </div>
  )
}
