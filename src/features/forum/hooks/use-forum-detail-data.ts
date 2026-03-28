"use client"

import { useCallback, useEffect, useState } from "react"
import { forumAPI } from "@/src/features/forum/api/forum-api"
import type { ForumTopicDetailResp } from "@/src/features/forum/model/types"

interface ForumDetailState {
  // loading 控制详情页骨架和错误切换。
  loading: boolean
  // error 统一承接帖子详情请求失败文案。
  error: string
  // detail 承载帖子、作者、评论等聚合详情。
  detail: ForumTopicDetailResp | null
}

function defaultState(): ForumDetailState {
  // 初始状态抽函数，避免页面层自己管理多组散乱状态。
  return {
    loading: true,
    error: "",
    detail: null,
  }
}

export function useForumDetailData(postID: number) {
  const [state, setState] = useState<ForumDetailState>(() => defaultState())

  const load = useCallback(async () => {
    // 路由参数非法时直接停掉请求，避免后端收到无意义 id。
    if (!Number.isFinite(postID) || postID <= 0) {
      setState({
        loading: false,
        error: "帖子 ID 无效",
        detail: null,
      })
      return
    }

    setState((prev) => ({ ...prev, loading: true, error: "" }))

    try {
      // 论坛详情只需要一次完整聚合请求，由后端统一返回帖子/作者/评论。
      const detail = await forumAPI.topicDetail(postID)
      setState({
        loading: false,
        error: "",
        detail,
      })
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "帖子详情加载失败",
        detail: null,
      })
    }
  }, [postID])

  useEffect(() => {
    // 帖子 id 变化后自动刷新详情。
    void load()
  }, [load])

  return {
    state,
    reload: load,
  }
}
