// 對戰排行榜的捏造玩家（CLAUDE.md 6.7）。只是展示用假資料，積分固定。
// 設計：初始 420 分排第 12 名，連贏 2 場（480 分）就能擠進前 10 名。

export interface LeaderboardEntry {
  name: string;
  avatar: string;
  rating: number;
}

export const FAKE_PLAYERS: LeaderboardEntry[] = [
  { name: '多益殺手 Leo', avatar: '🦁', rating: 980 },
  { name: 'Iris', avatar: '🦊', rating: 910 },
  { name: '學霸小芸', avatar: '🤓', rating: 855 },
  { name: 'Kevin 陳', avatar: '😼', rating: 790 },
  { name: '凱凱', avatar: '🐯', rating: 730 },
  { name: '夜貓子', avatar: '🦉', rating: 675 },
  { name: 'Annie', avatar: '🐰', rating: 620 },
  { name: '社畜阿翔', avatar: '🐨', rating: 560 },
  { name: '阿明', avatar: '😎', rating: 505 },
  { name: 'Mia', avatar: '🐼', rating: 455 },
  { name: '小雨', avatar: '🌧️', rating: 430 },
  { name: '阿哲', avatar: '🐶', rating: 395 },
  { name: '冰淇淋', avatar: '🍦', rating: 350 },
  { name: '小華', avatar: '🐢', rating: 290 },
  { name: '新手村長', avatar: '🐣', rating: 220 },
];
