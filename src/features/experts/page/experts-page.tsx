"use client"

// 高手推荐页负责承接高手榜单、筛选条件和关注入口，是高手业务的主页面容器。
import { useEffect, useMemo, useState } from "react"
import { Award, Flame, Search, ShieldCheck, TrendingUp, Users } from "lucide-react"
import { Button } from "@/components/ui/actions/button"
import { Input } from "@/components/ui/forms/input"
import { cn } from "@/lib/utils"
import { useExpertsData } from "@/src/features/experts/hooks/use-experts-data"
import type { ExpertItem } from "@/src/features/experts/model/types"
import { Footer } from "@/src/shared/layout/footer"
import { Header } from "@/src/shared/layout/header"
import { MobileNav } from "@/src/shared/layout/mobile-nav"

interface BoardTab {
  key: string
  title: string
  subtitle: string
}

const fallbackBoardTabs: BoardTab[] = [
  { key: "accuracy", title: "准确率榜", subtitle: "稳定命中" },
  { key: "streak", title: "连中榜", subtitle: "持续上分" },
  { key: "hot", title: "人气榜", subtitle: "关注度高" },
  { key: "rookie", title: "新秀榜", subtitle: "成长迅速" }
]

function calcTrendRate(item: ExpertItem): number {
  // trendRate 是页面内的视觉指标，不直接等于后端任意单一字段。
  const base = Math.max(25, Math.min(98, Math.round(item.hit_rate || 0)))
  const streakBoost = Math.max(0, Math.min(12, item.streak * 2))
  return Math.min(99, base + streakBoost)
}

export function ExpertsPage() {
  const { state, setLotteryCode } = useExpertsData()
  const [draftLotteryCode, setDraftLotteryCode] = useState("")
  const [activeBoardKey, setActiveBoardKey] = useState("")

  const boardTabs = useMemo<BoardTab[]>(() => {
    if (state.groups.length === 0) {
      // 后端暂无数据时仍然保留兜底 tab，避免榜单切换栏整块消失。
      return fallbackBoardTabs
    }

    return state.groups.map((group, index) => ({
      key: group.key,
      title: group.title,
      subtitle: index === 0 ? "主力榜单" : "实时更新"
    }))
  }, [state.groups])

  useEffect(() => {
    // activeBoardKey 始终与当前 groups 保持同步，避免切换彩种后指向一个失效 tab。
    if (!activeBoardKey && boardTabs.length > 0) {
      setActiveBoardKey(boardTabs[0].key)
      return
    }
    if (activeBoardKey && !boardTabs.some((tab) => tab.key === activeBoardKey)) {
      setActiveBoardKey(boardTabs[0]?.key || "")
    }
  }, [activeBoardKey, boardTabs])

  const activeGroup = useMemo(
    // 当前激活分组找不到时，回退到第一组，保证页面总有内容可展示。
    () => state.groups.find((group) => group.key === activeBoardKey) || state.groups[0],
    [activeBoardKey, state.groups]
  )

  const activeItems = activeGroup?.items || []
  const weeklyStar = activeItems[0]

  const overview = useMemo(() => {
    const allItems = state.groups.flatMap((group) => group.items)
    // 概览指标全部由当前所有榜单聚合而来，不单独请求额外接口。
    const totalExperts = new Set(allItems.map((item) => item.user_id)).size
    const avgHitRate =
      allItems.length > 0
        ? Number((allItems.reduce((sum, item) => sum + (item.hit_rate || 0), 0) / allItems.length).toFixed(1))
        : 0
    const maxStreak = allItems.reduce((max, item) => Math.max(max, item.streak || 0), 0)
    const hotUsers = allItems.reduce((sum, item) => sum + Math.max(0, Math.round((item.return_rate || 0) * 10)), 0)

    return {
      totalExperts,
      avgHitRate,
      maxStreak,
      hotUsers
    }
  }, [state.groups])

  const submitSearch = () => {
    // 查询动作只把草稿值提交给 hook，由 hook 统一触发刷新。
    setLotteryCode(draftLotteryCode)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-6 pb-24 lg:pb-8 lg:px-8">
        <section className="rounded-[28px] bg-gradient-to-b from-secondary/18 via-secondary/8 to-transparent px-4 py-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.24)] md:px-5 md:py-6 lg:rounded-2xl lg:border lg:border-border/60 lg:bg-card/85 lg:p-6 lg:shadow-none">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">高手推荐</h1>
            </div>

            <div className="w-full lg:w-auto">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <div className="relative min-w-0 lg:min-w-[200px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={draftLotteryCode}
                  onChange={(event) => setDraftLotteryCode(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submitSearch()
                  }}
                  placeholder="按彩种编码筛选"
                  className="h-10 border-border/70 bg-background/60 pl-9"
                />
                </div>
                <Button className="h-10 rounded-full px-5 lg:rounded-md" onClick={submitSearch}>
                  查询
                </Button>
              </div>
            </div>
          </div>

          <div className="mb-6 hidden gap-3 lg:grid lg:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[22px] bg-secondary/10 p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.16)] lg:rounded-xl lg:border lg:border-border/60 lg:bg-background/40 lg:shadow-none">
              <p className="text-xs text-muted-foreground">认证高手</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{overview.totalExperts || 0}</p>
            </div>
            <div className="rounded-[22px] bg-secondary/10 p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.16)] lg:rounded-xl lg:border lg:border-border/60 lg:bg-background/40 lg:shadow-none">
              <p className="text-xs text-muted-foreground">今日上榜</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{state.total || activeItems.length || 0}</p>
            </div>
            <div className="rounded-[22px] bg-secondary/10 p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.16)] lg:rounded-xl lg:border lg:border-border/60 lg:bg-background/40 lg:shadow-none">
              <p className="text-xs text-muted-foreground">平均命中率</p>
              <p className="mt-2 text-2xl font-bold text-emerald-400">{overview.avgHitRate}%</p>
            </div>
            <div className="rounded-[22px] bg-secondary/10 p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.16)] lg:rounded-xl lg:border lg:border-border/60 lg:bg-background/40 lg:shadow-none">
              <p className="text-xs text-muted-foreground">当前最高连中</p>
              <p className="mt-2 text-2xl font-bold text-rose-400">{overview.maxStreak}</p>
            </div>
          </div>

          {state.error ? (
            <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {state.error}
            </div>
          ) : null}

            <div className="mb-5 rounded-[24px] bg-secondary/12 p-1.5 lg:rounded-xl lg:border lg:border-border/60 lg:bg-secondary/25">
            <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
              {boardTabs.map((tab) => {
                const active = tab.key === activeBoardKey
                return (
                  <button
                    key={tab.key}
                    type="button"
                    // 板块切换只在前端切换 activeGroup，不重复请求后端。
                    onClick={() => setActiveBoardKey(tab.key)}
                    className={cn(
                      "rounded-lg px-3 py-2 text-left transition-all",
                      active
                        ? "bg-background text-foreground shadow-[0_12px_30px_-18px_rgba(0,0,0,0.95)]"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <p className="text-sm font-semibold">{tab.title}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {state.loading ? (
            <div className="rounded-xl border border-border/60 bg-background/50 py-12 text-center text-sm text-muted-foreground">
              加载中...
            </div>
          ) : !weeklyStar ? (
            <div className="rounded-xl border border-border/60 bg-background/50 py-12 text-center text-sm text-muted-foreground">
              暂无榜单数据
            </div>
          ) : (
            <>
              <section className="mb-5 rounded-[26px] bg-gradient-to-br from-primary/10 via-secondary/10 to-transparent p-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.2)] lg:rounded-2xl lg:border lg:border-primary/40 lg:via-card/95 lg:to-background/70 lg:shadow-none">
                {/* 本周之星使用当前榜单第一名，形成“主推位 + 列表”层次。 */}
                <div className="mb-4 flex items-center gap-2 text-primary">
                  <Award className="h-4 w-4" />
                  <p className="text-sm font-semibold">本周之星</p>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
                  <div className="flex flex-wrap items-center gap-4">
                    <img
                      src={weeklyStar.avatar || "/placeholder-user.jpg"}
                      alt={weeklyStar.nickname || "高手"}
                      className="h-16 w-16 rounded-full border border-primary/30 object-cover"
                      loading="lazy"
                    />

                    <div className="min-w-[220px]">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-foreground">{weeklyStar.nickname || `用户${weeklyStar.user_id}`}</h2>
                        <span className="rounded-full border border-primary/35 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          {weeklyStar.user_type || "认证高手"}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-muted-foreground">{weeklyStar.score_label || "稳定命中，持续输出高质量预测"}</p>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-secondary/65 px-2 py-1 text-muted-foreground">{activeGroup?.title || "榜单"}</span>
                        <span className="rounded-full bg-secondary/65 px-2 py-1 text-muted-foreground">{weeklyStar.streak_label || `${weeklyStar.streak} 连中`}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center sm:min-w-[340px]">
                    <div className="rounded-2xl bg-secondary/10 p-3 lg:rounded-lg lg:bg-background/50">
                      <p className="text-xl font-bold text-emerald-400">{weeklyStar.hit_rate}%</p>
                      <p className="text-xs text-muted-foreground">命中率</p>
                    </div>
                    <div className="rounded-2xl bg-secondary/10 p-3 lg:rounded-lg lg:bg-background/50">
                      <p className="text-xl font-bold text-rose-400">{weeklyStar.streak}</p>
                      <p className="text-xs text-muted-foreground">连中</p>
                    </div>
                    <div className="rounded-2xl bg-secondary/10 p-3 lg:rounded-lg lg:bg-background/50">
                      <p className="text-xl font-bold text-foreground">{weeklyStar.return_rate}%</p>
                      <p className="text-xs text-muted-foreground">回报率</p>
                    </div>
                    <div className="rounded-2xl bg-secondary/10 p-3 lg:rounded-lg lg:bg-background/50">
                      <p className="text-xl font-bold text-foreground">{overview.hotUsers || 0}</p>
                      <p className="text-xs text-muted-foreground">热度指数</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                {activeItems.map((item) => {
                  const trendRate = calcTrendRate(item)
                  return (
                    <article
                      key={`${activeGroup?.key || "group"}-${item.user_id}`}
                      className="rounded-[26px] bg-secondary/10 p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.18)] transition-all hover:bg-secondary/15 lg:rounded-2xl lg:border lg:border-border/60 lg:bg-background/40 lg:p-5 lg:shadow-none lg:hover:border-primary/35"
                    >
                      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                        <div>
                          <div className="flex items-start gap-3">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-primary/35 bg-primary/10 text-sm font-semibold text-primary">
                              {item.rank}
                            </span>
                            <img
                              src={item.avatar || "/placeholder-user.jpg"}
                              alt={item.nickname || "高手"}
                              className="h-12 w-12 rounded-full border border-border/60 object-cover"
                              loading="lazy"
                            />

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-semibold text-foreground">{item.nickname || `用户${item.user_id}`}</h3>
                                <span className="rounded-full border border-border/70 bg-secondary/40 px-2 py-0.5 text-xs text-muted-foreground">
                                  {item.user_type || "分析师"}
                                </span>
                                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                                  认证
                                </span>
                              </div>
                              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                {item.score_label || "结合走势与热度进行综合研判"}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4">
                            <div className="rounded-2xl bg-secondary/10 p-3 text-center lg:rounded-lg lg:bg-card/70">
                              <p className="text-xl font-bold text-emerald-400">{item.hit_rate}%</p>
                              <p className="text-xs text-muted-foreground">命中率</p>
                            </div>
                            <div className="rounded-2xl bg-secondary/10 p-3 text-center lg:rounded-lg lg:bg-card/70">
                              <p className="text-xl font-bold text-rose-400">{item.streak}</p>
                              <p className="text-xs text-muted-foreground">连中</p>
                            </div>
                            <div className="rounded-2xl bg-secondary/10 p-3 text-center lg:rounded-lg lg:bg-card/70">
                              <p className="text-xl font-bold text-foreground">{item.return_rate}%</p>
                              <p className="text-xs text-muted-foreground">回报率</p>
                            </div>
                            <div className="rounded-2xl bg-secondary/10 p-3 text-center lg:rounded-lg lg:bg-card/70">
                              <p className="text-xl font-bold text-foreground">{Math.max(1, 100 - item.rank * 3)}k</p>
                              <p className="text-xs text-muted-foreground">关注量</p>
                            </div>
                          </div>

                          <div className="mt-4">
                            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <TrendingUp className="h-3.5 w-3.5" />
                                近期状态
                              </span>
                              <span>{trendRate}%</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/60">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-primary to-rose-500"
                                style={{ width: `${trendRate}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-row gap-2 lg:flex-col lg:justify-center">
                          <Button className="h-10 min-w-[92px] gap-1 bg-primary text-primary-foreground hover:bg-primary/90">
                            <Users className="h-4 w-4" />
                            关注
                          </Button>
                          <Button variant="outline" className="h-10 min-w-[92px] border-border/70">
                            查看详情
                          </Button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </section>

              <div className="mt-5 flex justify-center">
                <Button variant="outline" className="min-w-[280px] border-border/70">
                  查看更多高手
                </Button>
              </div>
            </>
          )}
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[24px] bg-secondary/10 p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.16)] lg:rounded-xl lg:border lg:border-border/60 lg:bg-card/70 lg:shadow-none">
            <p className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-primary">
              <Flame className="h-4 w-4" />
              榜单说明
            </p>
            <p className="text-sm text-muted-foreground lg:hidden">榜单每 5 分钟刷新一次，命中率与连中值来自后台统计服务。</p>
          </div>
          <div className="rounded-[24px] bg-secondary/10 p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.16)] lg:rounded-xl lg:border lg:border-border/60 lg:bg-card/70 lg:shadow-none">
            <p className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-primary">
              <ShieldCheck className="h-4 w-4" />
              风险提示
            </p>
            <p className="text-sm text-muted-foreground lg:hidden">榜单仅供参考，请理性参与。异常账户会在后台风控系统中自动降权。</p>
          </div>
        </section>
      </main>

      <Footer />
      <MobileNav />
    </div>
  )
}
