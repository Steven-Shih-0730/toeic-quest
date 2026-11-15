import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QUESTIONS } from '../src/data/questions';
import { QUESTION_MS, REVEAL_MS } from '../src/lib/battle/engine';
import { FIRST_QUESTION_DELAY_MS, RealtimeRoom, isValidRoomCode, randomRoomCode } from '../src/lib/battle/realtime';
import type { PresenceMember, RoomChannel } from '../src/lib/battle/realtime';
import type { BattleEvent, BattleMsg, PlayerInfo } from '../src/lib/battle/types';

/** 記憶體內的假 Realtime：同一個 topic 的 channel 互相廣播、共享 Presence */
class FakeHub {
  private topics = new Map<string, Set<FakeChannel>>();
  join(topic: string, ch: FakeChannel) {
    if (!this.topics.has(topic)) this.topics.set(topic, new Set());
    this.topics.get(topic)!.add(ch);
  }
  leave(topic: string, ch: FakeChannel) {
    this.topics.get(topic)?.delete(ch);
    this.sync(topic);
  }
  broadcast(topic: string, from: FakeChannel, m: BattleMsg) {
    for (const ch of this.topics.get(topic) ?? []) if (ch !== from) ch.deliver(JSON.parse(JSON.stringify(m)));
  }
  sync(topic: string) {
    const chans = [...(this.topics.get(topic) ?? [])];
    const members = chans.map((c) => c.member).filter((m): m is PresenceMember => !!m);
    chans.forEach((c) => c.membersCb(members));
  }
  channel(topic: string): FakeChannel {
    return new FakeChannel(this, topic);
  }
}

class FakeChannel implements RoomChannel {
  member: PresenceMember | null = null;
  msgCb: (m: BattleMsg) => void = () => {};
  membersCb: (m: PresenceMember[]) => void = () => {};
  constructor(private hub: FakeHub, private topic: string) {}
  onMessage(cb: (m: BattleMsg) => void) {
    this.msgCb = cb;
  }
  onMembers(cb: (m: PresenceMember[]) => void) {
    this.membersCb = cb;
  }
  async subscribe() {
    this.hub.join(this.topic, this);
    return true;
  }
  async track(m: PresenceMember) {
    this.member = m;
    this.hub.sync(this.topic);
  }
  send(m: BattleMsg) {
    this.hub.broadcast(this.topic, this, m);
  }
  close() {
    this.member = null;
    this.hub.leave(this.topic, this);
  }
  deliver(m: BattleMsg) {
    this.msgCb(m);
  }
}

let clock = 1_000_000;
const now = () => clock;
const player = (id: string, name: string): PlayerInfo => ({ id, name, level: 3, avatar: '🧑' });

async function makeRoom(hub: FakeHub, code: string, me: PlayerInfo, isHost: boolean, words: string[] = []) {
  clock += 1; // 讓加入時間有先後
  const room = new RealtimeRoom(hub.channel(`battle:${code}`), code, me, isHost, QUESTIONS, words, now);
  await room.join();
  return room;
}

function collect(room: RealtimeRoom) {
  const opp = room.createOpponent();
  const events: BattleEvent[] = [];
  opp.subscribe((e) => events.push(e));
  return { opp, events };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(clock);
});
afterEach(() => vi.useRealTimers());

const tick = (ms: number) => {
  clock += ms;
  vi.advanceTimersByTime(ms);
};

describe('房號', () => {
  it('產生與驗證 4 位數房號', () => {
    expect(randomRoomCode(() => 0.0042)).toBe('0042');
    expect(isValidRoomCode('0042')).toBe(true);
    expect(isValidRoomCode('42')).toBe(false);
    expect(isValidRoomCode('12a4')).toBe(false);
  });
});

describe('RealtimeRoom：房間與 Presence', () => {
  it('房主建立、對手加入後雙方看得到彼此；都按準備才算 bothReady', async () => {
    const hub = new FakeHub();
    const host = await makeRoom(hub, '1234', player('A', '小陳'), true, ['reimburse']);
    expect(host.snapshot.opponent).toBeUndefined();

    const guest = await makeRoom(hub, '1234', player('B', '小美'), false, ['agenda']);
    expect(host.snapshot.opponent?.name).toBe('小美');
    expect(guest.snapshot.opponent?.name).toBe('小陳');
    expect(guest.snapshot.hostPresent).toBe(true);

    host.setReady();
    expect(guest.snapshot.oppReady).toBe(true);
    expect(host.bothReady).toBe(false);
    guest.setReady();
    expect(host.bothReady).toBe(true);
    expect(guest.bothReady).toBe(true);
  });

  it('第 3 個人進來時顯示「房間已滿」並離開，前兩人不受影響', async () => {
    const hub = new FakeHub();
    const a = await makeRoom(hub, '5555', player('A', 'A'), true);
    const b = await makeRoom(hub, '5555', player('B', 'B'), false);
    const c = await makeRoom(hub, '5555', player('C', 'C'), false);
    expect(c.snapshot.status).toBe('full');
    expect(a.snapshot.opponent?.id).toBe('B');
    expect(b.snapshot.opponent?.id).toBe('A');
  });

  it('房主先按準備、對手後加入：對手仍收得到房主的準備', async () => {
    const hub = new FakeHub();
    const host = await makeRoom(hub, '7777', player('A', 'A'), true);
    host.setReady();
    const guest = await makeRoom(hub, '7777', player('B', 'B'), false);
    expect(guest.snapshot.oppReady).toBe(true);
  });

  it('等待中對手離開：對手資訊與準備狀態清掉', async () => {
    const hub = new FakeHub();
    const host = await makeRoom(hub, '8888', player('A', 'A'), true);
    const guest = await makeRoom(hub, '8888', player('B', 'B'), false);
    guest.setReady();
    guest.leave();
    expect(host.snapshot.opponent).toBeUndefined();
    expect(host.snapshot.oppReady).toBe(false);
  });
});

describe('RealtimeOpponent：連線對戰', () => {
  async function setup() {
    const hub = new FakeHub();
    const host = await makeRoom(hub, '2468', player('A', '小陳'), true, ['reimburse', 'invoice']);
    const guest = await makeRoom(hub, '2468', player('B', '小美'), false, ['agenda', 'budget']);
    host.setReady();
    guest.setReady();
    return { hub, host, guest };
  }

  it('雙方看到同一組題目、來源標示出自各自的快忘清單', async () => {
    const { host, guest } = await setup();
    const H = collect(host);
    H.opp.start({ ...host.snapshot.me, dueWords: ['reimburse', 'invoice'] });
    const G = collect(guest); // 加入者比較晚建立對戰畫面：start 先暫存，訂閱時補送
    G.opp.start({ ...guest.snapshot.me, dueWords: ['agenda', 'budget'] });

    const hs = H.events[0] as Extract<BattleEvent, { type: 'start' }>;
    const gs = G.events[0] as Extract<BattleEvent, { type: 'start' }>;
    expect(gs).toEqual(hs);
    // 出題順序會打亂，所以比對「哪些字、出自誰」
    const wordsOf = (src: string) =>
      hs.questionIds
        .filter((id) => hs.sourceOf[id] === src)
        .map((id) => QUESTIONS.find((q) => q.id === id)!.word)
        .sort();
    expect(wordsOf('A')).toEqual(['invoice', 'reimburse']);
    expect(wordsOf('B')).toEqual(['agenda', 'budget']);
    expect(hs.questionIds).toHaveLength(5);
  });

  it('打完 5 題：每題 reveal 與最後分數雙方一致（以房主計算為準）', async () => {
    const { host, guest } = await setup();
    const H = collect(host);
    const G = collect(guest);
    H.opp.start({ ...host.snapshot.me, dueWords: [] });
    G.opp.start({ ...guest.snapshot.me, dueWords: [] });
    const start = H.events[0] as Extract<BattleEvent, { type: 'start' }>;

    tick(FIRST_QUESTION_DELAY_MS);
    for (let i = 0; i < 5; i += 1) {
      const q = QUESTIONS.find((x) => x.id === start.questionIds[i])!;
      tick(1200);
      G.opp.answer(i, q.answer, QUESTION_MS - 1200); // 小美都答對
      expect(H.events.at(-1)).toEqual({ type: 'opponentAnswered', index: i });
      tick(800);
      H.opp.answer(i, i % 2 === 0 ? q.answer : (q.answer + 1) % 4, QUESTION_MS - 2000); // 小陳對、錯交替
      tick(REVEAL_MS);
    }

    const reveals = (evs: BattleEvent[]) => evs.filter((e) => e.type === 'reveal');
    expect(reveals(G.events)).toEqual(reveals(H.events));
    const hEnd = H.events.at(-1) as Extract<BattleEvent, { type: 'end' }>;
    const gEnd = G.events.at(-1) as Extract<BattleEvent, { type: 'end' }>;
    expect(hEnd.type).toBe('end');
    expect(gEnd).toEqual(hEnd);
    // 小美 5 題都剩 8.8 秒答對：90 + 113 + 113 + 113 + 113
    expect(hEnd.scores.B).toBe(90 + 113 * 4);
    // 小陳第 1、3、5 題答對（剩 8 秒），Combo 被答錯打斷，每題 80
    expect(hEnd.scores.A).toBe(80 * 3);
  });

  it('對手作答時，另一邊收到「對手已作答」', async () => {
    const { host, guest } = await setup();
    const H = collect(host);
    const G = collect(guest);
    H.opp.start({ ...host.snapshot.me, dueWords: [] });
    tick(FIRST_QUESTION_DELAY_MS + 500);
    H.opp.answer(0, 0, 9000);
    expect(G.events.at(-1)).toEqual({ type: 'opponentAnswered', index: 0 });
  });

  it('對戰中對手斷線：留下的一方收到 opponentLeft，房主停止出題', async () => {
    const { host, guest } = await setup();
    const H = collect(host);
    const G = collect(guest);
    H.opp.start({ ...host.snapshot.me, dueWords: [] });
    tick(FIRST_QUESTION_DELAY_MS + 1000);

    G.opp.dispose(); // 關掉分頁
    tick(1);
    expect(H.events.at(-1)).toEqual({ type: 'opponentLeft' });
    const n = H.events.length;
    tick(60_000);
    expect(H.events).toHaveLength(n);
  });

  it('房主斷線：加入者也會收到 opponentLeft', async () => {
    const { host, guest } = await setup();
    const H = collect(host);
    const G = collect(guest);
    H.opp.start({ ...host.snapshot.me, dueWords: [] });
    tick(FIRST_QUESTION_DELAY_MS);
    H.opp.dispose();
    tick(1);
    expect(G.events.at(-1)).toEqual({ type: 'opponentLeft' });
  });

  it('React StrictMode：卸載後立刻重新訂閱，不會斷線，比賽照常進行', async () => {
    const { host, guest } = await setup();
    const G = collect(guest);
    // 房主畫面：第一次掛載 → 卸載（dispose）→ 再掛載
    const opp = host.createOpponent();
    const first: BattleEvent[] = [];
    const off = opp.subscribe((e) => first.push(e));
    opp.start({ ...host.snapshot.me, dueWords: [] });
    off();
    opp.dispose();
    const second: BattleEvent[] = [];
    opp.subscribe((e) => second.push(e));
    opp.start({ ...host.snapshot.me, dueWords: [] }); // 重複 start 不會重新出題
    tick(FIRST_QUESTION_DELAY_MS + 10);

    expect(host.snapshot.status).toBe('lobby'); // 沒有被關掉
    expect(G.events.some((e) => e.type === 'opponentLeft')).toBe(false);
    expect(second.at(-1)).toMatchObject({ type: 'question', index: 0 });
    expect(G.events.at(-1)).toMatchObject({ type: 'question', index: 0 });
    expect(G.events.filter((e) => e.type === 'start')).toHaveLength(1);
  });
});
