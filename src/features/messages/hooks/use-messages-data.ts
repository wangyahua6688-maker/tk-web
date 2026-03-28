"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { homeAPI } from "@/src/features/home/api/home-api"
import type { BroadcastItem } from "@/src/features/home/model/types"

export type MessageCategory = "notice" | "interaction" | "private"

// UserMessage 是页面层内部使用的消息视图模型，基于广播数据二次归类。
export interface UserMessage {
  id: number
  title: string
  content: string
  category: MessageCategory
  createdAt: string
}

function classifyMessage(item: BroadcastItem): MessageCategory {
  // 广播原始结构没有明确消息分类，这里通过关键词做前端归类兜底。
  const fullText = `${item.title || ""} ${item.content || ""}`.toLowerCase()
  if (/(评论|回复|点赞|互动|提到|关注|收藏)/.test(fullText)) {
    return "interaction"
  }
  if (/(私信|站内信|对话|聊天|会话)/.test(fullText)) {
    return "private"
  }
  return "notice"
}

interface MessagesState {
  // loading 控制消息列表骨架展示。
  loading: boolean
  // error 统一收口消息拉取失败文案。
  error: string
  // activeTab 表示当前正在查看哪一种消息。
  activeTab: MessageCategory
  // items 承载消息中心当前已拉取的全部消息。
  items: UserMessage[]
  // readIDs 存储本地已读状态。
  readIDs: number[]
}

function defaultState(): MessagesState {
  // 初始状态抽函数，便于后续补消息已读持久化时继续复用。
  return {
    loading: true,
    error: "",
    activeTab: "notice",
    items: [],
    readIDs: [],
  }
}

export function useMessagesData() {
  const [state, setState] = useState<MessagesState>(() => defaultState())

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: "" }))
    try {
      const overview = await homeAPI.getOverview()
      const now = Date.now()
      // 当前消息中心先复用 broadcasts 做演示映射，后续可无缝替换成专门的消息接口。
      const nextItems: UserMessage[] = (overview.broadcasts || []).map((item, index) => ({
        id: item.id,
        title: item.title || "系统通知",
        content: item.content || "暂无内容",
        category: classifyMessage(item),
        // 这里人为错开时间，仅用于让消息流相对时间展示更自然。
        createdAt: new Date(now - index * 45 * 60 * 1000).toISOString(),
      }))

      setState((prev) => ({
        ...prev,
        loading: false,
        error: "",
        items: nextItems,
      }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "消息加载失败",
      }))
    }
  }, [])

  useEffect(() => {
    // 消息中心首次进入时自动拉取广播映射数据。
    void load()
  }, [load])

  const grouped = useMemo(() => {
    const initial: Record<MessageCategory, UserMessage[]> = {
      notice: [],
      interaction: [],
      private: [],
    }

    for (const item of state.items) {
      // 分组结果由页面层直接消费，减少渲染阶段重复 filter。
      initial[item.category].push(item)
    }

    return initial
  }, [state.items])

  const currentItems = grouped[state.activeTab]
  // 未读数来源于 readIDs 与当前 tab 数据的交集。
  const unreadCount = currentItems.filter((item) => !state.readIDs.includes(item.id)).length

  const setActiveTab = useCallback((tab: MessageCategory) => {
    // 切换 tab 不需要重新请求，直接消费 grouped 结果。
    setState((prev) => ({ ...prev, activeTab: tab }))
  }, [])

  const markAllRead = useCallback(() => {
    if (currentItems.length === 0) return
    // Set 去重，避免重复点击“全部已读”时 readIDs 无限追加。
    setState((prev) => ({
      ...prev,
      readIDs: Array.from(new Set([...prev.readIDs, ...currentItems.map((item) => item.id)])),
    }))
  }, [currentItems])

  return {
    state,
    grouped,
    currentItems,
    unreadCount,
    reload: load,
    setActiveTab,
    markAllRead,
  }
}
