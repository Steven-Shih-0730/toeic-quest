// Supabase 連線設定。缺少環境變數時回傳 null，大廳顯示「尚未設定連線」。不得依賴 React。

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RoomChannel, PresenceMember } from './realtime';
import type { BattleMsg } from './types';

let client: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (client === undefined) {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    try {
      client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
    } catch {
      client = null;
    }
  }
  return client;
}

export function isRealtimeConfigured(): boolean {
  return getSupabase() !== null;
}

const EVENT = 'msg';

/** 把 Supabase Realtime channel 包成 RoomChannel（Broadcast + Presence） */
export function supabaseRoomChannel(sb: SupabaseClient, code: string, presenceKey: string): RoomChannel {
  const ch = sb.channel(`battle:${code}`, {
    config: { broadcast: { self: false }, presence: { key: presenceKey } },
  });
  let onMsg: (m: BattleMsg) => void = () => {};
  let onMembers: (m: PresenceMember[]) => void = () => {};

  ch.on('broadcast', { event: EVENT }, ({ payload }) => onMsg(payload as BattleMsg));
  ch.on('presence', { event: 'sync' }, () => {
    const state = ch.presenceState<PresenceMember>();
    onMembers(
      Object.values(state)
        .flat()
        .map(({ id, name, level, avatar, host, joinedAt }) => ({ id, name, level, avatar, host, joinedAt })),
    );
  });

  return {
    onMessage: (cb) => {
      onMsg = cb;
    },
    onMembers: (cb) => {
      onMembers = cb;
    },
    subscribe: () =>
      new Promise((resolve) => {
        ch.subscribe((status) => {
          if (status === 'SUBSCRIBED') resolve(true);
          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') resolve(false);
        });
      }),
    track: async (member) => {
      await ch.track(member);
    },
    send: (m) => {
      void ch.send({ type: 'broadcast', event: EVENT, payload: m });
    },
    close: () => {
      void sb.removeChannel(ch);
    },
  };
}
