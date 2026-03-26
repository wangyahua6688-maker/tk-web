"use client"

// 论坛列表页用于承接帖子列表、分类筛选和搜索入口，是论坛域的主入口。
import Link from "next/link"
import { Calendar, MessageCircle, Search } from "lucide-react"
import { Button } from "@/components/ui/actions/button"
import { Input } from "@/components/ui/forms/input"
import { useForumData } from "@/src/features/forum/hooks/use-forum-data"
import { formatRelativeTime } from "@/src/shared/utils/date"
import { Footer } from "@/src/shared/layout/footer"
import { Header } from "@/src/shared/layout/header"
import { MobileNav } from "@/src/shared/layout/mobile-nav"

export function ForumPage() {
  const { state, submitSearch, setFeed, setHistoryIssue, setHistoryYear, setKeyword } = useForumData()

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-6 pb-24 lg:pb-8 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">社区论坛</h1>
          </div>
        </div>

        <section className="mb-4 rounded-[28px] bg-gradient-to-b from-secondary/18 via-secondary/8 to-transparent px-4 py-5 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.24)] lg:rounded-2xl lg:border lg:border-border/60 lg:bg-card lg:p-4 lg:shadow-none">
          <div className="mb-3 flex flex-wrap gap-2">
            {state.tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                // 顶部 feed 切换直接驱动 hook 内的请求条件变化。
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  tab.key === state.feed
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                }`}
                onClick={() => setFeed(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={state.keyword}
                onChange={(event) => setKeyword(event.target.value)}
                onKeyDown={(event) => {
                  // 输入 Enter 时直接提交搜索，减少多一步点击。
                  if (event.key === "Enter") submitSearch()
                }}
                className="pl-9"
                placeholder="按标题或作者搜索"
              />
            </div>
            <Button className="h-11 min-w-[88px] rounded-full px-5 lg:h-10 lg:rounded-md" onClick={submitSearch}>
              搜索
            </Button>
          </div>

          {state.feed === "history" ? (
            <div className="mt-3 space-y-2">
              {/* 历史模式才展示年份和期号筛选，普通 feed 保持更轻的论坛浏览体验。 */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {state.years.map((year) => (
                  <button
                    key={year}
                    type="button"
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                      state.selectedYear === year
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                    onClick={() => setHistoryYear(year)}
                  >
                    {year} 年
                  </button>
                ))}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {state.issues.map((issue) => (
                  <button
                    key={issue}
                    type="button"
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                      state.selectedIssue === issue
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                    onClick={() => setHistoryIssue(issue)}
                  >
                    {issue}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
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
        ) : state.items.length === 0 ? (
          <div className="rounded-[26px] bg-secondary/10 py-12 text-center text-sm text-muted-foreground shadow-[0_18px_40px_-28px_rgba(15,23,42,0.18)] lg:rounded-xl lg:border lg:border-border/60 lg:bg-card lg:shadow-none">
            暂无帖子内容
          </div>
        ) : (
          <section className="space-y-4">
            {state.items.map((item) => (
              <article
                key={item.id}
                // 一条帖子拆成“左文案右缩略图”的双栏结构，兼顾信息量和点击欲望。
                className="rounded-[26px] bg-secondary/10 p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.18)] transition-all hover:bg-secondary/15 lg:rounded-xl lg:border lg:border-border/60 lg:bg-card/95 lg:shadow-none lg:hover:border-primary/40 lg:hover:bg-card"
              >
                <div className="grid gap-3 md:grid-cols-[1fr_188px] md:items-center md:gap-4">
                  <div className="space-y-2">
                    <Link href={`/forum/${item.id}`} className="line-clamp-2 text-base font-semibold hover:text-primary">
                      {item.title}
                    </Link>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {item.content_preview || "暂无摘要"}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3.5 w-3.5" />
                        {item.comment_count}
                      </span>
                      <span>点赞 {item.like_count}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatRelativeTime(item.created_at)}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/forum/${item.id}`}
                    className="group relative block overflow-hidden rounded-2xl bg-secondary/18 lg:rounded-lg lg:border lg:border-border/60 lg:bg-secondary/30"
                  >
                    <img
                      src={item.cover_image || "/placeholder.jpg"}
                      alt={item.title}
                      className="h-[116px] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  )
}
