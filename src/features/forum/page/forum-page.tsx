"use client"

// 论坛列表页用于承接帖子列表、分类筛选和搜索入口，是论坛域的主入口。
import { useState } from "react"
import { useForumData } from "@/src/features/forum/hooks/use-forum-data"
import { cn } from "@/lib/utils"
import { formatRelativeTime } from "@/src/shared/utils/date"
import { Footer } from "@/src/shared/layout/footer"
import { Header } from "@/src/shared/layout/header"
import { ErrorBanner } from "@/src/shared/ui/error-banner"
import { ForumTopicCard } from "@/src/shared/ui/forum-topic-card"
import { MobileNav } from "@/src/shared/layout/mobile-nav"
import { PageSectionShell } from "@/src/shared/ui/page-section-shell"
import { PageTitleBar } from "@/src/shared/ui/page-title-bar"
import { PillToggleButton } from "@/src/shared/ui/pill-toggle-button"
import { PillToggleRail } from "@/src/shared/ui/pill-toggle-rail"
import { SearchActionBar } from "@/src/shared/ui/search-action-bar"
import { StatePanel } from "@/src/shared/ui/state-panel"

export function ForumPage() {
  const { state, clearSearch, submitSearch, setFeed, setHistoryIssue, setHistoryYear, setKeyword } =
    useForumData()
  const [searchExpanded, setSearchExpanded] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-6 pb-24 lg:pb-8 lg:px-8">
        <PageTitleBar title="社区论坛" />

        <PageSectionShell className="mb-4 lg:p-4" padding="page">
          <div className="relative mb-3 h-[44px] lg:h-[40px]">
            <div
              className={cn(
                "min-w-0 overflow-hidden transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                searchExpanded ? "hidden lg:block lg:opacity-100" : "block opacity-100"
              )}
            >
              <PillToggleRail className="pr-14 lg:pr-0" mode="adaptive">
                {state.tabs.map((tab) => (
                  <PillToggleButton
                    key={tab.key}
                    // 顶部 feed 切换直接驱动 hook 内的请求条件变化。
                    selected={tab.key === state.feed}
                    className={tab.key === state.feed ? "" : "hover:bg-secondary/80"}
                    onClick={() => {
                      // 当前 feed 已激活但仍残留搜索条件时，允许再次点击直接恢复完整列表。
                      if (tab.key === state.feed && state.committedKeyword) {
                        clearSearch()
                        setSearchExpanded(false)
                        return
                      }
                      setFeed(tab.key)
                    }}
                  >
                    {tab.label}
                  </PillToggleButton>
                ))}
              </PillToggleRail>
            </div>
            <SearchActionBar
              value={state.keyword}
              onChange={setKeyword}
              onSubmit={submitSearch}
              placeholder="按标题或作者搜索"
              className="absolute right-0 top-0 z-10"
              expandedClassName="w-[min(13rem,calc(100vw-5.5rem))] lg:w-[20rem]"
              triggerClassName="h-11 w-11 rounded-[16px] lg:h-10 lg:w-10 lg:rounded-md"
              onExpandedChange={(expanded) => {
                setSearchExpanded(expanded)
                if (!expanded) {
                  clearSearch()
                }
              }}
            />
          </div>

          {state.feed === "history" ? (
            <div className="mt-3 space-y-2">
              {/* 历史模式才展示年份和期号筛选，普通 feed 保持更轻的论坛浏览体验。 */}
              <PillToggleRail>
                {state.years.map((year) => (
                  <PillToggleButton
                    key={year}
                    selected={state.selectedYear === year}
                    size="xs"
                    shrink
                    onClick={() => setHistoryYear(year)}
                  >
                    {year} 年
                  </PillToggleButton>
                ))}
              </PillToggleRail>
              <PillToggleRail>
                {state.issues.map((issue) => (
                  <PillToggleButton
                    key={issue}
                    selected={state.selectedIssue === issue}
                    size="xs"
                    shrink
                    onClick={() => setHistoryIssue(issue)}
                  >
                    {issue}
                  </PillToggleButton>
                ))}
              </PillToggleRail>
            </div>
          ) : null}
        </PageSectionShell>

        {state.error ? <ErrorBanner className="mb-4">{state.error}</ErrorBanner> : null}

        {state.loading ? (
          <StatePanel>加载中...</StatePanel>
        ) : state.items.length === 0 ? (
          <StatePanel>暂无帖子内容</StatePanel>
        ) : (
          <section className="space-y-4">
            {state.items.map((item) => (
              <ForumTopicCard
                key={item.id}
                href={`/forum/${item.id}`}
                title={item.title}
                summary={item.content_preview || "暂无摘要"}
                commentCount={item.comment_count}
                likeCount={item.like_count}
                createdAtText={formatRelativeTime(item.created_at)}
                coverImage={item.cover_image || "/placeholder.jpg"}
              />
            ))}
          </section>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  )
}
