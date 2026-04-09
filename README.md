# 中国象棋 (Chinese Chess) - Cloudflare Workers 版本

一个基于 Cloudflare Workers Durable Objects 构建的实时在线中国象棋对战应用。

**在线地址**: https://chess.netlib.re

---

## 目录

- [项目概述](#项目概述)
- [技术架构](#技术架构)
- [核心原理](#核心原理)
- [功能特性](#功能特性)
- [使用指南](#使用指南)
- [部署指南](#部署指南)
- [文件结构](#文件结构)
- [WebSocket 协议](#websocket-协议)
- [象棋规则实现](#象棋规则实现)
- [开发与测试](#开发与测试)

---

## 项目概述

本项目是一个完整的在线中国象棋对战平台，玩家可以创建房间、邀请对手进行实时对战。项目采用 Cloudflare Workers 作为后端服务器，利用 Durable Objects 实现有状态的 WebSocket 连接管理，确保游戏状态可靠持久化。

### 核心优势

- **边缘部署**: 基于 Cloudflare 全球边缘网络，延迟低、响应快
- **有状态连接**: Durable Objects 提供稳定的 WebSocket 连接状态管理
- **自动重连**: 支持页面刷新后自动恢复游戏状态
- **零服务器运维**: 无需管理传统服务器，自动扩展

---

## 技术架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         Cloudflare Edge                          │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                     Worker (Entry Point)                     │ │
│  │                    src/index.ts                              │ │
│  │  - 静态资源服务 (HTML/CSS/JS)                                 │ │
│  │  - WebSocket 路由 (/ws?roomName=X)                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                Durable Object (GameRoomDO)                   │ │
│  │                   src/GameRoomDO.ts                          │ │
│  │                                                              │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │ │
│  │  │  Room "A"    │  │  Room "B"    │  │  Room "C"    │       │ │
│  │  │              │  │              │  │              │       │ │
│  │  │ 红方Player1  │  │ 红方Player3  │  │ 红方Player5  │       │ │
│  │  │ 黑方Player2  │  │ 黑方Player4  │  │ (等待加入)   │       │ │
│  │  │ 棋盘状态     │  │ 棋盘状态     │  │ 棋盘状态     │       │ │
│  │  │ 聊天历史     │  │ 聊天历史     │  │              │       │ │
│  │  │ WebSocket连接│  │ WebSocket连接│  │              │       │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘       │ │
│  │                                                              │ │
│  │  每个 Durable Object 实例 = 一个独立的游戏房间                │ │
│  │  使用 idFromName(roomName) 创建/获取房间实例                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                          客户端浏览器                             │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                     Frontend (静态文件)                       │ │
│  │                                                              │ │
│  │  index.html          - 主页面结构                            │ │
│  │  css/style.css       - 样式文件                              │ │
│  │  js/config.js        - 配置常量                              │ │
│  │  js/board.js         - 棋盘绘制                              │ │
│  │  js/pieces.js        - 棋子绘制                              │ │
│  │  js/rules.js         - 象棋规则验证                          │ │
│  │  js/websocket.js     - WebSocket 连接管理                    │ │
│  │  js/game.js          - 游戏状态处理                          │ │
│  │  js/audio.js         - 音效管理                              │ │
│  │  js/main.js          - 初始化逻辑                            │ │
│  │                                                              │ │
│  │  Canvas API          - 绘制棋盘和棋子                        │ │
│  │  WebSocket API       - 实时通信                              │ │
│  │  Web Audio API       - 音效播放                              │ │
│  │  Cookie API          - 会话持久化                            │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 后端运行时 | Cloudflare Workers | 边缘计算平台，全球部署 |
| 状态存储 | Durable Objects | 有状态的 WebSocket 管理和游戏数据持久化 |
| 前端框架 | 纯 JavaScript | 无框架依赖，轻量高效 |
| 绘图引擎 | Canvas API | 绘制棋盘和棋子 |
| 实时通信 | WebSocket | 双向实时消息传递 |
| 音效系统 | Web Audio API | 棋子移动、将军、游戏结束音效 |

---

## 核心原理

### 1. Durable Objects 的关键作用

Durable Objects 是 Cloudflare Workers 提供的有状态计算单元。在本项目中，每个游戏房间对应一个独立的 Durable Object 实例。

#### 为什么需要 Durable Objects？

传统 WebSocket 服务器面临的问题：
- **无状态**: Workers 默认是无状态的，每次请求可能在不同边缘节点执行
- **连接断开**: WebSocket 连接需要持久保持在同一个服务器实例
- **状态同步**: 游戏数据（棋盘、玩家信息）需要可靠存储

Durable Objects 解决方案：
- **唯一标识**: 通过 `idFromName(roomName)` 创建确定性 ID，同一房间名总是路由到同一实例
- **有状态**: 实例内存储游戏状态，WebSocket 连接状态，聊天历史等
- **Hibernation API**: 支持 WebSocket 连接休眠，减少内存占用

#### Durable Objects Hibernation API

```typescript
// 在 acceptWebSocket 后，必须实现以下处理器方法
// 注意：不是使用 addEventListener，而是实现类方法！

async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
  // 处理客户端消息
}

async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
  // 处理连接关闭
}

async webSocketError(ws: WebSocket, error: any) {
  // 处理连接错误
}
```

### 2. WebSocket 路由机制

```
客户端连接请求
  ↓
/ws?roomName=A&playerId=player_123
  ↓
Worker (index.ts) 解析 URL 参数
  ↓
env.GAME_ROOM.idFromName("A")  // 获取房间 A 的 Durable Object ID
  ↓
env.GAME_ROOM.get(id)          // 获取 Durable Object Stub
  ↓
stub.fetch(request)            // 转发请求到对应的 GameRoomDO 实例
  ↓
GameRoomDO.handleWebSocket()   // 处理 WebSocket 连接
```

### 3. 会话持久化机制

使用 Cookie 存储会话信息，支持页面刷新后自动重连：

```javascript
// Cookie 存储的内容
xiangqi_player_id = "player_1234567890_abc123"  // 玩家唯一标识
xiangqi_room_name = "RoomA"                      // 房间名称

// Cookie 有效期：15分钟
```

**重连流程**：
1. 页面加载时检查 Cookie
2. 如果存在有效的 playerId 和 roomName，自动发起 WebSocket 连接
3. 服务端识别 playerId，发送 REJOINED 消息恢复游戏状态
4. 同时通知对手 OPPONENT_RECONNECTED

### 4. 断线重连机制

客户端实现了自动重连：

```javascript
// 最多重连 10 次，每次间隔递增
reconnectAttempts = 0;
MAX_RECONNECT = 10;

webSocket.onclose = function() {
  if (reconnectAttempts < MAX_RECONNECT) {
    reconnectAttempts++;
    setTimeout(() => connectWebSocket(), 2000 * reconnectAttempts);
  }
};
```

---

## 功能特性

### 游戏功能

| 功能 | 描述 |
|------|------|
| 创建房间 | 输入房间名创建新房间，自动分配红方 |
| 加入房间 | 输入已存在房间名加入，自动分配黑方 |
| 实时对战 | WebSocket 实时同步棋盘状态 |
| 棋子移动 | 点击选择棋子，点击目标位置移动 |
| 规则验证 | 完整的中国象棋规则实现 |
| 将军检测 | 自动检测将军状态并提示 |
| 胜负判定 | 将死、困毙自动判定游戏结束 |

### 游戏控制

| 功能 | 描述 |
|------|------|
| 悔棋 | 请求撤销上一步棋，需对手同意 |
| 求和 | 请求和棋，需对手同意 |
| 认输 | 直接放弃比赛，对手获胜 |

### 社交功能

| 功能 | 描述 |
|------|------|
| 实时聊天 | 自定义消息或快捷消息 |
| 快捷消息 | 预设的常用短语，快速发送 |
| 聊天历史 | 页面刷新后恢复聊天记录 |
| 语音播报 | 使用 Web Speech API 播报对手消息 |

### 音效系统

| 功能 | 描述 |
|------|------|
| 移动音效 | 棋子移动时的点击声 |
| 选择音效 | 选中棋子时的提示声 |
| 将军音效 | 将军时的警告声 |
| 游戏结束 | 获胜/失败时的不同旋律 |
| 背景音乐 | 中国风格的五声音阶旋律 |

### 状态通知

| 功能 | 描述 |
|------|------|
| 对手断线 | 显示对手断开连接提示 |
| 对手重连 | 清除断线提示，恢复正常 |
| 回合提示 | 显示当前是谁的回合 |
| 将军提示 | 显示将军状态 |

---

## 使用指南

### 创建房间

1. 打开网站 https://chess.netlib.re
2. 在"房间名"输入框输入一个唯一名称（如：我的房间）
3. 点击"创建房间"按钮
4. 系统会显示"房间: 我的房间 (等待对手加入)"
5. 等待对手加入

### 加入房间

1. 在"房间名"输入框输入已存在的房间名
2. 点击"加入房间"按钮
3. 如果房间存在且有空位，会自动加入并开始游戏

### 进行对战

1. 红方先手
2. 点击自己的棋子选中（会高亮显示）
3. 可移动的位置会显示提示
4. 点击目标位置完成移动
5. 等待对手移动

### 使用游戏控制

- **悔棋**: 点击"悔棋"按钮，等待对手同意
- **求和**: 点击"求和"按钮，等待对手同意
- **认输**: 点击"认输"按钮，直接结束游戏

### 使用聊天

- 在输入框输入自定义消息，点击"发送"
- 或使用下拉菜单选择快捷消息

### 断线重连

如果意外断开连接：
- 页面会自动尝试重新连接（最多10次）
- 重连成功后自动恢复游戏状态
- 对手会收到"已断开连接"提示，等你重连后自动消失

---

## 部署指南

### 前置要求

1. Node.js 18+
2. Cloudflare 账户
3. Wrangler CLI (`npm install -g wrangler`)

### 配置文件

**wrangler.toml**:
```toml
name = "chinese-chess"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[durable_objects]
bindings = [{ name = "GAME_ROOM", class_name = "GameRoomDO" }]

[[migrations]]
tag = "v1"
new_sqlite_classes = ["GameRoomDO"]

[assets]
directory = "./src/static"

# 自定义域名（可选）
# [[routes]]
# pattern = "chess.example.com/*"
# zone_name = "chess.example.com"
```

### 部署步骤

```bash
# 1. 克隆项目
git clone https://github.com/lwtdzh/chinese-chess-cloudflare-workers.git
cd chinese-chess-cloudflare-workers

# 2. 安装依赖
npm install

# 3. 登录 Cloudflare
wrangler login

# 4. 部署
wrangler deploy

# 5. 查看部署信息
wrangler deployments list
```

### 配置自定义域名

1. 在 Cloudflare Dashboard 添加域名
2. 添加 DNS 记录（CNAME 或 AAAA）
3. 在 wrangler.toml 中添加 routes 配置
4. 重新部署

```bash
# 添加自定义域名路由
wrangler domains add chess.example.com
```

### 本地开发

```bash
# 启动本地开发服务器
wrangler dev

# 访问 http://localhost:8787
```

---

## 文件结构

```
chinese-chess-cloudflare-workers/
├── src/
│   ├── index.ts                 # Worker 入口，WebSocket 路由
│   ├── GameRoomDO.ts            # Durable Object，游戏房间逻辑
│   ├── game/
│   │   ├── types.ts             # 类型定义
│   │   ├── ChessBoard.ts        # 棋盘数据结构
│   │   ├── MoveValidator.ts     # 走法验证
│   │   ├── CheckDetector.ts     # 将军检测
│   │   └── MoveGenerator.ts     # 走法生成
│   └── static/
│       ├── index.html           # 主页面
│       ├── css/
│       │   └── style.css        # 样式
│       └── js/
│           ├── config.js        # 配置常量
│           ├── board.js         # 棋盘绘制
│           ├── pieces.js        # 棋子绘制
│           ├── rules.js         # 规则验证（客户端）
│           ├── websocket.js     # WebSocket 管理
│           ├── game.js          # 游戏状态处理
│           ├── audio.js         # 音效管理
│           └── main.js          # 初始化
├── tests/
│   └── e2e/
│       └── game.spec.ts         # E2E 测试
├── playwright.config.ts         # Playwright 配置
├── wrangler.toml                # Cloudflare 配置
├── package.json                 # 项目依赖
└── README.md                    # 本文档
```

---

## WebSocket 协议

### 客户端发送消息

| 类型 | 字段 | 描述 |
|------|------|------|
| createRoom | roomName, playerId | 创建房间 |
| joinRoom | roomId, playerId | 加入房间 |
| move | roomId, playerId, from, to | 移动棋子 |
| resign | roomId, playerId | 认输 |
| drawRequest | roomId, playerId | 请求和棋 |
| drawResponse | roomId, playerId, accepted | 响应和棋请求 |
| takeBackRequest | roomId, playerId | 请求悔棋 |
| takeBackResponse | roomId, playerId, accepted | 响应悔棋请求 |
| chat | roomId, playerId, message | 发送聊天 |
| rejoin | roomId, playerId | 重新加入 |

### 服务端发送消息

| 类型 | 字段 | 描述 |
|------|------|------|
| CONNECTED | playerId, roomId | 连接确认 |
| ROOM_CREATED | roomId, roomName, playerId, color | 房间创建成功 |
| JOINED | roomId, playerId, color | 加入房间成功 |
| REJOINED | roomId, playerId, color, board, currentTurn, gameState, chatHistory | 重连恢复 |
| GAME_START | roomId, board | 游戏开始 |
| MOVE | from, to, piece, nextTurn, inCheck, gameState | 棋子移动 |
| GAME_OVER | winner, reason | 游戏结束 |
| INVALID_MOVE | - | 无效走法 |
| ERROR | message | 错误提示 |
| CHAT | playerId, playerColor, message, timestamp | 聊天消息 |
| DRAW_REQUEST | playerId, playerColor | 和棋请求 |
| DRAW_DECLINED | playerId | 和棋被拒绝 |
| TAKE_BACK_REQUEST | playerId, playerColor | 悔棋请求 |
| TAKE_BACK_DECLINED | playerId | 悔棋被拒绝 |
| TAKE_BACK | board | 悔棋执行 |
| OPPONENT_DISCONNECTED | playerColor | 对手断线 |
| OPPONENT_RECONNECTED | playerColor | 对手重连 |

---

## 象棋规则实现

### 棋子类型

| 类型 | 中文 | 移动规则 |
|------|------|----------|
| GENERAL | 将/帅 | 在九宫格内移动一格（横或竖） |
| ADVISOR | 士/仕 | 在九宫格内移动一格（斜线） |
| ELEPHANT | 象/相 | 斜走两格，不能过河，不能被塞象眼 |
| HORSE | 马 | 走"日"字，不能被蹩马腿 |
| CHARIOT | 车 | 横竖任意距离，不能跨越棋子 |
| CANNON |  | 横竖任意距离移动；吃子需隔一子 |
| SOLDIER | 兵/卒 | 未过河只能向前；过河可前进或横走 |

### 规则验证代码示例

```javascript
// 马的走法验证
case 'HORSE':
  // 必须走"日"字形（2+1 或 1+2）
  if (!((absRowDiff === 2 && absColDiff === 1) ||
        (absRowDiff === 1 && absColDiff === 2))) return false;

  // 检查蹩马腿
  const legRow = absRowDiff === 2 ? from.row + rowDiff / 2 : from.row;
  const legCol = absRowDiff === 2 ? from.col : from.col + colDiff / 2;
  return !board[legRow][legCol];  // 马腿位置不能有棋子
```

### 将军检测

系统会：
1. 检查走法是否会导致自己被将军（禁止自杀）
2. 检查走法是否将军对手
3. 检查将帅是否面对面（飞将规则）

### 胜负判定

- **将死 (Checkmate)**: 被将军且无法应将
- **困毙 (Stalemate)**: 未被将军但无合法走法
- **认输 (Resign)**: 玩家主动认输
- **和棋 (Draw)**: 双方同意和棋

---

## 开发与测试

### 安装依赖

```bash
npm install
```

### 本地开发

```bash
wrangler dev
```

### 运行 E2E 测试

```bash
# 安装 Playwright
npx playwright install

# 运行测试
npx playwright test

# 或指定文件
npx playwright test tests/e2e/game.spec.ts
```

### 测试覆盖范围

- 房间创建和加入
- 棋子移动和规则验证
- 悔棋、求和、认输
- 聊天功能
- 断线重连
- 游戏结束判定

---

## 常见问题

### Q: 为什么有时连接不上？

A: 检查以下几点：
1. 网络连接是否正常
2. 是否需要代理访问（中国大陆可能需要）
3. Cloudflare Workers 是否正常部署

### Q: 页面刷新后游戏状态丢失？

A: 正常情况下不会丢失。系统使用 Cookie 存储会话信息，15分钟内刷新页面会自动恢复。如果 Cookie 过期或被清除，则无法恢复。

### Q: 如何查看游戏日志？

A: 使用浏览器开发者工具查看 Console 和 Network 标签页。

### Q: 对手突然消失？

A: 对手可能断开了连接。系统会显示"对手已断开连接"提示。等待对手重连或自己也可以刷新页面。

---

## 许可证

MIT License

---

## 作者

本项目由 Claude Code 协助开发，使用 Cloudflare Workers 技术栈。

**GitHub**: https://github.com/lwtdzh/chinese-chess-cloudflare-workers