"use client"

// LiveDraw 负责首页开奖主卡片：彩种切换、倒计时、号码球和快捷操作都在这里集中编排。
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { History, ChevronRight, Zap } from "lucide-react"
import { Button } from "@/components/ui/actions/button"
import type { DashboardData, SpecialLotteryTab } from "@/src/features/home/model/types"
import { formatDateTime, toCountdown } from "@/src/shared/utils/date"
import { cn } from "@/lib/utils"

const fallbackLotteryTypes = [
  { id: "macau", name: "澳彩", time: "21:30", color: "from-amber-500 to-orange-600" },
  { id: "hongkong", name: "港彩", time: "21:00", color: "from-rose-500 to-pink-600" },
  { id: "taiwan", name: "台彩", time: "20:30", color: "from-emerald-500 to-teal-600" },
]

const fallbackNumbers = [
  { num: "02", zodiac: "牛", element: "木" },
  { num: "11", zodiac: "狗", element: "金" },
  { num: "17", zodiac: "龙", element: "木" },
  { num: "24", zodiac: "猪", element: "火" },
  { num: "32", zodiac: "羊", element: "木" },
  { num: "48", zodiac: "猪", element: "水" },
]
const fallbackBonusNumber = { num: "09", zodiac: "猴", element: "火" }
const normalBallPalette = [
  "from-sky-500 via-cyan-500 to-blue-600 shadow-sky-500/25",
  "from-emerald-500 via-teal-500 to-green-600 shadow-emerald-500/25",
  "from-fuchsia-500 via-rose-500 to-pink-600 shadow-rose-500/25",
]
const bonusBallPalette = "from-orange-500 via-rose-500 to-red-600 shadow-orange-500/30"

interface LiveDrawProps {
  tabs?: SpecialLotteryTab[]
  activeTabID?: number
  dashboard?: DashboardData | null
  onTabChange?: (tabID: number) => void
  className?: string
  desktopDensity?: "default" | "compact"
}

function splitLabel(raw: string | undefined): { zodiac: string; element: string } {
  // label 约定格式为“生肖/五行”，拆不开时回退成占位符，避免页面直接显示 undefined。
  const [zodiac, element] = String(raw || "").split("/")
  return {
    zodiac: zodiac || "-",
    element: element || "-"
  }
}

function buildBalls(
  numbers: number[] | undefined,
  labels: string[] | undefined
): { normals: Array<{ num: string; zodiac: string; element: string }>; bonus: { num: string; zodiac: string; element: string } } {
  if (!numbers || numbers.length === 0) {
    // 没有真实开奖号码时回退兜底演示数据，保证首页布局稳定。
    return { normals: fallbackNumbers, bonus: fallbackBonusNumber }
  }

  const withLabels = numbers.map((num, index) => {
    // 号码和生肖/五行标签按索引一一对齐，方便下面统一渲染。
    const parsed = splitLabel(labels?.[index])
    return {
      num: String(num).padStart(2, "0"),
      zodiac: parsed.zodiac,
      element: parsed.element
    }
  })

  // 最后一位默认视为特别号，其余号码归为普通号。
  const bonus = withLabels[withLabels.length - 1] || fallbackBonusNumber
  return {
    normals: withLabels.slice(0, Math.max(0, withLabels.length - 1)),
    bonus
  }
}

export function LiveDraw({
  tabs,
  activeTabID,
  dashboard,
  onTabChange,
  className,
  desktopDensity = "default",
}: LiveDrawProps) {
  const [activeType, setActiveType] = useState<string>("")
  // 倒计时拆成结构化对象，方便后面单独强调秒位、做更醒目的数字盒子。
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 })

  const viewTabs = useMemo(
    () =>
      tabs && tabs.length > 0
        ? tabs.map((item, index) => ({
            id: String(item.id),
            name: item.name,
            // tab 上显示的是“下一期开奖时间”的时分秒，而不是当前期开奖时间。
            time: item.next_draw_at ? formatDateTime(item.next_draw_at).split(" ")[1] || "--:--:--" : "--:--:--",
            color: fallbackLotteryTypes[index % fallbackLotteryTypes.length].color
          }))
        : fallbackLotteryTypes,
    [tabs]
  )

  const activeID = activeTabID ? String(activeTabID) : activeType || viewTabs[0]?.id || ""
  const rawNextDrawTime =
    (tabs || []).find((item) => String(item.id) === activeID)?.next_draw_at ||
    dashboard?.special_lottery?.next_draw_at ||
    ""

  // 号码球数据统一在进入渲染前整理好，模板层只管展示。
  const balls = buildBalls(dashboard?.draw?.numbers, dashboard?.draw?.labels)
  const activeHistoryHref = activeID ? `/history?tabId=${activeID}` : "/history"
  // “查看详情”需要知道当前彩种和默认期号，方便默认定位到对应的开奖现场。
  const activeSceneHref = activeID
    ? `/draw-scene?tabId=${activeID}&issue=${dashboard?.draw?.issue || dashboard?.special_lottery?.current_issue || ""}`
    : "/draw-scene"
  const isCompactDesktop = desktopDensity === "compact"

  useEffect(() => {
    // 当外部 activeTabID 更新时，同步本地激活态，避免按钮高亮滞后。
    setActiveType(activeID)
  }, [activeID])

  useEffect(() => {
    const tick = () => {
      // 倒计时只依赖下一期开奖时间，每秒刷新一次即可。
      const parsed = toCountdown(rawNextDrawTime)
      setCountdown({
        hours: parsed.hours,
        minutes: parsed.minutes,
        seconds: parsed.seconds
      })
    }

    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [rawNextDrawTime])

  return (
    <section
      className={cn(
        "relative w-full min-w-0 max-w-full overflow-hidden bg-transparent lg:flex lg:h-full lg:flex-col lg:rounded-2xl lg:border lg:border-border/50 lg:bg-gradient-to-br lg:from-card lg:via-card lg:to-secondary/20",
        className
      )}
    >
      <div className="absolute -right-20 -top-20 hidden h-40 w-40 rounded-full bg-primary/20 blur-3xl lg:block" />
      <div className="absolute -bottom-20 -left-20 hidden h-40 w-40 rounded-full bg-accent/20 blur-3xl lg:block" />

      <div
        className={cn(
          "relative flex gap-2 overflow-x-auto border-b border-border/40 px-0 pb-3 scrollbar-hide lg:border-border/50",
          isCompactDesktop ? "lg:px-5 lg:pb-3 lg:pt-4" : "lg:p-4"
        )}
      >
        {viewTabs.map((type) => (
          <button
            key={type.id}
            onClick={() => {
              setActiveType(type.id)
              if (onTabChange) {
                // 只有能转成合法数字 id 的 tab 才触发外部切换请求。
                const tabID = Number(type.id)
                if (Number.isFinite(tabID) && tabID > 0) {
                  onTabChange(tabID)
                }
              }
            }}
            className={cn(
              "relative shrink-0 overflow-hidden rounded-xl border px-3 py-2.5 text-center font-medium transition-all duration-300 min-w-[100px] md:min-w-[112px] md:px-4 md:py-3",
              activeID === type.id
                ? "border-transparent text-slate-900 shadow-lg shadow-primary/20 dark:text-white"
                : "border-border/50 bg-secondary/70 text-foreground/80 hover:border-primary/25 hover:bg-primary/10 hover:text-foreground"
            )}
          >
            {activeID === type.id && (
              <div className={cn("absolute inset-0 bg-gradient-to-r", type.color)} />
            )}
            <span
              className={cn(
                "relative block text-xs font-bold md:text-sm",
                activeID === type.id ? "text-slate-900 dark:text-white" : "text-foreground"
              )}
            >
              {type.name}
            </span>
            <span
              className={cn(
                "relative block text-[10px] md:text-xs",
                activeID === type.id ? "text-slate-700 dark:text-white/80" : "text-muted-foreground"
              )}
            >
              {type.time} 开奖
            </span>
            {activeID === type.id && (
              <span className="absolute right-2 top-2 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70 dark:bg-white/60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white dark:bg-white" />
              </span>
            )}
          </button>
        ))}
      </div>

      <div
        className={cn(
          "relative px-0 py-4 lg:grid lg:flex-1 lg:min-h-0 lg:grid-rows-[auto_minmax(0,1fr)_auto]",
          isCompactDesktop ? "lg:px-5 lg:pb-5 lg:pt-4" : "lg:p-6"
        )}
      >
        <div
          className={cn(
            "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 md:flex md:items-center md:justify-between md:gap-4",
            isCompactDesktop ? "mb-4 lg:mb-4" : "mb-5 md:mb-6"
          )}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 md:gap-2">
              <Zap className="h-4 w-4 text-primary md:h-5 md:w-5" />
              <h2 className="text-base font-bold text-foreground md:text-2xl">
                第 <span className="text-primary">{dashboard?.draw?.issue || dashboard?.special_lottery?.current_issue || "----"}</span> 期
              </h2>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground md:text-sm">
              开奖时间: {dashboard?.draw?.draw_at ? formatDateTime(dashboard.draw.draw_at) : "-"}
            </p>
            {!dashboard?.draw?.numbers?.length ? (
              <p className="mt-1 text-[11px] text-muted-foreground md:text-xs">当前显示兜底演示数据</p>
            ) : null}
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[10px] text-muted-foreground md:text-xs">距下期开奖</p>
            <div className="mt-1 flex items-center justify-end gap-1 font-mono text-sm font-bold md:text-xl">
                <span className="rounded bg-secondary px-1.5 py-1 text-primary md:px-2">
                  {String(countdown.hours).padStart(2, "0")}
                </span>
                <span className="text-primary">:</span>
                <span className="rounded bg-secondary px-1.5 py-1 text-primary md:px-2">
                  {String(countdown.minutes).padStart(2, "0")}
                </span>
                <span className="text-primary">:</span>
                {/* 秒位继续保留强调色，让用户第一眼就能感知它在实时跳动。 */}
                <span className="rounded bg-secondary px-1.5 py-1 text-accent md:px-2">
                  {String(countdown.seconds).padStart(2, "0")}
                </span>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "max-w-full lg:flex lg:min-h-0 lg:items-center lg:justify-center",
            isCompactDesktop ? "mb-5 lg:mb-0" : "mb-6"
          )}
        >
          <div className="overflow-x-auto pb-2 scrollbar-hide md:flex md:justify-center lg:w-full">
            <div className="flex min-w-max items-start justify-start gap-1 px-0.5 md:mx-auto md:min-w-0 md:w-fit md:justify-center md:gap-4 md:px-0">
              {balls.normals.map((ball, index) => (
                <div key={index} className="flex min-w-[36px] md:min-w-[64px] flex-col items-center gap-1 md:gap-2">
                  <div
                    className={cn(
                      // 普通号码改为冷色多彩方案，和特别号形成更明确的层级区分。
                      "flex h-8 w-8 md:h-16 md:w-16 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br text-white shadow-lg transition-all duration-500",
                      isCompactDesktop && "lg:h-14 lg:w-14",
                      normalBallPalette[index % normalBallPalette.length]
                    )}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <span className={cn("font-mono text-xs md:text-2xl font-bold text-white", isCompactDesktop && "lg:text-[22px]")}>
                      {ball.num}
                    </span>
                  </div>
                  <span className="w-full text-center text-[9px] leading-tight text-muted-foreground md:text-xs">
                    {ball.zodiac}/{ball.element}
                  </span>
                </div>
              ))}

              <div className="flex min-w-[12px] md:min-w-[28px] items-center justify-center pt-1 md:pt-4 text-sm font-light text-muted-foreground md:text-2xl">
                +
              </div>

              <div className="flex min-w-[36px] md:min-w-[64px] flex-col items-center gap-1 md:gap-2">
                <div
                  className={cn(
                    // 特别号使用独立暖色系，避免和普通号继续混成同一类视觉印象。
                    "flex h-8 w-8 md:h-16 md:w-16 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br text-white shadow-lg transition-all duration-500",
                    bonusBallPalette
                  )}
                  style={{ animationDelay: "700ms" }}
                >
                    <span className={cn("font-mono text-xs md:text-2xl font-bold text-white", isCompactDesktop && "lg:text-[22px]")}>
                    {balls.bonus.num}
                  </span>
                </div>
                <span className="w-full text-center text-[9px] leading-tight text-orange-500 md:text-xs">
                  {balls.bonus.zodiac}/{balls.bonus.element}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-start gap-2 md:justify-center md:gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-full border-0 bg-secondary/70 px-3 text-xs font-medium text-foreground/85 shadow-none hover:bg-secondary lg:h-8 lg:rounded-md lg:border lg:px-3 lg:text-sm"
            asChild
          >
            <Link href={activeHistoryHref}>
              <History className="h-4 w-4" />
              历史记录
            </Link>
          </Button>
          <Button
            size="sm"
            className="h-9 rounded-full bg-primary/12 px-3 text-xs font-semibold text-primary shadow-none hover:bg-primary/18 lg:h-8 lg:rounded-md lg:bg-primary lg:px-3 lg:text-sm lg:text-primary-foreground"
            asChild
          >
            <Link href={activeSceneHref}>
              查看详情
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
