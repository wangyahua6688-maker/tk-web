// 论坛接口层：专门负责帖子列表、帖子详情等论坛业务请求。
import { http } from "@/src/shared/api/http"
import type { ForumTopicDetailResp, ForumTopicsResp } from "@/src/features/forum/model/types"

export const forumAPI = {
  topics(params?: {
    feed?: string
    keyword?: string
    limit?: number
    issue?: string
    year?: number
  }): Promise<ForumTopicsResp> {
    // topics 承接论坛列表、搜索、期号筛选等多个场景，因此保留可选查询参数。
    return http.get<ForumTopicsResp>("/public/user/topics", { params })
  },

  topicDetail(postID: number): Promise<ForumTopicDetailResp> {
    // 详情接口按帖子 id 定位单篇内容，避免列表页把大文本全量带回来。
    return http.get<ForumTopicDetailResp>(`/public/user/topics/${postID}/detail`)
  }
}
