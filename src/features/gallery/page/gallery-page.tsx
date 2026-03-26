"use client"

// 图纸板块页负责承接首页图纸区的完整浏览场景：
// 1. 查看全部分类；
// 2. 根据分类切换图纸；
// 3. 保留移动端单行横滑的分类操作方式；
// 4. 提供稳定的“查看更多”落点，而不是让首页不断堆长。
import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useIsMobile } from "@/components/ui/hooks/use-mobile"
import { homeAPI } from "@/src/features/home/api/home-api"
import { normalizeCards, normalizeCategories, normalizeHomeOverview } from "@/src/features/home/mappers/home-mappers"
import type { LotteryCardItem, LotteryCategoryItem } from "@/src/features/home/model/types"
import { Footer } from "@/src/shared/layout/footer"
import { Header } from "@/src/shared/layout/header"
import { MobileNav } from "@/src/shared/layout/mobile-nav"

interface GalleryState {
  loading: boolean
  error: string
  categories: LotteryCategoryItem[]
  currentCategory: string
  cards: LotteryCardItem[]
}

function defaultState(): GalleryState {
  return {
    loading: true,
    error: "",
    categories: [{ key: "all", name: "全部", show_on_home: 1 }],
    currentCategory: "all",
    cards: []
  }
}

export function GalleryPage() {
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()
  const requestedCategory = useMemo(() => (searchParams.get("category") || "all").trim() || "all", [searchParams])
  const [state, setState] = useState<GalleryState>(() => defaultState())

  const load = useCallback(async (nextCategory?: string) => {
    setState((prev) => ({ ...prev, loading: true, error: "" }))

    try {
      const overview = normalizeHomeOverview(await homeAPI.getOverview())
      const categories = normalizeCategories(overview.lottery_categories || [])
      const currentCategory = nextCategory || requestedCategory || "all"
      const response = await homeAPI.getLotteryCards(currentCategory === "all" ? "" : currentCategory)
      const cards = normalizeCards(response.items || [])

      setState({
        loading: false,
        error: "",
        categories,
        currentCategory,
        cards
      })
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "图纸板块加载失败"
      }))
    }
  }, [requestedCategory])

  useEffect(() => {
    void load(requestedCategory)
  }, [load, requestedCategory])

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-6 pb-24 lg:pb-8 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">图纸板块</h1>
          </div>
        </div>

        {isMobile ? (
          <div className="mb-4 rounded-[28px] bg-gradient-to-b from-secondary/18 via-secondary/8 to-transparent px-4 py-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.24)]">
            <div className="flex gap-2 overflow-x-auto whitespace-nowrap pb-1 scrollbar-hide">
              {state.categories.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    state.currentCategory === item.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  }`}
                  onClick={() => void load(item.key)}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-4 flex flex-wrap gap-2">
            {state.categories.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  state.currentCategory === item.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-primary"
                }`}
                onClick={() => void load(item.key)}
              >
                {item.name}
              </button>
            ))}
          </div>
        )}

        {state.error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {state.error}
          </div>
        ) : state.loading ? (
          <div className="rounded-[26px] bg-secondary/10 py-16 text-center text-sm text-muted-foreground shadow-[0_18px_40px_-28px_rgba(15,23,42,0.18)] lg:rounded-xl lg:border lg:border-border/60 lg:bg-card lg:shadow-none">
            图纸板块加载中...
          </div>
        ) : state.cards.length === 0 ? (
          <div className="rounded-[26px] bg-secondary/10 py-16 text-center text-sm text-muted-foreground shadow-[0_18px_40px_-28px_rgba(15,23,42,0.18)] lg:rounded-xl lg:border lg:border-border/60 lg:bg-card lg:shadow-none">
            当前分类暂无图纸内容
          </div>
        ) : (
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {state.cards.map((item) => (
              <Link
                key={item.id}
                href={item.special_lottery_id > 0 ? `/draw-scene?tabId=${item.special_lottery_id}&issue=${item.issue}` : "/history"}
                className="overflow-hidden rounded-[24px] bg-secondary/10 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.18)] transition-all hover:bg-secondary/14 lg:rounded-xl lg:border lg:border-border/60 lg:bg-card lg:shadow-none lg:hover:border-primary/40 lg:hover:shadow-md"
              >
                <img src={item.cover_image_url} alt={item.title} className="aspect-video w-full object-cover" loading="lazy" />
                <div className="space-y-1 px-0 pt-2 lg:p-3">
                  <p className="line-clamp-2 text-xs font-semibold sm:text-sm">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground sm:text-xs">
                    第 {item.issue} 期 · {item.draw_at || "-"}
                  </p>
                </div>
              </Link>
            ))}
          </section>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  )
}
