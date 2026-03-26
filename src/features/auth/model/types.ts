// 短信验证码请求参数：purpose 用来区分登录、注册或其他验证码业务场景。
export interface SMSCodePayload {
  phone: string
  purpose: "login" | "register" | string
}

// 密码登录参数结构。
export interface LoginByPasswordPayload {
  phone: string
  password: string
}

// 短信验证码登录参数结构。
export interface LoginBySMSPayload {
  phone: string
  sms_code: string
}

// 注册参数结构；nickname 允许首登前先补一个昵称。
export interface RegisterPayload {
  phone: string
  password: string
  sms_code: string
  nickname?: string
}

// 用户资料结构直接对齐后端认证返回，避免登录后再做二次字段猜测。
export interface UserProfile {
  id: number
  username: string
  phone: string
  nickname: string
  avatar: string
  user_type: string
  status: number
  register_source: string
  last_login_at?: string | null
}

// 认证成功后返回的核心会话信息。
export interface AuthResult {
  access_token: string
  refresh_token: string
  user: UserProfile
}

// 验证码发送结果：mock_mode/preview_code 主要服务开发和联调阶段。
export interface SMSCodeResult {
  phone: string
  purpose: string
  expires_sec: number
  mock_mode: boolean
  preview_code?: string
}
